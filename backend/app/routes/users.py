"""
Rotas do Meu Perfil: /api/profile

GET /api/profile   dados da pessoa logada
PUT /api/profile   edita nome, e-mail, telefone e perfil_acesso
                   (só os campos enviados mudam)

A própria pessoa troca o perfil_acesso aqui ("Como você se
identifica?" em Configurações). O admin não altera o perfil de ninguém.
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
    recebidos = ler_json()

    # Começa com os dados atuais e troca só os campos editáveis enviados.
    dados = {
        "nome": g.usuario["nome"],
        "email": g.usuario["email"],
        "telefone": g.usuario["telefone"],
        "perfil_acesso": g.usuario["perfil_acesso"],
    }
    for campo in usuarios_service.CAMPOS_EDITAVEIS:
        if campo in recebidos:
            dados[campo] = recebidos[campo]

    mensagem_erro, limpos = usuarios_service.validar_perfil(usuario_id, dados)
    if mensagem_erro is not None:
        return erro(mensagem_erro, 400)

    usuarios_service.atualizar_perfil(usuario_id, limpos)
    usuario = auth_service.buscar_usuario_por_id(usuario_id)
    return jsonify({"usuario": auth_service.usuario_para_dict(usuario)})
