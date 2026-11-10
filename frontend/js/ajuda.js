/* =====================================================================
   E.L.O. — ajuda.js (pages/protecao-ajuda.html) — "PRECISO DE AJUDA"

   Visual: docs/proposta/12-preciso-de-ajuda.png.
   1. Mostra os canais do doc da equipe (180 e 190) e os serviços
      (Delegacia da Mulher, Serviços de saúde, Rede de apoio, Chat E.L.O.
      "Em breve"). Só EXIBE: nenhum número vira link de ligação. A seta
      de cada canal abre os detalhes (o que o canal faz; no 180, também
      o WhatsApp e o e-mail).
   2. Simula o alerta, um botão para cada ação:
        GET  /api/emergency  -> ações configuradas + contatos de confiança
        POST /api/emergency  {"acoes": ["alerta_contatos"]}
                          ou {"acoes": ["compartilhar_localizacao"]}
      A resposta traz mensagens como
        "[SIMULAÇÃO] Alerta enviado para contato configurado: ..."
      Uma ação desligada em "Configurações de emergência" deixa o botão
      dela desativado. Nenhuma mensagem, ligação ou localização real é enviada.
   ===================================================================== */

const caixaResultado = document.getElementById("resultado");

/* Ícone de cada serviço (dentro do círculo lilás). */
const ICONES_DOS_SERVICOS = ["escudo.svg", "mao-coracao.svg", "pessoas.svg", "pergunta.svg"];


/* ---------------------------------------------------------------------
   Canais e serviços
   --------------------------------------------------------------------- */

/* Detalhes do canal (aparecem ao clicar na seta). Textos do doc, seção 9. */
function htmlDetalhesCanal(numero, uteis) {
    const canal = uteis.canais.find(function (c) { return c.numero === numero; });
    let html = `<p>${htmlTexto(canal.texto)}</p>`;
    if (numero === "180") {
        html += `<p>WhatsApp: <strong>${escaparHtml(uteis.whatsapp_180)}</strong> ·
                 E-mail: <strong>${escaparHtml(uteis.email_180)}</strong></p>`;
    }
    html += `<p class="texto-secundario">${htmlTexto(uteis.aviso_conferir)}</p>`;
    return html;
}

function htmlCanal(resumo, uteis) {
    const idDetalhes = `detalhes-${resumo.numero}`;
    return `
        <section class="card canal">
            <div class="canal-linha">
                <span class="icone-redondo canal-icone" aria-hidden="true">☎</span>
                <div class="canal-texto">
                    <h2>Ligue ${escaparHtml(resumo.numero)}</h2>
                    <p class="canal-nome">${htmlTexto(resumo.nome)}</p>
                    <p class="texto-secundario">${htmlTexto(resumo.resumo)}</p>
                </div>
                <button type="button" class="botao-seta" data-detalhes="${idDetalhes}" aria-expanded="false"
                        aria-controls="${idDetalhes}" aria-label="Ver detalhes do Ligue ${escaparHtml(resumo.numero)}">→</button>
            </div>
            <div class="canal-detalhes oculto" id="${idDetalhes}">${htmlDetalhesCanal(resumo.numero, uteis)}</div>
        </section>`;
}

/* A seta abre e fecha os detalhes do canal. */
function alternarDetalhes(evento) {
    const botao = evento.target.closest("button[data-detalhes]");
    if (!botao) {
        return;
    }
    const detalhes = document.getElementById(botao.dataset.detalhes);
    const abriu = detalhes.classList.toggle("oculto") === false;
    botao.setAttribute("aria-expanded", String(abriu));
}

function htmlServico(servico, posicao) {
    return `
        <section class="card card-atalho">
            <span class="icone-redondo"><img src="/img/icones/${ICONES_DOS_SERVICOS[posicao]}" alt=""></span>
            <h3>${htmlTexto(servico.titulo)}</h3>
            <p>${htmlTexto(servico.texto)}</p>
        </section>`;
}

function mostrarCanais(conteudo) {
    const ajuda = conteudo.preciso_de_ajuda;
    document.getElementById("titulo").textContent = ajuda.titulo;
    document.getElementById("texto").textContent = ajuda.texto;
    document.getElementById("avisar-titulo").textContent = ajuda.avisar_titulo;

    let html = "";
    for (const resumo of ajuda.canais_resumo) {
        html += htmlCanal(resumo, conteudo.contatos_uteis);
    }
    document.getElementById("canais").innerHTML = html;

    html = "";
    ajuda.servicos.forEach(function (servico, posicao) {
        html += htmlServico(servico, posicao);
    });
    document.getElementById("servicos").innerHTML = html;
}


/* ---------------------------------------------------------------------
   Avisar meus contatos (simulação)
   --------------------------------------------------------------------- */

/* Mostra quem seria avisado e desativa os botões das ações que estão
   desligadas em "Configurações de emergência". */
async function carregarSituacao(textoSimulacao) {
    const resposta = await chamarApi("GET", "/api/emergency");
    if (!resposta.ok) {
        mostrarMensagem(caixaResultado, resposta.dados.erro, "erro");
        return;
    }
    const configuracoes = resposta.dados.configuracoes;
    desativarSeDesligada("botao-alerta", configuracoes.acao_alertar_contatos);
    desativarSeDesligada("botao-localizacao", configuracoes.acao_compartilhar_localizacao);

    const nomes = resposta.dados.contatos.map(function (contato) { return contato.nome; });
    const contatos = nomes.length > 0 ? `Contatos: ${nomes.join(", ")}.` : "Nenhum contato de confiança cadastrado.";
    document.getElementById("avisar-texto").textContent = `${textoSimulacao} ${contatos}`;
}

function desativarSeDesligada(idBotao, ligada) {
    const botao = document.getElementById(idBotao);
    botao.disabled = !ligada;
    botao.title = ligada ? "" : "Ação desligada em Configurações de emergência";
}

async function simular(acao) {
    const resposta = await chamarApi("POST", "/api/emergency", { acoes: [acao] });
    if (!resposta.ok) {
        mostrarMensagem(caixaResultado, resposta.dados.erro, "erro");
        return;
    }
    let itens = "";
    for (const mensagem of resposta.dados.mensagens) {
        itens += `<li>${escaparHtml(mensagem)}</li>`;
    }
    caixaResultado.innerHTML = `
        <div class="mensagem mensagem-info" role="status">
            <ul>${itens}</ul>
            <p style="margin: 8px 0 0;">Em situação de emergência, ligue 190. Para orientação, ligue 180.</p>
        </div>`;
}


async function iniciarAjuda() {
    const pagina = await montarPagina({
        paginaAtual: "protecao", exige: "mulher", protecao: true, breadcrumb: "Preciso de ajuda",
    });
    if (!pagina) {
        return;
    }
    mostrarCanais(pagina.conteudo);
    document.getElementById("canais").addEventListener("click", alternarDetalhes);
    document.getElementById("botao-alerta").addEventListener("click", function () { simular("alerta_contatos"); });
    document.getElementById("botao-localizacao").addEventListener("click", function () { simular("compartilhar_localizacao"); });
    await carregarSituacao(pagina.conteudo.preciso_de_ajuda.avisar_texto);
}


iniciarAjuda();
