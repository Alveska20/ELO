"""
Rota do conteúdo da Proteção E.L.O.: /api/protection  (somente perfil mulher)

GET /api/protection   todos os textos da área (início, orientações, tipos de
                      violência, FAQ, contatos úteis, avisos), lidos de
                      content/protecao.json

A área é de orientação e prevenção: acessar não significa que a pessoa
seja vítima, e nada sobre o acesso é registrado.
"""
from flask import Blueprint, jsonify

from app.services import protecao_service
from app.utils.decorators import acesso_mulher_required

bp = Blueprint("protection", __name__, url_prefix="/api/protection")


@bp.get("")
@acesso_mulher_required
def conteudo():
    return jsonify(protecao_service.obter_conteudo())
