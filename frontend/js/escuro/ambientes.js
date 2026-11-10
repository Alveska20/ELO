/* =====================================================================
   E.L.O. — escuro/ambientes.js (pages/escuro/ambientes.html)

   Tela "Ambientes" do visual escuro (Figma 06-perfil-homem/03-ambientes-hifi.png).
   No sistema, "ambiente" = cômodo.
   Dados:
     GET  /api/men-area   cômodos com total de dispositivos e ativos
     GET  /api/devices    luzes ligadas e temperatura do ar-condicionado
     GET  /api/doors      portas abertas/destrancadas ("Com alertas")
     POST /api/rooms      "+ Adicionar ambiente"
   ===================================================================== */

const caixaMensagemAmbientes = document.getElementById("mensagem");

let ambientes = [];          // cômodos já com as informações calculadas
let filtroAtual = "todos";
let textosArea = null;       // textos do homem.json (casa_vazia)


/* Junta, para cada cômodo, o que os cartões do Figma mostram. */
function montarAmbientes(lista, dispositivos, portas) {
    const resultado = [];
    for (const comodo of lista) {
        let luzesLigadas = 0;
        let temperatura = null;
        let alerta = false;
        for (const d of dispositivos) {
            if (d.comodo_id !== comodo.id) {
                continue;
            }
            if (d.tipo === "luz" && d.ativo) {
                luzesLigadas += 1;
            }
            // Temperatura = a do ar-condicionado do cômodo (se ele estiver ligado).
            if (d.tipo === "ar_condicionado" && d.ativo) {
                temperatura = d.temperatura;
            }
            if (d.tipo === "janela" && d.estado === "aberta") {
                alerta = true;
            }
        }
        for (const porta of portas) {
            if (porta.comodo_id === comodo.id && (porta.aberta || !porta.trancada)) {
                alerta = true;
            }
        }
        resultado.push({
            id: comodo.id,
            nome: comodo.nome,
            total: comodo.total_dispositivos,
            ativos: comodo.ativos,
            luzesLigadas: luzesLigadas,
            temperatura: temperatura,
            alerta: alerta,
        });
    }
    return resultado;
}


/* ---------------------------------------------------------------------
   Filtros (Todos · Ativos · Com alertas · Favoritos)
   --------------------------------------------------------------------- */

function passaNoFiltro(ambiente) {
    if (filtroAtual === "ativos") {
        return ambiente.ativos > 0;
    }
    if (filtroAtual === "alertas") {
        return ambiente.alerta;
    }
    return true;
}

function desenharFiltros() {
    let ativos = 0;
    let alertas = 0;
    for (const ambiente of ambientes) {
        if (ambiente.ativos > 0) { ativos += 1; }
        if (ambiente.alerta) { alertas += 1; }
    }
    const filtros = [
        { id: "todos", texto: "Todos", contagem: ambientes.length },
        { id: "ativos", texto: "Ativos", contagem: ativos },
        { id: "alertas", texto: "Com alertas", contagem: alertas },
    ];
    let html = "";
    for (const filtro of filtros) {
        const ativo = filtro.id === filtroAtual;
        html += `
            <button type="button" class="h-filtro${ativo ? " ativo" : ""}" data-filtro="${filtro.id}" aria-pressed="${ativo}">
                ${filtro.texto} <span class="contagem">${filtro.contagem}</span>
            </button>`;
    }
    // Favoritos: o sistema não tem. O botão fica no lugar do Figma, desativado,
    // com o selo "Sincronizando…".
    html += `
        <button type="button" class="h-filtro" disabled title="Favoritos ainda não existem no sistema">
            Favoritos ${htmlSeloExemplo(SELO_SINCRONIZANDO)}
        </button>
        <button type="button" class="h-botao" id="botao-adicionar" style="margin-left: auto;">
            <span data-texto="ambientes.botao_adicionar">+ Adicionar ambiente</span>
        </button>`;
    document.getElementById("filtros").innerHTML = html;
}


/* ---------------------------------------------------------------------
   Cartões
   --------------------------------------------------------------------- */

