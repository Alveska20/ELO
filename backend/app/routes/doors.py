"""
Rota das portas: /api/doors — SOMENTE CONSULTA.

GET /api/doors   lista as portas: aberta/fechada e trancada/destrancada

Não existe rota para trancar ou destrancar (regra dos requisitos do projeto).
"""
from flask import Blueprint, g, jsonify

from app.services import portas_service
from app.utils.decorators import login_required

bp = Blueprint("doors", __name__, url_prefix="/api/doors")


@bp.get("")
@login_required
def listar():
    return jsonify({"portas": portas_service.listar_portas(g.usuario["id"])})
