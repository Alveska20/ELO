/* =====================================================================
   E.L.O. — escuro/inicio.js (pages/escuro/inicio.html)

   Tela "Início" do visual escuro (Figma 06-perfil-homem/01-inicio-hifi.png).
   Usada pelo perfil homem, pelo perfil não definido e pelo admin.
   Dados:
     GET  /api/men-area                 números, ambientes, temperatura do ar
                                        e os dados de exemplo (textos.exemplos)
     GET  /api/automations              "Cenários" = automações do usuário
     POST /api/automations/<id>/run     o "play" executa a simulação

   Consumo, moradores e atividades mostram DADOS FICTÍCIOS do homem.json,
   sempre com o selo "Dados de exemplo".
   ===================================================================== */

const caixaMensagemInicio = document.getElementById("mensagem");


/* Cartão de número no formato do Figma: rótulo, valor e detalhe.
   selo (opcional): HTML do selo "Dados de exemplo". */
function htmlNumeroInicio(rotulo, valor, detalhe, link, cor, selo) {
    const conteudo = `
            <span class="rotulo">${escaparHtml(rotulo)} ${selo || ""}</span>
            <span class="valor">${valor}</span>
            <span class="detalhe">${detalhe}</span>`;
    if (!link) {
        return `<div class="h-numero centro ${cor}">${conteudo}</div>`;
    }
    return `<a class="h-numero centro ${cor}" href="${link}">${conteudo}</a>`;
}

/* Temperatura: a do ar-condicionado (simulado). Sem ar cadastrado, o card
   fica "Sincronizando…" em vez de inventar um número. */
function htmlTemperatura(textos, temperatura) {
    if (!temperatura) {
        return htmlNumeroInicio(textos.card_temperatura, "—", "Nenhum ar-condicionado",
            "/pages/escuro/dispositivos.html", "", htmlSeloExemplo(SELO_SINCRONIZANDO));
    }
    const onde = temperatura.comodo ? ` · ${escaparHtml(temperatura.comodo)}` : "";
    const estado = temperatura.ligado ? "ligado" : "desligado";
    return htmlNumeroInicio(textos.card_temperatura, `${temperatura.valor} °C`,
        `Ar-condicionado ${estado}${onde}`, "/pages/escuro/dispositivos.html", "");
}

function desenharNumeros(area) {
    const textos = area.textos.inicio;
    const exemplos = area.textos.exemplos;
    const resumo = area.resumo;
    let html = "";
    html += htmlNumeroInicio(textos.card_dispositivos, resumo.dispositivos_ativos,
        `de ${resumo.total_dispositivos} dispositivos`, "/pages/escuro/dispositivos.html", "");
    html += htmlNumeroInicio(textos.card_automacoes, String(resumo.automacoes_ativas).padStart(2, "0"),
        `de ${resumo.total_automacoes} automações`, "/pages/escuro/automacoes.html", "roxo");
    // Consumo: o sistema não mede energia -> valor de exemplo, com o selo.
    html += htmlNumeroInicio(textos.card_consumo, escaparHtml(exemplos.consumo_hoje),
        `↓ ${escaparHtml(exemplos.consumo_variacao)}`, null, "", htmlSeloExemplo());
    html += htmlTemperatura(textos, area.temperatura);
    document.getElementById("numeros").innerHTML = html;
}


/* "Consumo de energia": gráfico de barras simples com a semana de exemplo.
   A altura de cada barra é proporcional ao maior valor da semana. */
function desenharConsumo(exemplos) {
    let maior = 0;
    for (const dia of exemplos.consumo_semana) {
        maior = Math.max(maior, dia.kwh);
    }
    let barras = "";
    exemplos.consumo_semana.forEach(function (dia, posicao) {
        const altura = Math.round((dia.kwh / maior) * 100);
        // A última barra (hoje) fica roxa, como no Figma.
        const hoje = posicao === exemplos.consumo_semana.length - 1 ? " hoje" : "";
        barras += `
            <div class="h-barra${hoje}" title="${dia.kwh} kWh">
                <span style="height: ${altura}%;"></span>
                <small>${escaparHtml(dia.dia)}</small>
            </div>`;
    });
    document.getElementById("consumo").innerHTML = `
        <p style="color: var(--h-ciano); font-size: 24px; margin: 4px 0 0;">${escaparHtml(exemplos.consumo_hoje)}</p>
        <p class="h-subtitulo" style="font-size: 12px;">Esta semana</p>
        <div class="h-barras" role="img" aria-label="Gráfico de consumo da semana (dados de exemplo)">${barras}</div>`;
}