function htmlCartaoAmbiente(ambiente) {
    let classePonto = "";
    if (ambiente.alerta) {
        classePonto = " alerta";
    } else if (ambiente.ativos > 0) {
        classePonto = " ativo";
    }
    let chipTemperatura = "";
    if (ambiente.temperatura !== null) {
        chipTemperatura = `<span class="h-chip">${ambiente.temperatura}°C</span>`;
    }
    return `
        <article class="h-ambiente-card">
            <div class="h-ambiente-foto">
                <span class="inicial" aria-hidden="true">${escaparHtml(ambiente.nome.charAt(0))}</span>
                <span class="ponto${classePonto}" title="${ambiente.alerta ? "Porta ou janela pedindo atenção" : ""}"></span>
            </div>
            <div class="h-ambiente-corpo">
                <h3>${escaparHtml(ambiente.nome)}</h3>
                <div class="linha">
                    <span>${ambiente.total} dispositivo(s)</span>
                    <span>• ${ambiente.ativos} ativo(s)</span>
                </div>
                <div class="chips">
                    ${chipTemperatura}
                    <span class="h-chip">💡 ${ambiente.luzesLigadas} ligada(s)</span>
                    <a href="/pages/escuro/ambiente.html?id=${ambiente.id}" aria-label="Abrir ${escaparHtml(ambiente.nome)}">&gt;</a>
                </div>
            </div>
        </article>`;
}

/* Cartão "+" do Figma: completa a última linha da grade (3 por linha). */
function htmlCartaoAdicionar() {
    return `
        <button type="button" class="h-adicionar" data-acao="adicionar" aria-label="Adicionar ambiente">
            <span aria-hidden="true">+</span>
        </button>`;
}

function desenharAmbientes() {
    // Casa sem cômodos: "casa vazia" no estilo escuro (comum.js).
    if (ambientes.length === 0) {
        document.getElementById("lista-ambientes").innerHTML = htmlCasaVaziaEscuro(textosArea.casa_vazia, {
            passoAtual: 1,
            botaoTexto: "+ Adicionar ambiente",
            botaoId: "botao-vazio",
        });
        document.getElementById("botao-vazio").addEventListener("click", function () { mostrarFormulario(true); });
        return;
    }
    let html = "";
    let quantidade = 0;
    for (const ambiente of ambientes) {
        if (passaNoFiltro(ambiente)) {
            html += htmlCartaoAmbiente(ambiente);
            quantidade += 1;
        }
    }
    // Sempre pelo menos um "+", e completa a linha como no Figma.
    let cartoesMais = 3 - (quantidade % 3);
    for (let i = 0; i < cartoesMais; i++) {
        html += htmlCartaoAdicionar();
    }
    document.getElementById("lista-ambientes").innerHTML = html;
}


/* ---------------------------------------------------------------------
   Adicionar ambiente
   --------------------------------------------------------------------- */

function mostrarFormulario(mostrar) {
    document.getElementById("caixa-formulario").classList.toggle("oculto", !mostrar);
    if (mostrar) {
        document.getElementById("ambiente-nome").focus();
    }
}

async function salvarAmbiente(evento) {
    evento.preventDefault();
    const nome = document.getElementById("ambiente-nome").value;
    const resposta = await chamarApi("POST", "/api/rooms", { nome: nome });
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemAmbientes, resposta.dados.erro, "erro");
        return;
    }
    mostrarMensagem(caixaMensagemAmbientes, "Ambiente criado.", "sucesso");
    document.getElementById("formulario-ambiente").reset();
    mostrarFormulario(false);
    await carregarAmbientes();
}


async function carregarAmbientes() {
    const area = await chamarApi("GET", "/api/men-area");
    if (!area.ok) {
        mostrarMensagem(caixaMensagemAmbientes, area.dados.erro, "erro");
        return;
    }
    const dispositivos = await buscarListaEscuro("/api/devices", "dispositivos");
    const portas = await buscarListaEscuro("/api/doors", "portas");
    ambientes = montarAmbientes(area.dados.ambientes, dispositivos, portas);
    desenharFiltros();
    desenharAmbientes();
}

function tratarClique(evento) {
    const filtro = evento.target.closest("[data-filtro]");
    if (filtro) {
        filtroAtual = filtro.dataset.filtro;
        desenharFiltros();
        desenharAmbientes();
        return;
    }
    if (evento.target.closest("#botao-adicionar, [data-acao='adicionar']")) {
        mostrarFormulario(true);
    }
}


async function iniciarAmbientes() {
    const pagina = await iniciarPaginaEscuro("ambientes");
    if (!pagina) {
        return;
    }
    textosArea = pagina.area.textos;
    document.querySelector("main").addEventListener("click", tratarClique);
    document.getElementById("formulario-ambiente").addEventListener("submit", salvarAmbiente);
    document.getElementById("botao-cancelar").addEventListener("click", function () { mostrarFormulario(false); });
    await carregarAmbientes();
    // Veio do "+ Adicionar ambiente" da casa vazia (Início ou Minha casa)?
    if (window.location.hash === "#novo") {
        mostrarFormulario(true);
    }
}


iniciarAmbientes();
