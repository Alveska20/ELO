"""
Testes da área escura (perfil homem, perfil não definido e admin).

O que é conferido:
1. o perfil homem acessa a rota da área escura (200);
2. não definido e admin também acessam (200); mulher recebe 403;
   sem login, 401;
3. o campo "tema" do /api/auth/me diz o visual de cada pessoa;
4. homem, não definido e admin continuam bloqueados na Proteção E.L.O. (403);
5. quando a pessoa escolhe "Mulher" em Configurações, o visual e a
   Proteção mudam na hora;
6. a área escura mostra só os dados do próprio usuário;
7. os dados de exemplo (consumo, moradores...) vêm marcados como fictícios;
8. nenhuma rota de admin mostra dados pessoais da área escura
   (mesma regra de privacidade da Proteção E.L.O.);
9. o login e o cadastro são neutros (não citam a Proteção).
"""
from tests.conftest import ADMIN_EMAIL, EMAIL_HOMEM, EMAIL_MULHER, EMAIL_NAO_DEFINIDO, SENHA_ADMIN
from tests.test_privacidade_admin import listar_rotas_admin

ROTA_AREA_HOMEM = "/api/men-area"


def test_perfil_homem_acessa_a_area_dele(logar):
    joao = logar(EMAIL_HOMEM)
    resposta = joao.get(ROTA_AREA_HOMEM)

    assert resposta.status_code == 200
    dados = resposta.get_json()
    # A tela Início precisa destas três partes (ver area_homem_service.py).
    assert "textos" in dados
    assert "resumo" in dados
    assert "ambientes" in dados


def test_nao_definido_e_admin_acessam_a_area_escura(logar):
    """O visual escuro vale para homem, não definido e admin."""
    assert logar(EMAIL_NAO_DEFINIDO).get(ROTA_AREA_HOMEM).status_code == 200
    assert logar(ADMIN_EMAIL, SENHA_ADMIN).get(ROTA_AREA_HOMEM).status_code == 200


def test_perfil_mulher_e_bloqueado_na_area_escura(logar):
    # A mulher usa o visual roxo: a rota da área escura responde 403.
    assert logar(EMAIL_MULHER).get(ROTA_AREA_HOMEM).status_code == 403


def test_tema_de_cada_perfil(logar):
    """O /api/auth/me diz qual visual a pessoa usa (o frontend segue isso)."""
    def tema(cliente):
        return cliente.get("/api/auth/me").get_json()["usuario"]["tema"]

    assert tema(logar(EMAIL_MULHER)) == "roxo"
    assert tema(logar(EMAIL_HOMEM)) == "escuro"
    assert tema(logar(EMAIL_NAO_DEFINIDO)) == "escuro"
    assert tema(logar(ADMIN_EMAIL, SENHA_ADMIN)) == "escuro"


def test_protecao_continua_so_para_o_perfil_mulher(logar):
    """Usar o visual escuro não libera a Proteção E.L.O. para ninguém."""
    for cliente in [logar(EMAIL_NAO_DEFINIDO), logar(ADMIN_EMAIL, SENHA_ADMIN)]:
        assert cliente.get("/api/protection").status_code == 403
        assert cliente.get("/api/trusted-contacts").status_code == 403
        assert cliente.post("/api/emergency", json={"acoes": ["alerta_contatos"]}).status_code == 403
    assert logar(EMAIL_MULHER).get("/api/protection").status_code == 200


def test_pessoa_escolhe_mulher_e_o_visual_muda_na_hora(logar):
    """Conta "não definido" -> a própria pessoa escolhe "Mulher" em
    Configurações -> visual roxo + Proteção, sem sair e entrar de novo.
    (O admin não altera o perfil de ninguém.)"""
    alex = logar(EMAIL_NAO_DEFINIDO)
    assert alex.get("/api/protection").status_code == 403

    resposta = alex.put("/api/profile", json={"perfil_acesso": "mulher"})
    assert resposta.status_code == 200

    assert alex.get("/api/auth/me").get_json()["usuario"]["tema"] == "roxo"
    assert alex.get("/api/protection").status_code == 200
    assert alex.get(ROTA_AREA_HOMEM).status_code == 403


def test_prefiro_nao_informar_fica_nao_definido_e_escuro(cliente, logar):
    """Quem responde "Prefiro não informar" no cadastro fica "não definido"
    (visual escuro, sem Proteção) até escolher outro perfil em Configurações."""
    dados = {"nome": "Conta Nova", "email": "nova@elo.exemplo", "senha": "senha-nova-123",
             "perfil_acesso": "nao_definido"}
    assert cliente.post("/api/auth/register", json=dados).status_code == 201

    nova = logar("nova@elo.exemplo", "senha-nova-123")
    usuario = nova.get("/api/auth/me").get_json()["usuario"]
    assert usuario["perfil_acesso"] == "nao_definido"
    assert usuario["tema"] == "escuro"
    assert nova.get("/api/protection").status_code == 403


def test_area_do_homem_sem_login_retorna_401(cliente):
    assert cliente.get(ROTA_AREA_HOMEM).status_code == 401


def test_perfil_homem_continua_bloqueado_na_protecao(logar):
    joao = logar(EMAIL_HOMEM)
    assert joao.get("/api/protection").status_code == 403
    assert joao.get("/api/quiz").status_code == 403
    assert joao.get("/api/trusted-contacts").status_code == 403
    assert joao.get("/api/emergency").status_code == 403
    # Tentar disparar a simulação de alerta também é barrado.
    assert joao.post("/api/emergency", json={"acoes": ["alerta_contatos"]}).status_code == 403


