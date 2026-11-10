"""
Conteúdo da área Proteção E.L.O.

Os textos ficam em content/protecao.json (copiados do doc da equipe),
e não no código, para a equipe poder editar sem programar.
"""
import json
import os

PASTA_CONTEUDO = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "content")


def ler_arquivo_de_conteudo(nome_arquivo):
    """Lê um arquivo .json da pasta content/ e devolve como dict.

    O arquivo é lido a cada chamada (não fica guardado na memória). Assim,
    quando a equipe edita um texto, a mudança aparece sem reiniciar o servidor.
    """
    caminho = os.path.join(PASTA_CONTEUDO, nome_arquivo)
    with open(caminho, encoding="utf-8") as arquivo:
        return json.load(arquivo)


def remover_anotacoes(dados):
    """Tira as chaves que começam com "_" (ex.: "_fonte", "_como_editar").

    Elas são anotações para a equipe dentro do JSON, não texto para a tela.
    A função chama a si mesma para limpar também os dicts e listas de dentro.
    """
    if isinstance(dados, dict):
        limpo = {}
        for chave, valor in dados.items():
            if not chave.startswith("_"):
                limpo[chave] = remover_anotacoes(valor)
        return limpo

    if isinstance(dados, list):
        lista_limpa = []
        for item in dados:
            lista_limpa.append(remover_anotacoes(item))
        return lista_limpa

    return dados


def obter_conteudo():
    """Todo o conteúdo da Proteção E.L.O., pronto para enviar ao frontend."""
    return remover_anotacoes(ler_arquivo_de_conteudo("protecao.json"))
