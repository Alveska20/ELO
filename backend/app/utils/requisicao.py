"""
Funções para ler e converter os dados que chegam nas requisições.

Tudo que vem do navegador pode chegar faltando ou no formato errado
(ex.: "5" em vez de 5). Estas funções tratam esses casos num lugar só.
"""
from flask import request


def ler_json():
    """Lê o corpo da requisição como dict.

    silent=True: se o corpo não for JSON válido, devolve None em vez de dar erro.
    Se vier None (ou uma lista, por exemplo), devolvemos um dict vazio,
    para o .get() das rotas sempre funcionar.
    """
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict):
        return {}
    return dados


def para_inteiro(valor):
    """Converte para int. Devolve None se não for um número inteiro válido."""
    if valor is None or valor == "" or isinstance(valor, bool):
        return None
    try:
        return int(valor)
    except (TypeError, ValueError):
        return None


def para_sim_nao(valor):
    """Converte para 1 (sim) ou 0 (não), o formato dos campos sim/não do banco.

    Aceita True/False do JSON e também 1/0 ou "true"/"1" vindos de formulários.
    """
    if valor is True or valor == 1 or valor == "1" or valor == "true":
        return 1
    return 0


def texto(valor):
    """Devolve o texto sem espaços nas pontas ("" se vier vazio ou None)."""
    if valor is None:
        return ""
    return str(valor).strip()
