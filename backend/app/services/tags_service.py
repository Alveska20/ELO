"""
Regras de negócio das Tags (atalhos físicos tipo NFC, simulados).

Como a leitura funciona:
    Tag identificada (pelo código) -> sistema busca a configuração dela
    -> devolve o "destino" (a página) -> o frontend redireciona para lá.

Sem hardware, a "leitura" é simulada: o frontend envia o código da Tag
para POST /api/tags/scan, como se o celular tivesse lido o chip.

As Tags NUNCA usam gênero para identificar ninguém. A única regra ligada
ao perfil é a mesma da Proteção E.L.O.: as funções de proteção e
emergência só existem para quem tem perfil_acesso = 'mulher'. Quem não é
perfil mulher também não pode CRIAR nem EDITAR uma
Tag com essas funções (a rota responde 403), e o formulário escuro nem
mostra essas opções.
"""
from app.database.db import get_db
from app.services.comodos_service import comodo_pertence_ao_usuario
from app.utils.requisicao import para_inteiro, para_sim_nao, texto

FUNCOES = ("abrir_dashboard", "abrir_comodo", "abrir_protecao", "abrir_emergencia")

# Funções que levam para áreas exclusivas do perfil mulher.
FUNCOES_SO_PERFIL_MULHER = ("abrir_protecao", "abrir_emergencia")

# Página aberta por cada função. "abrir_comodo" é montada na hora,
# porque depende do id do cômodo (ver calcular_destino).
DESTINOS = {
    "abrir_dashboard": "/pages/dashboard.html",
    "abrir_protecao": "/pages/protecao.html",
    "abrir_emergencia": "/pages/protecao-ajuda.html",
}

SQL_TAGS = """
    SELECT t.*, c.nome AS comodo_nome
    FROM tags t
    LEFT JOIN comodos c ON c.id = t.comodo_id
    WHERE t.usuario_id = ?
"""


def tag_para_dict(linha):
    return {
        "id": linha["id"],
        "nome": linha["nome"],
        "codigo": linha["codigo"],
        "funcao": linha["funcao"],
        "comodo_id": linha["comodo_id"],
        "comodo_nome": linha["comodo_nome"],
        "ativo": bool(linha["ativo"]),
    }


def listar_tags(usuario_id):
    linhas = get_db().execute(SQL_TAGS + " ORDER BY t.nome", (usuario_id,)).fetchall()
    tags = []
    for linha in linhas:
        tags.append(tag_para_dict(linha))
    return tags


def buscar_tag(usuario_id, tag_id):
    return get_db().execute(SQL_TAGS + " AND t.id = ?", (usuario_id, tag_id)).fetchone()


def buscar_tag_por_codigo(usuario_id, codigo):
    return get_db().execute(SQL_TAGS + " AND t.codigo = ?", (usuario_id, codigo)).fetchone()


def normalizar_codigo(codigo):
    """Códigos sempre em maiúsculas e sem espaços nas pontas ("sala " = "SALA")."""
    return texto(codigo).upper()


# ---------------------------------------------------------------------
# Validação e gravação
# ---------------------------------------------------------------------

def validar_tag(usuario_id, dados, tag_id=None):
    """Confere o formulário. Devolve (erro, None) ou (None, dados_limpos).
    tag_id: id da Tag sendo editada (para não acusar o próprio código como repetido)."""
    nome = texto(dados.get("nome"))
    codigo = normalizar_codigo(dados.get("codigo"))
    funcao = texto(dados.get("funcao"))

    if not nome:
        return "Informe o nome da Tag.", None
    if not codigo:
        return "Informe o código da Tag.", None
    if funcao not in FUNCOES:
        return "Função da Tag inválida.", None

    # O cômodo só é usado (e obrigatório) na função "abrir_comodo".
    comodo_id = None
    if funcao == "abrir_comodo":
        comodo_id = para_inteiro(dados.get("comodo_id"))
        if comodo_id is None or not comodo_pertence_ao_usuario(usuario_id, comodo_id):
            return "Escolha o cômodo que a Tag deve abrir.", None

    existente = buscar_tag_por_codigo(usuario_id, codigo)
    if existente is not None and existente["id"] != tag_id:
        return "Você já tem uma Tag com esse código.", None

    limpos = {
        "nome": nome,
        "codigo": codigo,
        "funcao": funcao,
        "comodo_id": comodo_id,
        "ativo": para_sim_nao(dados.get("ativo", True)),
    }
    return None, limpos


def criar_tag(usuario_id, dados):
    conexao = get_db()
    cursor = conexao.execute(
        "INSERT INTO tags (usuario_id, nome, codigo, funcao, comodo_id, ativo) VALUES (?, ?, ?, ?, ?, ?)",
        (usuario_id, dados["nome"], dados["codigo"], dados["funcao"], dados["comodo_id"], dados["ativo"]),
    )
    conexao.commit()
    return cursor.lastrowid


def atualizar_tag(usuario_id, tag_id, dados):
    conexao = get_db()
    conexao.execute(
        "UPDATE tags SET nome = ?, codigo = ?, funcao = ?, comodo_id = ?, ativo = ? "
        "WHERE id = ? AND usuario_id = ?",
        (dados["nome"], dados["codigo"], dados["funcao"], dados["comodo_id"], dados["ativo"],
         tag_id, usuario_id),
    )
    conexao.commit()


def excluir_tag(usuario_id, tag_id):
    conexao = get_db()
    conexao.execute("DELETE FROM tags WHERE id = ? AND usuario_id = ?", (tag_id, usuario_id))
    conexao.commit()


# ---------------------------------------------------------------------
# Simulação de leitura
# ---------------------------------------------------------------------

def calcular_destino(tag):
    """Devolve a página que a Tag abre, ou None se a Tag estiver sem cômodo."""
    if tag["funcao"] == "abrir_comodo":
        if tag["comodo_id"] is None:
            # Acontece se o cômodo da Tag foi apagado depois.
            return None
        return f"/pages/comodo.html?id={tag['comodo_id']}"
    return DESTINOS[tag["funcao"]]


def funcao_permitida(funcao, usuario):
    """As funções de proteção e emergência só valem para o perfil mulher.
    Usada ao criar, editar e ler (simular) uma Tag."""
    if funcao in FUNCOES_SO_PERFIL_MULHER:
        return usuario["perfil_acesso"] == "mulher"
    return True


def usuario_pode_usar(tag, usuario):
    """Tags de proteção/emergência só funcionam para o perfil mulher."""
    return funcao_permitida(tag["funcao"], usuario)
