"""
Regras de negócio dos dispositivos simulados.

Nenhum aparelho de verdade é controlado. "Desligar a luz" significa:
o frontend chama a API, a API troca o campo "estado" no banco, e a tela
mostra o novo estado. É isso que torna o projeto testável sem hardware.
"""
from app.database.db import get_db
from app.services.comodos_service import comodo_pertence_ao_usuario
from app.utils.requisicao import para_inteiro, texto

# Para cada tipo: (estado "ativo", estado "inativo").
# Alternar o dispositivo troca de um para o outro.
# Luz, ar, TV etc. ligam/desligam; cortina, persiana e janela abrem/fecham.
ESTADOS_POR_TIPO = {
    "luz": ("ligado", "desligado"),
    "ar_condicionado": ("ligado", "desligado"),
    "tv": ("ligado", "desligado"),
    "tomada": ("ligado", "desligado"),
    "cortina": ("aberta", "fechada"),
    "persiana": ("aberta", "fechada"),
    "janela": ("aberta", "fechada"),
    "sensor": ("ligado", "desligado"),
    "camera": ("ligado", "desligado"),
}

TEMPERATURA_MINIMA = 16
TEMPERATURA_MAXIMA = 30
TEMPERATURA_PADRAO = 23

# LEFT JOIN para trazer também o nome do cômodo (ou NULL se estiver sem cômodo).
SQL_DISPOSITIVOS = """
    SELECT d.*, c.nome AS comodo_nome
    FROM dispositivos d
    LEFT JOIN comodos c ON c.id = d.comodo_id
    WHERE d.usuario_id = ?
"""


def esta_ativo(tipo, estado):
    """Um dispositivo está "ativo" quando está no primeiro estado do tipo
    (ligado, ou aberto no caso de cortina/persiana/janela)."""
    return estado == ESTADOS_POR_TIPO[tipo][0]


def dispositivo_para_dict(linha):
    return {
        "id": linha["id"],
        "nome": linha["nome"],
        "tipo": linha["tipo"],
        "estado": linha["estado"],
        "ativo": esta_ativo(linha["tipo"], linha["estado"]),
        "temperatura": linha["temperatura"],
        "comodo_id": linha["comodo_id"],
        "comodo_nome": linha["comodo_nome"],
    }


def listar_dispositivos(usuario_id, comodo_id=None, tipo=None):
    """Lista os dispositivos do usuário. Os filtros são opcionais:
    comodo_id (página do cômodo) e tipo (página de Câmeras usa tipo="camera")."""
    sql = SQL_DISPOSITIVOS
    parametros = [usuario_id]

    if comodo_id is not None:
        sql = sql + " AND d.comodo_id = ?"
        parametros.append(comodo_id)
    if tipo is not None:
        sql = sql + " AND d.tipo = ?"
        parametros.append(tipo)

    sql = sql + " ORDER BY c.nome, d.nome"
    linhas = get_db().execute(sql, parametros).fetchall()

    dispositivos = []
    for linha in linhas:
        dispositivos.append(dispositivo_para_dict(linha))
    return dispositivos


def buscar_dispositivo(usuario_id, dispositivo_id):
    """Devolve a linha, ou None se não existir / for de outro usuário."""
    return get_db().execute(
        SQL_DISPOSITIVOS + " AND d.id = ?", (usuario_id, dispositivo_id)
    ).fetchone()


def validar_dispositivo(usuario_id, dados):
    """Confere os dados do formulário.

    Devolve (mensagem_de_erro, None) se algo estiver errado,
    ou (None, dados_limpos) se estiver tudo certo.
    """
    nome = texto(dados.get("nome"))
    tipo = texto(dados.get("tipo"))

    if not nome:
        return "Informe o nome do dispositivo.", None
    if tipo not in ESTADOS_POR_TIPO:
        return "Tipo de dispositivo inválido.", None

    # Cômodo é opcional; se vier, precisa ser um cômodo do próprio usuário.
    comodo_id = None
    if dados.get("comodo_id") not in (None, ""):
        comodo_id = para_inteiro(dados.get("comodo_id"))
        if comodo_id is None or not comodo_pertence_ao_usuario(usuario_id, comodo_id):
            return "Cômodo não encontrado.", None

    # Temperatura só existe para o ar-condicionado.
    temperatura = None
    if tipo == "ar_condicionado":
        temperatura = para_inteiro(dados.get("temperatura"))
        if temperatura is None:
            temperatura = TEMPERATURA_PADRAO
        if temperatura < TEMPERATURA_MINIMA or temperatura > TEMPERATURA_MAXIMA:
            return (
                f"A temperatura precisa estar entre {TEMPERATURA_MINIMA} e {TEMPERATURA_MAXIMA} °C.",
                None,
            )

    limpos = {"nome": nome, "tipo": tipo, "comodo_id": comodo_id, "temperatura": temperatura}
    return None, limpos


def criar_dispositivo(usuario_id, dados):
    """Todo dispositivo novo começa no estado inativo (desligado ou fechado)."""
    estado_inicial = ESTADOS_POR_TIPO[dados["tipo"]][1]
    conexao = get_db()
    cursor = conexao.execute(
        "INSERT INTO dispositivos (usuario_id, comodo_id, nome, tipo, estado, temperatura) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (usuario_id, dados["comodo_id"], dados["nome"], dados["tipo"], estado_inicial, dados["temperatura"]),
    )
    conexao.commit()
    return cursor.lastrowid


def atualizar_dispositivo(usuario_id, dispositivo_atual, dados):
    """Salva a edição. Se o tipo mudou (ex.: de luz para cortina), o estado
    antigo pode não valer mais, então ele volta para o inativo do novo tipo."""
    estado = dispositivo_atual["estado"]
    if dados["tipo"] != dispositivo_atual["tipo"]:
        estado = ESTADOS_POR_TIPO[dados["tipo"]][1]

    conexao = get_db()
    conexao.execute(
        "UPDATE dispositivos SET nome = ?, tipo = ?, comodo_id = ?, estado = ?, temperatura = ? "
        "WHERE id = ? AND usuario_id = ?",
        (dados["nome"], dados["tipo"], dados["comodo_id"], estado, dados["temperatura"],
         dispositivo_atual["id"], usuario_id),
    )
    conexao.commit()


def alternar_estado(usuario_id, dispositivo_atual):
    """Liga/desliga ou abre/fecha: troca para o outro estado do tipo."""
    estado_ativo, estado_inativo = ESTADOS_POR_TIPO[dispositivo_atual["tipo"]]
    if dispositivo_atual["estado"] == estado_ativo:
        novo_estado = estado_inativo
    else:
        novo_estado = estado_ativo

    conexao = get_db()
    conexao.execute(
        "UPDATE dispositivos SET estado = ? WHERE id = ? AND usuario_id = ?",
        (novo_estado, dispositivo_atual["id"], usuario_id),
    )
    conexao.commit()


def excluir_dispositivo(usuario_id, dispositivo_id):
    """Apaga o dispositivo. Ele sai também das automações que o usavam
    (ON DELETE CASCADE em automacao_dispositivos)."""
    conexao = get_db()
    conexao.execute(
        "DELETE FROM dispositivos WHERE id = ? AND usuario_id = ?", (dispositivo_id, usuario_id)
    )
    conexao.commit()
