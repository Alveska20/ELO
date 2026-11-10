"""
Regras de negócio de usuários e login.

As rotas (routes/auth.py) só recebem a requisição e chamam estas funções.
Aqui ficam as consultas ao banco e as validações.
"""
from werkzeug.security import check_password_hash, generate_password_hash

from app.database.db import get_db

TAMANHO_MINIMO_SENHA = 8

# Respostas aceitas em "Como você se identifica?" (no cadastro e em
# Configurações):
#   Mulher -> "mulher" · Homem -> "homem" · Prefiro não informar -> "nao_definido".
# Qualquer outro valor (vazio, errado, inventado) vira "nao_definido".
PERFIS_DO_CADASTRO = ("mulher", "homem", "nao_definido")
PERFIL_PADRAO = "nao_definido"

# Visual de cada pessoa:
#   "roxo"   -> perfil mulher: casa inteligente roxa + Proteção E.L.O.
#   "escuro" -> perfil homem, perfil não definido e admin: casa no visual
#               escuro do Figma (pages/escuro/), sem a Proteção E.L.O.
TEMA_ROXO = "roxo"
TEMA_ESCURO = "escuro"


def tema_do_usuario(linha):
    """Diz qual visual a pessoa usa: "roxo" ou "escuro".

    O admin usa sempre o escuro (ele cuida da casa e da Administração).
    Os outros usam o roxo só se o perfil de acesso for "mulher".
    A Proteção E.L.O. NÃO depende disto: ela continua liberada só para
    perfil_acesso = "mulher" (@acesso_mulher_required).
    """
    if linha["papel"] == "admin":
        return TEMA_ESCURO
    if linha["perfil_acesso"] == "mulher":
        return TEMA_ROXO
    return TEMA_ESCURO


def usuario_para_dict(linha):
    """Converte a linha do banco em dict para enviar como JSON.

    O senha_hash fica de fora de propósito: ele nunca sai do backend.
    """
    return {
        "id": linha["id"],
        "nome": linha["nome"],
        "email": linha["email"],
        "telefone": linha["telefone"],
        "papel": linha["papel"],
        "perfil_acesso": linha["perfil_acesso"],
        # O frontend usa este campo para escolher as telas (roxas ou escuras).
        "tema": tema_do_usuario(linha),
    }


def buscar_usuario_por_id(usuario_id):
    """Devolve a linha do usuário ou None se não existir."""
    return get_db().execute("SELECT * FROM usuarios WHERE id = ?", (usuario_id,)).fetchone()


def buscar_usuario_por_email(email):
    return get_db().execute("SELECT * FROM usuarios WHERE email = ?", (email,)).fetchone()


def normalizar_email(email):
    """Tira espaços e deixa minúsculo, para "Maria@X.com " e "maria@x.com"
    serem o mesmo e-mail."""
    return email.strip().lower()


def validar_cadastro(nome, email, senha):
    """Devolve a mensagem de erro, ou None se os dados estiverem ok."""
    if not nome or not email or not senha:
        return "Preencha nome, e-mail e senha."
    if "@" not in email or "." not in email:
        return "E-mail inválido."
    if len(senha) < TAMANHO_MINIMO_SENHA:
        return f"A senha precisa ter pelo menos {TAMANHO_MINIMO_SENHA} caracteres."
    if buscar_usuario_por_email(email) is not None:
        return "Já existe uma conta com esse e-mail."
    return None


def perfil_do_cadastro(valor):
    """Confere a resposta de "Como você se identifica?" (cadastro e Configurações).
    Só aceita os 3 valores de PERFIS_DO_CADASTRO; o resto vira "nao_definido"."""
    if valor in PERFIS_DO_CADASTRO:
        return valor
    return PERFIL_PADRAO


def cadastrar_usuario(nome, email, senha, perfil_acesso=PERFIL_PADRAO):
    """Cria um usuário comum e devolve o id.

    O perfil de acesso vem da pergunta "Como você se identifica?",
    sempre conferido por perfil_do_cadastro(). O PAPEL nunca vem do
    formulário: todo cadastro é 'usuario' (o valor padrão da tabela). Ninguém
    vira admin pelo cadastro. Só a própria pessoa muda o perfil
    depois, em Configurações (o admin não altera o perfil de ninguém).
    """
    conexao = get_db()
    cursor = conexao.execute(
        "INSERT INTO usuarios (nome, email, senha_hash, perfil_acesso) VALUES (?, ?, ?, ?)",
        (nome, email, generate_password_hash(senha), perfil_do_cadastro(perfil_acesso)),
    )
    conexao.commit()
    return cursor.lastrowid


def verificar_login(email, senha):
    """Devolve a linha do usuário se e-mail e senha estiverem certos, senão None.

    check_password_hash embaralha a senha digitada do mesmo jeito e compara
    com o hash salvo. A senha original nunca é guardada nem comparada direto.
    """
    usuario = buscar_usuario_por_email(email)
    if usuario is None:
        return None
    if not check_password_hash(usuario["senha_hash"], senha):
        return None
    return usuario
