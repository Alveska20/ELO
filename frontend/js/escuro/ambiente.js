/* =====================================================================
   E.L.O. — escuro/ambiente.js (pages/escuro/ambiente.html?id=N)

   Detalhe de um ambiente (cômodo) do visual escuro
   (Figma 06-perfil-homem/04-ambiente-detalhe-hifi.png).
   Dados:
     GET    /api/rooms/<id>              cômodo, dispositivos e portas
     GET    /api/automations             "Cenas do ambiente"
     PATCH  /api/devices/<id>/toggle     interruptor (simulado)
     POST   /api/automations/<id>/run    executa uma cena (simulação)
     PUT    /api/rooms/<id>              renomear
     DELETE /api/rooms/<id>              excluir
   ===================================================================== */

const caixaMensagemAmbiente = document.getElementById("mensagem");
// O id vem da barra de endereço: ambiente.html?id=3
const ambienteId = new URLSearchParams(window.location.search).get("id");


function htmlLinhaDispositivo(dispositivo) {
    const classe = dispositivo.ativo ? "ligado" : "desligado";
    return `
        <div class="h-linha-info">
            <span class="h-status ${classe}" style="color: #FFFFFF;">${escaparHtml(dispositivo.nome)}</span>
            <span style="display: flex; align-items: center; gap: 12px;">
                <span class="h-subtitulo">${TEXTOS_ESTADOS_ESCURO[dispositivo.estado]}</span>
                ${htmlInterruptorEscuro("alternar", dispositivo.id, dispositivo.ativo, `Ligar ou desligar ${dispositivo.nome}`)}
            </span>
        </div>`;
}

/* Portas: só consulta (o sistema não tranca nem destranca). */
function htmlLinhaPorta(porta) {
    const alerta = porta.aberta || !porta.trancada;
    const texto = `${porta.aberta ? "Aberta" : "Fechada"} · ${porta.trancada ? "Trancada" : "Destrancada"}`;
    return `
        <div class="h-linha-info">
            <span class="h-status ${alerta ? "alerta" : "ligado"}">${escaparHtml(porta.nome)}</span>
            <span class="h-subtitulo">${texto}</span>
        </div>`;
}

function desenharDispositivos(dispositivos, portas) {
    let html = "";
    for (const dispositivo of dispositivos) {
        html += htmlLinhaDispositivo(dispositivo);
    }
    for (const porta of portas) {
        html += htmlLinhaPorta(porta);
    }
    if (html === "") {
        html = '<p class="h-subtitulo">Nenhum dispositivo neste ambiente.</p>';
    }
    document.getElementById("lista-dispositivos").innerHTML = html;
}


/* Cenas = automações que têm pelo menos uma ação num aparelho deste cômodo. */
function desenharCenas(automacoes, dispositivos) {
    const idsDoAmbiente = [];
    for (const dispositivo of dispositivos) {
        idsDoAmbiente.push(dispositivo.id);
    }
    let html = "";
    for (const automacao of automacoes) {
        let usaEsteAmbiente = false;
        for (const acao of automacao.acoes) {
            if (idsDoAmbiente.includes(acao.dispositivo_id)) {
                usaEsteAmbiente = true;
            }
        }
        if (usaEsteAmbiente) {
            html += `
                <p><button type="button" class="h-botao h-botao-contorno h-botao-pequeno" data-acao="cena" data-id="${automacao.id}">
                    ▷ ${escaparHtml(automacao.nome)}
                </button></p>`;
        }
    }
    if (html === "") {
        html = '<p class="h-subtitulo">Nenhuma automação usa os aparelhos deste ambiente.</p>';
    }
    document.getElementById("lista-cenas").innerHTML = html;
}


async function carregarAmbiente() {
    const resposta = await chamarApi("GET", `/api/rooms/${ambienteId}`);
    if (!resposta.ok) {
        // 404: o cômodo não existe ou é de outra pessoa.
        mostrarMensagem(caixaMensagemAmbiente, resposta.dados.erro, "erro");
        return;
    }
    const comodo = resposta.dados.comodo;
    const dispositivos = resposta.dados.dispositivos;

    let ligados = 0;
    for (const dispositivo of dispositivos) {
        if (dispositivo.ativo) { ligados += 1; }
    }
    document.getElementById("nome-ambiente").textContent = comodo.nome;
    document.getElementById("legenda-foto").textContent =
        `${comodo.nome} • ${ligados > 0 ? "Ambiente ativo" : "Tudo desligado"}`;
    document.getElementById("ambiente-nome").value = comodo.nome;
    document.title = `${comodo.nome} — ELO`;

    desenharDispositivos(dispositivos, resposta.dados.portas);
    desenharCenas(await buscarListaEscuro("/api/automations", "automacoes"), dispositivos);
}


async function tratarClique(evento) {
    const alternar = evento.target.closest("[data-acao='alternar']");
    if (alternar) {
        if (await alternarDispositivoEscuro(alternar.dataset.id, caixaMensagemAmbiente)) {
            await carregarAmbiente();
        }
        return;
    }
    const cena = evento.target.closest("[data-acao='cena']");
    if (cena) {
        const resposta = await chamarApi("POST", `/api/automations/${cena.dataset.id}/run`);
        if (!resposta.ok) {
            mostrarMensagem(caixaMensagemAmbiente, resposta.dados.erro, "erro");
            return;
        }
        mostrarMensagem(caixaMensagemAmbiente, resposta.dados.mensagem, "sucesso");
        await carregarAmbiente();
    }
}

async function renomear(evento) {
    evento.preventDefault();
    const nome = document.getElementById("ambiente-nome").value;
    const resposta = await chamarApi("PUT", `/api/rooms/${ambienteId}`, { nome: nome });
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemAmbiente, resposta.dados.erro, "erro");
        return;
    }
    mostrarMensagem(caixaMensagemAmbiente, "Nome salvo.", "sucesso");
    await carregarAmbiente();
}

async function excluir() {
    // confirm() abre a caixinha "OK / Cancelar" do próprio navegador.
    if (!confirm("Excluir este ambiente? Os dispositivos dele ficam sem ambiente.")) {
        return;
    }
    const resposta = await chamarApi("DELETE", `/api/rooms/${ambienteId}`);
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemAmbiente, resposta.dados.erro, "erro");
        return;
    }
    window.location.href = "/pages/escuro/ambientes.html";
}


async function iniciarAmbiente() {
    const pagina = await iniciarPaginaEscuro("ambientes");
    if (!pagina) {
        return;
    }
    document.querySelector("main").addEventListener("click", tratarClique);
    document.getElementById("formulario-ambiente").addEventListener("submit", renomear);
    document.getElementById("botao-excluir").addEventListener("click", excluir);
    await carregarAmbiente();
}


iniciarAmbiente();
