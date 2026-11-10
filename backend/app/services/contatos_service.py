"""
Regras dos contatos de confiança (somente perfil mulher).

Cuidado de privacidade (doc, seção 11): antes do primeiro cadastro, a
usuária precisa aceitar um aviso explicando para que os dados servem.
Sem esse consentimento, a API não deixa cadastrar contatos.

Guardamos só o mínimo: nome, telefone e relação.
O admin NÃO tem rota para ver estes dados.
"""
from app.database.db import get_db
from app.utils.requisicao import texto

MINIMO_DIGITOS_TELEFONE = 8


def obter_configuracoes(usuario_id):
    """Devolve a linha de configuracoes_protecao da usuária, criando se não existir.

    INSERT OR IGNORE: tenta inserir; se a linha já existir (mesmo usuario_id),
    o SQLite simplesmente ignora. Assim toda usuária sempre tem uma linha,
    com os valores padrão do schema.sql.
    """
    conexao = get_db()
    conexao.execute("INSERT OR IGNORE INTO configuracoes_protecao (usuario_id) VALUES (?)", (usuario_id,))
    conexao.commit()
    return conexao.execute(
        "SELECT * FROM configuracoes_protecao WHERE usuario_id = ?", (usuario_id,)
    ).fetchone()


def tem_consentimento(usuario_id):
    return obter_configuracoes(usuario_id)["consentimento_contatos"] == 1


def registrar_consentimento(usuario_id):
    obter_configuracoes(usuario_id)
    conexao = get_db()
    conexao.execute(
        "UPDATE configuracoes_protecao SET consentimento_contatos = 1, consentimento_em = CURRENT_TIMESTAMP "
        "WHERE usuario_id = ?",
        (usuario_id,),
    )
    conexao.commit()


def contato_para_dict(linha):
    return {
        "id": linha["id"],
        "nome": linha["nome"],
        "telefone": linha["telefone"],
        "relacao": linha["relacao"],
    }


def listar_contatos(usuario_id):
    linhas = get_db().execute(
        "SELECT * FROM contatos_confianca WHERE usuario_id = ? ORDER BY nome", (usuario_id,)
    ).fetchall()
    contatos = []
    for linha in linhas:
        contatos.append(contato_para_dict(linha))
    return contatos


def buscar_contato(usuario_id, contato_id):
    return get_db().execute(
        "SELECT * FROM contatos_confianca WHERE id = ? AND usuario_id = ?", (contato_id, usuario_id)
    ).fetchone()


def contar_digitos(telefone):
    """Quantos números tem o telefone, ignorando espaços, parênteses e traços."""
    quantidade = 0
    for caractere in telefone:
        if caractere.isdigit():
            quantidade = quantidade + 1
    return quantidade


def validar_contato(dados):
    """Devolve (erro, None) ou (None, dados_limpos)."""
    nome = texto(dados.get("nome"))
    telefone = texto(dados.get("telefone"))
    relacao = texto(dados.get("relacao"))

    if not nome:
        return "Informe o nome do contato.", None
    if contar_digitos(telefone) < MINIMO_DIGITOS_TELEFONE:
        return "Informe um telefone válido.", None

    return None, {"nome": nome, "telefone": telefone, "relacao": relacao}


def criar_contato(usuario_id, dados):
    conexao = get_db()
    cursor = conexao.execute(
        "INSERT INTO contatos_confianca (usuario_id, nome, telefone, relacao) VALUES (?, ?, ?, ?)",
        (usuario_id, dados["nome"], dados["telefone"], dados["relacao"]),
    )
    conexao.commit()
    return cursor.lastrowid


def atualizar_contato(usuario_id, contato_id, dados):
    conexao = get_db()
    conexao.execute(
        "UPDATE contatos_confianca SET nome = ?, telefone = ?, relacao = ? WHERE id = ? AND usuario_id = ?",
        (dados["nome"], dados["telefone"], dados["relacao"], contato_id, usuario_id),
    )
    conexao.commit()


def excluir_contato(usuario_id, contato_id):
    conexao = get_db()
    conexao.execute(
        "DELETE FROM contatos_confianca WHERE id = ? AND usuario_id = ?", (contato_id, usuario_id)
    )
    conexao.commit()
