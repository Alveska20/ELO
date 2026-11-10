/* =====================================================================
   E.L.O. — escuro/automacoes.js (pages/escuro/automacoes.html)

   Tela "Automações" do visual escuro (Figma 06-perfil-homem/06-automacoes-hifi.png).
   "Execuções hoje", "Condição" e o histórico salvo mostram DADOS
   DE EXEMPLO (homem.json → exemplos) com selo; sem automações, "casa vazia".
   Como funcionam: uma automação é uma lista de ações "dispositivo X fica
   no estado Y". "Executar" aplica as ações nos dispositivos SIMULADOS.

     GET    /api/automations             lista
     POST   /api/automations             nova
     PUT    /api/automations/<id>        editar (ativar/pausar: {"ativo": false})
     DELETE /api/automations/<id>        excluir
     POST   /api/automations/<id>/run    executar (simulação)
     GET    /api/devices                 dispositivos para o formulário
   ===================================================================== */

const caixaMensagemAuto = document.getElementById("mensagem");

let automacoes = [];
let selecionadaId = null;
const execucoesDaVisita = [];   // "Atividade recente": só o que rodou nesta visita
let textosArea = null;          // textos do homem.json (casa_vazia e exemplos)


/* ---------------------------------------------------------------------
   Números (Figma: ativas · agendadas · pausadas · execuções hoje)
   --------------------------------------------------------------------- */

function desenharNumeros() {
    let ativas = 0;
    let agendadas = 0;
    let pausadas = 0;
    for (const a of automacoes) {
        if (a.ativo) {
            ativas += 1;
            // "Agendada" = tem horário registrado (gatilho "horario").
            if (a.gatilho === "horario") { agendadas += 1; }
        } else {
            pausadas += 1;   // "Pausada" = desativada
        }
    }
    document.getElementById("numeros").innerHTML = `
        <div class="h-numero verde"><span class="valor">${ativas}</span><span class="rotulo">Automações ativas</span></div>
        <div class="h-numero roxo"><span class="valor">${agendadas}</span><span class="rotulo">Agendadas</span></div>
        <div class="h-numero amarelo"><span class="valor">${pausadas}</span><span class="rotulo">Pausadas</span></div>
        <div class="h-numero ciano"><span class="valor">${escaparHtml(textosArea.exemplos.automacoes_execucoes_hoje)}</span><span class="rotulo">Execuções hoje ${htmlSeloExemplo()}</span></div>`;
}


/* ---------------------------------------------------------------------
   Cartões
   --------------------------------------------------------------------- */

/* Resumo curto das ações, como no Figma ("Acender luzes e abrir cortinas"):
   as 2 primeiras e "e mais N". A lista completa fica no painel de detalhes. */
function resumoDasAcoes(automacao) {
    const partes = [];
    for (const acao of automacao.acoes) {
        partes.push(`${acao.dispositivo_nome}: ${TEXTOS_ESTADOS_ESCURO[acao.novo_estado].toLowerCase()}`);
    }
    if (automacao.verificar_portas) {
        partes.push("verificar portas e janelas");
    }
    if (partes.length <= 2) {
        return partes.join(", ");
    }
    return `${partes[0]}, ${partes[1]} e mais ${partes.length - 2}`;
}

function textoDoGatilho(automacao) {
    if (automacao.gatilho === "horario") {
        return `Horário: ${escaparHtml(automacao.horario)}`;
    }
    return "Gatilho: Manual";
}

function htmlCartao(automacao) {
    const selecionada = automacao.id === selecionadaId ? " selecionado" : "";
    const icone = automacao.gatilho === "horario" ? "◷" : "ϟ";
    return `
        <article class="h-auto-card${selecionada}" data-selecionar="${automacao.id}" tabindex="0">
            <h3><span aria-hidden="true" style="color: var(--h-ciano);">${icone}</span> ${escaparHtml(automacao.nome)}</h3>
            <p>${textoDoGatilho(automacao)}</p>
            <p>Ação: ${escaparHtml(resumoDasAcoes(automacao))}</p>
            <p>Status: ${automacao.ativo ? "Ativa" : "Pausada"}</p>
            ${htmlInterruptorEscuro("ativar", automacao.id, automacao.ativo, `Ativar ou pausar ${automacao.nome}`)}
        </article>`;
}

