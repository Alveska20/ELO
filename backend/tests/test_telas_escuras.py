"""
Testes da separação entre as telas escuras (frontend/pages/escuro/) e as
páginas roxas. O visual escuro é usado pelo perfil homem, pelo perfil
não definido e pelo admin.

Regra da equipe: os protótipos NÃO se misturam. As telas escuras seguem o
LAYOUT do Figma escuro e usam só o css/escuro.css; as páginas da mulher
continuam 100% no visual roxo. Estes testes leem os arquivos HTML/JS que
o Flask entrega e conferem que um visual não carrega peças do outro.

No escuro, Câmeras é um filtro de Dispositivos, a casa sem cômodos mostra
a mensagem de "casa vazia" e os blocos sem dados no sistema mostram dados
de exemplo. As regras do roxo ficam em test_telas_roxas.py.
"""
import json
import os
import re

from app.services.protecao_service import PASTA_CONTEUDO

# Telas escuras (frontend/pages/escuro/), incluindo a Administração.
TELAS_ESCURAS = [
    "inicio", "minha-casa", "ambientes", "ambiente", "dispositivos",
    "automacoes", "configuracoes", "tags", "admin",
]

# Páginas roxas (casa inteligente, Proteção E.L.O. e Fale conosco)
PAGINAS_ROXAS = [
    "dashboard", "cameras", "dispositivos", "avisos", "tags", "automacoes",
    "casa", "comodo", "perfil", "fale-conosco",
    "protecao", "protecao-orientacoes", "protecao-violencia", "protecao-faq",
    "protecao-quiz", "protecao-contatos", "protecao-configuracoes", "protecao-ajuda",
]

# Endereços que não existem no sistema (devem responder 404).
# A aba Câmeras do roxo é a pages/cameras.html.
PAGINAS_APAGADAS = [
    "/pages/admin.html", "/pages/perfil-homem.html",
    "/pages/escuro/cameras.html", "/js/admin.js", "/js/escuro/cameras.js",
]

CSS_ROXOS = ["/css/base.css", "/css/componentes.css", "/css/paginas.css"]


def ler(cliente, caminho):
    resposta = cliente.get(caminho)
    assert resposta.status_code == 200, caminho
    return resposta.get_data(as_text=True)


def test_telas_escuras_usam_so_o_css_escuro(cliente):
    for tela in TELAS_ESCURAS:
        html = ler(cliente, f"/pages/escuro/{tela}.html")

        assert "/css/escuro.css" in html, tela
        assert 'class="escuro"' in html, tela
        # Nenhum CSS do visual roxo, nem o tema do login.
        for css in CSS_ROXOS + ["/css/tema-escuro.css"]:
            assert css not in html, f"{tela} carrega {css}"
        # Nem o JS de componentes roxos da casa.
        assert "casa_comum.js" not in html, tela
        assert "/js/escuro/comum.js" in html, tela


def test_paginas_roxas_nao_carregam_nada_do_escuro(cliente):
    for pagina in PAGINAS_ROXAS:
        html = ler(cliente, f"/pages/{pagina}.html")
        assert "escuro.css" not in html, pagina
        assert "tema-escuro" not in html, pagina
        assert "/js/escuro/" not in html, pagina
        assert "/css/base.css" in html, pagina


def test_enderecos_inexistentes_respondem_404(cliente):
    for caminho in PAGINAS_APAGADAS:
        assert cliente.get(caminho).status_code == 404, caminho


def test_cada_pagina_roxa_da_casa_tem_uma_tela_escura(cliente):
    """O layout.js leva quem usa o visual escuro da página roxa para a tela
    escura. Todos os destinos dessa lista precisam existir."""
    layout = ler(cliente, "/js/layout.js")
    inicio = layout.index("const PAGINAS_ESCURAS")
    trecho = layout[inicio:layout.index("};", inicio)]
    pares = re.findall(r'"(/pages/[^"]+)":\s*"(/pages/escuro/[^"]+)"', trecho)

    # dashboard, casa, comodo, dispositivos, automacoes, tags, perfil,
    # cameras, avisos e fale-conosco
    assert len(pares) == 10
    for origem, destino in pares:
        assert cliente.get(origem).status_code == 200, origem
        assert cliente.get(destino).status_code == 200, destino


