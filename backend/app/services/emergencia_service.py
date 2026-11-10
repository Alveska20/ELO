"""
Regras da área "Preciso de ajuda" (somente perfil mulher).

TUDO AQUI É SIMULAÇÃO. Nenhuma ligação, SMS, mensagem ou localização real
é enviada, e não há integração com serviços oficiais. As mensagens de
resposta começam com [SIMULAÇÃO] para deixar isso claro na tela.

O que fica gravado em alertas_emergencia: só o tipo da ação e a hora.
Nenhuma localização, mensagem ou relato (doc, seção 11).
O admin NÃO tem rota para ver estes registros.
"""
from app.database.db import get_db
from app.services.contatos_service import listar_contatos, obter_configuracoes
from app.utils.requisicao import para_sim_nao

# Ações que o botão PRECISO DE AJUDA pode simular.
ACOES = ("alerta_contatos", "compartilhar_localizacao")


def configuracoes_para_dict(linha):
    return {
        "acao_alertar_contatos": bool(linha["acao_alertar_contatos"]),
        "acao_compartilhar_localizacao": bool(linha["acao_compartilhar_localizacao"]),
    }


def ler_configuracoes(usuario_id):
    return configuracoes_para_dict(obter_configuracoes(usuario_id))


def salvar_configuracoes(usuario_id, dados):
    """Atualiza só as ações enviadas; as outras ficam como estavam."""
    atuais = ler_configuracoes(usuario_id)
    atuais.update(dados)

    conexao = get_db()
    conexao.execute(
        "UPDATE configuracoes_protecao SET acao_alertar_contatos = ?, acao_compartilhar_localizacao = ? "
        "WHERE usuario_id = ?",
        (para_sim_nao(atuais["acao_alertar_contatos"]),
         para_sim_nao(atuais["acao_compartilhar_localizacao"]),
         usuario_id),
    )
    conexao.commit()


def acoes_configuradas(usuario_id):
    """Lista das ações marcadas nas configurações de emergência."""
    configuracoes = ler_configuracoes(usuario_id)
    acoes = []
    if configuracoes["acao_alertar_contatos"]:
        acoes.append("alerta_contatos")
    if configuracoes["acao_compartilhar_localizacao"]:
        acoes.append("compartilhar_localizacao")
    return acoes


def registrar_alerta(usuario_id, tipo):
    get_db().execute(
        "INSERT INTO alertas_emergencia (usuario_id, tipo) VALUES (?, ?)", (usuario_id, tipo)
    )


def simular_alerta_contatos(usuario_id, contatos):
    if len(contatos) == 0:
        return ["[SIMULAÇÃO] Nenhum contato de confiança cadastrado. Nenhum alerta foi enviado."]

    mensagens = []
    for contato in contatos:
        mensagens.append(f"[SIMULAÇÃO] Alerta enviado para contato configurado: {contato['nome']}.")
    registrar_alerta(usuario_id, "alerta_contatos")
    return mensagens


def simular_localizacao(usuario_id, contatos):
    if len(contatos) == 0:
        return ["[SIMULAÇÃO] Nenhum contato de confiança cadastrado. Nenhuma localização foi compartilhada."]

    registrar_alerta(usuario_id, "compartilhar_localizacao")
    return [
        "[SIMULAÇÃO] Localização compartilhada com os contatos configurados. "
        "Nenhuma localização real foi coletada."
    ]


def executar(usuario_id, acoes):
    """Simula as ações escolhidas e devolve as mensagens para mostrar na tela."""
    contatos = listar_contatos(usuario_id)
    mensagens = []

    if "alerta_contatos" in acoes:
        mensagens.extend(simular_alerta_contatos(usuario_id, contatos))
    if "compartilhar_localizacao" in acoes:
        mensagens.extend(simular_localizacao(usuario_id, contatos))

    get_db().commit()
    return mensagens
