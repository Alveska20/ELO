"""
Testes do visual roxo (perfil mulher): as 14 imagens aprovadas em
docs/proposta/ (Figma roxo + melhorias).

O pytest não abre um navegador: estes testes leem os arquivos HTML/JS que
o Flask entrega e a API, e conferem as regras pedidas pela equipe:
- logo horizontal no cabeçalho e logo completa no rodapé, só nas telas roxas;
- cabeçalho: Minha casa · Proteção E.L.O. · Fale conosco;
- abas de Minha casa: Início · Câmeras · Aparelhos · Avisos · Tags · Rotinas;
- simulações que NÃO salvam nada (modos da faixa e Fale conosco);
- conteúdo da Proteção vindo do doc (via protecao.json);
- os selos "NOVO" das imagens não aparecem no sistema.
"""
import os
import re

from tests.conftest import EMAIL_MULHER

PASTA_FRONTEND = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend"
)

# Telas da casa (todas mostram as abas de Minha casa) e o id da aba ativa.
TELAS_DA_CASA = {
    "dashboard": "inicio",
    "cameras": "cameras",
    "dispositivos": "aparelhos",
    "avisos": "avisos",
    "tags": "tags",
    "automacoes": "rotinas",
    "casa": "aparelhos",     # "Gerenciar cômodos", aberta a partir de Aparelhos
    "comodo": "aparelhos",
}

# Todas as páginas roxas (para conferir que nenhuma mostra "NOVO").
PAGINAS_ROXAS = list(TELAS_DA_CASA) + [
    "perfil", "fale-conosco", "protecao", "protecao-orientacoes", "protecao-violencia",
    "protecao-faq", "protecao-quiz", "protecao-contatos", "protecao-configuracoes",
    "protecao-ajuda",
]


def ler(cliente, caminho):
    resposta = cliente.get(caminho)
    assert resposta.status_code == 200, caminho
    return resposta.get_data(as_text=True)


def textos_da_lista(js, nome_da_lista):
    """Lê os textos ("texto: ...") de uma lista que fica no JS."""
    inicio = js.index(f"const {nome_da_lista} = [")
    return re.findall(r'texto: "([^"]+)"', js[inicio:js.index("];", inicio)])


def trecho_da_funcao(js, nome):
    """Devolve o código de uma função do JS: do "function nome(" até a
    chave "}" que fecha a função (a que fica sozinha no começo da linha)."""
    inicio = js.index(f"function {nome}(")
    fim = js.index("\n}", inicio)
    return js[inicio:fim + 2]


def test_logos_no_cabecalho_e_no_rodape(cliente):
    layout = ler(cliente, "/js/layout.js")
    assert "/img/logo-elo-horizontal.png" in trecho_da_funcao(layout, "montarCabecalho")
    assert "/img/logo-elo.png" in trecho_da_funcao(layout, "montarRodape")
    assert cliente.get("/img/logo-elo-horizontal.png").status_code == 200
    assert cliente.get("/img/logo-elo.png").status_code == 200

    css = ler(cliente, "/css/componentes.css")
    assert re.search(r"\.cabecalho-marca img \{[^}]*height: 36px", css)
    assert re.search(r"\.rodape img \{[^}]*height: 64px", css)


def test_login_e_cadastro_continuam_sem_a_logo(cliente):
    for pagina in ["/", "/pages/cadastro.html"]:
        html = ler(cliente, pagina)
        assert "logo-elo" not in html, pagina
        assert "layout.js" not in html, pagina   # cabeçalho e rodapé roxos não entram


def test_rodape_tem_o_texto_pedido(cliente):
    rodape = trecho_da_funcao(ler(cliente, "/js/layout.js"), "montarRodape")
    assert "Projeto acadêmico de apoio e informação para mulheres." in rodape
    assert "Em situação de emergência, ligue 190. Para orientação, ligue 180." in rodape