def test_dados_de_exemplo_sao_marcados_como_ficticios(app, logar):
    """Consumo, moradores, atividades etc. são FICTÍCIOS: a tela escura tem os
    textos dos selos e a API entrega os valores de exemplo."""
    comum = app.test_client().get("/js/escuro/comum.js").get_data(as_text=True)
    assert 'SELO_EXEMPLO = "Dados de exemplo"' in comum
    assert 'SELO_SINCRONIZANDO = "Sincronizando…"' in comum

    textos = logar(EMAIL_HOMEM).get(ROTA_AREA_HOMEM).get_json()["textos"]
    exemplos = textos["exemplos"]
    assert len(exemplos["consumo_semana"]) == 7
    # Os textos da casa vazia (mesma mensagem do roxo) também vêm do JSON.
    assert textos["casa_vazia"]["titulo"] == "Sua casa ainda está vazia"


def test_temperatura_vem_do_ar_condicionado(logar):
    """O card "Temperatura" usa a temperatura do ar-condicionado (simulado)."""
    joao = logar(EMAIL_HOMEM)
    temperatura = joao.get(ROTA_AREA_HOMEM).get_json()["temperatura"]

    ares = joao.get("/api/devices?tipo=ar_condicionado").get_json()["dispositivos"]
    assert temperatura["valor"] in [ar["temperatura"] for ar in ares]

    # Sem ar-condicionado (o admin do seed não tem casa): None, e a tela
    # mostra "Sincronizando…" em vez de inventar um número.
    admin = logar(ADMIN_EMAIL, SENHA_ADMIN)
    assert admin.get(ROTA_AREA_HOMEM).get_json()["temperatura"] is None


def test_area_do_homem_mostra_so_os_comodos_dele(logar):
    """Os "Ambientes da Casa" são os cômodos do João, nunca os da Maria."""
    joao = logar(EMAIL_HOMEM)
    ids_da_area = set()
    for ambiente in joao.get(ROTA_AREA_HOMEM).get_json()["ambientes"]:
        ids_da_area.add(ambiente["id"])

    ids_do_joao = set()
    for comodo in joao.get("/api/rooms").get_json()["comodos"]:
        ids_do_joao.add(comodo["id"])

    ids_da_maria = set()
    for comodo in logar(EMAIL_MULHER).get("/api/rooms").get_json()["comodos"]:
        ids_da_maria.add(comodo["id"])

    assert ids_da_area == ids_do_joao
    # Nenhum cômodo da Maria aparece para o João.
    assert ids_da_area.isdisjoint(ids_da_maria)


def test_admin_nao_tem_rota_nem_ve_dados_pessoais_da_area_do_homem(app, logar):
    # 1. Não existe rota de admin para a área do homem.
    for rota in listar_rotas_admin(app):
        assert "men" not in rota.lower(), f"rota de admin proibida: {rota}"
        assert "homem" not in rota.lower(), f"rota de admin proibida: {rota}"

    # 2. O João preenche um dado pessoal no perfil (telefone)...
    joao = logar(EMAIL_HOMEM)
    assert joao.put("/api/profile", json={"telefone": "(11) 95555-4444"}).status_code == 200

    # ...e nenhuma resposta de leitura do admin mostra esse telefone,
    # a senha (nem o hash) ou o conteúdo da área do homem.
    textos_sensiveis = ["95555-4444", "senha_hash", "scrypt", "FUNCIONALIDADE A SER DEFINIDA"]
    admin = logar(ADMIN_EMAIL, SENHA_ADMIN)
    for rota in listar_rotas_admin(app):
        if "<" in rota:
            continue   # rotas com <id> são de alteração/exclusão, não de leitura
        corpo = admin.get(rota).get_data(as_text=True)
        for texto in textos_sensiveis:
            assert texto not in corpo, f"{rota} mostrou '{texto}'"


def test_login_e_cadastro_sao_neutros(cliente):
    """Login e cadastro (escuros, para todos) não citam a Proteção E.L.O.

    Qualquer pessoa que abre o site vê essas páginas, inclusive quem divide
    o aparelho com a usuária. Por isso o texto, os comentários do HTML e as
    logos "Central de auxílio à mulher" não podem aparecer.
    O cadastro pergunta "Como você se identifica?" (Mulher / Homem /
    Prefiro não informar); a palavra "Mulher" aparece só como opção.
    """
    for pagina in ["/", "/pages/cadastro.html"]:
        html = cliente.get(pagina).get_data(as_text=True)
        assert "Proteção" not in html, pagina
        assert "proteção" not in html.lower(), pagina
        assert "área da mulher" not in html.lower(), pagina
        assert "auxílio à mulher" not in html.lower(), pagina
        assert "logo" not in html.lower(), pagina

    # No login, nem a palavra "mulher".
    assert "mulher" not in cliente.get("/").get_data(as_text=True).lower()

    # No cadastro, só as 3 opções da pergunta.
    cadastro = cliente.get("/pages/cadastro.html").get_data(as_text=True)
    assert "Como você se identifica?" in cadastro
    for valor, texto in [("mulher", "Mulher"), ("homem", "Homem"), ("nao_definido", "Prefiro não informar")]:
        assert f'value="{valor}"' in cadastro
        assert f"<span>{texto}</span>" in cadastro
    assert 'name="papel"' not in cadastro
