"""
Regras do quiz educativo.

- Só perguntas com ativo = 1 aparecem e entram na contagem ("1 de 10").
- A resposta certa NÃO vai junto com as perguntas: o frontend só descobre
  se acertou depois de responder (POST /api/quiz/answer).
- As respostas da usuária NÃO são salvas (doc, seção 11: não guardar
  histórico de quiz sem necessidade). O resultado é calculado na tela.
- O quiz é educativo: não dá diagnóstico sobre a vida de ninguém.
"""
from app.database.db import get_db
from app.services.protecao_service import ler_arquivo_de_conteudo


def listar_alternativas(pergunta_id):
    """Alternativas sem o campo "correta", para não entregar a resposta."""
    linhas = get_db().execute(
        "SELECT letra, texto FROM quiz_alternativas WHERE pergunta_id = ? ORDER BY letra",
        (pergunta_id,),
    ).fetchall()

    alternativas = []
    for linha in linhas:
        alternativas.append({"letra": linha["letra"], "texto": linha["texto"]})
    return alternativas


def listar_perguntas_ativas():
    linhas = get_db().execute(
        "SELECT id, ordem, texto FROM quiz_perguntas WHERE ativo = 1 ORDER BY ordem"
    ).fetchall()

    perguntas = []
    for linha in linhas:
        perguntas.append({
            "id": linha["id"],
            "texto": linha["texto"],
            "alternativas": listar_alternativas(linha["id"]),
        })
    return perguntas


def texto_do_resultado():
    """O texto final do quiz fica no quiz.json (vem do doc, seção 8)."""
    dados = ler_arquivo_de_conteudo("quiz.json")
    return dados["texto_resultado"]


def corrigir_resposta(pergunta_id, letra):
    """Confere a resposta. Devolve None se a pergunta não existir ou estiver inativa.

    Nada é gravado no banco: a função só lê e compara.
    """
    pergunta = get_db().execute(
        "SELECT id, explicacao FROM quiz_perguntas WHERE id = ? AND ativo = 1", (pergunta_id,)
    ).fetchone()
    if pergunta is None:
        return None

    certa = get_db().execute(
        "SELECT letra FROM quiz_alternativas WHERE pergunta_id = ? AND correta = 1", (pergunta_id,)
    ).fetchone()

    return {
        "correta": certa is not None and letra == certa["letra"],
        "resposta_certa": certa["letra"] if certa is not None else None,
        "explicacao": pergunta["explicacao"],
    }
