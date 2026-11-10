"""
Conexão com o banco SQLite usando o módulo sqlite3 do Python.

Ideia principal: cada requisição HTTP abre UMA conexão, usa durante a
requisição e fecha no final. A conexão fica guardada em flask.g, um
objeto que o Flask cria a cada requisição e descarta no fim dela.
"""
import os
import sqlite3

from flask import current_app, g

# Caminho do schema.sql (está na mesma pasta deste arquivo).
CAMINHO_SCHEMA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "schema.sql")


def abrir_conexao(caminho_banco):
    """Abre uma conexão sqlite3 já configurada."""
    conexao = sqlite3.connect(caminho_banco)

    # Com sqlite3.Row, cada linha pode ser lida pelo nome da coluna
    # (linha["nome"]) em vez da posição (linha[1]).
    conexao.row_factory = sqlite3.Row

    # O SQLite vem com as chaves estrangeiras DESLIGADAS. Sem esta linha,
    # o ON DELETE CASCADE do schema.sql não funcionaria.
    conexao.execute("PRAGMA foreign_keys = ON")
    return conexao


def get_db():
    """Devolve a conexão da requisição atual (abre se ainda não existir)."""
    if "db" not in g:
        g.db = abrir_conexao(current_app.config["DATABASE"])
    return g.db


def fechar_db(erro=None):
    """Fecha a conexão no fim da requisição.

    O Flask chama esta função sozinho (ver registrar_no_app). O parâmetro
    "erro" é obrigatório nessa assinatura, mesmo sem ser usado.
    """
    conexao = g.pop("db", None)
    if conexao is not None:
        conexao.close()


def criar_tabelas():
    """Executa o schema.sql: apaga as tabelas antigas e cria de novo."""
    # Garante que a pasta do arquivo .db existe (ex.: backend/instance/).
    pasta = os.path.dirname(current_app.config["DATABASE"])
    if pasta:
        os.makedirs(pasta, exist_ok=True)

    conexao = get_db()
    with open(CAMINHO_SCHEMA, encoding="utf-8") as arquivo:
        # executescript roda vários comandos SQL de uma vez.
        conexao.executescript(arquivo.read())


def registrar_no_app(app):
    """Pede ao Flask para chamar fechar_db ao final de toda requisição."""
    app.teardown_appcontext(fechar_db)
