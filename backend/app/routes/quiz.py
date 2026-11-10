"""
Rotas do quiz educativo: /api/quiz  (somente perfil mulher)

GET  /api/quiz          perguntas ATIVAS, sem a resposta certa
POST /api/quiz/answer   confere uma resposta   corpo: {"pergunta_id": 1, "letra": "A"}

A resposta da usuária não é salva em lugar nenhum.
"""
from flask import Blueprint, jsonify

from app.services import quiz_service
from app.utils.decorators import acesso_mulher_required
from app.utils.requisicao import ler_json, para_inteiro, texto
from app.utils.respostas import erro

bp = Blueprint("quiz", __name__, url_prefix="/api/quiz")


@bp.get("")
@acesso_mulher_required
def perguntas():
    lista = quiz_service.listar_perguntas_ativas()
    return jsonify({
        # "total" conta só as ativas: é o "de 10" do contador "1 de 10".
        "total": len(lista),
        "perguntas": lista,
        "texto_resultado": quiz_service.texto_do_resultado(),
    })


@bp.post("/answer")
@acesso_mulher_required
def responder():
    dados = ler_json()
    pergunta_id = para_inteiro(dados.get("pergunta_id"))
    letra = texto(dados.get("letra")).upper()

    if pergunta_id is None or not letra:
        return erro("Envie a pergunta e a letra escolhida.", 400)

    resultado = quiz_service.corrigir_resposta(pergunta_id, letra)
    if resultado is None:
        return erro("Pergunta não encontrada.", 404)
    return jsonify(resultado)
