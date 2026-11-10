/* =====================================================================
   E.L.O. — escuro/minha_casa.js (pages/escuro/minha-casa.html)

   Tela "Minha casa" do visual escuro (Figma 06-perfil-homem/02-minha-casa-hifi.png).
   Endereço, planta e acesso remoto com DADOS DE EXEMPLO
   (homem.json → exemplos) e selo; sem cômodos, mostra a "casa vazia".
   Dados:
     GET   /api/men-area               status, números, luzes e cômodos
     PATCH /api/devices/<id>/toggle    interruptor das luzes (simulado)
   ===================================================================== */

const caixaMensagemCasa = document.getElementById("mensagem");

let luzes = [];          // "Acessos rápidos" (as luzes da casa)
let posicaoLuz = 0;      // qual luz o carrossel está mostrando


function desenharTopo(textos, resumo) {
    const selo = document.getElementById("selo-status");
    const status = document.getElementById("status-casa");
    const avisos = document.getElementById("avisos-casa");

    // Mesmo status do Dashboard: sem avisos de portas/janelas = tudo certo.
    if (resumo.avisos.length === 0) {
        selo.textContent = "Online";
        selo.classList.remove("alerta");
        status.textContent = textos.status_ok;
        avisos.innerHTML = "";
    } else {
        selo.textContent = "Atenção";
        selo.classList.add("alerta");
        status.textContent = `${resumo.avisos.length} ponto(s) pedem atenção.`;
        let html = "";
        for (const aviso of resumo.avisos) {
            html += `<div><span class="h-status alerta">${escaparHtml(aviso)}</span></div>`;
        }
        avisos.innerHTML = html;
    }

    document.getElementById("numeros-casa").innerHTML = `
        <a class="h-mini-numero" href="/pages/escuro/dispositivos.html">
            <span class="h-imagem" style="width: 50px; height: 50px;"><img src="/img/icones/tomada.svg" alt=""></span>
            <span><strong>${resumo.total_dispositivos}</strong>${escaparHtml(textos.card_dispositivos)}</span>
        </a>
        <a class="h-mini-numero" href="/pages/escuro/automacoes.html">
            <span class="h-imagem" style="width: 50px; height: 50px;"><img src="/img/icones/sino.svg" alt=""></span>
            <span><strong>${resumo.automacoes_ativas}</strong>${escaparHtml(textos.card_automacoes)}</span>
        </a>`;
}


/* Carrossel: mostra uma luz por vez, com o interruptor. */
function desenharCarrossel() {
    const lugar = document.getElementById("carrossel");
    if (luzes.length === 0) {
        lugar.innerHTML = '<p class="h-subtitulo">Nenhuma luz cadastrada.</p>';
        return;
    }
    const luz = luzes[posicaoLuz];
    lugar.innerHTML = `
        ${htmlImagemTipo("luz")}
        <span class="nome">${escaparHtml(luz.nome)}</span>
        ${htmlInterruptorEscuro("alternar", luz.id, luz.ativo, `Ligar ou desligar ${luz.nome}`)}
        <p class="h-subtitulo" style="margin-top: 10px;">${posicaoLuz + 1} de ${luzes.length}</p>`;
}

function mudarLuz(passo) {
    if (luzes.length === 0) {
        return;
    }
    // O "%" faz a volta: depois da última vem a primeira.
    posicaoLuz = (posicaoLuz + passo + luzes.length) % luzes.length;
    desenharCarrossel();
}

async function tratarCliqueCarrossel(evento) {
    const botao = evento.target.closest("[data-acao='alternar']");
    if (!botao) {
        return;
    }
    if (await alternarDispositivoEscuro(botao.dataset.id, caixaMensagemCasa)) {
        await carregarCasa();
    }
}


/* No lugar da planta: os cômodos, cada um levando à tela dele. */
function desenharComodos(ambientes) {
    let html = "";
    for (const ambiente of ambientes) {
        html += `
            <a class="h-ambiente-mini" href="/pages/escuro/ambiente.html?id=${ambiente.id}">
                ${escaparHtml(ambiente.nome)}
                <small>${ambiente.total_dispositivos} dispositivo(s)</small>
            </a>`;
    }
    document.getElementById("comodos").innerHTML = html;
}


async function carregarCasa() {
    const resposta = await chamarApi("GET", "/api/men-area");
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemCasa, resposta.dados.erro, "erro");
        return;
    }
    const area = resposta.dados;
    desenharTopo(area.textos.minha_casa, area.resumo);
    luzes = area.resumo.controles_rapidos;
    if (posicaoLuz >= luzes.length) {
        posicaoLuz = 0;
    }
    desenharCarrossel();
    desenharComodos(area.ambientes);

    // Casa sem cômodos: a mensagem com os 3 passos no lugar dos cards de baixo.
    const vazia = area.ambientes.length === 0;
    document.getElementById("conteudo-casa").classList.toggle("oculto", vazia);
    document.getElementById("casa-vazia").innerHTML = vazia
        ? htmlCasaVaziaEscuro(area.textos.casa_vazia, {
            passoAtual: 1,
            botaoTexto: "+ Adicionar ambiente",
            botaoLink: "/pages/escuro/ambientes.html#novo",
        })
        : "";
}

/* Partes do Figma que o sistema não tem: dados FICTÍCIOS, com selo. */
function desenharExemplos(exemplos) {
    document.getElementById("endereco").innerHTML =
        `${escaparHtml(exemplos.endereco)}<br><span class="h-subtitulo">${escaparHtml(exemplos.cidade)}</span>`;
    document.getElementById("planta").textContent = exemplos.planta_texto;
    document.getElementById("acessos").innerHTML = `
        <div class="h-cartao-topo">
            <span>${escaparHtml(exemplos.acesso_remoto)}</span>
            ${htmlSeloExemplo()}
        </div>`;
}


async function iniciarMinhaCasa() {
    const pagina = await iniciarPaginaEscuro("minha-casa");
    if (!pagina) {
        return;
    }
    document.getElementById("saudacao").textContent = `Olá, ${pagina.usuario.nome}`;

    desenharExemplos(pagina.area.textos.exemplos);

    document.getElementById("seta-anterior").addEventListener("click", function () { mudarLuz(-1); });
    document.getElementById("seta-proxima").addEventListener("click", function () { mudarLuz(1); });
    document.getElementById("carrossel").addEventListener("click", tratarCliqueCarrossel);

    await carregarCasa();
}


iniciarMinhaCasa();
