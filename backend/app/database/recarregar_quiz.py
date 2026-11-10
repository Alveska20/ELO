"""
Recarrega SÓ as perguntas do quiz a partir de content/quiz.json.

Como rodar (dentro da pasta backend/, com o venv ativado):
    python -m app.database.recarregar_quiz

Diferente do seed.py, este comando NÃO apaga usuários, casas, Tags nem
contatos. Ele troca apenas as tabelas quiz_perguntas e quiz_alternativas.
Isso é seguro porque as respostas das usuárias nunca são salvas no banco:
não existe nada ligado às perguntas antigas que possa se perder.
"""
import sqlite3

from app import create_app
from app.database.db import get_db
from app.database.seed import carregar_quiz


def recarregar(conexao):
    """Apaga as perguntas antigas e grava as do quiz.json.

    Tudo acontece numa única transação: se o quiz.json tiver erro (ex.: uma
    pergunta ativa ainda com [ADICIONAR AQUI]), o rollback desfaz o DELETE
    e o quiz antigo continua no banco.
    """
    try:
        # Apagar a pergunta apaga as alternativas junto (ON DELETE CASCADE).
        conexao.execute("DELETE FROM quiz_perguntas")
        carregar_quiz(conexao)
        conexao.commit()
    except Exception:
        conexao.rollback()
        raise


def main():
    app = create_app()
    with app.app_context():
        conexao = get_db()
        try:
            recarregar(conexao)
        except sqlite3.OperationalError:
            # Acontece quando as tabelas ainda não existem.
            raise SystemExit("Banco não encontrado. Rode primeiro: python -m app.database.seed")
        except ValueError as erro:
            raise SystemExit(f"Nada foi alterado. {erro}")

        ativas = conexao.execute(
            "SELECT COUNT(*) FROM quiz_perguntas WHERE ativo = 1"
        ).fetchone()[0]
        total = conexao.execute("SELECT COUNT(*) FROM quiz_perguntas").fetchone()[0]

    print(f"Quiz recarregado: {total} perguntas no banco, {ativas} ativas.")


if __name__ == "__main__":
    main()
