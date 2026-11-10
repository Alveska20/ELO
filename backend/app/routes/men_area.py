"""
Rota da área escura: /api/men-area  (perfil homem, não definido e admin)

GET /api/men-area   textos das telas escuras (content/homem.json), números da
                    casa, os ambientes (cômodos) com seus dispositivos e a
                    temperatura do ar-condicionado

Apesar do nome da URL ("men-area"), a rota vale para todos que usam o
visual escuro: perfil homem, perfil não definido e admin.

O restante da casa (cômodos, dispositivos, automações, Tags, perfil) usa as
rotas que já existiam, iguais para todos os perfis. Só muda o visual.

Perfil mulher (visual roxo) recebe 403; sem login, 401
(regra do @area_escura_required).
"""
from flask import Blueprint, g, jsonify

from app.services import area_homem_service
from app.utils.decorators import area_escura_required

bp = Blueprint("men_area", __name__, url_prefix="/api/men-area")


@bp.get("")
@area_escura_required
def inicio():
    return jsonify(area_homem_service.montar_inicio(g.usuario["id"]))
