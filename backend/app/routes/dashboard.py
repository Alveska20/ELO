"""
Rota do Dashboard: /api/dashboard

GET /api/dashboard   números da casa, status geral, avisos e controles rápidos

(Arquivo extra em relação à lista dos requisitos do projeto: o Dashboard
não pertence a nenhum outro Blueprint, então ganhou o seu.)
"""
from flask import Blueprint, g, jsonify

from app.services import dashboard_service
from app.utils.decorators import login_required

bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@bp.get("")
@login_required
def resumo():
    return jsonify(dashboard_service.montar_resumo(g.usuario["id"]))