function desenharLista() {
    const lista = document.getElementById("lista");
    if (automacoes.length === 0) {
        // Casa vazia no estilo escuro (comum.js), no passo 3.
        lista.innerHTML = htmlCasaVaziaEscuro(textosArea.casa_vazia, {
            titulo: "Nenhuma automação ainda",
            texto: "Crie uma rotina, como o Modo Noite, para mudar vários dispositivos de uma vez.",
            passoAtual: 3,
            botaoTexto: "+ Nova automação",
            botaoId: "botao-vazio",
        });
        document.getElementById("botao-vazio").addEventListener("click", function () { abrirFormulario(null); });
        return;
    }
    let html = "";
    for (const automacao of automacoes) {
        html += htmlCartao(automacao);
    }
    lista.innerHTML = html;
}


/* ---------------------------------------------------------------------
   Painel "Detalhes da automação": Gatilho → Condição → Ação
   --------------------------------------------------------------------- */

function desenharPainel() {
    const painel = document.getElementById("painel");
    const a = automacoes.find(function (item) { return item.id === selecionadaId; });
    if (!a) {
        painel.innerHTML = '<p class="h-subtitulo">Escolha uma automação para ver os detalhes.</p>';
        return;
    }
    let acoes = "";
    for (const acao of a.acoes) {
        const temperatura = acao.temperatura ? ` (${acao.temperatura} °C)` : "";
        acoes += `<p>${escaparHtml(acao.dispositivo_nome)}: ${TEXTOS_ESTADOS_ESCURO[acao.novo_estado]}${temperatura}</p>`;
    }
    if (a.verificar_portas) {
        acoes += "<p>Verificar portas e janelas</p>";
    }
    const gatilho = a.gatilho === "horario" ? escaparHtml(a.horario) : "Manual";
    painel.innerHTML = `
        <h2 data-texto="automacoes.detalhes_titulo">Detalhes da automação</h2>
        <h3 style="margin: 14px 0;">${escaparHtml(a.nome)}</h3>
        <div class="h-fluxo-bloco"><span>Gatilho</span><p>${gatilho}</p></div>
        <div class="h-fluxo-seta" aria-hidden="true">↓</div>
        <div class="h-fluxo-bloco roxo"><span>Condição ${htmlSeloExemplo()}</span><p>${escaparHtml(textosArea.exemplos.automacao_condicao)}</p></div>
        <div class="h-fluxo-seta" aria-hidden="true">↓</div>
        <div class="h-fluxo-bloco verde"><span>Ação</span>${acoes}</div>
        <div class="h-botoes">
            <button type="button" class="h-botao h-botao-pequeno" data-acao="editar" data-id="${a.id}">Editar</button>
            <button type="button" class="h-botao h-botao-contorno h-botao-pequeno" data-acao="executar" data-id="${a.id}">Executar (simulação)</button>
            <button type="button" class="h-botao h-botao-perigo h-botao-pequeno" data-acao="excluir" data-id="${a.id}">Excluir</button>
        </div>`;
}


/* "Atividade recente": o que foi executado nesta visita (dado real, nada é
   salvo) + o histórico de exemplo, com selo (o sistema não guarda histórico). */
function desenharAtividade() {
    const lugar = document.getElementById("atividade");
    let html = "";
    for (const execucao of execucoesDaVisita) {
        html += `<p>${escaparHtml(execucao)}</p>`;
    }
    html += `<p class="h-subtitulo" style="margin-top: 8px;">Antes desta visita ${htmlSeloExemplo()}</p>`;
    html += htmlLinhasExemplo(textosArea.exemplos.automacoes_historico);
    lugar.innerHTML = html;
}


/* ---------------------------------------------------------------------
   Formulário (uma linha por dispositivo: marcar + estado + temperatura)
   --------------------------------------------------------------------- */

