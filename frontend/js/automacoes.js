/* =====================================================================
   E.L.O. — automacoes.js (pages/automacoes.html)

   Como as automações funcionam:
   uma automação é uma lista de ações "dispositivo X fica no estado Y".
   O botão "Executar (simulação)" chama POST /api/automations/<id>/run,
   o backend aplica as ações nos dispositivos simulados e devolve um
   relatório (o que mudou + avisos de portas e janelas).

     listar    GET    /api/automations
     criar     POST   /api/automations
     editar    PUT    /api/automations/<id>   (ativar/desativar: {"ativo": false})
     excluir   DELETE /api/automations/<id>
     executar  POST   /api/automations/<id>/run
   ===================================================================== */

const caixaMensagemAutomacoes = document.getElementById("mensagem");
const formularioAutomacao = document.getElementById("formulario-automacao");
const campoAutomacaoId = document.getElementById("automacao-id");
const campoGatilho = document.getElementById("automacao-gatilho");
const botaoCancelarAutomacao = document.getElementById("botao-cancelar");

/* Estados possíveis de cada tipo (os mesmos do backend). */
const ESTADOS_DOS_TIPOS = {
    luz: ["ligado", "desligado"],
    ar_condicionado: ["ligado", "desligado"],
    tv: ["ligado", "desligado"],
    tomada: ["ligado", "desligado"],
    cortina: ["aberta", "fechada"],
    persiana: ["aberta", "fechada"],
    janela: ["aberta", "fechada"],
    sensor: ["ligado", "desligado"],
    camera: ["ligado", "desligado"],
};

let automacoesCarregadas = [];


/* ---------------------------------------------------------------------
   Formulário: uma linha por dispositivo (marcar + escolher o estado)
   --------------------------------------------------------------------- */

function htmlLinhaAcao(dispositivo) {
    let opcoes = "";
    for (const estado of ESTADOS_DOS_TIPOS[dispositivo.tipo]) {
        opcoes += `<option value="${estado}">${TEXTOS_DOS_ESTADOS[estado]}</option>`;
    }
    // Temperatura só para o ar-condicionado.
    let temperatura = "";
    if (dispositivo.tipo === "ar_condicionado") {
        temperatura = `<input type="number" min="16" max="30" placeholder="°C" style="width: 80px;"
                        data-temperatura-de="${dispositivo.id}" aria-label="Temperatura de ${escaparHtml(dispositivo.nome)}">`;
    }
    const comodo = dispositivo.comodo_nome ? ` (${escaparHtml(dispositivo.comodo_nome)})` : "";
    return `
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin: 8px 0;">
            <label class="campo-checkbox" style="min-width: 280px;">
                <input type="checkbox" data-dispositivo="${dispositivo.id}">
                ${escaparHtml(dispositivo.nome)}${comodo}
            </label>
            <select data-estado-de="${dispositivo.id}" aria-label="Novo estado de ${escaparHtml(dispositivo.nome)}">${opcoes}</select>
            ${temperatura}
        </div>`;
}


async function carregarListaDeAcoes() {
    const resposta = await chamarApi("GET", "/api/devices");
    const lista = document.getElementById("lista-acoes");
    if (!resposta.ok || resposta.dados.dispositivos.length === 0) {
        lista.innerHTML = '<p class="texto-secundario">Cadastre dispositivos primeiro.</p>';
        return;
    }
    let html = "";
    for (const dispositivo of resposta.dados.dispositivos) {
        html += htmlLinhaAcao(dispositivo);
    }
    lista.innerHTML = html;
}


