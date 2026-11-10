"""
Ponto de partida do backend: a função create_app() monta o aplicativo Flask.

Usar uma função (em vez de criar o app solto no arquivo) permite criar
um app diferente para os testes, apontando para um banco temporário.
"""
import os

from flask import Flask, request, send_from_directory

from app.config import PASTA_BACKEND, Config
from app.database import db
from app.middleware import registrar_middleware
from app.utils.respostas import erro

# Pasta frontend/ (fica ao lado da pasta backend/).
PASTA_FRONTEND = os.path.join(os.path.dirname(PASTA_BACKEND), "frontend")


def create_app(config_extra=None):
    """Cria e configura o aplicativo Flask.

    config_extra: dict opcional que substitui configurações
    (os testes usam isso para trocar o caminho do banco).
    """
    # static_folder + static_url_path="": o Flask entrega os arquivos da
    # pasta frontend/ direto na raiz do site. Ex.: /pages/dashboard.html,
    # /css/estilo.css, /js/api.js. Frontend e API ficam na MESMA origem
    # (mesmo endereço e porta), então o cookie da sessão funciona sem CORS.
    app = Flask(__name__, static_folder=PASTA_FRONTEND, static_url_path="")
    app.config.from_object(Config)

    if config_extra is not None:
        app.config.update(config_extra)

    # Sem SECRET_KEY o Flask não consegue assinar o cookie da sessão.
    if not app.config.get("SECRET_KEY"):
        raise RuntimeError("Defina SECRET_KEY no arquivo .env (modelo em .env.example).")

    db.registrar_no_app(app)
    # Middleware: mede o tempo de cada requisição da API e
    # acrescenta cabeçalhos de segurança em todas as respostas.
    registrar_middleware(app)
    registrar_blueprints(app)
    registrar_erros(app)
    registrar_pagina_inicial(app)
    return app


def registrar_blueprints(app):
    """Cada Blueprint traz as rotas de uma parte do sistema."""
    # Os imports ficam dentro da função para evitar import circular:
    # os arquivos de rotas importam coisas de "app", que é este arquivo.
    from app.routes.admin import bp as admin_bp
    from app.routes.auth import bp as auth_bp
    from app.routes.automations import bp as automations_bp
    from app.routes.dashboard import bp as dashboard_bp
    from app.routes.devices import bp as devices_bp
    from app.routes.doors import bp as doors_bp
    from app.routes.emergency import bp as emergency_bp
    from app.routes.men_area import bp as men_area_bp
    from app.routes.protection import bp as protection_bp
    from app.routes.quiz import bp as quiz_bp
    from app.routes.rooms import bp as rooms_bp
    from app.routes.tags import bp as tags_bp
    from app.routes.trusted_contacts import bp as trusted_contacts_bp
    from app.routes.users import bp as users_bp

    blueprints = [
        # Casa inteligente (qualquer usuário logado)
        auth_bp, dashboard_bp, rooms_bp, devices_bp, doors_bp, automations_bp, tags_bp,
        # Proteção E.L.O. (somente perfil mulher)
        protection_bp, quiz_bp, trusted_contacts_bp, emergency_bp,
        # Área escura (perfil homem, perfil não definido e admin)
        men_area_bp,
        # Perfil (qualquer usuário logado) e Administração (somente admin)
        users_bp, admin_bp,
    ]
    for blueprint in blueprints:
        app.register_blueprint(blueprint)


def registrar_erros(app):
    """Erros da API também saem no formato {"erro": "..."}.

    Para endereços fora de /api (páginas do frontend), o Flask segue com a
    página de erro padrão dele.
    """

    @app.errorhandler(404)
    def nao_encontrado(e):
        if request.path.startswith("/api/"):
            return erro("Endereço não encontrado.", 404)
        return e

    @app.errorhandler(405)
    def metodo_nao_permitido(e):
        if request.path.startswith("/api/"):
            return erro("Método não permitido para este endereço.", 405)
        return e


def registrar_pagina_inicial(app):
    """Abrir http://localhost:5000/ mostra a tela de login (index.html)."""

    @app.get("/")
    def pagina_inicial():
        return send_from_directory(PASTA_FRONTEND, "index.html")