async function montarListaDeAcoes() {
    const dispositivos = await buscarListaEscuro("/api/devices", "dispositivos");
    let html = "";
    for (const d of dispositivos) {
        let opcoes = "";
        for (const estado of ESTADOS_TIPOS_ESCURO[d.tipo]) {
            opcoes += `<option value="${estado}">${TEXTOS_ESTADOS_ESCURO[estado]}</option>`;
        }
        let temperatura = "";
        if (d.tipo === "ar_condicionado") {
            temperatura = `<input type="number" min="16" max="30" placeholder="°C" style="width: 80px;"
                            data-temperatura-de="${d.id}" aria-label="Temperatura de ${escaparHtml(d.nome)}">`;
        }
        const ambiente = d.comodo_nome ? ` (${escaparHtml(d.comodo_nome)})` : "";
        html += `
            <div class="h-linha-info">
                <label class="h-campo-check"><input type="checkbox" data-dispositivo="${d.id}"> ${escaparHtml(d.nome)}${ambiente}</label>
                <span class="h-campo" style="display: flex; gap: 8px;">
                    <select data-estado-de="${d.id}" aria-label="Novo estado de ${escaparHtml(d.nome)}">${opcoes}</select>
                    ${temperatura}
                </span>
            </div>`;
    }
    document.getElementById("lista-acoes").innerHTML = html || '<p class="h-subtitulo">Cadastre dispositivos primeiro.</p>';
}

function lerAcoes() {
    const acoes = [];
    for (const caixa of document.querySelectorAll("#lista-acoes input[data-dispositivo]:checked")) {
        const id = caixa.dataset.dispositivo;
        const campoTemp = document.querySelector(`[data-temperatura-de="${id}"]`);
        acoes.push({
            dispositivo_id: Number(id),
            novo_estado: document.querySelector(`[data-estado-de="${id}"]`).value,
            temperatura: campoTemp ? campoTemp.value : null,
        });
    }
    return acoes;
}

function mostrarCampoHorario() {
    const ehHorario = document.getElementById("automacao-gatilho").value === "horario";
    document.getElementById("campo-horario").classList.toggle("oculto", !ehHorario);
}

function abrirFormulario(automacao) {
    document.getElementById("formulario-automacao").reset();
    document.getElementById("automacao-id").value = automacao ? automacao.id : "";
    document.getElementById("titulo-formulario").textContent = automacao ? "Editar automação" : "Nova automação";
    if (automacao) {
        document.getElementById("automacao-nome").value = automacao.nome;
        document.getElementById("automacao-descricao").value = automacao.descricao || "";
        document.getElementById("automacao-gatilho").value = automacao.gatilho;
        document.getElementById("automacao-horario").value = automacao.horario || "";
        document.getElementById("automacao-verificar-portas").checked = automacao.verificar_portas;
        document.getElementById("automacao-ativo").checked = automacao.ativo;
        for (const acao of automacao.acoes) {
            const caixa = document.querySelector(`[data-dispositivo="${acao.dispositivo_id}"]`);
            if (caixa) {
                caixa.checked = true;
                document.querySelector(`[data-estado-de="${acao.dispositivo_id}"]`).value = acao.novo_estado;
                const campoTemp = document.querySelector(`[data-temperatura-de="${acao.dispositivo_id}"]`);
                if (campoTemp && acao.temperatura) {
                    campoTemp.value = acao.temperatura;
                }
            }
        }
    }
    mostrarCampoHorario();
    const caixa = document.getElementById("caixa-formulario");
    caixa.classList.remove("oculto");
    caixa.scrollIntoView({ behavior: "smooth" });
}

function fecharFormulario() {
    document.getElementById("caixa-formulario").classList.add("oculto");
}

async function salvarAutomacao(evento) {
    evento.preventDefault();
    const id = document.getElementById("automacao-id").value;
    const dados = {
        nome: document.getElementById("automacao-nome").value,
        descricao: document.getElementById("automacao-descricao").value,
        gatilho: document.getElementById("automacao-gatilho").value,
        horario: document.getElementById("automacao-horario").value,
        verificar_portas: document.getElementById("automacao-verificar-portas").checked,
        ativo: document.getElementById("automacao-ativo").checked,
        acoes: lerAcoes(),
    };
    let resposta;
    if (id) {
        resposta = await chamarApi("PUT", `/api/automations/${id}`, dados);
    } else {
        resposta = await chamarApi("POST", "/api/automations", dados);
    }
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemAuto, resposta.dados.erro, "erro");
        return;
    }
    mostrarMensagem(caixaMensagemAuto, "Automação salva.", "sucesso");
    selecionadaId = resposta.dados.automacao.id;
    fecharFormulario();
    await carregarAutomacoes();
}


