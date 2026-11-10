"""
Cria o banco do zero e coloca dados de demonstração.

Como rodar (dentro da pasta backend/, com o venv ativado):
    python -m app.database.seed

ATENÇÃO: o schema.sql apaga as tabelas antes de criar. Rodar o seed de
novo APAGA tudo o que foi cadastrado e volta para os dados de demonstração.

Senhas: o admin usa ADMIN_EMAIL/ADMIN_SENHA e os usuários de
demonstração usam DEMO_SENHA, todos lidos do .env. Nenhuma senha fica
escrita no código.
"""
import json
import os

from werkzeug.security import generate_password_hash

from app import create_app
from app.database.db import criar_tabelas, get_db

CAMINHO_QUIZ = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "content", "quiz.json"
)

# Texto que marca um campo do quiz ainda não preenchido pela equipe.
MARCADOR_VAZIO = "[ADICIONAR AQUI]"

# Usuários de demonstração (e-mails fictícios). Um de cada perfil de acesso,
# para dar para testar as três experiências.
USUARIOS_DEMO = [
    ("Maria Demo", "maria@elo.exemplo", "mulher"),
    ("João Demo", "joao@elo.exemplo", "homem"),
    ("Alex Demo", "alex@elo.exemplo", "nao_definido"),
]

COMODOS_DEMO = ["Sala", "Quarto", "Cozinha", "Banheiro", "Entrada", "Garagem", "Quintal"]

# (nome, tipo, cômodo, estado, temperatura)
# A Câmera do Quintal começa desligada para o Dashboard mostrar "3/4 câmeras",
# como no Figma (02-usuario/01-casa-inicio-lofi.png).
DISPOSITIVOS_DEMO = [
    ("Luz da sala", "luz", "Sala", "ligado", None),
    ("Luz do quarto", "luz", "Quarto", "desligado", None),
    ("Luz da entrada", "luz", "Entrada", "desligado", None),
    ("Luz da cozinha", "luz", "Cozinha", "desligado", None),
    ("Ar-condicionado do quarto", "ar_condicionado", "Quarto", "desligado", 23),
    ("TV da sala", "tv", "Sala", "desligado", None),
    ("Tomada da cozinha", "tomada", "Cozinha", "ligado", None),
    ("Cortina da sala", "cortina", "Sala", "aberta", None),
    ("Persiana do quarto", "persiana", "Quarto", "aberta", None),
    ("Janela da cozinha", "janela", "Cozinha", "fechada", None),
    ("Janela do banheiro", "janela", "Banheiro", "aberta", None),
    ("Sensor de movimento da entrada", "sensor", "Entrada", "ligado", None),
    ("Câmera da Entrada", "camera", "Entrada", "ligado", None),
    ("Câmera da Garagem", "camera", "Garagem", "ligado", None),
    ("Câmera do Quintal", "camera", "Quintal", "desligado", None),
    ("Câmera da Sala", "camera", "Sala", "ligado", None),
]

# (nome, cômodo, aberta, trancada)
PORTAS_DEMO = [
    ("Porta principal", "Entrada", 0, 1),
    ("Porta da cozinha", "Cozinha", 0, 0),
    ("Portão da garagem", "Garagem", 0, 1),
]


# ---------------------------------------------------------------------
# Usuários
# ---------------------------------------------------------------------

def criar_usuario(conexao, nome, email, senha, papel, perfil_acesso):
    """Insere um usuário e devolve o id criado. A senha vira hash antes de salvar."""
    cursor = conexao.execute(
        "INSERT INTO usuarios (nome, email, senha_hash, papel, perfil_acesso) "
        "VALUES (?, ?, ?, ?, ?)",
        (nome, email, generate_password_hash(senha), papel, perfil_acesso),
    )
    # lastrowid = id que o banco acabou de gerar para essa linha.
    return cursor.lastrowid


# ---------------------------------------------------------------------
# Casa inteligente
# ---------------------------------------------------------------------

def criar_comodos(conexao, usuario_id):
    """Cria os cômodos e devolve um dict {"Sala": id, "Quarto": id, ...}."""
    ids_comodos = {}
    for nome in COMODOS_DEMO:
        cursor = conexao.execute(
            "INSERT INTO comodos (usuario_id, nome) VALUES (?, ?)", (usuario_id, nome)
        )
        ids_comodos[nome] = cursor.lastrowid
    return ids_comodos


