"""
Rotas das automações: /api/automations

GET    /api/automations            lista (com as ações de cada uma)
POST   /api/automations            cria
PUT    /api/automations/<id>       edita (só os campos enviados mudam; ex.: {"ativo": false})
DELETE /api/automations/<id>       apaga
POST   /api/automations/<id>/run   "Executar (simulação)": aplica as ações nos dispositivos

Formato do corpo (POST/PUT):
{
  "nome": "Modo Noite", "descricao": "...",
  "gatilho": "manual" ou "horario", "horario": "22:00",
  "verificar_portas": true, "ativo": true,
  "acoes": [{"dispositivo_id": 1, "novo_estado": "desligado"},
            {"dispositivo_id": 5, "novo_estado": "ligado", "temperatura": 22}]
}
"""
from flask import Blueprint, g, jsonify

from app.services import automacoes_service
from app.utils.decorators import login_required
from app.utils.requisicao import ler_json
from app.utils.respostas import erro

bp = Blueprint("automations", __name__, url_prefix="/api/automations")

MENSAGEM_NAO_ENCONTRADO = "Automação não encontrada."


def resposta_automacao(automacao_id, status=200):
    automacao = automacoes_service.buscar_automacao(g.usuario["id"], automacao_id)
    return jsonify({"automacao": automacoes_service.automacao_para_dict(automacao)}), status


@bp.get("")
@login_required
def listar():
    return jsonify({"automacoes": automacoes_service.listar_automacoes(g.usuario["id"])})


@bp.post("")
@login_required
def criar():
    mensagem_erro, dados = automacoes_service.validar_automacao(g.usuario["id"], ler_json())
    if mensagem_erro is not None:
        return erro(mensagem_erro, 400)

    automacao_id = automacoes_service.criar_automacao(g.usuario["id"], dados)
    return resposta_automacao(automacao_id, 201)


@bp.put("/<int:automacao_id>")
@login_required
def atualizar(automacao_id):
    usuario_id = g.usuario["id"]
    atual = automacoes_service.buscar_automacao(usuario_id, automacao_id)
    if atual is None:
        return erro(MENSAGEM_NAO_ENCONTRADO, 404)

    # Começa com os valores atuais (incluindo as ações) e troca só o que foi enviado.
    dados = automacoes_service.automacao_para_dict(atual)
    dados.update(ler_json())

    mensagem_erro, limpos = automacoes_service.validar_automacao(usuario_id, dados)
    if mensagem_erro is not None:
        return erro(mensagem_erro, 400)

    automacoes_service.atualizar_automacao(usuario_id, automacao_id, limpos)
    return resposta_automacao(automacao_id)


@bp.delete("/<int:automacao_id>")
@login_required
def excluir(automacao_id):
    if automacoes_service.buscar_automacao(g.usuario["id"], automacao_id) is None:
        return erro(MENSAGEM_NAO_ENCONTRADO, 404)

    automacoes_service.excluir_automacao(g.usuario["id"], automacao_id)
    return jsonify({"mensagem": "Automação excluída."})


@bp.post("/<int:automacao_id>/run")
@login_required
def executar(automacao_id):
    automacao = automacoes_service.buscar_automacao(g.usuario["id"], automacao_id)
    if automacao is None:
        return erro(MENSAGEM_NAO_ENCONTRADO, 404)
    if not automacao["ativo"]:
        return erro("Esta automação está desativada. Ative para executar.", 400)

    resultado = automacoes_service.executar_automacao(g.usuario["id"], automacao_id)
    return jsonify(resultado)
