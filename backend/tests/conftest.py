"""
Preparação comum dos testes (o pytest lê este arquivo sozinho).

Fixture = função que o pytest roda ANTES do teste para entregar algo
pronto. Basta o teste pedir pelo nome no parâmetro:

    def test_exemplo(cliente):     # o pytest chama a fixture "cliente"
        resposta = cliente.get("/api/auth/me")

Cada teste recebe um banco SQLite NOVO e temporário (pasta tmp_path,
criada e apagada pelo pytest). Assim um teste nunca interfere no outro
e o banco de verdade (instance/elo.db) nunca é tocado.
"""
import pytest

from app import create_app
from app.database.db import criar_tabelas, get_db
from app.database.seed import popular_banco

# Senhas só dos testes (o banco temporário é apagado no fim).
ADMIN_EMAIL = "admin@elo.exemplo"
SENHA_ADMIN = "senha-admin-teste"
SENHA_DEMO = "senha-demo-teste"

# Usuários de demonstração criados pelo seed.py.
EMAIL_MULHER = "maria@elo.exemplo"
EMAIL_HOMEM = "joao@elo.exemplo"
EMAIL_NAO_DEFINIDO = "alex@elo.exemplo"


@pytest.fixture
def app(tmp_path):
    """App Flask apontando para um banco temporário com os dados do seed."""
    app = create_app({
        "TESTING": True,
        "SECRET_KEY": "chave-so-para-testes",
        "DATABASE": str(tmp_path / "teste.db"),
    })
    with app.app_context():
        criar_tabelas()
        popular_banco(get_db(), ADMIN_EMAIL, SENHA_ADMIN, SENHA_DEMO)
    return app


@pytest.fixture
def cliente(app):
    """Navegador de mentira do Flask (test_client), sem ninguém logado."""
    return app.test_client()


@pytest.fixture
def logar(app):
    """Devolve uma função que cria um cliente já logado.

    Uso no teste:  maria = logar(EMAIL_MULHER)
    Cada chamada cria um cliente novo, com o próprio cookie de sessão.
    """
    def fazer_login(email, senha=SENHA_DEMO):
        novo_cliente = app.test_client()
        resposta = novo_cliente.post("/api/auth/login", json={"email": email, "senha": senha})
        assert resposta.status_code == 200, f"login de {email} falhou"
        return novo_cliente

    return fazer_login
