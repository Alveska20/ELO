"""
Rotas dos contatos de confiança: /api/trusted-contacts  (somente perfil mulher)

GET    /api/trusted-contacts            lista + se o aviso de consentimento já foi aceito
POST   /api/trusted-contacts/consent    aceita o aviso de consentimento
POST   /api/trusted-contacts            cria     corpo: {"nome", "telefone", "relacao"}
PUT    /api/trusted-contacts/<id>       edita    (só os campos enviados mudam)
DELETE /api/trusted-contacts/<id>       apaga

A rota /consent é um acréscimo à lista dos requisitos do projeto: é ela que registra o
consentimento pedido antes do primeiro cadastro.
"""
from flask import Blueprint, g, jsonify

from app.services import contatos_service
from app.utils.decorators import acesso_mulher_required
from app.utils.requisicao import ler_json
from app.utils.respostas import erro

bp = Blueprint("trusted_contacts", __name__, url_prefix="/api/trusted-contacts")

MENSAGEM_NAO_ENCONTRADO = "Contato não encontrado."


@bp.get("")
@acesso_mulher_required
def listar():
    usuario_id = g.usuario["id"]
    return jsonify({
        "consentimento": contatos_service.tem_consentimento(usuario_id),
        "contatos": contatos_service.listar_contatos(usuario_id),
    })


@bp.post("/consent")
@acesso_mulher_required
def aceitar_consentimento():
    contatos_service.registrar_consentimento(g.usuario["id"])
    return jsonify({"consentimento": True})


@bp.post("")
@acesso_mulher_required
def criar():
    usuario_id = g.usuario["id"]
    # Regra de privacidade: sem aceitar o aviso, não dá para cadastrar.
    if not contatos_service.tem_consentimento(usuario_id):
        return erro("Leia e aceite o aviso de privacidade antes de cadastrar contatos.", 400)

    mensagem_erro, dados = contatos_service.validar_contato(ler_json())
    if mensagem_erro is not None:
        return erro(mensagem_erro, 400)

    contato_id = contatos_service.criar_contato(usuario_id, dados)
    contato = contatos_service.buscar_contato(usuario_id, contato_id)
    return jsonify({"contato": contatos_service.contato_para_dict(contato)}), 201


@bp.put("/<int:contato_id>")
@acesso_mulher_required
def atualizar(contato_id):
    usuario_id = g.usuario["id"]
    atual = contatos_service.buscar_contato(usuario_id, contato_id)
    if atual is None:
        return erro(MENSAGEM_NAO_ENCONTRADO, 404)

    dados = contatos_service.contato_para_dict(atual)
    dados.update(ler_json())

    mensagem_erro, limpos = contatos_service.validar_contato(dados)
    if mensagem_erro is not None:
        return erro(mensagem_erro, 400)

    contatos_service.atualizar_contato(usuario_id, contato_id, limpos)
    contato = contatos_service.buscar_contato(usuario_id, contato_id)
    return jsonify({"contato": contatos_service.contato_para_dict(contato)})


@bp.delete("/<int:contato_id>")
@acesso_mulher_required
def excluir(contato_id):
    usuario_id = g.usuario["id"]
    if contatos_service.buscar_contato(usuario_id, contato_id) is None:
        return erro(MENSAGEM_NAO_ENCONTRADO, 404)

    contatos_service.excluir_contato(usuario_id, contato_id)
    return jsonify({"mensagem": "Contato excluído."})
