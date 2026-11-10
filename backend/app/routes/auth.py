"""
Rotas de autenticação: cadastro, login, logout e "quem sou eu".

Como funciona a sessão do Flask:
1. No login certo, guardamos session["usuario_id"] = id do usuário.
2. O Flask envia isso ao navegador num cookie ASSINADO com a SECRET_KEY.
   A pessoa consegue ver o cookie, mas não consegue alterar (a assinatura
   deixaria de bater e o Flask ignoraria o cookie).
3. O navegador manda o cookie de volta em toda requisição, e os
   decorators (utils/decorators.py) leem session["usuario_id"].
4. No logout, session.clear() apaga tudo.
"""
from flask import Blueprint, g, jsonify, session

from app.services import auth_service
from app.utils.decorators import login_required
from app.utils.requisicao import ler_json
from app.utils.respostas import erro

# Blueprint = um "pedaço" do app com as próprias rotas. Todas as rotas
# daqui começam com /api/auth (url_prefix).
bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/register")
def cadastrar():
    dados = ler_json()
    nome = (dados.get("nome") or "").strip()
    email = auth_service.normalizar_email(dados.get("email") or "")
    senha = dados.get("senha") or ""
    # "Como você se identifica?": o service aceita só mulher, homem ou
    # nao_definido. O campo "papel" NUNCA é lido daqui (ninguém vira admin).
    perfil_acesso = dados.get("perfil_acesso")

    mensagem_erro = auth_service.validar_cadastro(nome, email, senha)
    if mensagem_erro is not None:
        return erro(mensagem_erro, 400)

    auth_service.cadastrar_usuario(nome, email, senha, perfil_acesso)
    # O cadastro não faz login sozinho: o fluxo volta para a tela de login.
    return jsonify({"mensagem": "Conta criada, faça login."}), 201


@bp.post("/login")
def entrar():
    dados = ler_json()
    email = auth_service.normalizar_email(dados.get("email") or "")
    senha = dados.get("senha") or ""

    usuario = auth_service.verificar_login(email, senha)
    if usuario is None:
        # Mesma mensagem para e-mail inexistente e senha errada: assim
        # ninguém descobre quais e-mails têm conta no E.L.O.
        return erro("E-mail ou senha incorretos.", 401)

    # Limpa qualquer sessão anterior antes de guardar o novo login.
    session.clear()
    session["usuario_id"] = usuario["id"]
    return jsonify({"usuario": auth_service.usuario_para_dict(usuario)})


@bp.post("/logout")
def sair():
    # Sem @login_required de propósito: sair sem estar logado não é erro.
    # Isso também deixa a "saída rápida" funcionar sempre (navigator.sendBeacon).
    session.clear()
    return jsonify({"mensagem": "Sessão encerrada."})


@bp.get("/me")
@login_required
def quem_sou_eu():
    """Usada pelo frontend em toda página: diz quem está logado e o que pode ver
    (papel e perfil_acesso decidem quais itens do menu aparecem)."""
    return jsonify({"usuario": auth_service.usuario_para_dict(g.usuario)})
