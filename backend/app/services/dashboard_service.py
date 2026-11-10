"""
Números e resumo mostrados em "Minha casa" (tela inicial roxa)
e no Início escuro (via area_homem_service).

Só faz contagens no banco; não altera nada.
"""
from app.database.db import get_db
from app.services.dispositivos_service import listar_dispositivos
from app.services.portas_service import avisos_de_seguranca


def contar(sql, usuario_id):
    """Roda um SELECT COUNT(*) filtrado pelo usuário e devolve o número."""
    return get_db().execute(sql, (usuario_id,)).fetchone()[0]


def montar_resumo(usuario_id):
    total_dispositivos = contar("SELECT COUNT(*) FROM dispositivos WHERE usuario_id = ?", usuario_id)
    # "Ativo" = ligado, ou aberto (cortina/persiana/janela). Mesma regra de dispositivos_service.
    dispositivos_ativos = contar(
        "SELECT COUNT(*) FROM dispositivos WHERE usuario_id = ? AND estado IN ('ligado', 'aberta')",
        usuario_id,
    )
    total_comodos = contar("SELECT COUNT(*) FROM comodos WHERE usuario_id = ?", usuario_id)
    total_automacoes = contar("SELECT COUNT(*) FROM automacoes WHERE usuario_id = ?", usuario_id)
    automacoes_ativas = contar(
        "SELECT COUNT(*) FROM automacoes WHERE usuario_id = ? AND ativo = 1", usuario_id
    )
    # Tags ativas: card "Tags ativas" de Minha casa (docs/proposta/01-minha-casa.png).
    tags_ativas = contar("SELECT COUNT(*) FROM tags WHERE usuario_id = ? AND ativo = 1", usuario_id)

    # Status geral: "Casa protegida" se nada pede atenção (texto do Figma).
    avisos = avisos_de_seguranca(usuario_id)
    if len(avisos) == 0:
        status_geral = "Casa protegida"
    else:
        status_geral = "Atenção"

    return {
        "total_dispositivos": total_dispositivos,
        "dispositivos_ativos": dispositivos_ativos,
        "total_comodos": total_comodos,
        "total_automacoes": total_automacoes,
        "automacoes_ativas": automacoes_ativas,
        "tags_ativas": tags_ativas,
        "status_geral": status_geral,
        "avisos": avisos,
        # "Controles rápidos" do Figma: as luzes da casa, com o toggle.
        "controles_rapidos": listar_dispositivos(usuario_id, tipo="luz"),
    }
