"""
Regras da Administração.

O que o admin pode fazer:
- ver os usuários e o perfil_acesso de cada um (só VER; quem
  escolhe o perfil é a própria pessoa, no cadastro e em Configurações);
- ver e excluir cômodos, dispositivos e Tags de qualquer usuário;
- ver informações gerais (contagens).

REGRA DE PRIVACIDADE (requisitos do projeto, seção 7.12):
o admin NÃO pode ver contatos de confiança, alertas de emergência nem
nada do quiz dos usuários. Por isso este arquivo só consulta as tabelas
da lista TABELAS_PERMITIDAS abaixo. As tabelas contatos_confianca,
alertas_emergencia, configuracoes_protecao, quiz_perguntas e
quiz_alternativas não aparecem em nenhum SQL daqui. Os testes (etapa 9)
chamam todas as rotas /api/admin e conferem que nenhuma devolve esses dados.

Também ficam de fora, por não serem necessários para administrar:
senha_hash e telefone dos usuários.
"""
from app.database.db import get_db

TABELAS_PERMITIDAS = ("usuarios", "comodos", "dispositivos", "tags", "automacoes")

PERFIS_ACESSO = ("nao_definido", "mulher", "homem")


# ---------------------------------------------------------------------
# Usuários
# ---------------------------------------------------------------------

def usuario_para_dict_admin(linha):
    """Só o necessário para administrar. Sem senha_hash e sem telefone."""
    return {
        "id": linha["id"],
        "nome": linha["nome"],
        "email": linha["email"],
        "papel": linha["papel"],
        "perfil_acesso": linha["perfil_acesso"],
        "criado_em": linha["criado_em"],
    }


def listar_usuarios():
    linhas = get_db().execute(
        "SELECT id, nome, email, papel, perfil_acesso, criado_em FROM usuarios ORDER BY nome"
    ).fetchall()
    usuarios = []
    for linha in linhas:
        usuarios.append(usuario_para_dict_admin(linha))
    return usuarios


def buscar_usuario(usuario_id):
    return get_db().execute(
        "SELECT id, nome, email, papel, perfil_acesso, criado_em FROM usuarios WHERE id = ?",
        (usuario_id,),
    ).fetchone()


# ---------------------------------------------------------------------
# Cômodos, dispositivos e Tags de todos os usuários
# (JOIN com usuarios para mostrar o nome do dono de cada item)
# ---------------------------------------------------------------------

def linhas_para_lista(linhas):
    """Transforma cada sqlite3.Row em dict comum (dict(linha) usa os nomes das colunas)."""
    lista = []
    for linha in linhas:
        lista.append(dict(linha))
    return lista


def listar_comodos():
    linhas = get_db().execute(
        "SELECT c.id, c.nome, u.nome AS dono_nome, u.email AS dono_email "
        "FROM comodos c JOIN usuarios u ON u.id = c.usuario_id "
        "ORDER BY u.nome, c.nome"
    ).fetchall()
    return linhas_para_lista(linhas)


def listar_dispositivos():
    linhas = get_db().execute(
        "SELECT d.id, d.nome, d.tipo, d.estado, c.nome AS comodo_nome, "
        "       u.nome AS dono_nome, u.email AS dono_email "
        "FROM dispositivos d "
        "JOIN usuarios u ON u.id = d.usuario_id "
        "LEFT JOIN comodos c ON c.id = d.comodo_id "
        "ORDER BY u.nome, d.nome"
    ).fetchall()
    return linhas_para_lista(linhas)


def listar_tags():
    linhas = get_db().execute(
        "SELECT t.id, t.nome, t.codigo, t.funcao, t.ativo, c.nome AS comodo_nome, "
        "       u.nome AS dono_nome, u.email AS dono_email "
        "FROM tags t "
        "JOIN usuarios u ON u.id = t.usuario_id "
        "LEFT JOIN comodos c ON c.id = t.comodo_id "
        "ORDER BY u.nome, t.nome"
    ).fetchall()

    tags = linhas_para_lista(linhas)
    for tag in tags:
        tag["ativo"] = bool(tag["ativo"])
    return tags


# Qual tabela cada tipo de item usa. A função excluir_item só aceita
# estes três nomes, então não existe jeito de apagar outra tabela por ela.
TABELA_POR_ITEM = {"comodo": "comodos", "dispositivo": "dispositivos", "tag": "tags"}


def item_existe(tipo_item, item_id):
    tabela = TABELA_POR_ITEM[tipo_item]
    linha = get_db().execute(f"SELECT id FROM {tabela} WHERE id = ?", (item_id,)).fetchone()
    return linha is not None


def excluir_item(tipo_item, item_id):
    # O nome da tabela vem do dict TABELA_POR_ITEM (nunca do que o navegador
    # enviou), por isso é seguro montar o SQL com f-string aqui. Valores que
    # vêm do navegador sempre vão como "?", nunca dentro do texto do SQL.
    tabela = TABELA_POR_ITEM[tipo_item]
    conexao = get_db()
    conexao.execute(f"DELETE FROM {tabela} WHERE id = ?", (item_id,))
    conexao.commit()


# ---------------------------------------------------------------------
# Informações gerais
# ---------------------------------------------------------------------

def contar(sql):
    return get_db().execute(sql).fetchone()[0]


def informacoes_gerais():
    """Contagens gerais do sistema. Nada sobre proteção, contatos, alertas ou quiz."""
    usuarios_por_perfil = {}
    for perfil in PERFIS_ACESSO:
        usuarios_por_perfil[perfil] = get_db().execute(
            "SELECT COUNT(*) FROM usuarios WHERE perfil_acesso = ?", (perfil,)
        ).fetchone()[0]

    return {
        "total_usuarios": contar("SELECT COUNT(*) FROM usuarios"),
        "total_admins": contar("SELECT COUNT(*) FROM usuarios WHERE papel = 'admin'"),
        "usuarios_por_perfil": usuarios_por_perfil,
        "total_comodos": contar("SELECT COUNT(*) FROM comodos"),
        "total_dispositivos": contar("SELECT COUNT(*) FROM dispositivos"),
        "total_automacoes": contar("SELECT COUNT(*) FROM automacoes"),
        "total_tags": contar("SELECT COUNT(*) FROM tags"),
    }
