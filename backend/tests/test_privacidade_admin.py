"""
Regra de privacidade (requisitos do projeto, seção 7.12): o admin NÃO pode ver alertas
de emergência, contatos de confiança nem dados do quiz dos usuários.

Dois testes:
1. nenhuma rota /api/admin tem a ver com esses assuntos;
2. depois de gerar alertas e contatos, nenhuma resposta do admin
   mostra esses dados.
"""
from tests.conftest import ADMIN_EMAIL, EMAIL_MULHER, SENHA_ADMIN

# Palavras que não podem aparecer em nenhuma rota de admin.
PALAVRAS_PROIBIDAS = ["contact", "contato", "alert", "alerta", "emergenc", "quiz", "consent", "trusted"]


def listar_rotas_admin(app):
    """Todas as URLs registradas que começam com /api/admin."""
    rotas = []
    for regra in app.url_map.iter_rules():
        if str(regra).startswith("/api/admin"):
            rotas.append(str(regra))
    return rotas


def test_admin_nao_tem_rota_para_alertas_contatos_ou_quiz(app):
    rotas = listar_rotas_admin(app)
    assert len(rotas) > 0   # garante que o teste está olhando para algo

    for rota in rotas:
        for palavra in PALAVRAS_PROIBIDAS:
            assert palavra not in rota.lower(), f"rota de admin proibida: {rota}"


def test_respostas_do_admin_nao_mostram_dados_sensiveis(app, logar):
    # Gera dados sensíveis: a Maria simula um alerta e cadastra um contato.
    maria = logar(EMAIL_MULHER)
    maria.post("/api/emergency", json={"acoes": ["alerta_contatos", "compartilhar_localizacao"]})
    maria.post("/api/trusted-contacts", json={"nome": "Contato Secreto", "telefone": "(11) 97777-6666"})

    textos_sensiveis = [
        "Contato Secreto", "97777-6666",            # contato de confiança
        "Contato fictício", "90000-0001",            # contatos do seed
        "alerta_contatos", "compartilhar_localizacao",  # alertas
        "consentimento",                             # configurações de proteção
        "Controle do celular",                       # texto do quiz (cenário 1)
        "senha_hash", "scrypt",                      # senha (nem o hash pode sair)
    ]

    admin = logar(ADMIN_EMAIL, SENHA_ADMIN)
    for rota in listar_rotas_admin(app):
        if "<" in rota:
            continue   # rotas com <id> são de alteração/exclusão, não de leitura
        corpo = admin.get(rota).get_data(as_text=True)
        for texto in textos_sensiveis:
            assert texto not in corpo, f"{rota} mostrou '{texto}'"


def test_admin_tambem_e_barrado_nas_rotas_da_protecao(logar):
    """O papel de admin não dá acesso à Proteção E.L.O. de ninguém."""
    admin = logar(ADMIN_EMAIL, SENHA_ADMIN)
    assert admin.get("/api/trusted-contacts").status_code == 403
    assert admin.get("/api/emergency").status_code == 403
    assert admin.get("/api/quiz").status_code == 403
