"""
Rotas da Administração: /api/admin  (somente papel = admin)

GET    /api/admin/overview                     informações gerais (contagens)
GET    /api/admin/users                        lista os usuários (só para ver: o admin
                                               NÃO altera o perfil de ninguém)
GET    /api/admin/rooms                        cômodos de todos os usuários
DELETE /api/admin/rooms/<id>
GET    /api/admin/devices                      dispositivos de todos os usuários
DELETE /api/admin/devices/<id>
GET    /api/admin/tags                         Tags de todos os usuários
DELETE /api/admin/tags/<id>

Todas usam @admin_required: um usuário comum recebe 403 mesmo chamando
a URL direto, sem passar pela tela.

REGRA DE PRIVACIDADE: não existe (e não deve ser criada) nenhuma rota
aqui para contatos de confiança, alertas de emergência ou quiz.
"""
from flask import Blueprint, jsonify

from app.services import admin_service
from app.utils.decorators import admin_required
from app.utils.respostas import erro

bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@bp.get("/overview")
@admin_required
def informacoes_gerais():
    return jsonify(admin_service.informacoes_gerais())


# ---------------------------------------------------------------------
# Usuários (só para ver)
# Não existe rota para o admin mudar o perfil_acesso de alguém: quem
# escolhe o perfil é a própria pessoa (cadastro e Configurações).
# ---------------------------------------------------------------------

@bp.get("/users")
@admin_required
def listar_usuarios():
    return jsonify({"usuarios": admin_service.listar_usuarios()})


# ---------------------------------------------------------------------
# Cômodos, dispositivos e Tags
# ---------------------------------------------------------------------

def excluir(tipo_item, item_id, mensagem_nao_encontrado):
    """Exclusão usada pelas três rotas DELETE abaixo."""
    if not admin_service.item_existe(tipo_item, item_id):
        return erro(mensagem_nao_encontrado, 404)
    admin_service.excluir_item(tipo_item, item_id)
    return jsonify({"mensagem": "Item excluído."})


@bp.get("/rooms")
@admin_required
def listar_comodos():
    return jsonify({"comodos": admin_service.listar_comodos()})


@bp.delete("/rooms/<int:comodo_id>")
@admin_required
def excluir_comodo(comodo_id):
    return excluir("comodo", comodo_id, "Cômodo não encontrado.")


@bp.get("/devices")
@admin_required
def listar_dispositivos():
    return jsonify({"dispositivos": admin_service.listar_dispositivos()})


@bp.delete("/devices/<int:dispositivo_id>")
@admin_required
def excluir_dispositivo(dispositivo_id):
    return excluir("dispositivo", dispositivo_id, "Dispositivo não encontrado.")


@bp.get("/tags")
@admin_required
def listar_tags():
    return jsonify({"tags": admin_service.listar_tags()})


@bp.delete("/tags/<int:tag_id>")
@admin_required
def excluir_tag(tag_id):
    return excluir("tag", tag_id, "Tag não encontrada.")
