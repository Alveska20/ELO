"""
Rotas dos cômodos: /api/rooms

GET    /api/rooms        lista os cômodos do usuário
POST   /api/rooms        cria um cômodo           corpo: {"nome": "Sala"}
GET    /api/rooms/<id>   um cômodo + os dispositivos e portas dele (página do cômodo)
PUT    /api/rooms/<id>   renomeia                 corpo: {"nome": "Sala de estar"}
DELETE /api/rooms/<id>   apaga (os dispositivos ficam "sem cômodo")
"""
from flask import Blueprint, g, jsonify

from app.services import comodos_service, dispositivos_service, portas_service
from app.utils.decorators import login_required
from app.utils.requisicao import ler_json, texto
from app.utils.respostas import erro

bp = Blueprint("rooms", __name__, url_prefix="/api/rooms")

MENSAGEM_NAO_ENCONTRADO = "Cômodo não encontrado."


@bp.get("")
@login_required
def listar():
    return jsonify({"comodos": comodos_service.listar_comodos(g.usuario["id"])})


@bp.post("")
@login_required
def criar():
    nome = texto(ler_json().get("nome"))
    mensagem_erro = comodos_service.validar_nome(nome)
    if mensagem_erro is not None:
        return erro(mensagem_erro, 400)

    comodo_id = comodos_service.criar_comodo(g.usuario["id"], nome)
    comodo = comodos_service.buscar_comodo(g.usuario["id"], comodo_id)
    return jsonify({"comodo": comodos_service.comodo_para_dict(comodo)}), 201


# <int:comodo_id>: o Flask só aceita números nesse pedaço da URL e já
# entrega o valor como int para a função.
@bp.get("/<int:comodo_id>")
@login_required
def detalhar(comodo_id):
    usuario_id = g.usuario["id"]
    comodo = comodos_service.buscar_comodo(usuario_id, comodo_id)
    if comodo is None:
        return erro(MENSAGEM_NAO_ENCONTRADO, 404)

    return jsonify({
        "comodo": comodos_service.comodo_para_dict(comodo),
        "dispositivos": dispositivos_service.listar_dispositivos(usuario_id, comodo_id=comodo_id),
        "portas": portas_service.listar_portas(usuario_id, comodo_id=comodo_id),
    })


@bp.put("/<int:comodo_id>")
@login_required
def atualizar(comodo_id):
    usuario_id = g.usuario["id"]
    if comodos_service.buscar_comodo(usuario_id, comodo_id) is None:
        return erro(MENSAGEM_NAO_ENCONTRADO, 404)

    nome = texto(ler_json().get("nome"))
    mensagem_erro = comodos_service.validar_nome(nome)
    if mensagem_erro is not None:
        return erro(mensagem_erro, 400)

    comodos_service.atualizar_comodo(usuario_id, comodo_id, nome)
    comodo = comodos_service.buscar_comodo(usuario_id, comodo_id)
    return jsonify({"comodo": comodos_service.comodo_para_dict(comodo)})


@bp.delete("/<int:comodo_id>")
@login_required
def excluir(comodo_id):
    usuario_id = g.usuario["id"]
    if comodos_service.buscar_comodo(usuario_id, comodo_id) is None:
        return erro(MENSAGEM_NAO_ENCONTRADO, 404)

    comodos_service.excluir_comodo(usuario_id, comodo_id)
    return jsonify({"mensagem": "Cômodo excluído. Os dispositivos dele ficaram sem cômodo."})
