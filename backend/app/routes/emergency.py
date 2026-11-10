"""
Rotas da área "Preciso de ajuda": /api/emergency  (somente perfil mulher)

GET  /api/emergency            ações configuradas + contatos de confiança
PUT  /api/emergency/settings   salva as configurações de emergência
                               corpo: {"acao_alertar_contatos": true, "acao_compartilhar_localizacao": false}
POST /api/emergency            SIMULA as ações   corpo opcional: {"acoes": ["alerta_contatos"]}
                               sem "acoes", usa as ações marcadas nas configurações

GET e PUT /settings são acréscimos à lista dos requisitos do projeto: guardam as
"configurações de emergência" pedidas para a área de Proteção.

Nada é enviado de verdade: sem ligações, SMS ou integração com serviços oficiais.
"""
from flask import Blueprint, g, jsonify

from app.services import contatos_service, emergencia_service
from app.utils.decorators import acesso_mulher_required
from app.utils.requisicao import ler_json
from app.utils.respostas import erro

bp = Blueprint("emergency", __name__, url_prefix="/api/emergency")


@bp.get("")
@acesso_mulher_required
def situacao():
    usuario_id = g.usuario["id"]
    return jsonify({
        "configuracoes": emergencia_service.ler_configuracoes(usuario_id),
        "contatos": contatos_service.listar_contatos(usuario_id),
    })


@bp.put("/settings")
@acesso_mulher_required
def salvar_configuracoes():
    dados = ler_json()
    # Só estes dois campos podem ser alterados por esta rota.
    permitidos = {}
    for chave in ["acao_alertar_contatos", "acao_compartilhar_localizacao"]:
        if chave in dados:
            permitidos[chave] = dados[chave]

    emergencia_service.salvar_configuracoes(g.usuario["id"], permitidos)
    return jsonify({"configuracoes": emergencia_service.ler_configuracoes(g.usuario["id"])})


@bp.post("")
@acesso_mulher_required
def simular():
    usuario_id = g.usuario["id"]
    dados = ler_json()

    if "acoes" in dados and isinstance(dados["acoes"], list):
        # Mantém só as ações conhecidas (ignora qualquer outro texto).
        acoes = []
        for acao in dados["acoes"]:
            if acao in emergencia_service.ACOES:
                acoes.append(acao)
    else:
        acoes = emergencia_service.acoes_configuradas(usuario_id)

    if len(acoes) == 0:
        return erro("Escolha pelo menos uma ação.", 400)

    mensagens = emergencia_service.executar(usuario_id, acoes)
    return jsonify({"mensagens": mensagens})
