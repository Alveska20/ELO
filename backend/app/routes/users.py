"""
Rotas do Meu Perfil: /api/profile

GET /api/profile   dados da pessoa logada
PUT /api/profile   edita nome, e-mail, telefone e perfil_acesso
                   (só os campos enviados mudam)

O perfil_acesso é definido UMA única vez: quem está "nao_definido" pode
escolher "mulher" ou "homem" aqui ("Como você se identifica?" em
Configurações). Depois disso, pedir outro perfil responde 403 e nada da
requisição é salvo. O admin não altera o perfil de ninguém.
O papel (usuario/admin) nunca é lido de formulário.
"""
from flask import Blueprint, g, jsonify

from app.services import auth_service, usuarios_service
from app.utils.decorators import login_required
from app.utils.requisicao import ler_json
from app.utils.respostas import erro

bp = Blueprint("users", __name__, url_prefix="/api/profile")


@bp.get("")
@login_required
def ver():
    return jsonify({"usuario": auth_service.usuario_para_dict(g.usuario)})


@bp.put("")
@login_required
def atualizar():
    usuario_id = g.usuario["id"]
    perfil_atual = g.usuario["perfil_acesso"]
    recebidos = ler_json()

    # Perfil já definido não muda mais. Conferido antes de tudo: se for
    # recusado, nem nome, e-mail ou telefone desta requisição são salvos.
    perfil_novo = usuarios_service.perfil_pedido(perfil_atual, recebidos.get("perfil_acesso"))
    if not usuarios_service.pode_trocar_perfil(perfil_atual, perfil_novo):
        return erro(usuarios_service.ERRO_PERFIL_JA_DEFINIDO, 403)

    # Começa com os dados atuais e troca só os campos editáveis enviados.
    dados = {
        "nome": g.usuario["nome"],
        "email": g.usuario["email"],
        "telefone": g.usuario["telefone"],
        "perfil_acesso": perfil_atual,
    }
    for campo in usuarios_service.CAMPOS_EDITAVEIS:
        if campo in recebidos:
            dados[campo] = recebidos[campo]

    mensagem_erro, limpos = usuarios_service.validar_perfil(usuario_id, dados, perfil_atual)
    if mensagem_erro is not None:
        return erro(mensagem_erro, 400)

    usuarios_service.atualizar_perfil(usuario_id, limpos)
    usuario = auth_service.buscar_usuario_por_id(usuario_id)
    return jsonify({"usuario": auth_service.usuario_para_dict(usuario)})
