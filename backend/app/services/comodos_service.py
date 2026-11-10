"""
Regras de negócio dos cômodos (Sala, Quarto, Cozinha...).

Toda consulta filtra por usuario_id: um usuário nunca vê nem altera
o cômodo de outro. Se o id existir mas for de outra pessoa, a função
devolve None, e a rota responde 404 (como se não existisse).
"""
from app.database.db import get_db

# LEFT JOIN + COUNT: traz cada cômodo com quantos dispositivos ele tem.
# O LEFT JOIN garante que cômodos sem nenhum dispositivo também apareçam (com 0).
SQL_COMODOS = """
    SELECT c.id, c.nome, COUNT(d.id) AS total_dispositivos
    FROM comodos c
    LEFT JOIN dispositivos d ON d.comodo_id = c.id
    WHERE c.usuario_id = ?
"""


def comodo_para_dict(linha):
    return {
        "id": linha["id"],
        "nome": linha["nome"],
        "total_dispositivos": linha["total_dispositivos"],
    }


def listar_comodos(usuario_id):
    linhas = get_db().execute(
        SQL_COMODOS + " GROUP BY c.id ORDER BY c.nome", (usuario_id,)
    ).fetchall()

    comodos = []
    for linha in linhas:
        comodos.append(comodo_para_dict(linha))
    return comodos


def buscar_comodo(usuario_id, comodo_id):
    """Devolve a linha do cômodo, ou None se não existir / for de outro usuário."""
    return get_db().execute(
        SQL_COMODOS + " AND c.id = ? GROUP BY c.id", (usuario_id, comodo_id)
    ).fetchone()


def comodo_pertence_ao_usuario(usuario_id, comodo_id):
    """Usada por dispositivos e Tags antes de ligar algo a um cômodo."""
    return buscar_comodo(usuario_id, comodo_id) is not None


def validar_nome(nome):
    """Devolve a mensagem de erro, ou None se estiver ok."""
    if not nome:
        return "Informe o nome do cômodo."
    if len(nome) > 50:
        return "O nome do cômodo pode ter no máximo 50 caracteres."
    return None


def criar_comodo(usuario_id, nome):
    conexao = get_db()
    cursor = conexao.execute(
        "INSERT INTO comodos (usuario_id, nome) VALUES (?, ?)", (usuario_id, nome)
    )
    conexao.commit()
    return cursor.lastrowid


def atualizar_comodo(usuario_id, comodo_id, nome):
    conexao = get_db()
    conexao.execute(
        "UPDATE comodos SET nome = ? WHERE id = ? AND usuario_id = ?",
        (nome, comodo_id, usuario_id),
    )
    conexao.commit()


def excluir_comodo(usuario_id, comodo_id):
    """Apaga o cômodo. Os dispositivos, portas e Tags dele NÃO são apagados:
    ficam "sem cômodo" (ON DELETE SET NULL no schema.sql)."""
    conexao = get_db()
    conexao.execute(
        "DELETE FROM comodos WHERE id = ? AND usuario_id = ?", (comodo_id, usuario_id)
    )
    conexao.commit()