def criar_dispositivos(conexao, usuario_id, ids_comodos):
    """Cria os dispositivos e devolve um dict {"Luz da sala": id, ...}."""
    ids_dispositivos = {}
    for nome, tipo, comodo, estado, temperatura in DISPOSITIVOS_DEMO:
        cursor = conexao.execute(
            "INSERT INTO dispositivos (usuario_id, comodo_id, nome, tipo, estado, temperatura) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (usuario_id, ids_comodos[comodo], nome, tipo, estado, temperatura),
        )
        ids_dispositivos[nome] = cursor.lastrowid
    return ids_dispositivos


def criar_portas(conexao, usuario_id, ids_comodos):
    for nome, comodo, aberta, trancada in PORTAS_DEMO:
        conexao.execute(
            "INSERT INTO portas (usuario_id, comodo_id, nome, aberta, trancada) "
            "VALUES (?, ?, ?, ?, ?)",
            (usuario_id, ids_comodos[comodo], nome, aberta, trancada),
        )


def criar_modo_noite(conexao, usuario_id, ids_dispositivos):
    """Automação de exemplo dos requisitos do projeto: apagar luzes, fechar cortinas,
    ajustar o ar e verificar portas e janelas."""
    cursor = conexao.execute(
        "INSERT INTO automacoes (usuario_id, nome, descricao, gatilho, horario, verificar_portas) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (
            usuario_id,
            "Modo Noite",
            "Apaga as luzes, fecha cortina e persiana, ajusta o ar e verifica portas e janelas.",
            "horario",
            "22:00",
            1,
        ),
    )
    automacao_id = cursor.lastrowid

    # (dispositivo, novo estado, temperatura)
    acoes = [
        ("Luz da sala", "desligado", None),
        ("Luz do quarto", "desligado", None),
        ("Luz da entrada", "desligado", None),
        ("Luz da cozinha", "desligado", None),
        ("Cortina da sala", "fechada", None),
        ("Persiana do quarto", "fechada", None),
        ("Ar-condicionado do quarto", "ligado", 22),
    ]
    for nome_dispositivo, novo_estado, temperatura in acoes:
        conexao.execute(
            "INSERT INTO automacao_dispositivos (automacao_id, dispositivo_id, novo_estado, temperatura) "
            "VALUES (?, ?, ?, ?)",
            (automacao_id, ids_dispositivos[nome_dispositivo], novo_estado, temperatura),
        )


def criar_tags(conexao, usuario_id, ids_comodos, perfil_acesso):
    """Tags de exemplo dos requisitos do projeto. Todos recebem a Tag "Sala". As
    Tags "Proteção" e "Emergência" só são criadas para o perfil mulher
    (a Maria), porque só ela pode usar essas funções."""
    tags = [("Sala", "SALA", "abrir_comodo", ids_comodos["Sala"])]
    if perfil_acesso == "mulher":
        tags.append(("Proteção", "PROTECAO", "abrir_protecao", None))
        tags.append(("Emergência", "EMERGENCIA", "abrir_emergencia", None))
    for nome, codigo, funcao, comodo_id in tags:
        conexao.execute(
            "INSERT INTO tags (usuario_id, nome, codigo, funcao, comodo_id) VALUES (?, ?, ?, ?, ?)",
            (usuario_id, nome, codigo, funcao, comodo_id),
        )


def criar_casa_demo(conexao, usuario_id, perfil_acesso):
    """Monta uma casa completa de demonstração para um usuário."""
    ids_comodos = criar_comodos(conexao, usuario_id)
    ids_dispositivos = criar_dispositivos(conexao, usuario_id, ids_comodos)
    criar_portas(conexao, usuario_id, ids_comodos)
    criar_modo_noite(conexao, usuario_id, ids_dispositivos)
    criar_tags(conexao, usuario_id, ids_comodos, perfil_acesso)


# ---------------------------------------------------------------------
# Proteção E.L.O.
# ---------------------------------------------------------------------

def criar_protecao_demo(conexao, usuario_id):
    """Contatos fictícios e configurações de emergência da usuária demo.
    O consentimento já vem aceito para os contatos poderem aparecer."""
    conexao.execute(
        "INSERT INTO configuracoes_protecao "
        "(usuario_id, consentimento_contatos, consentimento_em, "
        " acao_alertar_contatos, acao_compartilhar_localizacao) "
        "VALUES (?, 1, CURRENT_TIMESTAMP, 1, 1)",
        (usuario_id,),
    )
    contatos = [
        ("Contato fictício 1", "(11) 90000-0001", "Amiga"),
        ("Contato fictício 2", "(11) 90000-0002", "Irmã"),
    ]
    for nome, telefone, relacao in contatos:
        conexao.execute(
            "INSERT INTO contatos_confianca (usuario_id, nome, telefone, relacao) VALUES (?, ?, ?, ?)",
            (usuario_id, nome, telefone, relacao),
        )


