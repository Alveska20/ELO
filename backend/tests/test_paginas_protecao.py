"""
Teste das páginas da Proteção E.L.O. (frontend): todas precisam ter o
botão "Sair rápido" e o aviso do rodapé.

Como essas duas coisas aparecem na tela:
- o HTML carrega js/saida_rapida.js e js/layout.js e tem <div id="rodape">;
- o JS da página chama montarPagina({ ..., protecao: true });
- com protecao: true, o layout.js busca o texto do aviso
  (GET /api/protection -> aviso_rodape.texto), coloca no rodapé e chama
  iniciarSaidaRapida(), que cria o botão.

O pytest não abre um navegador de verdade, então o teste confere cada
elo dessa corrente: se algum faltar, o botão ou o aviso não apareceriam.
"""
import os
import re

from tests.conftest import EMAIL_MULHER

PASTA_FRONTEND = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend"
)

PAGINAS_DA_PROTECAO = [
    "protecao.html",                # início
    "protecao-orientacoes.html",    # orientações
    "protecao-violencia.html",      # tipos de violência
    "protecao-faq.html",            # perguntas frequentes
    "protecao-quiz.html",           # quiz
    "protecao-contatos.html",       # contatos de confiança
    "protecao-configuracoes.html",  # configurações de emergência
    "protecao-ajuda.html",          # preciso de ajuda
]

# Scripts usados por todas as páginas (não são o "JS da página").
SCRIPTS_COMUNS = ["/js/api.js", "/js/saida_rapida.js", "/js/layout.js"]

# Texto do aviso (doc da equipe, seção 11), como está em content/protecao.json.
AVISO_ESPERADO = "Conteúdo informativo. Não substitui atendimento de emergência, jurídico, psicológico ou policial."


def ler_arquivo_do_frontend(caminho_no_site):
    """Lê um arquivo do frontend a partir do endereço (ex.: /js/layout.js)."""
    caminho = os.path.join(PASTA_FRONTEND, caminho_no_site.lstrip("/"))
    with open(caminho, encoding="utf-8") as arquivo:
        return arquivo.read()


def codigo_da_pagina(html, scripts):
    """Junta o JS próprio da página: os <script src> que não são comuns
    e o JS escrito dentro do próprio HTML (caso das páginas pequenas)."""
    codigo = html
    for script in scripts:
        if script not in SCRIPTS_COMUNS:
            codigo = codigo + ler_arquivo_do_frontend(script)
    return codigo


def test_todas_as_paginas_da_protecao_tem_saida_rapida_e_aviso(cliente):
    for pagina in PAGINAS_DA_PROTECAO:
        resposta = cliente.get(f"/pages/{pagina}")
        assert resposta.status_code == 200, pagina
        html = resposta.get_data(as_text=True)

        # Lista dos <script src="..."> na ordem em que aparecem.
        scripts = re.findall(r'<script src="([^"]+)"', html)

        assert "/js/saida_rapida.js" in scripts, f"{pagina} não carrega saida_rapida.js"
        assert "/js/layout.js" in scripts, f"{pagina} não carrega layout.js"
        assert 'id="rodape"' in html, f"{pagina} não tem o lugar do rodapé"

        # O JS da página precisa pedir o modo Proteção (botão + aviso).
        assert "protecao: true" in codigo_da_pagina(html, scripts), f"{pagina} não usa protecao: true"


def test_layout_coloca_aviso_e_botao_no_modo_protecao():
    """Confere, no layout.js, que o modo Proteção liga o botão e o aviso."""
    layout = ler_arquivo_do_frontend("/js/layout.js")
    assert "if (opcoes.protecao)" in layout
    assert "iniciarSaidaRapida(" in layout
    assert "aviso_rodape.texto" in layout
    # O aviso fica no fim do conteúdo, acima do rodapé (docs/proposta/07 a 12).
    assert "aviso-protecao" in layout

    saida_rapida = ler_arquivo_do_frontend("/js/saida_rapida.js")
    assert "function iniciarSaidaRapida" in saida_rapida
    assert "navigator.sendBeacon" in saida_rapida
    assert "window.location.replace" in saida_rapida


def test_api_entrega_o_texto_do_aviso(logar):
    conteudo = logar(EMAIL_MULHER).get("/api/protection").get_json()
    assert conteudo["aviso_rodape"]["texto"] == AVISO_ESPERADO
    assert conteudo["saida_rapida"]["limitacao"] != ""


def test_paginas_fora_da_protecao_nao_tem_saida_rapida(cliente):
    """O botão é só da área sensível: as telas da casa e o Fale conosco não têm."""
    for pagina in ["dashboard", "cameras", "dispositivos", "avisos", "tags", "automacoes", "fale-conosco"]:
        html = cliente.get(f"/pages/{pagina}.html").get_data(as_text=True)
        assert "saida_rapida.js" not in html, pagina