/* "Moradores": a própria pessoa (dado real) + moradores de exemplo. */
function desenharMoradores(usuario, exemplos) {
    const papel = usuario.papel === "admin" ? "Administrador" : "Você";
    let html = `
        <div class="h-pessoa">
            <span class="h-avatar">${escaparHtml(usuario.nome.charAt(0).toUpperCase())}</span>
            <div><strong>${escaparHtml(usuario.nome)}</strong><span class="h-subtitulo">${papel}</span></div>
        </div>`;
    for (const morador of exemplos.moradores) {
        html += `
            <div class="h-pessoa">
                <span class="h-avatar">${escaparHtml(morador.nome.charAt(0))}</span>
                <div><strong>${escaparHtml(morador.nome)}</strong><span class="h-subtitulo">${escaparHtml(morador.papel)}</span></div>
            </div>`;
    }
    document.getElementById("moradores").innerHTML = html;
}

/* "Atividades recentes": lista de exemplo (o sistema não guarda histórico). */
function desenharAtividades(exemplos) {
    let html = "";
    for (const atividade of exemplos.atividades) {
        html += `
            <div class="h-atividade">
                <img src="/img/icones/${escaparHtml(atividade.icone)}" alt="">
                <span>${escaparHtml(atividade.texto)}</span>
                <span class="h-subtitulo" style="flex: 0;">${escaparHtml(atividade.hora)}</span>
            </div>`;
    }
    document.getElementById("atividades").innerHTML = html;
}


/* "Ambientes da Casa": um quadradinho por cômodo (Sala · 4 dispositivos). */
function desenharAmbientes(ambientes) {
    let html = "";
    for (const ambiente of ambientes) {
        html += `
            <a class="h-ambiente-mini" href="/pages/escuro/ambiente.html?id=${ambiente.id}">
                ${escaparHtml(ambiente.nome)}
                <small>${ambiente.total_dispositivos} dispositivo(s)</small>
            </a>`;
    }
    document.getElementById("ambientes").innerHTML = html;
}


/* "Cenários": cada automação vira um botão com o "play" do Figma. */
function desenharCenarios(automacoes) {
    const lugar = document.getElementById("cenarios");
    if (automacoes.length === 0) {
        lugar.innerHTML = '<p class="h-subtitulo">Nenhuma automação ainda. '
            + '<a href="/pages/escuro/automacoes.html">Criar em Automações</a>.</p>';
        return;
    }
    let html = "";
    for (const automacao of automacoes) {
        html += `
            <button type="button" class="h-cenario" data-id="${automacao.id}"
                    aria-label="Executar ${escaparHtml(automacao.nome)} (simulação)">
                ${escaparHtml(automacao.nome)}
                <span class="h-play" aria-hidden="true">▶</span>
            </button>`;
    }
    lugar.innerHTML = html;
}

async function executarCenario(evento) {
    const botao = evento.target.closest(".h-cenario");
    if (!botao) {
        return;
    }
    const resposta = await chamarApi("POST", `/api/automations/${botao.dataset.id}/run`);
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemInicio, resposta.dados.erro, "erro");
        return;
    }
    // A mensagem do backend já começa com [SIMULAÇÃO].
    mostrarMensagem(caixaMensagemInicio, resposta.dados.mensagem, "sucesso");
    await carregarNumeros();
}

/* Depois de executar um cenário os números mudam: busca de novo. */
async function carregarNumeros() {
    const resposta = await chamarApi("GET", "/api/men-area");
    if (resposta.ok) {
        desenharNumeros(resposta.dados);
    }
}


async function iniciarInicio() {
    const pagina = await iniciarPaginaEscuro("inicio");
    if (!pagina) {
        return;
    }
    const area = pagina.area;
    document.getElementById("saudacao").textContent = `Olá, ${pagina.usuario.nome}`;

    // Casa sem cômodos: a mensagem com os 3 passos no lugar dos cards.
    if (area.ambientes.length === 0) {
        document.getElementById("casa-vazia").innerHTML = htmlCasaVaziaEscuro(area.textos.casa_vazia, {
            passoAtual: 1,
            botaoTexto: "+ Adicionar ambiente",
            botaoLink: "/pages/escuro/ambientes.html#novo",
        });
        return;
    }

    document.getElementById("conteudo-casa").classList.remove("oculto");
    desenharNumeros(area);
    desenharConsumo(area.textos.exemplos);
    desenharMoradores(pagina.usuario, area.textos.exemplos);
    desenharAtividades(area.textos.exemplos);
    desenharAmbientes(area.ambientes);

    desenharCenarios(await buscarListaEscuro("/api/automations", "automacoes"));
    document.getElementById("cenarios").addEventListener("click", executarCenario);
}


iniciarInicio();
