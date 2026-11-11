"""
Testes da casa inteligente: dispositivos, Tags e isolamento entre usuários.
"""
import sqlite3

from tests.conftest import EMAIL_HOMEM, EMAIL_MULHER, EMAIL_NAO_DEFINIDO


def buscar_por_nome(lista, nome):
    """Acha um item pelo nome numa lista vinda da API (ou None)."""
    for item in lista:
        if item["nome"] == nome:
            return item
    return None


def test_alterar_estado_de_dispositivo(logar):
    maria = logar(EMAIL_MULHER)
    dispositivos = maria.get("/api/devices").get_json()["dispositivos"]
    luz = buscar_por_nome(dispositivos, "Luz do quarto")
    assert luz["estado"] == "desligado"   # assim está no seed

    # Liga...
    resposta = maria.patch(f"/api/devices/{luz['id']}/toggle")
    assert resposta.status_code == 200
    assert resposta.get_json()["dispositivo"]["estado"] == "ligado"

    # ...e desliga de novo.
    resposta = maria.patch(f"/api/devices/{luz['id']}/toggle")
    assert resposta.get_json()["dispositivo"]["estado"] == "desligado"


def test_cortina_abre_e_fecha_em_vez_de_ligar(logar):
    maria = logar(EMAIL_MULHER)
    cortina = buscar_por_nome(maria.get("/api/devices").get_json()["dispositivos"], "Cortina da sala")
    resposta = maria.patch(f"/api/devices/{cortina['id']}/toggle")
    assert resposta.get_json()["dispositivo"]["estado"] == "fechada"


def test_simular_leitura_de_tag_retorna_destino_certo(logar):
    maria = logar(EMAIL_MULHER)
    sala = buscar_por_nome(maria.get("/api/rooms").get_json()["comodos"], "Sala")

    # Tag "Sala" -> página do cômodo Sala dela. O código não diferencia maiúsculas.
    resposta = maria.post("/api/tags/scan", json={"codigo": "sala"})
    assert resposta.status_code == 200
    assert resposta.get_json()["destino"] == f"/pages/comodo.html?id={sala['id']}"

    # Tags de Proteção e Emergência funcionam para o perfil mulher.
    assert maria.post("/api/tags/scan", json={"codigo": "PROTECAO"}).get_json()["destino"] == "/pages/protecao.html"
    assert maria.post("/api/tags/scan", json={"codigo": "EMERGENCIA"}).get_json()["destino"] == "/pages/protecao-ajuda.html"


def test_tag_de_protecao_nao_abre_para_outros_perfis(app, logar):
    """Uma Tag de Proteção ou Emergência só abre para o perfil mulher.
    Como o perfil não muda depois de definido, a única forma de uma conta
    "homem" ter essas Tags é alguém gravar direto no banco: mesmo assim,
    a leitura responde 403."""
    conexao = sqlite3.connect(app.config["DATABASE"])
    joao_id = conexao.execute("SELECT id FROM usuarios WHERE email = ?", (EMAIL_HOMEM,)).fetchone()[0]
    conexao.executemany(
        "INSERT INTO tags (usuario_id, nome, codigo, funcao) VALUES (?, ?, ?, ?)",
        [(joao_id, "Proteção", "PROTECAO", "abrir_protecao"),
         (joao_id, "Emergência", "EMERGENCIA", "abrir_emergencia")],
    )
    conexao.commit()
    conexao.close()

    joao = logar(EMAIL_HOMEM)
    assert joao.post("/api/tags/scan", json={"codigo": "PROTECAO"}).status_code == 403
    assert joao.post("/api/tags/scan", json={"codigo": "EMERGENCIA"}).status_code == 403


def test_maria_nao_esconde_a_protecao_trocando_o_perfil(logar):
    """Alguém com o celular da Maria tenta trocar o perfil dela para "homem":
    recebe 403, e as Tags de Proteção e Emergência continuam abrindo."""
    maria = logar(EMAIL_MULHER)
    assert maria.put("/api/profile", json={"perfil_acesso": "homem"}).status_code == 403
    assert maria.post("/api/tags/scan", json={"codigo": "PROTECAO"}).status_code == 200
    assert maria.post("/api/tags/scan", json={"codigo": "EMERGENCIA"}).status_code == 200


def test_seed_so_da_tags_de_protecao_para_a_maria(logar):
    """Só a Maria (perfil mulher) recebe as Tags "Proteção" e "Emergência"."""
    funcoes_da_maria = {t["funcao"] for t in logar(EMAIL_MULHER).get("/api/tags").get_json()["tags"]}
    assert {"abrir_protecao", "abrir_emergencia"} <= funcoes_da_maria

    for email in [EMAIL_HOMEM, EMAIL_NAO_DEFINIDO]:
        tags = logar(email).get("/api/tags").get_json()["tags"]
        assert [t["nome"] for t in tags] == ["Sala"], email


def test_quem_nao_e_mulher_nao_cria_nem_edita_tag_de_protecao(logar):
    """Criar ou editar Tag com "abrir_protecao" ou "abrir_emergencia"
    sem ser perfil mulher responde 403. A Maria pode."""
    for funcao in ["abrir_protecao", "abrir_emergencia"]:
        nova = {"nome": "Teste", "codigo": f"T-{funcao}", "funcao": funcao}
        for email in [EMAIL_HOMEM, EMAIL_NAO_DEFINIDO]:
            cliente = logar(email)
            assert cliente.post("/api/tags", json=nova).status_code == 403, (email, funcao)
            sala = cliente.get("/api/tags").get_json()["tags"][0]
            assert cliente.put(f"/api/tags/{sala['id']}", json={"funcao": funcao}).status_code == 403
        assert logar(EMAIL_MULHER).post("/api/tags", json=nova).status_code == 201


def test_tag_desativada_ou_desconhecida_nao_abre(logar):
    maria = logar(EMAIL_MULHER)
    assert maria.post("/api/tags/scan", json={"codigo": "NAO-EXISTE"}).status_code == 404

    tag = buscar_por_nome(maria.get("/api/tags").get_json()["tags"], "Sala")
    maria.put(f"/api/tags/{tag['id']}", json={"ativo": False})
    assert maria.post("/api/tags/scan", json={"codigo": "SALA"}).status_code == 400


def test_usuario_nao_mexe_nos_dados_de_outro(logar):
    """Um usuário nunca vê nem altera dados de outro: a resposta é 404."""
    maria = logar(EMAIL_MULHER)
    joao = logar(EMAIL_HOMEM)
    luz_da_maria = buscar_por_nome(maria.get("/api/devices").get_json()["dispositivos"], "Luz da sala")

    assert joao.patch(f"/api/devices/{luz_da_maria['id']}/toggle").status_code == 404
    assert joao.delete(f"/api/devices/{luz_da_maria['id']}").status_code == 404

    # O dispositivo da Maria continua lá.
    assert buscar_por_nome(maria.get("/api/devices").get_json()["dispositivos"], "Luz da sala") is not None


def test_automacao_modo_noite_aplica_as_acoes(logar):
    maria = logar(EMAIL_MULHER)
    modo_noite = buscar_por_nome(maria.get("/api/automations").get_json()["automacoes"], "Modo Noite")

    resultado = maria.post(f"/api/automations/{modo_noite['id']}/run").get_json()
    assert resultado["mensagem"].startswith("[SIMULAÇÃO]")

    luz = buscar_por_nome(maria.get("/api/devices").get_json()["dispositivos"], "Luz da sala")
    assert luz["estado"] == "desligado"
