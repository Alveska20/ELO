"""
Regras de negócio das automações (ex.: Modo Noite).

Uma automação é uma lista de ações do tipo "este dispositivo deve ficar
neste estado". Executar a automação aplica todas as ações no banco.

Sobre o gatilho "horario": nesta versão ele só fica registrado. A
automação roda apenas pelo botão "Executar (simulação)". Rodar sozinha
no horário exigiria um agendador sempre ligado, o que foge da base simples.
"""
from app.database.db import get_db
from app.services.dispositivos_service import ESTADOS_POR_TIPO, TEMPERATURA_MAXIMA, TEMPERATURA_MINIMA, buscar_dispositivo
from app.services.portas_service import avisos_de_seguranca
from app.utils.requisicao import para_inteiro, para_sim_nao, texto

GATILHOS = ("manual", "horario")


# ---------------------------------------------------------------------
# Leitura
# ---------------------------------------------------------------------

def listar_acoes(automacao_id):
    """Ações de uma automação, já com o nome e o tipo de cada dispositivo."""
    linhas = get_db().execute(
        "SELECT ad.dispositivo_id, ad.novo_estado, ad.temperatura, d.nome, d.tipo "
        "FROM automacao_dispositivos ad "
        "JOIN dispositivos d ON d.id = ad.dispositivo_id "
        "WHERE ad.automacao_id = ? ORDER BY d.nome",
        (automacao_id,),
    ).fetchall()

    acoes = []
    for linha in linhas:
        acoes.append({
            "dispositivo_id": linha["dispositivo_id"],
            "dispositivo_nome": linha["nome"],
            "dispositivo_tipo": linha["tipo"],
            "novo_estado": linha["novo_estado"],
            "temperatura": linha["temperatura"],
        })
    return acoes


def automacao_para_dict(linha):
    return {
        "id": linha["id"],
        "nome": linha["nome"],
        "descricao": linha["descricao"],
        "gatilho": linha["gatilho"],
        "horario": linha["horario"],
        "verificar_portas": bool(linha["verificar_portas"]),
        "ativo": bool(linha["ativo"]),
        "acoes": listar_acoes(linha["id"]),
    }


def listar_automacoes(usuario_id):
    linhas = get_db().execute(
        "SELECT * FROM automacoes WHERE usuario_id = ? ORDER BY nome", (usuario_id,)
    ).fetchall()

    automacoes = []
    for linha in linhas:
        automacoes.append(automacao_para_dict(linha))
    return automacoes


def buscar_automacao(usuario_id, automacao_id):
    """Devolve a linha, ou None se não existir / for de outro usuário."""
    return get_db().execute(
        "SELECT * FROM automacoes WHERE id = ? AND usuario_id = ?", (automacao_id, usuario_id)
    ).fetchone()


# ---------------------------------------------------------------------
# Validação
# ---------------------------------------------------------------------

def horario_valido(horario):
    """Confere o formato "HH:MM" (ex.: "22:00")."""
    partes = horario.split(":")
    if len(partes) != 2 or len(partes[0]) != 2 or len(partes[1]) != 2:
        return False
    horas = para_inteiro(partes[0])
    minutos = para_inteiro(partes[1])
    if horas is None or minutos is None:
        return False
    return 0 <= horas <= 23 and 0 <= minutos <= 59


def validar_acao(usuario_id, acao):
    """Confere uma ação. Devolve (erro, None) ou (None, acao_limpa)."""
    if not isinstance(acao, dict):
        return "Ação inválida.", None

    dispositivo_id = para_inteiro(acao.get("dispositivo_id"))
    dispositivo = None
    if dispositivo_id is not None:
        dispositivo = buscar_dispositivo(usuario_id, dispositivo_id)
    if dispositivo is None:
        return "Dispositivo da ação não encontrado.", None

    # O novo estado precisa combinar com o tipo (luz não fica "aberta").
    novo_estado = texto(acao.get("novo_estado"))
    if novo_estado not in ESTADOS_POR_TIPO[dispositivo["tipo"]]:
        return f"Estado inválido para {dispositivo['nome']}.", None

    # Temperatura: só para ar-condicionado sendo ligado (opcional).
    temperatura = None
    if dispositivo["tipo"] == "ar_condicionado" and novo_estado == "ligado":
        temperatura = para_inteiro(acao.get("temperatura"))
        if temperatura is not None:
            if temperatura < TEMPERATURA_MINIMA or temperatura > TEMPERATURA_MAXIMA:
                return (
                    f"A temperatura precisa estar entre {TEMPERATURA_MINIMA} e {TEMPERATURA_MAXIMA} °C.",
                    None,
                )

    return None, {"dispositivo_id": dispositivo_id, "novo_estado": novo_estado, "temperatura": temperatura}


def validar_acoes(usuario_id, acoes_recebidas):
    """Confere a lista de ações. Devolve (erro, None) ou (None, acoes_limpas)."""
    if not isinstance(acoes_recebidas, list):
        acoes_recebidas = []
    acoes = []
    for acao in acoes_recebidas:
        mensagem_erro, acao_limpa = validar_acao(usuario_id, acao)
        if mensagem_erro is not None:
            return mensagem_erro, None
        acoes.append(acao_limpa)
    return None, acoes