def test_textos_das_telas_escuras_existem_no_homem_json(cliente):
    """Todo data-texto="bloco.chave" das telas precisa existir no homem.json."""
    caminho = os.path.join(PASTA_CONTEUDO, "homem.json")
    with open(caminho, encoding="utf-8") as arquivo:
        textos = json.load(arquivo)

    for tela in TELAS_ESCURAS:
        html = ler(cliente, f"/pages/escuro/{tela}.html")
        for bloco, chave in re.findall(r'data-texto="([a-z_]+)\.([a-z_]+)"', html):
            assert bloco in textos and chave in textos[bloco], f"{tela}: {bloco}.{chave}"


def test_scripts_das_telas_escuras_existem(cliente):
    for tela in TELAS_ESCURAS:
        html = ler(cliente, f"/pages/escuro/{tela}.html")
        for script in re.findall(r'<script src="([^"]+)"', html):
            assert cliente.get(script).status_code == 200, f"{tela}: {script}"


def test_scripts_das_paginas_roxas_existem(cliente):
    """Todo JS que uma página roxa carrega precisa existir."""
    for pagina in PAGINAS_ROXAS:
        html = ler(cliente, f"/pages/{pagina}.html")
        for script in re.findall(r'<script src="([^"]+)"', html):
            assert cliente.get(script).status_code == 200, f"{pagina}: {script}"


def textos_dos_filtros(js, nome_da_lista):
    """Lê os textos dos filtros (ex.: "Câmeras") da lista que fica no JS."""
    inicio = js.index(f"const {nome_da_lista} = [")
    return re.findall(r'texto: "([^"]+)"', js[inicio:js.index("];", inicio)])


def test_escuro_tem_cameras_como_filtro_de_dispositivos(cliente):
    """No escuro, Câmeras é um filtro de Dispositivos e não existe item
    "Câmeras" no menu lateral. Portas: "Só consulta"."""
    escuro = ler(cliente, "/js/escuro/dispositivos.js")
    assert textos_dos_filtros(escuro, "CATEGORIAS") == [
        "Todos", "Luzes", "Climatização", "Cortinas e janelas", "Câmeras",
        "Sensores", "TV e tomadas", "Portas (consulta)",
    ]
    assert "Só consulta" in escuro

    layout = ler(cliente, "/js/layout.js")
    inicio = layout.index("const ITENS_MENU_ESCURO = [")
    menu_escuro = layout[inicio:layout.index("];", inicio)]
    assert "Câmeras" not in menu_escuro


def test_mensagem_de_casa_vazia_nos_dois_visuais(cliente):
    """Mesma mensagem (3 passos) em Minha casa, Dispositivos, Automações e
    Tags: no roxo (casa_comum.js) e no escuro (escuro/comum.js)."""
    roxo = ler(cliente, "/js/casa_comum.js")
    for texto in ["Cômodos", "Aparelhos e câmeras", "Rotinas e Tags"]:   # textos da imagem 02
        assert texto in roxo
    for js in ["dashboard", "casa", "dispositivos", "automacoes", "tags"]:
        assert "htmlCasaVazia(" in ler(cliente, f"/js/{js}.js"), js

    assert "function htmlCasaVaziaEscuro" in ler(cliente, "/js/escuro/comum.js")
    for js in ["inicio", "minha_casa", "ambientes", "dispositivos", "automacoes", "tags"]:
        assert "htmlCasaVaziaEscuro(" in ler(cliente, f"/js/escuro/{js}.js"), js


def test_telas_escuras_sem_placeholder_de_funcionalidade(cliente):
    """Nenhuma tela escura mostra [FUNCIONALIDADE A SER DEFINIDA]: os blocos
    sem dados no sistema mostram dados de exemplo, sempre com o selo
    "Dados de exemplo" ou "Sincronizando…"."""
    for tela in TELAS_ESCURAS:
        html = ler(cliente, f"/pages/escuro/{tela}.html")
        assert "[FUNCIONALIDADE A SER DEFINIDA]" not in html, tela
        for script in re.findall(r'<script src="(/js/escuro/[^"]+)"', html):
            codigo = ler(cliente, script)
            assert "htmlPlaceholder(" not in codigo, script
    assert "function htmlSeloExemplo" in ler(cliente, "/js/escuro/comum.js")


def test_cards_escuros_ocupam_a_largura_toda(cliente):
    """A área principal escura não tem mais max-width (os cards ficavam pela
    metade em telas grandes)."""
    css = ler(cliente, "/css/escuro.css")
    regra = css[css.index(".h-principal {"):css.index("}", css.index(".h-principal {"))]
    assert "max-width" not in regra
