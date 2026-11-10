"""
Regras de negócio das portas: SOMENTE CONSULTA.

Os requisitos do projeto pedem para não implementar trancar/destrancar, então este arquivo
não tem nenhuma função que altere uma porta. Os valores vêm do seed.
"""
from app.database.db import get_db


def porta_para_dict(linha):
    return {
        "id": linha["id"],
        "nome": linha["nome"],
        "comodo_id": linha["comodo_id"],
        "comodo_nome": linha["comodo_nome"],
        # bool(...) transforma o 0/1 do banco em false/true no JSON.
        "aberta": bool(linha["aberta"]),
        "trancada": bool(linha["trancada"]),
    }


def listar_portas(usuario_id, comodo_id=None):
    sql = (
        "SELECT p.*, c.nome AS comodo_nome FROM portas p "
        "LEFT JOIN comodos c ON c.id = p.comodo_id "
        "WHERE p.usuario_id = ?"
    )
    parametros = [usuario_id]
    if comodo_id is not None:
        sql = sql + " AND p.comodo_id = ?"
        parametros.append(comodo_id)

    linhas = get_db().execute(sql + " ORDER BY p.nome", parametros).fetchall()

    portas = []
    for linha in linhas:
        portas.append(porta_para_dict(linha))
    return portas


def avisos_de_seguranca(usuario_id):
    """Lista o que merece atenção: portas abertas ou destrancadas e janelas abertas.

    Usada pelo Dashboard (status geral da casa) e pela automação Modo Noite
    ("verificar portas e janelas"). Só lê o banco, não muda nada.
    """
    avisos = []

    for porta in listar_portas(usuario_id):
        if porta["aberta"]:
            avisos.append(f"{porta['nome']} está aberta.")
        if not porta["trancada"]:
            avisos.append(f"{porta['nome']} está destrancada.")

    janelas_abertas = get_db().execute(
        "SELECT nome FROM dispositivos WHERE usuario_id = ? AND tipo = 'janela' AND estado = 'aberta' "
        "ORDER BY nome",
        (usuario_id,),
    ).fetchall()
    for janela in janelas_abertas:
        avisos.append(f"{janela['nome']} está aberta.")

    return avisos