/* Lê as linhas marcadas e monta a lista de ações para enviar à API. */
function lerAcoesDoFormulario() {
    const acoes = [];
    const marcados = document.querySelectorAll("#lista-acoes input[data-dispositivo]:checked");
    for (const caixa of marcados) {
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


function mostrarOuEsconderHorario() {
    document.getElementById("campo-horario").classList.toggle("oculto", campoGatilho.value !== "horario");
}


function limparFormulario() {
    formularioAutomacao.reset();
    campoAutomacaoId.value = "";
    document.getElementById("titulo-formulario").textContent = "Nova automação";
    botaoCancelarAutomacao.classList.add("oculto");
    mostrarOuEsconderHorario();
}


function prepararEdicao(automacaoId) {
    limparFormulario();
    let automacao = null;
    for (const item of automacoesCarregadas) {
        if (item.id === automacaoId) {
            automacao = item;
        }
    }
    campoAutomacaoId.value = automacao.id;
    document.getElementById("automacao-nome").value = automacao.nome;
    document.getElementById("automacao-descricao").value = automacao.descricao || "";
    campoGatilho.value = automacao.gatilho;
    document.getElementById("automacao-horario").value = automacao.horario || "";
    document.getElementById("automacao-verificar-portas").checked = automacao.verificar_portas;
    document.getElementById("automacao-ativo").checked = automacao.ativo;

    // Marca as ações que já existem.
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

    document.getElementById("titulo-formulario").textContent = "Editar automação";
    botaoCancelarAutomacao.classList.remove("oculto");
    mostrarOuEsconderHorario();
    formularioAutomacao.scrollIntoView({ behavior: "smooth" });
}


async function salvarAutomacao(evento) {
    evento.preventDefault();
    const dados = {
        nome: document.getElementById("automacao-nome").value,
        descricao: document.getElementById("automacao-descricao").value,
        gatilho: campoGatilho.value,
        horario: document.getElementById("automacao-horario").value,
        verificar_portas: document.getElementById("automacao-verificar-portas").checked,
        ativo: document.getElementById("automacao-ativo").checked,
        acoes: lerAcoesDoFormulario(),
    };

    let resposta;
    if (campoAutomacaoId.value) {
        resposta = await chamarApi("PUT", `/api/automations/${campoAutomacaoId.value}`, dados);
    } else {
        resposta = await chamarApi("POST", "/api/automations", dados);
    }

    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemAutomacoes, resposta.dados.erro, "erro");
        return;
    }
    mostrarMensagem(caixaMensagemAutomacoes, "Automação salva.", "sucesso");
    limparFormulario();
    await carregarAutomacoes();
}


/* ---------------------------------------------------------------------
   Lista de automações
   --------------------------------------------------------------------- */

function htmlCardAutomacao(automacao) {
    let quando = "Gatilho: manual";
    if (automacao.gatilho === "horario") {
        quando = `Gatilho: todo dia às ${escaparHtml(automacao.horario)} (registrado)`;
    }

    let acoes = "";
    for (const acao of automacao.acoes) {
        let temperatura = "";
        if (acao.temperatura) {
            temperatura = ` (${acao.temperatura} °C)`;
        }
        acoes += `<li>${escaparHtml(acao.dispositivo_nome)}: ${TEXTOS_DOS_ESTADOS[acao.novo_estado]}${temperatura}</li>`;
    }
    if (automacao.verificar_portas) {
        acoes += "<li>Verificar portas e janelas</li>";
    }

    const etiqueta = automacao.ativo
        ? '<span class="etiqueta">Ativa</span>'
        : '<span class="etiqueta atencao">Desativada</span>';
    const textoAtivar = automacao.ativo ? "Desativar" : "Ativar";

    return `
        <div class="card">
            <h3>${escaparHtml(automacao.nome)} ${etiqueta}</h3>
            <p class="texto-secundario">${escaparHtml(automacao.descricao)}</p>
            <p>${quando}</p>
            <ul>${acoes}</ul>
            <div class="card-acoes">
                <button type="button" class="botao botao-pequeno" data-acao="executar" data-id="${automacao.id}">Executar (simulação)</button>
                <button type="button" class="botao botao-pequeno botao-contorno" data-acao="ativar" data-id="${automacao.id}">${textoAtivar}</button>
                <button type="button" class="botao botao-pequeno botao-contorno" data-acao="editar" data-id="${automacao.id}">Editar</button>
                <button type="button" class="botao botao-pequeno botao-perigo" data-acao="excluir" data-id="${automacao.id}">Excluir</button>
            </div>
        </div>`;
}


