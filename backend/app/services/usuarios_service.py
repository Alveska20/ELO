"""
Regras do "Meu Perfil": a pessoa vê e edita os próprios dados.

O que ela PODE mudar: nome, e-mail, telefone e o perfil de
acesso, respondendo "Como você se identifica?" (Mulher / Homem / Prefiro
não informar). O perfil é conferido por perfil_do_cadastro(): qualquer
valor fora dos 3 aceitos vira "nao_definido".
O que ela NÃO pode mudar: o papel (usuario/admin), que só o seed define.
O admin também não muda o perfil de ninguém.
"""
from app.database.db import get_db
from app.services.auth_service import buscar_usuario_por_email, normalizar_email, perfil_do_cadastro
from app.utils.requisicao import texto

# Únicos campos aceitos no PUT /api/profile. Qualquer outro campo enviado
# (ex.: "papel": "admin") é simplesmente ignorado.
CAMPOS_EDITAVEIS = ("nome", "email", "telefone", "perfil_acesso")


def validar_perfil(usuario_id, dados):
    """Devolve (erro, None) ou (None, dados_limpos)."""
    nome = texto(dados.get("nome"))
    email = normalizar_email(texto(dados.get("email")))
    telefone = texto(dados.get("telefone"))

    if not nome:
        return "Informe o seu nome.", None
    if "@" not in email or "." not in email:
        return "E-mail inválido.", None

    # O e-mail pode ser o mesmo de antes, mas não pode ser o de outra conta.
    dono_do_email = buscar_usuario_por_email(email)
    if dono_do_email is not None and dono_do_email["id"] != usuario_id:
        return "Já existe uma conta com esse e-mail.", None

    # Telefone é opcional: vazio vira NULL no banco.
    if not telefone:
        telefone = None

    return None, {
        "nome": nome,
        "email": email,
        "telefone": telefone,
        "perfil_acesso": perfil_do_cadastro(dados.get("perfil_acesso")),
    }


def atualizar_perfil(usuario_id, dados):
    conexao = get_db()
    conexao.execute(
        "UPDATE usuarios SET nome = ?, email = ?, telefone = ?, perfil_acesso = ? WHERE id = ?",
        (dados["nome"], dados["email"], dados["telefone"], dados["perfil_acesso"], usuario_id),
    )
    conexao.commit()
