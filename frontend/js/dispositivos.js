/* =====================================================================
   E.L.O. — dispositivos.js (pages/dispositivos.html) — aba "Aparelhos"

   Visual: docs/proposta/04-aparelhos.png. As câmeras ficam na aba
   Câmeras (cameras.js), então não aparecem aqui.

   CRUD de aparelhos + alterar estado:
     listar    GET    /api/devices
     criar     POST   /api/devices
     editar    PUT    /api/devices/<id>
     excluir   DELETE /api/devices/<id>
     alternar  PATCH  /api/devices/<id>/toggle   (feito pelo casa_comum.js)
   E as portas (somente consulta): GET /api/doors
   ===================================================================== */

const caixaMensagemDispositivos = document.getElementById("mensagem");
const painelFormulario = document.getElementById("painel-formulario");
const formularioDispositivo = document.getElementById("formulario-dispositivo");
const campoDispositivoId = document.getElementById("dispositivo-id");
const campoDispositivoNome = document.getElementById("dispositivo-nome");
const campoDispositivoTipo = document.getElementById("dispositivo-tipo");
const campoDispositivoComodo = document.getElementById("dispositivo-comodo");
const campoTemperatura = document.getElementById("dispositivo-temperatura");

/* Filtros da imagem 04. "tipos" = tipos de dispositivo que entram no
   filtro. TV e tomada não têm filtro próprio: aparecem em "Todos". */
const FILTROS = [
    { id: "todos", texto: "Todos", tipos: null },
    { id: "luz", texto: "Luzes", tipos: ["luz"] },
    { id: "clima", texto: "Climatização", tipos: ["ar_condicionado"] },
    { id: "cortinas", texto: "Cortinas e janelas", tipos: ["cortina", "persiana", "janela"] },
    { id: "sensor", texto: "Sensores", tipos: ["sensor"] },
    { id: "portas", texto: "Portas", tipos: [] },
];

let dispositivosCarregados = [];   // sem as câmeras
let portasCarregadas = [];
let filtroAtual = "todos";
let totalComodos = 0;


/* Os cartões de aparelho e de porta ficam no casa_comum.js
   (htmlCardAparelho e htmlCardPorta), porque a tela Cômodo usa os mesmos. */


/* ---------------------------------------------------------------------
   Filtros
   --------------------------------------------------------------------- */

function filtroEscolhido() {
    return FILTROS.find(function (f) { return f.id === filtroAtual; });
}

function desenharFiltros() {
    let html = "";
    for (const filtro of FILTROS) {
        const ativo = filtro.id === filtroAtual;
        html += `<button type="button" class="filtro${ativo ? " ativo" : ""}" data-filtro="${filtro.id}"
                    aria-pressed="${ativo}">${filtro.texto}</button>`;
    }
    document.getElementById("filtros").innerHTML = html;
}

function desenharLista() {
    const filtro = filtroEscolhido();
    let html = "";
    for (const d of dispositivosCarregados) {
        if (filtro.tipos === null || filtro.tipos.includes(d.tipo)) {
            html += htmlCardAparelho(d, true);
        }
    }
    // As portas aparecem em "Todos" e no filtro "Portas".
    if (filtro.id === "todos" || filtro.id === "portas") {
        for (const porta of portasCarregadas) {
            html += htmlCardPorta(porta);
        }
    }
    const lista = document.getElementById("lista-dispositivos");
    lista.innerHTML = html || '<p class="texto-secundario">Nada neste filtro.</p>';
    ativarInterruptores(lista, caixaMensagemDispositivos, carregarDispositivos);   // casa_comum.js
}

function trocarFiltro(evento) {
    const botao = evento.target.closest("button[data-filtro]");
    if (!botao) {
        return;
    }
    filtroAtual = botao.dataset.filtro;
    desenharFiltros();
    desenharLista();
}


/* ---------------------------------------------------------------------
   Carregar (e a mensagem de casa vazia)
   --------------------------------------------------------------------- */

function desenharVazio() {
    document.getElementById("filtros").innerHTML = "";
    let opcoes = {
        titulo: "Nenhum aparelho ainda",
        texto: "Adicione luzes, ar-condicionado, cortinas ou sensores. Tudo aqui é simulado.",
        passoAtual: 2,
        botaoTexto: "+ Novo aparelho",
        botaoId: "botao-vazio",
    };
    // Sem cômodos, o primeiro passo ainda é cadastrar os cômodos.
    if (totalComodos === 0) {
        opcoes = {
            titulo: "Sua casa ainda está vazia",
            texto: "Comece cadastrando os cômodos da sua casa. Depois, adicione os aparelhos de cada um.",
            passoAtual: 1,
            botaoTexto: "+ Adicionar cômodo",
            botaoLink: "/pages/casa.html#novo",
        };
    }
    document.getElementById("lista-dispositivos").innerHTML = htmlCasaVazia(opcoes);
    const botao = document.getElementById("botao-vazio");
    if (botao) {
        botao.addEventListener("click", function () { abrirFormulario(null); });
    }
}

