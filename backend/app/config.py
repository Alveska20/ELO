"""
Configurações do E.L.O.

Os valores vêm do arquivo .env (modelo em .env.example). Assim nenhuma
senha ou chave fica escrita no código.
"""
import os

from dotenv import load_dotenv

# Pasta "backend/" (dois níveis acima deste arquivo: app/config.py -> app -> backend).
# Usamos esse caminho como base para que o banco seja criado sempre no mesmo
# lugar, não importa de qual pasta o comando foi rodado.
PASTA_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# load_dotenv lê o .env e coloca cada linha "CHAVE=valor" em os.environ.
load_dotenv(os.path.join(PASTA_BACKEND, ".env"))


def caminho_do_banco():
    """Devolve o caminho completo do arquivo .db.

    No .env o caminho pode ser relativo (ex.: instance/elo.db). Aqui ele é
    transformado em caminho completo a partir da pasta backend/.
    """
    caminho = os.environ.get("DATABASE_PATH", "instance/elo.db")
    if os.path.isabs(caminho):
        return caminho
    return os.path.join(PASTA_BACKEND, caminho)


class Config:
    """Configurações lidas pelo Flask com app.config.from_object(Config)."""

    # Chave que assina o cookie da sessão (ver etapa de autenticação).
    SECRET_KEY = os.environ.get("SECRET_KEY")

    # Cuidados com o cookie da sessão:
    # - HTTPONLY: o JavaScript da página não consegue ler o cookie
    #   (protege contra scripts maliciosos roubarem o login).
    # - SAMESITE="Lax": outros sites não conseguem enviar o cookie
    #   junto em formulários feitos por eles.
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

    DATABASE = caminho_do_banco()

    # Dados do primeiro admin e senha dos usuários de demonstração (usados no seed.py).
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL")
    ADMIN_SENHA = os.environ.get("ADMIN_SENHA")
    DEMO_SENHA = os.environ.get("DEMO_SENHA")

    DEBUG = os.environ.get("FLASK_DEBUG") == "1"
