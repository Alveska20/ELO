"""
Resposta de erro padronizada da API.

Todas as rotas devolvem erros no mesmo formato: {"erro": "mensagem"},
com o status HTTP certo. Assim o frontend sempre sabe onde ler a mensagem.

Status usados no projeto:
- 400: dados enviados estão errados ou faltando
- 401: não está logado (ou e-mail/senha errados no login)
- 403: está logado, mas não tem permissão
- 404: o item não existe (ou é de outro usuário)
"""
from flask import jsonify


def erro(mensagem, status):
    """Devolve a tupla (resposta JSON, status). O Flask entende essa tupla."""
    return jsonify({"erro": mensagem}), status