def test_menu_do_cabecalho_e_abas_de_minha_casa(cliente):
    layout = ler(cliente, "/js/layout.js")
    assert textos_da_lista(layout, "ITENS_MENU") == ["Minha casa", "Proteção E.L.O.", "Fale conosco"]
    assert textos_da_lista(layout, "ABAS_CASA") == ["Início", "Câmeras", "Aparelhos", "Avisos", "Tags", "Rotinas"]
    # Avatar com Configurações e Sair; botão "Preciso de ajuda".
    assert "Configurações" in layout and "botao-sair" in layout
    assert "Preciso de ajuda" in layout

    for pagina, aba in TELAS_DA_CASA.items():
        html = ler(cliente, f"/pages/{pagina}.html")
        assert 'id="abas-casa"' in html, pagina
        js = ler(cliente, f"/js/{pagina}.js")
        assert f'abaCasa: "{aba}"' in js, pagina


def test_primeira_tela_depois_do_login_e_minha_casa(cliente):
    login = ler(cliente, "/js/login.js")
    assert 'window.location.replace("/pages/dashboard.html")' in login


def test_modos_da_faixa_sao_so_simulacao(cliente):
    """Em casa / Fora / Desarmar só trocam o texto da faixa: nada vai para a API."""
    js = ler(cliente, "/js/dashboard.js")
    trecho = trecho_da_funcao(js, "trocarModo")
    assert "chamarApi" not in trecho
    for texto in ["Em casa", "Fora", "Desarmar"]:
        assert texto in ler(cliente, "/pages/dashboard.html")


def test_cameras_com_selo_simulacao(cliente):
    js = ler(cliente, "/js/cameras.js")
    assert "SIMULAÇÃO" in js and "DESLIGADA" in js
    assert "/api/devices?tipo=camera" in js
    assert "Nenhum vídeo real" in ler(cliente, "/pages/cameras.html")


def test_aparelhos_filtros_gerenciar_comodos_e_portas(cliente):
    js = ler(cliente, "/js/dispositivos.js")
    assert textos_da_lista(js, "FILTROS") == [
        "Todos", "Luzes", "Climatização", "Cortinas e janelas", "Sensores", "Portas",
    ]
    # Os cartões ficam no casa_comum.js (a tela Cômodo usa os mesmos).
    comum = ler(cliente, "/js/casa_comum.js")
    assert "Só consulta" in trecho_da_funcao(comum, "htmlCardPorta")
    # Portas não têm interruptor (não existe rota para trancar/destrancar).
    assert "interruptor" not in trecho_da_funcao(comum, "htmlCardPorta")

    html = ler(cliente, "/pages/dispositivos.html")
    assert 'href="/pages/casa.html"' in html and "Gerenciar cômodos" in html


def test_avisos_saem_do_estado_real_da_casa(cliente, logar):
    """As regras ficam numa função só (gerarAvisos) e usam /api/devices e /api/doors."""
    comum = ler(cliente, "/js/casa_comum.js")
    assert "function gerarAvisos(" in comum
    for nivel in ['"ok"', '"alerta"', '"atencao"']:
        assert nivel in comum
    avisos = ler(cliente, "/js/avisos.js")
    assert "/api/devices" in avisos and "/api/doors" in avisos

    # A Maria do seed tem uma porta destrancada e uma janela aberta: há
    # dados reais para os avisos vermelhos.
    maria = logar(EMAIL_MULHER)
    portas = maria.get("/api/doors").get_json()["portas"]
    assert any(not porta["trancada"] for porta in portas)


def test_tags_sem_campo_de_codigo_e_com_editar(cliente):
    html = ler(cliente, "/pages/tags.html")
    assert "formulario-leitura" not in html   # decisão da equipe: só "Iniciar teste"
    js = ler(cliente, "/js/tags.js")
    assert "Iniciar teste" in js
    assert 'data-acao="editar"' in js
    assert "/api/tags/scan" in js


def test_fale_conosco_e_simulacao(cliente):
    html = ler(cliente, "/pages/fale-conosco.html")
    assert "Dados de exemplo" in html
    assert "[SIMULAÇÃO] Nenhuma mensagem é enviada nem salva." in html
    js = ler(cliente, "/js/fale_conosco.js")
    assert "chamarApi" not in js   # nada vai para o backend


