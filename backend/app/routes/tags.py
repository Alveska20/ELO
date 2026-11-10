"""
Rotas das Tags: /api/tags

GET    /api/tags          lista
POST   /api/tags          cria     corpo: {"nome", "codigo", "funcao", "comodo_id", "ativo"}
PUT    /api/tags/<id>     edita    (só os campos enviados mudam; ex.: {"ativo": false})
DELETE /api/tags/<id>     apaga
POST   /api/tags/scan     simula a leitura   corpo: {"codigo": "SALA"}

Resposta da leitura (scan) quando dá certo:
{"mensagem": "Tag identificada: Sala.", "destino": "/pages/comodo.html?id=1", "tag": {...}}
O frontend lê "destino" e redireciona a página para lá.

Criar ou editar uma Tag com as funções "abrir_protecao" ou
"abrir_emergencia" sem ser perfil mulher responde 403.
"""
from flask import Blueprint, g, jsonify

from app.services import tags_service
from app.utils.decorators import MENSAGEM_SEM_PERMISSAO, login_required
from app.utils.requisicao import ler_json
from app.utils.respostas import erro

bp = Blueprint("tags", __name__, url_prefix="/api/tags")

MENSAGEM_NAO_ENCONTRADO = "Tag não encontrada."


def resposta_tag(tag_id, status=200):
    tag = tags_service.buscar_tag(g.usuario["id"], tag_id)
    return jsonify({"tag": tags_service.tag_para_dict(tag)}), status


@bp.get("")
@login_required
def listar():
    return jsonify({"tags": tags_service.listar_tags(g.usuario["id"])})


@bp.post("")
@login_required
def criar():
    recebidos = ler_json()
    if not tags_service.funcao_permitida(recebidos.get("funcao"), g.usuario):
        return erro(MENSAGEM_SEM_PERMISSAO, 403)
    mensagem_erro, dados = tags_service.validar_tag(g.usuario["id"], recebidos)
    if mensagem_erro is not None:
        return erro(mensagem_erro, 400)

    tag_id = tags_service.criar_tag(g.usuario["id"], dados)
    return resposta_tag(tag_id, 201)


@bp.put("/<int:tag_id>")
@login_required
def atualizar(tag_id):
    usuario_id = g.usuario["id"]
    atual = tags_service.buscar_tag(usuario_id, tag_id)
    if atual is None:
        return erro(MENSAGEM_NAO_ENCONTRADO, 404)

    # Começa com os valores atuais e troca só o que foi enviado.
    dados = tags_service.tag_para_dict(atual)
    dados.update(ler_json())
    if not tags_service.funcao_permitida(dados.get("funcao"), g.usuario):
        return erro(MENSAGEM_SEM_PERMISSAO, 403)

    mensagem_erro, limpos = tags_service.validar_tag(usuario_id, dados, tag_id)
    if mensagem_erro is not None:
        return erro(mensagem_erro, 400)

    tags_service.atualizar_tag(usuario_id, tag_id, limpos)
    return resposta_tag(tag_id)


@bp.delete("/<int:tag_id>")
@login_required
def excluir(tag_id):
    if tags_service.buscar_tag(g.usuario["id"], tag_id) is None:
        return erro(MENSAGEM_NAO_ENCONTRADO, 404)

    tags_service.excluir_tag(g.usuario["id"], tag_id)
    return jsonify({"mensagem": "Tag excluída."})


@bp.post("/scan")
@login_required
def simular_leitura():
    """Tag identificada -> busca a configuração -> devolve o destino."""
    codigo = tags_service.normalizar_codigo(ler_json().get("codigo"))
    tag = tags_service.buscar_tag_por_codigo(g.usuario["id"], codigo)

    if tag is None:
        return erro("Tag não reconhecida.", 404)
    if not tag["ativo"]:
        return erro("Esta Tag está desativada.", 400)
    if not tags_service.usuario_pode_usar(tag, g.usuario):
        return erro(MENSAGEM_SEM_PERMISSAO, 403)

    destino = tags_service.calcular_destino(tag)
    if destino is None:
        return erro("Esta Tag não tem cômodo configurado. Edite a Tag e escolha um cômodo.", 400)

    return jsonify({
        "mensagem": f"Tag identificada: {tag['nome']}.",
        "destino": destino,
        "tag": tags_service.tag_para_dict(tag),
    })