async function carregarDispositivos() {
    const [respostaDispositivos, respostaPortas] = await Promise.all([
        chamarApi("GET", "/api/devices"),
        chamarApi("GET", "/api/doors"),
    ]);
    if (!respostaDispositivos.ok || !respostaPortas.ok) {
        const falhou = respostaDispositivos.ok ? respostaPortas : respostaDispositivos;
        mostrarMensagem(caixaMensagemDispositivos, falhou.dados.erro, "erro");
        return;
    }
    dispositivosCarregados = respostaDispositivos.dados.dispositivos.filter(function (d) {
        return d.tipo !== "camera";   // câmeras: aba Câmeras
    });
    portasCarregadas = respostaPortas.dados.portas;

    if (dispositivosCarregados.length === 0 && portasCarregadas.length === 0) {
        desenharVazio();
        return;
    }
    desenharFiltros();
    desenharLista();
}


/* ---------------------------------------------------------------------
   Formulário (novo, editar e excluir)
   --------------------------------------------------------------------- */

/* Opções do campo "Tipo" (sem câmera: ela é criada na aba Câmeras). */
function preencherSelectTipos() {
    let html = "";
    for (const tipo of Object.keys(NOMES_DOS_TIPOS)) {
        if (tipo !== "camera") {
            html += `<option value="${tipo}">${NOMES_DOS_TIPOS[tipo]}</option>`;
        }
    }
    campoDispositivoTipo.innerHTML = html;
}

/* O campo de temperatura só aparece para o ar-condicionado. */
function mostrarOuEsconderTemperatura() {
    const ehAr = campoDispositivoTipo.value === "ar_condicionado";
    document.getElementById("campo-temperatura").classList.toggle("oculto", !ehAr);
}

function fecharFormulario() {
    formularioDispositivo.reset();
    campoDispositivoId.value = "";
    painelFormulario.classList.add("oculto");
}

/* Abre o formulário vazio (novo) ou com os dados do aparelho (editar). */
function abrirFormulario(dispositivo) {
    formularioDispositivo.reset();
    campoDispositivoId.value = dispositivo ? dispositivo.id : "";
    document.getElementById("titulo-formulario").textContent = dispositivo ? "Editar aparelho" : "Novo aparelho";
    if (dispositivo) {
        campoDispositivoNome.value = dispositivo.nome;
        campoDispositivoTipo.value = dispositivo.tipo;
        campoDispositivoComodo.value = dispositivo.comodo_id || "";
        campoTemperatura.value = dispositivo.temperatura || 23;
    }
    // "Excluir" só aparece quando o aparelho já existe.
    document.getElementById("botao-excluir").classList.toggle("oculto", !dispositivo);
    painelFormulario.classList.remove("oculto");
    mostrarOuEsconderTemperatura();
    levarAoFormulario(formularioDispositivo);   // casa_comum.js
}

function editarPeloCartao(evento) {
    const botao = evento.target.closest("button[data-editar]");
    if (!botao) {
        return;
    }
    const dispositivo = dispositivosCarregados.find(function (d) { return d.id === Number(botao.dataset.editar); });
    abrirFormulario(dispositivo);
}

async function salvarDispositivo(evento) {
    evento.preventDefault();
    const dados = {
        nome: campoDispositivoNome.value,
        tipo: campoDispositivoTipo.value,
        comodo_id: campoDispositivoComodo.value,
        temperatura: campoTemperatura.value,
    };
    let resposta;
    if (campoDispositivoId.value) {
        resposta = await chamarApi("PUT", `/api/devices/${campoDispositivoId.value}`, dados);
    } else {
        resposta = await chamarApi("POST", "/api/devices", dados);
    }
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemDispositivos, resposta.dados.erro, "erro");
        return;
    }
    mostrarMensagem(caixaMensagemDispositivos, "Aparelho salvo.", "sucesso");
    fecharFormulario();
    await carregarDispositivos();
}

async function excluirDispositivo() {
    if (!confirm("Excluir este aparelho? Ele também sai das rotinas que o usavam.")) {
        return;
    }
    const resposta = await chamarApi("DELETE", `/api/devices/${campoDispositivoId.value}`);
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemDispositivos, resposta.dados.erro, "erro");
        return;
    }
    mostrarMensagem(caixaMensagemDispositivos, resposta.dados.mensagem, "sucesso");
    fecharFormulario();
    await carregarDispositivos();
}


async function iniciarDispositivos() {
    const pagina = await montarPagina({ paginaAtual: "minha-casa", abaCasa: "aparelhos" });
    if (!pagina) {
        return;
    }
    // ?filtro=portas (vindo do card "Porta principal") já abre filtrado.
    const filtroDaUrl = new URLSearchParams(window.location.search).get("filtro");
    if (FILTROS.some(function (f) { return f.id === filtroDaUrl; })) {
        filtroAtual = filtroDaUrl;
    }

    preencherSelectTipos();
    await preencherSelectComodos(campoDispositivoComodo, "Sem cômodo");
    totalComodos = campoDispositivoComodo.options.length - 1;   // menos a opção "Sem cômodo"

    campoDispositivoTipo.addEventListener("change", mostrarOuEsconderTemperatura);
    formularioDispositivo.addEventListener("submit", salvarDispositivo);
    document.getElementById("botao-cancelar").addEventListener("click", fecharFormulario);
    document.getElementById("botao-excluir").addEventListener("click", excluirDispositivo);
    document.getElementById("botao-novo").addEventListener("click", function () { abrirFormulario(null); });
    document.getElementById("filtros").addEventListener("click", trocarFiltro);
    document.getElementById("lista-dispositivos").addEventListener("click", editarPeloCartao);

    await carregarDispositivos();
}


iniciarDispositivos();