/* ---------------------------------------------------------------------
   Cliques
   --------------------------------------------------------------------- */

async function executar(id) {
    const resposta = await chamarApi("POST", `/api/automations/${id}/run`);
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemAuto, resposta.dados.erro, "erro");
        return;
    }
    // Relatório do backend: mensagem [SIMULAÇÃO] + o que mudou + avisos.
    const linhas = resposta.dados.alteracoes.concat(resposta.dados.avisos);
    let itens = "";
    for (const linha of linhas) {
        itens += `<li>${escaparHtml(linha)}</li>`;
    }
    caixaMensagemAuto.innerHTML = `
        <div class="mensagem mensagem-sucesso" role="status">${escaparHtml(resposta.dados.mensagem)}<ul>${itens}</ul></div>`;
    const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const automacao = automacoes.find(function (a) { return a.id === Number(id); });
    execucoesDaVisita.unshift(`${automacao.nome} — ${hora}`);
    desenharAtividade();
}

/* Interruptor do cartão: ativa ou pausa a automação. */
async function ativarOuPausar(botao) {
    const ligado = botao.getAttribute("aria-checked") === "true";
    const resposta = await chamarApi("PUT", `/api/automations/${botao.dataset.id}`, { ativo: !ligado });
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemAuto, resposta.dados.erro, "erro");
        return;
    }
    await carregarAutomacoes();
}

async function excluirAutomacao(automacaoId) {
    if (!confirm("Excluir esta automação?")) {
        return;
    }
    const resposta = await chamarApi("DELETE", `/api/automations/${automacaoId}`);
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemAuto, resposta.dados.erro, "erro");
        return;
    }
    selecionadaId = null;
    mostrarMensagem(caixaMensagemAuto, "Automação excluída.", "sucesso");
    await carregarAutomacoes();
}

function selecionarAutomacao(automacaoId) {
    selecionadaId = automacaoId;
    desenharLista();
    desenharPainel();
}

/* Um ouvinte só para a página inteira: descobre o que foi clicado pelos
   atributos data-* e chama a função certa. */
function tratarClique(evento) {
    const botao = evento.target.closest("[data-acao]");
    const acao = botao ? botao.dataset.acao : null;
    if (acao === "ativar") {
        ativarOuPausar(botao);
    } else if (acao === "editar") {
        abrirFormulario(automacoes.find(function (a) { return a.id === Number(botao.dataset.id); }));
    } else if (acao === "executar") {
        executar(botao.dataset.id);
    } else if (acao === "excluir") {
        excluirAutomacao(botao.dataset.id);
    } else if (evento.target.closest("[data-selecionar]")) {
        selecionarAutomacao(Number(evento.target.closest("[data-selecionar]").dataset.selecionar));
    }
}

function tratarTeclado(evento) {
    if (evento.key === "Enter" && evento.target.matches("[data-selecionar]")) {
        evento.target.click();
    }
}


async function carregarAutomacoes() {
    automacoes = await buscarListaEscuro("/api/automations", "automacoes");
    if (selecionadaId === null && automacoes.length > 0) {
        selecionadaId = automacoes[0].id;   // como no Figma: a primeira já aparece no painel
    }
    desenharNumeros();
    desenharLista();
    desenharPainel();
}


async function iniciarAutomacoes() {
    const pagina = await iniciarPaginaEscuro("automacoes");
    if (!pagina) {
        return;
    }
    textosArea = pagina.area.textos;
    await montarListaDeAcoes();
    desenharAtividade();

    document.querySelector("main").addEventListener("click", tratarClique);
    document.querySelector("main").addEventListener("keydown", tratarTeclado);
    document.getElementById("botao-nova").addEventListener("click", function () { abrirFormulario(null); });
    document.getElementById("botao-cancelar").addEventListener("click", fecharFormulario);
    document.getElementById("automacao-gatilho").addEventListener("change", mostrarCampoHorario);
    document.getElementById("formulario-automacao").addEventListener("submit", salvarAutomacao);

    await carregarAutomacoes();
}


iniciarAutomacoes();
