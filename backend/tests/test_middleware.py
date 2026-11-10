"""
Testes do middleware (app/middleware.py).

capsys é uma fixture do próprio pytest: ela "captura" o que foi impresso
com print(), para o teste conseguir ler a linha do terminal.
"""
from tests.conftest import EMAIL_MULHER, SENHA_DEMO

CABECALHOS_ESPERADOS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
}


def test_cabecalhos_de_seguranca_em_todas_as_respostas(cliente):
    # Uma rota da API (401, sem login), uma página e um arquivo CSS:
    # o middleware é global, então os três precisam ter os cabeçalhos.
    for endereco in ["/api/auth/me", "/", "/css/base.css"]:
        resposta = cliente.get(endereco)
        for nome, valor in CABECALHOS_ESPERADOS.items():
            assert resposta.headers.get(nome) == valor, f"{endereco} sem {nome}"


def test_terminal_mostra_so_metodo_caminho_status_e_tempo(cliente, capsys):
    capsys.readouterr()   # descarta o que foi impresso antes deste teste

    # Login com senha no corpo e um parâmetro na query string.
    cliente.post("/api/auth/login?origem=teste", json={"email": EMAIL_MULHER, "senha": SENHA_DEMO})
    saida = capsys.readouterr().out

    # A linha existe: método, caminho, status e o tempo em ms.
    assert "POST /api/auth/login" in saida
    assert "200 (" in saida and " ms)" in saida
    # Nada de corpo, senha, e-mail, query string ou cookie.
    assert SENHA_DEMO not in saida
    assert EMAIL_MULHER not in saida
    assert "origem=teste" not in saida
    assert "session" not in saida.lower()


def test_arquivos_estaticos_nao_aparecem_no_terminal(cliente, capsys):
    capsys.readouterr()
    cliente.get("/css/base.css")
    cliente.get("/pages/dashboard.html")
    assert capsys.readouterr().out == ""
