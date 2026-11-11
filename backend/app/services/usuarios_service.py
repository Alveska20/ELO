"""
Regras do "Meu Perfil": a pessoa vê e edita os próprios dados.

O que ela PODE mudar: nome, e-mail e telefone, a qualquer momento.

O perfil de acesso é escolhido no cadastro e só pode ser DEFINIDO UMA VEZ:
- quem está "nao_definido" ("Prefiro não informar") pode escolher
  "mulher" ou "homem" uma única vez, em Configurações;
- depois disso o perfil não muda mais (403, e nada da requisição é salvo).
Assim, ninguém com acesso ao celular consegue esconder ou revelar a Proteção.
O perfil enviado é conferido por perfil_do_cadastro(): qualquer valor fora
dos 3 aceitos vira "nao_definido".

O que ela NÃO pode mudar: o papel (usuario/admin), que só o seed define.
O admin também não muda o perfil de ninguém.
"""
from app.database.db import get_db
from app.services.auth_service import PERFIL_PADRAO, buscar_usuario_por_email, normalizar_email, perfil_do_cadastro
from app.utils.requisicao import texto

# Únicos campos aceitos no PUT /api/profile. Qualquer outro campo enviado
# (ex.: "papel": "admin") é simplesmente ignorado.
CAMPOS_EDITAVEIS = ("nome", "email", "telefone", "perfil_acesso")

ERRO_PERFIL_JA_DEFINIDO = "O perfil já foi definido e não pode ser alterado."


def perfil_pedido(perfil_atual, valor_recebido):
    """Qual perfil a requisição pede. Sem perfil_acesso (ausente ou null)
    mantém o atual; qualquer outro valor passa por perfil_do_cadastro()."""
    if valor_recebido is None:
        return perfil_atual
    return perfil_do_cadastro(valor_recebido)


def pode_trocar_perfil(perfil_atual, perfil_novo):
    """Regra do "definido uma única vez":
    - igual ao atual: pode (a pessoa só está editando nome/e-mail/telefone);
    - atual "nao_definido": pode (é a definição única);
    - atual "mulher" ou "homem" e valor diferente: NÃO pode."""
    if perfil_novo == perfil_atual:
        return True
    return perfil_atual == PERFIL_PADRAO


def validar_perfil(usuario_id, dados, perfil_atual):
    """Devolve (erro, None) ou (None, dados_limpos).
    A troca de perfil proibida é conferida antes, na rota (403)."""
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
        "perfil_acesso": perfil_pedido(perfil_atual, dados.get("perfil_acesso")),
    }


def atualizar_perfil(usuario_id, dados):
    conexao = get_db()
    conexao.execute(
        "UPDATE usuarios SET nome = ?, email = ?, telefone = ?, perfil_acesso = ? WHERE id = ?",
        (dados["nome"], dados["email"], dados["telefone"], dados["perfil_acesso"], usuario_id),
    )
    conexao.commit()