async function carregarAutomacoes() {
    const resposta = await chamarApi("GET", "/api/automations");
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemAutomacoes, resposta.dados.erro, "erro");
        return;
    }
    automacoesCarregadas = resposta.dados.automacoes;
    const lista = document.getElementById("lista-automacoes");
    if (automacoesCarregadas.length === 0) {
        // Casa vazia (casa_comum.js), no passo 3. O botão leva ao formulário logo abaixo.
        lista.innerHTML = "";
        document.getElementById("casa-vazia").innerHTML = htmlCasaVazia({
            titulo: "Nenhuma automação ainda",
            texto: "Crie uma rotina, como o Modo Noite, para mudar vários dispositivos de uma vez.",
            passoAtual: 3,
            botaoTexto: "+ Nova automação",
            botaoId: "botao-vazio",
        });
        document.getElementById("botao-vazio").addEventListener("click", function () {
            levarAoFormulario(document.getElementById("formulario-automacao"));
        });
        return;
    }
    document.getElementById("casa-vazia").innerHTML = "";
    let html = "";
    for (const automacao of automacoesCarregadas) {
        html += htmlCardAutomacao(automacao);
    }
    lista.innerHTML = html;
}


/* Mostra o relatório da execução: mensagem, o que mudou e os avisos. */
function mostrarResultado(resultado) {
    let alteracoes = "";
    for (const linha of resultado.alteracoes) {
        alteracoes += `<li>${escaparHtml(linha)}</li>`;
    }
    let avisos = "";
    for (const linha of resultado.avisos) {
        avisos += `<li>${escaparHtml(linha)}</li>`;
    }
    document.getElementById("resultado-execucao").innerHTML = `
        <div class="mensagem mensagem-info" role="status">
            <strong>${escaparHtml(resultado.mensagem)}</strong>
            ${alteracoes ? `<p style="margin: 8px 0 0;">O que mudou:</p><ul>${alteracoes}</ul>` : ""}
            ${avisos ? `<p style="margin: 8px 0 0;">Portas e janelas:</p><ul>${avisos}</ul>` : ""}
        </div>`;
}


async function executarAutomacao(automacaoId) {
    const resposta = await chamarApi("POST", `/api/automations/${automacaoId}/run`);
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemAutomacoes, resposta.dados.erro, "erro");
        return;
    }
    caixaMensagemAutomacoes.innerHTML = "";
    mostrarResultado(resposta.dados);
    window.scrollTo({ top: 0, behavior: "smooth" });
}


async function alternarAtivo(automacaoId) {
    let ativoAgora = false;
    for (const automacao of automacoesCarregadas) {
        if (automacao.id === automacaoId) {
            ativoAgora = automacao.ativo;
        }
    }
    // PUT parcial: só o campo "ativo" muda; as ações continuam iguais.
    const resposta = await chamarApi("PUT", `/api/automations/${automacaoId}`, { ativo: !ativoAgora });
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemAutomacoes, resposta.dados.erro, "erro");
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
        mostrarMensagem(caixaMensagemAutomacoes, resposta.dados.erro, "erro");
        return;
    }
    mostrarMensagem(caixaMensagemAutomacoes, resposta.dados.mensagem, "sucesso");
    await carregarAutomacoes();
}


function tratarCliqueNaLista(evento) {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) {
        return;
    }
    const automacaoId = Number(botao.dataset.id);
    const acao = botao.dataset.acao;
    if (acao === "executar") {
        executarAutomacao(automacaoId);
    } else if (acao === "ativar") {
        alternarAtivo(automacaoId);
    } else if (acao === "editar") {
        prepararEdicao(automacaoId);
    } else if (acao === "excluir") {
        excluirAutomacao(automacaoId);
    }
}


async function iniciarAutomacoes() {
    const pagina = await montarPagina({ paginaAtual: "minha-casa", abaCasa: "rotinas" });
    if (!pagina) {
        return;
    }
    await carregarListaDeAcoes();
    campoGatilho.addEventListener("change", mostrarOuEsconderHorario);
    formularioAutomacao.addEventListener("submit", salvarAutomacao);
    botaoCancelarAutomacao.addEventListener("click", limparFormulario);
    document.getElementById("lista-automacoes").addEventListener("click", tratarCliqueNaLista);
    await carregarAutomacoes();
}


iniciarAutomacoes();
