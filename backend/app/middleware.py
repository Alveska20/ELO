"""
Middleware do E.L.O.: roda em TODAS as requisições.

O que é middleware: um código que fica "no meio do caminho" entre o
navegador e as rotas. O Flask chama estas funções sozinho:

    navegador → before_request → rota (ex.: GET /api/devices) → after_request → navegador

Aqui ele faz duas coisas:
1. mede quanto tempo a requisição levou e mostra uma linha no terminal:
       [14:03:22] GET /api/devices → 200 (3 ms)
2. acrescenta em toda resposta três cabeçalhos de segurança.

Diferença entre o middleware e os decorators (@login_required etc.):
- o middleware é GLOBAL: vale para todas as rotas, sem precisar escrever
  nada em cima delas. Serve para o que é igual para todo mundo (medir
  tempo, cabeçalhos de segurança);
- o decorator é ESCOLHIDO rota por rota: só a rota que tem
  @acesso_mulher_required confere o perfil mulher. Serve para regras que
  mudam de uma rota para outra (quem pode acessar o quê).
Por isso as permissões continuam nos decorators: o middleware não sabe
qual rota exige qual perfil.

Privacidade: a linha do terminal NUNCA mostra o corpo da requisição
(onde vão senhas e dados pessoais), os cookies (onde vai a sessão) nem a
query string (a parte depois do "?" na URL). Só o método, o caminho,
o status e o tempo.
"""
import time
from datetime import datetime

from flask import g, request

# Cabeçalhos de segurança acrescentados em toda resposta.
CABECALHOS_DE_SEGURANCA = {
    # O navegador não tenta "adivinhar" o tipo do arquivo: um .txt não
    # vira script só porque o conteúdo parece JavaScript.
    "X-Content-Type-Options": "nosniff",
    # Nenhum outro site pode abrir o E.L.O. dentro de um <iframe>
    # (evita que alguém "disfarce" as nossas páginas dentro de outra).
    "X-Frame-Options": "DENY",
    # Ao clicar num link para fora (ex.: a saída rápida), o outro site
    # não fica sabendo de qual página do E.L.O. a pessoa veio.
    "Referrer-Policy": "no-referrer",
}


def marcar_inicio():
    """before_request: guarda a hora de início em g (vale só para esta requisição).

    perf_counter() é um relógio feito para medir intervalos curtos.
    """
    g.inicio_da_requisicao = time.perf_counter()


def deve_registrar(caminho):
    """Só a API aparece no terminal.

    Páginas HTML, CSS, JS, fontes e imagens (arquivos estáticos) ficam de
    fora: cada página carrega vários deles, e o terminal ficaria cheio de
    linhas que não ajudam a entender o sistema.
    """
    return caminho.startswith("/api/")


def montar_linha(metodo, caminho, status, milissegundos):
    """Monta o texto: [14:03:22] GET /api/devices → 200 (3 ms)."""
    hora = datetime.now().strftime("%H:%M:%S")
    return f"[{hora}] {metodo} {caminho} → {status} ({milissegundos} ms)"


def mostrar_no_terminal(linha):
    """Imprime a linha sem nunca quebrar a resposta.

    No Windows, quando a saída do terminal não aceita a seta "→", o print
    dá erro. Nesse caso trocamos por "->" e tentamos de novo: um problema
    no registro não pode virar erro 500 para quem está usando o site.
    """
    try:
        print(linha, flush=True)
    except UnicodeEncodeError:
        print(linha.replace("→", "->"), flush=True)


def registrar_e_proteger(resposta):
    """after_request: registra a requisição e acrescenta os cabeçalhos.

    O Flask passa a resposta já pronta; a função precisa devolvê-la.
    """
    for nome, valor in CABECALHOS_DE_SEGURANCA.items():
        resposta.headers[nome] = valor

    # request.path é só o caminho, SEM a query string (ex.: "?id=3").
    caminho = request.path
    inicio = g.get("inicio_da_requisicao")
    if deve_registrar(caminho) and inicio is not None:
        milissegundos = round((time.perf_counter() - inicio) * 1000)
        mostrar_no_terminal(montar_linha(request.method, caminho, resposta.status_code, milissegundos))

    return resposta


def registrar_middleware(app):
    """Liga as duas funções no app. Chamada pelo create_app() (app/__init__.py)."""
    app.before_request(marcar_inicio)
    app.after_request(registrar_e_proteger)