def test_conteudo_da_protecao_igual_as_imagens(logar):
    conteudo = logar(EMAIL_MULHER).get("/api/protection").get_json()

    tipos = [tipo["titulo"] for tipo in conteudo["tipos_violencia"]["tipos"]]
    assert tipos[-1] == "Violência vicária" and len(tipos) == 6
    assert len(conteudo["faq"]["perguntas"]) == 8
    assert len(conteudo["contatos_confianca"]["plano_seguranca"]["itens"]) == 5

    servicos = {s["titulo"]: s["texto"] for s in conteudo["preciso_de_ajuda"]["servicos"]}
    assert servicos["Chat E.L.O."] == "Em breve"

    cards = {c["titulo"]: c["texto"] for c in conteudo["inicio"]["cards"]}
    assert cards["Contatos de confiança"] == "Pessoas e serviços que podem apoiar você."


def test_selo_novo_das_imagens_nao_aparece(cliente):
    """Os selos "NOVO" das imagens são só para a equipe."""
    for pagina in PAGINAS_ROXAS:
        html = ler(cliente, f"/pages/{pagina}.html")
        assert ">NOVO<" not in html and ">Novo<" not in html, pagina


def test_roxo_sem_placeholder_visivel(cliente):
    """Nenhuma tela roxa mostra "[FUNCIONALIDADE A SER DEFINIDA]" nem
    "[ADICIONAR ...]"."""
    for pagina in PAGINAS_ROXAS:
        html = ler(cliente, f"/pages/{pagina}.html")
        codigo = html
        for script in re.findall(r'<script src="(/js/[^"]+)"', html):
            if script != "/js/layout.js":   # o layout.js só cita o formato num comentário
                codigo += ler(cliente, script)
        assert "[FUNCIONALIDADE" not in codigo, pagina
        assert "[ADICIONAR" not in codigo, pagina


def test_configuracoes_tem_como_voce_se_identifica_e_privacidade(cliente):
    html = ler(cliente, "/pages/perfil.html")
    assert "Como você se identifica?" in html
    for valor in ["mulher", "homem", "nao_definido"]:
        assert f'value="{valor}"' in html
    assert "O administrador não vê seus contatos nem seus alertas." in html
    assert "Proteção E.L.O." not in html.split("Como você se identifica?")[1].split("</fieldset>")[0]
    escuro = ler(cliente, "/pages/escuro/configuracoes.html")
    assert "Como você se identifica?" in escuro


def test_administracao_so_mostra_o_perfil(cliente):
    """Sem seletor e sem os botões "Definir como mulher / homem"; o quadro
    de contas novas é só um aviso."""
    js = ler(cliente, "/js/escuro/admin.js")
    assert "perfil-acesso" not in js
    assert "<select" not in js
    assert "Definir como" not in js
    assert "Peça para a pessoa escolher em Configurações > Como você se identifica?" in js


def test_login_sem_a_frase_do_rodape(cliente):
    assert "Tecnologia para um lar mais simples" not in ler(cliente, "/")


def test_minha_casa_tem_consumo_e_moradores_de_exemplo(cliente):
    """"Consumo de energia" e "Moradores" mostram dados fictícios, com o selo
    "Dados de exemplo"; "Gerenciar acessos" fica desativado ("Em breve")."""
    html = ler(cliente, "/pages/dashboard.html")
    assert "Consumo de energia" in html and "Moradores" in html
    assert html.count(">Dados de exemplo<") == 2
    botao = html[html.index("Gerenciar acessos") - 200:html.index("Gerenciar acessos")]
    assert "disabled" in botao
    js = ler(cliente, "/js/dashboard.js")
    for texto in ["Média da semana", "Administradora da casa", "Morador A", "Moradora B"]:
        assert texto in js
    # Nada disso vai para a API.
    assert "chamarApi" not in trecho_da_funcao(js, "desenharConsumo")
    assert "chamarApi" not in trecho_da_funcao(js, "desenharMoradores")


def test_configuracoes_com_blocos_em_breve_desativados(cliente):
    html = ler(cliente, "/pages/perfil.html")
    for titulo in ["Perfil e conta", "Senha e segurança", "Notificações",
                   "Aparência e acessibilidade", "Privacidade"]:
        assert titulo in html, titulo
    assert html.count(">Em breve<") == 3
    # Só o formulário de "Perfil e conta" funciona; o resto fica desativado.
    depois_do_formulario = html.split("</form>")[1]
    for botao in re.findall(r"<button[^>]*>", depois_do_formulario):
        assert "disabled" in botao, botao
    assert "/api/profile" in ler(cliente, "/js/perfil.js")
