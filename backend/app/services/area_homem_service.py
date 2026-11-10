"""
Área escura (tela Início do Figma 06-perfil-homem/01-inicio-hifi.png).

Usada pelo perfil homem, pelo perfil não definido e pelo admin
(ver tema_do_usuario em auth_service.py).

Quem usa o visual escuro usa a MESMA casa inteligente dos outros perfis (cômodos,
dispositivos, automações, Tags), com as mesmas rotas e os dados de cada
usuário. Por isso não existe tabela nova: este service só junta, para a
tela Início dele, números que já existem no banco + os textos de
content/homem.json.

Nada aqui lê dados da Proteção E.L.O. (contatos, alertas, quiz).
"""
from app.database.db import get_db
from app.services.dashboard_service import montar_resumo
from app.services.protecao_service import ler_arquivo_de_conteudo, remover_anotacoes

# Cômodos com o total de dispositivos e quantos estão ativos.
# "Ativo" = ligado, ou aberto (cortina/persiana/janela): mesma regra do Dashboard.
# SUM(CASE ...) soma 1 para cada dispositivo ativo e 0 para os outros.
# LEFT JOIN: cômodo sem nenhum dispositivo também aparece (com 0).
SQL_AMBIENTES = """
    SELECT c.id, c.nome,
           COUNT(d.id) AS total_dispositivos,
           SUM(CASE WHEN d.estado IN ('ligado', 'aberta') THEN 1 ELSE 0 END) AS ativos
    FROM comodos c
    LEFT JOIN dispositivos d ON d.comodo_id = c.id
    WHERE c.usuario_id = ?
    GROUP BY c.id
    ORDER BY c.nome
"""


def obter_textos():
    """Textos da área do homem, sem as anotações "_fonte" / "_como_editar"."""
    return remover_anotacoes(ler_arquivo_de_conteudo("homem.json"))


def listar_ambientes(usuario_id):
    """Cards "Ambientes da Casa": um por cômodo, com nº de dispositivos e ativos."""
    linhas = get_db().execute(SQL_AMBIENTES, (usuario_id,)).fetchall()
    ambientes = []
    for linha in linhas:
        ativos = linha["ativos"]
        if ativos is None:
            # Sem dispositivos no cômodo, o SUM devolve None (vazio).
            ativos = 0
        ambientes.append({
            "id": linha["id"],
            "nome": linha["nome"],
            "total_dispositivos": linha["total_dispositivos"],
            "ativos": ativos,
        })
    return ambientes


# Temperatura do card "Temperatura": a do ar-condicionado do usuário.
# Prefere um que esteja ligado; ORDER BY estado = 'ligado' DESC põe os
# ligados primeiro (verdadeiro = 1, falso = 0).
SQL_TEMPERATURA = """
    SELECT d.temperatura, d.estado, c.nome AS comodo_nome
    FROM dispositivos d
    LEFT JOIN comodos c ON c.id = d.comodo_id
    WHERE d.usuario_id = ? AND d.tipo = 'ar_condicionado' AND d.temperatura IS NOT NULL
    ORDER BY d.estado = 'ligado' DESC, d.id
    LIMIT 1
"""


def temperatura_do_ar(usuario_id):
    """Temperatura configurada no ar-condicionado (simulado), ou None se não houver."""
    linha = get_db().execute(SQL_TEMPERATURA, (usuario_id,)).fetchone()
    if linha is None:
        return None
    return {
        "valor": linha["temperatura"],
        "ligado": linha["estado"] == "ligado",
        "comodo": linha["comodo_nome"],
    }


def montar_inicio(usuario_id):
    """Tudo o que a tela Início do perfil homem precisa, numa resposta só.

    Reaproveita o resumo do Dashboard (mesmos números para todos os perfis)
    e acrescenta a lista de ambientes e os textos.
    """
    return {
        "textos": obter_textos(),
        "resumo": montar_resumo(usuario_id),
        "ambientes": listar_ambientes(usuario_id),
        "temperatura": temperatura_do_ar(usuario_id),
    }
