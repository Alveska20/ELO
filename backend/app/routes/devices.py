"""
Rotas dos dispositivos simulados: /api/devices

GET    /api/devices               lista (filtros opcionais: ?comodo_id=3  ?tipo=camera)
POST   /api/devices               cria       corpo: {"nome", "tipo", "comodo_id", "temperatura"}
PUT    /api/devices/<id>          edita      corpo: só os campos que mudaram
DELETE /api/devices/<id>          apaga
PATCH  /api/devices/<id>/toggle   liga/desliga (ou abre/fecha)
"""
from flask import Blueprint, g, jsonify, request

from app.services import dispositivos_service
from app.utils.decorators import login_required
from app.utils.requisicao import ler_json, para_inteiro, texto
from app.utils.respostas import erro

bp = Blueprint("devices", __name__, url_prefix="/api/devices")

MENSAGEM_NAO_ENCONTRADO = "Dispositivo não encontrado."


def resposta_dispositivo(dispositivo_id, status=200):
    """Busca o dispositivo atualizado no banco e devolve como JSON."""
    dispositivo = dispositivos_service.buscar_dispositivo(g.usuario["id"], dispositivo_id)
    return jsonify({"dispositivo": dispositivos_service.dispositivo_para_dict(dispositivo)}), status


@bp.get("")
@login_required
def listar():
    # request.args = parâmetros da URL depois do "?" (ex.: ?tipo=camera).
    comodo_id = para_inteiro(request.args.get("comodo_id"))
    tipo = texto(request.args.get("tipo")) or None
    dispositivos = dispositivos_service.listar_dispositivos(g.usuario["id"], comodo_id, tipo)
    return jsonify({"dispositivos": dispositivos})


@bp.post("")
@login_required
def criar():
    mensagem_erro, dados = dispositivos_service.validar_dispositivo(g.usuario["id"], ler_json())
    if mensagem_erro is not None:
        return erro(mensagem_erro, 400)

    dispositivo_id = dispositivos_service.criar_dispositivo(g.usuario["id"], dados)
    return resposta_dispositivo(dispositivo_id, 201)


@bp.put("/<int:dispositivo_id>")
@login_required
def atualizar(dispositivo_id):
    usuario_id = g.usuario["id"]
    atual = dispositivos_service.buscar_dispositivo(usuario_id, dispositivo_id)
    if atual is None:
        return erro(MENSAGEM_NAO_ENCONTRADO, 404)

    # Começa com os valores atuais e troca só o que foi enviado.
    # Assim o frontend pode mandar só {"nome": "Novo nome"}.
    dados = {
        "nome": atual["nome"],
        "tipo": atual["tipo"],
        "comodo_id": atual["comodo_id"],
        "temperatura": atual["temperatura"],
    }
    dados.update(ler_json())

    mensagem_erro, limpos = dispositivos_service.validar_dispositivo(usuario_id, dados)
    if mensagem_erro is not None:
        return erro(mensagem_erro, 400)

    dispositivos_service.atualizar_dispositivo(usuario_id, atual, limpos)
    return resposta_dispositivo(dispositivo_id)


@bp.patch("/<int:dispositivo_id>/toggle")
@login_required
def alternar(dispositivo_id):
    atual = dispositivos_service.buscar_dispositivo(g.usuario["id"], dispositivo_id)
    if atual is None:
        return erro(MENSAGEM_NAO_ENCONTRADO, 404)

    dispositivos_service.alternar_estado(g.usuario["id"], atual)
    return resposta_dispositivo(dispositivo_id)


@bp.delete("/<int:dispositivo_id>")
@login_required
def excluir(dispositivo_id):
    if dispositivos_service.buscar_dispositivo(g.usuario["id"], dispositivo_id) is None:
        return erro(MENSAGEM_NAO_ENCONTRADO, 404)

    dispositivos_service.excluir_dispositivo(g.usuario["id"], dispositivo_id)
    return jsonify({"mensagem": "Dispositivo excluído."})
