"""
Decorators de permissão: @login_required, @admin_required, @acesso_mulher_required
e @area_escura_required.

O que é um decorator: uma função que "embrulha" outra. Escrevendo
@login_required em cima de uma rota, o Flask roda primeiro a verificação
daqui; só se ela passar é que a rota de verdade é executada.

Exemplo de uso numa rota:

    @bp.get("/api/protection")
    @acesso_mulher_required
    def ver_protecao():
        ...

Por que a verificação fica no backend: esconder um botão no frontend não
impede ninguém de chamar a URL da API direto. A regra que vale é esta.
"""
from functools import wraps

from flask import g, session

from app.services.auth_service import TEMA_ESCURO, buscar_usuario_por_id, tema_do_usuario
from app.utils.respostas import erro

MENSAGEM_SEM_LOGIN = "Faça login para continuar."
MENSAGEM_SEM_PERMISSAO = "Você não tem permissão para acessar essa página."


def carregar_usuario_logado():
    """Lê o id guardado na sessão e busca o usuário no banco.

    Buscamos no banco a cada requisição (em vez de guardar tudo na sessão)
    para que uma mudança feita pelo admin, como trocar o perfil_acesso,
    valha na hora, sem a pessoa precisar sair e entrar de novo.

    O usuário fica em g.usuario para a rota usar (ex.: g.usuario["id"]).
    Devolve o usuário ou None.
    """
    usuario_id = session.get("usuario_id")
    if usuario_id is None:
        return None

    usuario = buscar_usuario_por_id(usuario_id)
    if usuario is None:
        # A conta foi apagada depois do login: a sessão antiga não vale mais.
        session.clear()
        return None

    g.usuario = usuario
    return usuario


def login_required(funcao_da_rota):
    """Só deixa passar quem está logado. Senão: 401."""

    # @wraps mantém o nome original da função da rota. O Flask usa esse
    # nome para identificar cada rota; sem ele, todas se chamariam "verificar".
    @wraps(funcao_da_rota)
    def verificar(*args, **kwargs):
        if carregar_usuario_logado() is None:
            return erro(MENSAGEM_SEM_LOGIN, 401)
        return funcao_da_rota(*args, **kwargs)

    return verificar


def admin_required(funcao_da_rota):
    """Só deixa passar quem está logado E tem papel 'admin'.
    Sem login: 401. Logado sem ser admin: 403."""

    @wraps(funcao_da_rota)
    def verificar(*args, **kwargs):
        usuario = carregar_usuario_logado()
        if usuario is None:
            return erro(MENSAGEM_SEM_LOGIN, 401)
        if usuario["papel"] != "admin":
            return erro(MENSAGEM_SEM_PERMISSAO, 403)
        return funcao_da_rota(*args, **kwargs)

    return verificar


def acesso_mulher_required(funcao_da_rota):
    """Só deixa passar quem está logado E tem perfil_acesso 'mulher'.
    Protege a Proteção E.L.O., o quiz, os contatos de confiança e a emergência.
    Sem login: 401. Outro perfil: 403."""

    @wraps(funcao_da_rota)
    def verificar(*args, **kwargs):
        usuario = carregar_usuario_logado()
        if usuario is None:
            return erro(MENSAGEM_SEM_LOGIN, 401)
        if usuario["perfil_acesso"] != "mulher":
            return erro(MENSAGEM_SEM_PERMISSAO, 403)
        return funcao_da_rota(*args, **kwargs)

    return verificar


def area_escura_required(funcao_da_rota):
    """Só deixa passar quem está logado E usa o visual escuro:
    perfil homem, perfil não definido ou admin.
    Protege a rota da área escura (/api/men-area).
    Sem login: 401. Perfil mulher (que usa o visual roxo): 403.

    A regra de quem usa o escuro fica num lugar só: tema_do_usuario(),
    em services/auth_service.py. A Proteção E.L.O. continua só para o
    perfil mulher, porque aquelas rotas usam o @acesso_mulher_required.
    """

    @wraps(funcao_da_rota)
    def verificar(*args, **kwargs):
        usuario = carregar_usuario_logado()
        if usuario is None:
            return erro(MENSAGEM_SEM_LOGIN, 401)
        if tema_do_usuario(usuario) != TEMA_ESCURO:
            return erro(MENSAGEM_SEM_PERMISSAO, 403)
        return funcao_da_rota(*args, **kwargs)

    return verificar