# ---------------------------------------------------------------------
# Quiz
# ---------------------------------------------------------------------

def pergunta_esta_completa(pergunta):
    """Uma pergunta só pode ser ativada se nenhum campo tiver o marcador
    [ADICIONAR AQUI] e se a resposta for uma das letras das alternativas."""
    if MARCADOR_VAZIO in pergunta["texto"] or MARCADOR_VAZIO in pergunta["explicacao"]:
        return False
    for texto_alternativa in pergunta["alternativas"].values():
        if MARCADOR_VAZIO in texto_alternativa:
            return False
    return pergunta["resposta"] in pergunta["alternativas"]


def carregar_quiz(conexao):
    """Lê content/quiz.json e grava perguntas e alternativas no banco."""
    with open(CAMINHO_QUIZ, encoding="utf-8") as arquivo:
        # json.load transforma o texto do arquivo em dicts e listas do Python.
        dados = json.load(arquivo)

    for pergunta in dados["perguntas"]:
        # Proteção contra erro de edição: uma pergunta ativa precisa estar
        # completa, senão o quiz mostraria "[ADICIONAR AQUI]" para a usuária.
        if pergunta["ativo"] and not pergunta_esta_completa(pergunta):
            raise ValueError(
                f"Pergunta {pergunta['ordem']} do quiz está ativa, mas incompleta. "
                f"Preencha todos os campos e coloque em 'resposta' uma letra válida."
            )

        cursor = conexao.execute(
            "INSERT INTO quiz_perguntas (ordem, texto, explicacao, ativo) VALUES (?, ?, ?, ?)",
            (pergunta["ordem"], pergunta["texto"], pergunta["explicacao"], int(pergunta["ativo"])),
        )
        pergunta_id = cursor.lastrowid

        # .items() devolve os pares (letra, texto): ("A", "..."), ("B", "...")...
        for letra, texto in pergunta["alternativas"].items():
            correta = 1 if letra == pergunta["resposta"] else 0
            conexao.execute(
                "INSERT INTO quiz_alternativas (pergunta_id, letra, texto, correta) VALUES (?, ?, ?, ?)",
                (pergunta_id, letra, texto, correta),
            )


# ---------------------------------------------------------------------
# Execução
# ---------------------------------------------------------------------

def popular_banco(conexao, admin_email, admin_senha, demo_senha):
    """Grava todos os dados de demonstração. Os testes também usam esta função."""
    criar_usuario(conexao, "Administrador E.L.O.", admin_email, admin_senha, "admin", "nao_definido")

    for nome, email, perfil_acesso in USUARIOS_DEMO:
        usuario_id = criar_usuario(conexao, nome, email, demo_senha, "usuario", perfil_acesso)
        criar_casa_demo(conexao, usuario_id, perfil_acesso)
        if perfil_acesso == "mulher":
            criar_protecao_demo(conexao, usuario_id)

    carregar_quiz(conexao)
    # commit grava de verdade no arquivo. Sem ele, nada fica salvo.
    conexao.commit()


def verificar_configuracoes(config):
    """Para o seed com uma mensagem clara se faltar algo no .env."""
    faltando = []
    for chave in ["ADMIN_EMAIL", "ADMIN_SENHA", "DEMO_SENHA"]:
        if not config.get(chave):
            faltando.append(chave)
    if faltando:
        raise SystemExit(
            "Faltam no .env: " + ", ".join(faltando) + ". Copie o .env.example para .env e preencha."
        )


def main():
    app = create_app()
    verificar_configuracoes(app.config)

    # app_context: permite usar get_db() fora de uma requisição HTTP.
    with app.app_context():
        criar_tabelas()
        popular_banco(
            get_db(), app.config["ADMIN_EMAIL"], app.config["ADMIN_SENHA"], app.config["DEMO_SENHA"]
        )

    print("Banco criado em:", app.config["DATABASE"])
    print("Admin:", app.config["ADMIN_EMAIL"])
    for nome, email, perfil_acesso in USUARIOS_DEMO:
        print(f"Usuário demo: {email} (perfil {perfil_acesso})")


# Só roda quando o arquivo é executado direto (python -m app.database.seed),
# e não quando outro arquivo faz "import" dele (como os testes).
if __name__ == "__main__":
    main()
