"""
Testes de login, sessão e permissões (requisitos do projeto, seção 13).

Como ler um teste: cada um faz uma requisição e usa "assert" para
conferir o resultado. Se o assert for falso, o pytest mostra o teste
como FAILED e diz qual linha falhou.
"""
from tests.conftest import ADMIN_EMAIL, EMAIL_HOMEM, EMAIL_MULHER, EMAIL_NAO_DEFINIDO, SENHA_ADMIN


def test_cadastro_e_login_funcionam(cliente):
    cadastro = cliente.post("/api/auth/register", json={
        "nome": "Bia", "email": "bia@teste.com", "senha": "12345678",
    })
    assert cadastro.status_code == 201

    login = cliente.post("/api/auth/login", json={"email": "bia@teste.com", "senha": "12345678"})
    assert login.status_code == 200

    # Depois do login, a sessão funciona: /me diz quem está logado.
    eu = cliente.get("/api/auth/me").get_json()["usuario"]
    assert eu["email"] == "bia@teste.com"
    # Conta nova é sempre usuário comum. Sem a resposta de "Como você se
    # identifica?", o perfil fica "não definido".
    assert eu["papel"] == "usuario"
    assert eu["perfil_acesso"] == "nao_definido"


def cadastrar_e_ver(app, email, extras):
    """Cadastra uma conta com os campos extras e devolve o /me dela."""
    cliente = app.test_client()
    dados = {"nome": "Teste", "email": email, "senha": "12345678"}
    dados.update(extras)
    assert cliente.post("/api/auth/register", json=dados).status_code == 201
    cliente.post("/api/auth/login", json={"email": email, "senha": "12345678"})
    return cliente.get("/api/auth/me").get_json()["usuario"]


def test_cadastro_aceita_os_3_perfis_e_ignora_o_papel(app):
    """"Como você se identifica?" aceita mulher, homem e
    nao_definido. O papel NUNCA vem do formulário: ninguém vira admin."""
    for posicao, perfil in enumerate(["mulher", "homem", "nao_definido"]):
        eu = cadastrar_e_ver(app, f"conta{posicao}@teste.com", {"perfil_acesso": perfil, "papel": "admin"})
        assert eu["perfil_acesso"] == perfil
        assert eu["papel"] == "usuario"


def test_cadastro_com_perfil_invalido_vira_nao_definido(app):
    """Qualquer valor fora dos 3 aceitos vira "nao_definido"."""
    for posicao, valor in enumerate(["admin", "MULHER", "", None, 123, ["mulher"]]):
        eu = cadastrar_e_ver(app, f"invalido{posicao}@teste.com", {"perfil_acesso": valor})
        assert eu["perfil_acesso"] == "nao_definido", valor
        assert eu["papel"] == "usuario"


def test_senha_errada_retorna_401(cliente):
    resposta = cliente.post("/api/auth/login", json={"email": EMAIL_MULHER, "senha": "senha-errada"})
    assert resposta.status_code == 401
    assert "erro" in resposta.get_json()


def test_logout_encerra_a_sessao(logar):
    maria = logar(EMAIL_MULHER)
    maria.post("/api/auth/logout")
    assert maria.get("/api/auth/me").status_code == 401


def test_rota_protegida_sem_login_retorna_401(cliente):
    rotas = ["/api/auth/me", "/api/dashboard", "/api/rooms", "/api/devices",
             "/api/tags", "/api/profile", "/api/protection", "/api/admin/users"]
    for rota in rotas:
        assert cliente.get(rota).status_code == 401, rota


def test_usuario_comum_em_rota_admin_retorna_403(logar):
    maria = logar(EMAIL_MULHER)
    assert maria.get("/api/admin/users").status_code == 403

    # E o admin entra normalmente.
    admin = logar(ADMIN_EMAIL, SENHA_ADMIN)
    assert admin.get("/api/admin/users").status_code == 200


def test_sem_perfil_mulher_em_protection_retorna_403(logar):
    # Homem e "não definido" não acessam a Proteção E.L.O.
    for email in [EMAIL_HOMEM, EMAIL_NAO_DEFINIDO]:
        assert logar(email).get("/api/protection").status_code == 403, email

    # Nem o admin (o perfil dele é "não definido").
    assert logar(ADMIN_EMAIL, SENHA_ADMIN).get("/api/protection").status_code == 403

    # Perfil mulher acessa.
    assert logar(EMAIL_MULHER).get("/api/protection").status_code == 200


def test_admin_nao_altera_o_perfil_de_ninguem(app, logar):
    """A rota PUT /api/admin/users/<id>/perfil-acesso não existe.
    Nem o admin nem um usuário comum conseguem mudar o perfil de outra pessoa."""
    admin = logar(ADMIN_EMAIL, SENHA_ADMIN)
    joao_id = None
    for usuario in admin.get("/api/admin/users").get_json()["usuarios"]:
        if usuario["email"] == EMAIL_HOMEM:
            joao_id = usuario["id"]

    for cliente in [admin, logar(EMAIL_MULHER)]:
        resposta = cliente.put(f"/api/admin/users/{joao_id}/perfil-acesso", json={"perfil_acesso": "mulher"})
        assert resposta.status_code in (403, 404, 405)

    # Nenhuma rota de admin aceita PUT (a lista de rotas vem do próprio Flask).
    for regra in app.url_map.iter_rules():
        if regra.rule.startswith("/api/admin"):
            assert "PUT" not in regra.methods, regra.rule

    assert logar(EMAIL_HOMEM).get("/api/profile").get_json()["usuario"]["perfil_acesso"] == "homem"


def test_a_propria_pessoa_muda_o_perfil_e_vale_na_hora(logar):
    """O João escolhe "Mulher" em Configurações e já acessa a
    Proteção, sem sair e entrar de novo."""
    joao = logar(EMAIL_HOMEM)
    assert joao.get("/api/protection").status_code == 403

    resposta = joao.put("/api/profile", json={"perfil_acesso": "mulher"})
    assert resposta.status_code == 200
    assert resposta.get_json()["usuario"]["tema"] == "roxo"
    assert joao.get("/api/protection").status_code == 200


def test_configuracoes_aceita_so_os_3_perfis_e_ignora_o_papel(logar):
    """Mesma regra do cadastro: só mulher, homem ou nao_definido; o resto vira
    nao_definido. O papel nunca muda por formulário."""
    alex = logar(EMAIL_NAO_DEFINIDO)
    for perfil in ["mulher", "homem", "nao_definido"]:
        eu = alex.put("/api/profile", json={"perfil_acesso": perfil, "papel": "admin"}).get_json()["usuario"]
        assert eu["perfil_acesso"] == perfil
        assert eu["papel"] == "usuario"

    eu = alex.put("/api/profile", json={"perfil_acesso": "admin"}).get_json()["usuario"]
    assert eu["perfil_acesso"] == "nao_definido"

    # Editar só o telefone não mexe no perfil.
    alex.put("/api/profile", json={"perfil_acesso": "homem"})
    eu = alex.put("/api/profile", json={"telefone": "(11) 90000-0000"}).get_json()["usuario"]
    assert eu["perfil_acesso"] == "homem"
