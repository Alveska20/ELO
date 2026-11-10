"""
Testes da área Proteção E.L.O.: quiz, contatos de confiança e emergência.
"""
import sqlite3

from tests.conftest import EMAIL_MULHER


def test_quiz_mostra_so_perguntas_ativas_e_sem_a_resposta(logar):
    maria = logar(EMAIL_MULHER)
    dados = maria.get("/api/quiz").get_json()

    # Os 10 cenários do doc (seção 8), todos ativos.
    assert dados["total"] == 10
    assert len(dados["perguntas"]) == 10
    # A resposta certa não pode ir junto com as perguntas.
    assert "correta" not in str(dados)


def test_resposta_do_quiz_nao_e_salva(app, logar):
    maria = logar(EMAIL_MULHER)
    pergunta = maria.get("/api/quiz").get_json()["perguntas"][0]

    # Cenário 1 do doc ("Controle do celular"): a resposta certa é B.
    resposta = maria.post("/api/quiz/answer", json={"pergunta_id": pergunta["id"], "letra": "B"})
    assert resposta.get_json()["correta"] is True

    # Nenhuma tabela do banco guarda respostas do quiz.
    conexao = sqlite3.connect(app.config["DATABASE"])
    tabelas = []
    for linha in conexao.execute("SELECT name FROM sqlite_master WHERE type = 'table'"):
        tabelas.append(linha[0])
    conexao.close()
    for tabela in tabelas:
        assert "resposta" not in tabela


def test_contato_exige_consentimento(app, logar):
    # O Alex vira perfil mulher, mas ainda não aceitou o aviso de privacidade.
    conexao = sqlite3.connect(app.config["DATABASE"])
    conexao.execute("UPDATE usuarios SET perfil_acesso = 'mulher' WHERE email = 'alex@elo.exemplo'")
    conexao.commit()
    conexao.close()

    alex = logar("alex@elo.exemplo")
    novo = {"nome": "Amiga", "telefone": "(11) 98888-7777"}
    assert alex.post("/api/trusted-contacts", json=novo).status_code == 400

    alex.post("/api/trusted-contacts/consent")
    assert alex.post("/api/trusted-contacts", json=novo).status_code == 201


def test_emergencia_e_somente_simulacao(logar):
    maria = logar(EMAIL_MULHER)
    resposta = maria.post("/api/emergency", json={"acoes": ["alerta_contatos"]})
    assert resposta.status_code == 200
    for mensagem in resposta.get_json()["mensagens"]:
        assert mensagem.startswith("[SIMULAÇÃO]")


def test_textos_dos_cards_orientacoes_e_configuracoes(logar):
    """Os cards "Orientações" e "Configurações" têm texto de verdade (sem
    placeholder); o de Configurações segue docs/proposta/07-protecao-inicio.png."""
    cards = logar(EMAIL_MULHER).get("/api/protection").get_json()["inicio"]["cards"]
    textos = {card["titulo"]: card["texto"] for card in cards}

    assert textos["Orientações"] == "Sinais de alerta, como buscar ajuda, rede de apoio e plano de segurança."
    assert textos["Configurações de emergência"] == (
        "Escolha os contatos e as ações do botão Preciso de ajuda."
    )