def validar_automacao(usuario_id, dados):
    """Confere o formulário. Devolve (erro, None) ou (None, dados_limpos)."""
    nome = texto(dados.get("nome"))
    gatilho = texto(dados.get("gatilho")) or "manual"
    horario = texto(dados.get("horario"))

    if not nome:
        return "Informe o nome da automação.", None
    if gatilho not in GATILHOS:
        return "Gatilho inválido. Use 'manual' ou 'horario'.", None
    if gatilho == "horario" and not horario_valido(horario):
        return "Informe o horário no formato HH:MM (ex.: 22:00).", None
    if gatilho == "manual":
        horario = None

    mensagem_erro, acoes = validar_acoes(usuario_id, dados.get("acoes"))
    if mensagem_erro is not None:
        return mensagem_erro, None

    verificar_portas = para_sim_nao(dados.get("verificar_portas"))
    if len(acoes) == 0 and verificar_portas == 0:
        return "Escolha pelo menos um dispositivo ou marque 'verificar portas e janelas'.", None

    limpos = {
        "nome": nome,
        "descricao": texto(dados.get("descricao")),
        "gatilho": gatilho,
        "horario": horario,
        "verificar_portas": verificar_portas,
        "ativo": para_sim_nao(dados.get("ativo", True)),
        "acoes": acoes,
    }
    return None, limpos


# ---------------------------------------------------------------------
# Gravação
# ---------------------------------------------------------------------

def salvar_acoes(conexao, automacao_id, acoes):
    """Troca as ações da automação: apaga as antigas e grava as novas.
    É mais simples do que descobrir qual ação mudou, qual saiu e qual entrou."""
    conexao.execute("DELETE FROM automacao_dispositivos WHERE automacao_id = ?", (automacao_id,))
    for acao in acoes:
        conexao.execute(
            "INSERT INTO automacao_dispositivos (automacao_id, dispositivo_id, novo_estado, temperatura) "
            "VALUES (?, ?, ?, ?)",
            (automacao_id, acao["dispositivo_id"], acao["novo_estado"], acao["temperatura"]),
        )


def criar_automacao(usuario_id, dados):
    conexao = get_db()
    cursor = conexao.execute(
        "INSERT INTO automacoes (usuario_id, nome, descricao, gatilho, horario, verificar_portas, ativo) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (usuario_id, dados["nome"], dados["descricao"], dados["gatilho"], dados["horario"],
         dados["verificar_portas"], dados["ativo"]),
    )
    automacao_id = cursor.lastrowid
    salvar_acoes(conexao, automacao_id, dados["acoes"])
    # Um único commit no fim: a automação e as ações são gravadas juntas.
    conexao.commit()
    return automacao_id


def atualizar_automacao(usuario_id, automacao_id, dados):
    conexao = get_db()
    conexao.execute(
        "UPDATE automacoes SET nome = ?, descricao = ?, gatilho = ?, horario = ?, "
        "verificar_portas = ?, ativo = ? WHERE id = ? AND usuario_id = ?",
        (dados["nome"], dados["descricao"], dados["gatilho"], dados["horario"],
         dados["verificar_portas"], dados["ativo"], automacao_id, usuario_id),
    )
    salvar_acoes(conexao, automacao_id, dados["acoes"])
    conexao.commit()


def excluir_automacao(usuario_id, automacao_id):
    conexao = get_db()
    conexao.execute(
        "DELETE FROM automacoes WHERE id = ? AND usuario_id = ?", (automacao_id, usuario_id)
    )
    conexao.commit()


# ---------------------------------------------------------------------
# Execução (simulação)
# ---------------------------------------------------------------------

def aplicar_acao(conexao, usuario_id, acao):
    """Muda o estado (e a temperatura, se houver) de UM dispositivo simulado.
    Devolve o texto da alteração, ex.: "Luz da sala: desligado"."""
    if acao["temperatura"] is not None:
        conexao.execute(
            "UPDATE dispositivos SET estado = ?, temperatura = ? WHERE id = ? AND usuario_id = ?",
            (acao["novo_estado"], acao["temperatura"], acao["dispositivo_id"], usuario_id),
        )
        return f"{acao['dispositivo_nome']}: {acao['novo_estado']} ({acao['temperatura']} °C)"
    conexao.execute(
        "UPDATE dispositivos SET estado = ? WHERE id = ? AND usuario_id = ?",
        (acao["novo_estado"], acao["dispositivo_id"], usuario_id),
    )
    return f"{acao['dispositivo_nome']}: {acao['novo_estado']}"


def avisos_de_portas_e_janelas(usuario_id):
    """Avisos da opção "verificar portas e janelas" (só informa: o sistema não tranca nada)."""
    avisos = avisos_de_seguranca(usuario_id)
    if len(avisos) == 0:
        avisos.append("Portas e janelas: tudo fechado e trancado.")
    return avisos


def executar_automacao(usuario_id, automacao_id):
    """Aplica cada ação nos dispositivos simulados e devolve um relatório.

    Exemplo de retorno:
    {
      "mensagem": "[SIMULAÇÃO] Automação 'Modo Noite' executada.",
      "alteracoes": ["Luz da sala: desligado", ...],
      "avisos": ["Janela do banheiro está aberta."]
    }
    """
    automacao = buscar_automacao(usuario_id, automacao_id)
    conexao = get_db()

    alteracoes = []
    for acao in listar_acoes(automacao_id):
        alteracoes.append(aplicar_acao(conexao, usuario_id, acao))
    conexao.commit()

    avisos = []
    if automacao["verificar_portas"]:
        avisos = avisos_de_portas_e_janelas(usuario_id)

    return {
        "mensagem": f"[SIMULAÇÃO] Automação '{automacao['nome']}' executada.",
        "alteracoes": alteracoes,
        "avisos": avisos,
    }
