/* =====================================================================
   E.L.O. — escuro/dispositivos.js (pages/escuro/dispositivos.html)

   Tela "Dispositivos" do visual escuro (Figma 06-perfil-homem/05-dispositivos-hifi.png):
   números · filtros por categoria · busca · cartões · painel de detalhe.

   Dados (as mesmas rotas das páginas roxas):
     GET    /api/devices                 lista de dispositivos
     GET    /api/doors                   portas (só consulta)
     GET    /api/rooms                   ambientes, para o formulário
     GET    /api/automations             aba "Automações" do painel
     PATCH  /api/devices/<id>/toggle     ligar/desligar (simulado)
     POST   /api/devices                 novo
     PUT    /api/devices/<id>            editar
     DELETE /api/devices/<id>            excluir
   ===================================================================== */

const caixaMensagemDisp = document.getElementById("mensagem");

/* Filtros: os MESMOS da tela Dispositivos roxa, para os dois temas terem
   a mesma estrutura. As câmeras aparecem no filtro "Câmeras". (O Figma
   escuro mostra Luzes · Segurança · Clima · Eletrodomésticos: ver
   docs/PENDENCIAS.md, "Figma escuro".) */
const CATEGORIAS = [
    { id: "todos", texto: "Todos", tipos: null },
    { id: "luz", texto: "Luzes", tipos: ["luz"] },
    { id: "clima", texto: "Climatização", tipos: ["ar_condicionado"] },
    { id: "cortinas", texto: "Cortinas e janelas", tipos: ["cortina", "persiana", "janela"] },
    { id: "camera", texto: "Câmeras", tipos: ["camera"] },
    { id: "sensor", texto: "Sensores", tipos: ["sensor"] },
    { id: "outros", texto: "TV e tomadas", tipos: ["tv", "tomada"] },
    { id: "portas", texto: "Portas (consulta)", tipos: ["porta"] },
];

let itens = [];              // dispositivos + portas, no mesmo formato
let automacoes = [];
let comodos = [];
let categoriaAtual = "todos";
let chaveSelecionada = null; // ex.: "d-5" (dispositivo 5) ou "p-2" (porta 2)
let abaAtual = "geral";
let textosArea = null;       // textos do homem.json (casa_vazia e exemplos)


/* Junta dispositivos e portas numa lista só, para a grade e o painel. */
function montarItens(dispositivos, portas) {
    const lista = [];
    for (const d of dispositivos) {
        lista.push({ chave: `d-${d.id}`, ehPorta: false, tipo: d.tipo, dados: d });
    }
    for (const p of portas) {
        lista.push({ chave: `p-${p.id}`, ehPorta: true, tipo: "porta", dados: p });
    }
    return lista;
}

function portaPedeAtencao(porta) {
    return porta.aberta || !porta.trancada;
}


/* ---------------------------------------------------------------------
   Números e filtros
   --------------------------------------------------------------------- */

function desenharNumeros() {
    let total = 0;
    let ligados = 0;
    let alertas = 0;
    for (const item of itens) {
        if (item.ehPorta) {
            if (portaPedeAtencao(item.dados)) { alertas += 1; }
            continue;
        }
        total += 1;
        if (item.dados.ativo) { ligados += 1; }
        if (item.tipo === "janela" && item.dados.estado === "aberta") { alertas += 1; }
    }
    // Cores dos números como no Figma: branco, verde, vermelho e amarelo.
    // "Com alertas" = portas abertas/destrancadas e janelas abertas.
    document.getElementById("numeros").innerHTML = `
        <div class="h-numero"><span class="rotulo">Total de dispositivos</span><span class="valor">${total}</span></div>
        <div class="h-numero verde"><span class="rotulo">Ligados</span><span class="valor">${ligados}</span></div>
        <div class="h-numero vermelho"><span class="rotulo">Desligados</span><span class="valor">${total - ligados}</span></div>
        <div class="h-numero amarelo"><span class="rotulo">Com alertas</span><span class="valor">${alertas}</span></div>`;
}

function itemNaCategoria(item, categoria) {
    return categoria.tipos === null || categoria.tipos.includes(item.tipo);
}

function desenharFiltros() {
    let html = "";
    for (const categoria of CATEGORIAS) {
        let contagem = 0;
        for (const item of itens) {
            if (itemNaCategoria(item, categoria)) { contagem += 1; }
        }
        const ativo = categoria.id === categoriaAtual;
        html += `
            <button type="button" class="h-filtro${ativo ? " ativo" : ""}" data-categoria="${categoria.id}" aria-pressed="${ativo}">
                ${categoria.texto} <span class="contagem">${contagem}</span>
            </button>`;
    }
    document.getElementById("filtros").innerHTML = html;
}


/* ---------------------------------------------------------------------
   Grade de cartões
   --------------------------------------------------------------------- */

/* Cartão de porta: só consulta (sem interruptor). */
function htmlCartaoPorta(item, selecionado) {
    const porta = item.dados;
    const status = `${porta.aberta ? "Aberta" : "Fechada"} · ${porta.trancada ? "Trancada" : "Destrancada"}`;
    return `
        <div class="h-disp-card${selecionado}" data-chave="${item.chave}" tabindex="0" role="button">
            <span class="h-imagem"><img src="/img/icones/porta.svg" alt=""></span>
            <span class="nome">${escaparHtml(porta.nome)}</span>
            <span class="h-status ${portaPedeAtencao(porta) ? "alerta" : "ligado"}">${status}</span>
            <span class="h-selo-exemplo">Só consulta</span>
        </div>`;
}

/* Câmera: quadro escuro no lugar da imagem (não há vídeo: é simulação). */
function htmlImagemCamera(d) {
    return `
        <div class="h-camera-imagem${d.ativo ? "" : " desligada"}" role="img" aria-label="Câmera simulada, sem imagem real">
            <span class="selo">${d.ativo ? "SIMULAÇÃO" : "DESLIGADA"}</span>
        </div>`;
}

function htmlCartao(item) {
    const selecionado = item.chave === chaveSelecionada ? " selecionado" : "";
    if (item.ehPorta) {
        return htmlCartaoPorta(item, selecionado);
    }
    const d = item.dados;
    const imagem = d.tipo === "camera" ? htmlImagemCamera(d) : htmlImagemTipo(d.tipo);
    return `
        <div class="h-disp-card${selecionado}" data-chave="${item.chave}" tabindex="0" role="button">
            ${imagem}
            <span class="nome">${escaparHtml(d.nome)}</span>
            ${htmlStatusDispositivo(d)}
            ${htmlInterruptorEscuro("alternar", d.id, d.ativo, `Ligar ou desligar ${d.nome}`)}
        </div>`;
}

/* Sem nenhum dispositivo nem porta: "casa vazia" no estilo escuro (comum.js).
   Sem cômodos, o passo atual ainda é o 1 (cadastrar os ambientes). */
function desenharVazio() {
    let opcoes = {
        titulo: "Nenhum dispositivo ainda",
        texto: "Adicione luzes, ar-condicionado, cortinas ou câmeras. Tudo aqui é simulado.",
        passoAtual: 2,
        botaoTexto: "+ Novo dispositivo",
        botaoId: "botao-vazio",
    };
    if (comodos.length === 0) {
        opcoes = { passoAtual: 1, botaoTexto: "+ Adicionar ambiente", botaoLink: "/pages/escuro/ambientes.html#novo" };
    }
    document.getElementById("lista").innerHTML = htmlCasaVaziaEscuro(textosArea.casa_vazia, opcoes);
    document.getElementById("contagem-lista").textContent = 0;
    const botao = document.getElementById("botao-vazio");
    if (botao) {
        botao.addEventListener("click", function () { abrirFormulario(null); });
    }
}

function desenharLista() {
    if (itens.length === 0) {
        desenharVazio();
        return;
    }
    const categoria = CATEGORIAS.find(function (c) { return c.id === categoriaAtual; });
    const busca = document.getElementById("busca").value.trim().toLowerCase();
    let html = "";
    let quantidade = 0;
    for (const item of itens) {
        const nome = item.dados.nome.toLowerCase();
        if (itemNaCategoria(item, categoria) && nome.includes(busca)) {
            html += htmlCartao(item);
            quantidade += 1;
        }
    }
    if (quantidade === 0) {
        html = '<p class="h-subtitulo">Nenhum dispositivo nesta categoria.</p>';
    }
    document.getElementById("lista").innerHTML = html;
    document.getElementById("contagem-lista").textContent = quantidade;
}


/* ---------------------------------------------------------------------
   Painel de detalhe
   --------------------------------------------------------------------- */

function htmlAbas() {
    const abas = [["geral", "Visão geral"], ["automacoes", "Automações"], ["historico", "Histórico"]];
    let html = '<div class="h-abas" role="tablist">';
    for (const [id, texto] of abas) {
        const ativa = id === abaAtual;
        html += `<button type="button" class="h-aba${ativa ? " ativa" : ""}" role="tab" aria-selected="${ativa}" data-aba="${id}">${texto}</button>`;
    }
    return html + "</div>";
}

/* Aba "Visão geral": o que o sistema tem (status, ambiente, temperatura) +
   consumo, tensão, conexão e tempo ligado de EXEMPLO (com selo). */
function htmlVisaoGeral(d) {
    const ex = textosArea.exemplos;
    let temperatura = "";
    if (d.tipo === "ar_condicionado") {
        temperatura = `<div class="h-linha-info"><span>Temperatura</span><span>${d.temperatura} °C</span></div>`;
    }
    let ambiente = '<span class="h-subtitulo">Sem ambiente</span>';
    if (d.comodo_id) {
        ambiente = `<a href="/pages/escuro/ambiente.html?id=${d.comodo_id}">${escaparHtml(d.comodo_nome)} ›</a>`;
    }
    return `
        <div class="h-cartao" style="padding: 14px 18px;">
            <div class="h-cartao-topo"><h3>Status</h3>${htmlSeloExemplo()}</div>
            ${htmlStatusDispositivo(d)}
            <div class="h-grade h-grade-3" style="gap: 8px; margin: 12px 0;">
                <div class="h-celula">Consumo total<br>${escaparHtml(ex.dispositivo_consumo)}</div>
                <div class="h-celula">Tensão<br>${escaparHtml(ex.dispositivo_tensao)}</div>
                <div class="h-celula">Conexão<br>${escaparHtml(ex.dispositivo_conexao)}</div>
            </div>
            <div class="h-linha-info"><span>Última atividade</span><span>${escaparHtml(ex.dispositivo_ultima_atividade)}</span></div>
            <div class="h-linha-info"><span>Tempo ligado hoje</span><span>${escaparHtml(ex.dispositivo_tempo_ligado)}</span></div>
            ${temperatura}
        </div>
        <div class="h-linha-info h-espaco"><span>Ambiente</span>${ambiente}</div>
        <h3 class="h-espaco" data-texto="dispositivos.acoes_rapidas">Ações rápidas</h3>
        <div class="h-acoes-rapidas">
            <button type="button" class="h-acao-rapida" data-acao="alternar" data-id="${d.id}">
                Desligar/ligar <span class="icone" aria-hidden="true">⏻</span>
            </button>
            <button type="button" class="h-acao-rapida" disabled title="${SELO_SINCRONIZANDO}">
                Brilho <span class="icone" aria-hidden="true">☀</span>
            </button>
            <button type="button" class="h-acao-rapida" disabled title="${SELO_SINCRONIZANDO}">
                Ajustar cor <span class="icone" aria-hidden="true">🎨</span>
            </button>
        </div>
        <p class="h-subtitulo" style="font-size: 13px; margin-top: 8px;">Brilho e cor: ${htmlSeloExemplo(SELO_SINCRONIZANDO)}</p>`;
}

/* Aba "Automações": as automações que mexem neste aparelho (dado real). */
function htmlAbaAutomacoes(d) {
    let html = "";
    for (const automacao of automacoes) {
        for (const acao of automacao.acoes) {
            if (acao.dispositivo_id === d.id) {
                html += `
                    <div class="h-linha-info">
                        <a href="/pages/escuro/automacoes.html">${escaparHtml(automacao.nome)}</a>
                        <span>${TEXTOS_ESTADOS_ESCURO[acao.novo_estado]}</span>
                    </div>`;
            }
        }
    }
    return html || '<p class="h-subtitulo">Nenhuma automação usa este aparelho.</p>';
}

function htmlPainelDispositivo(d) {
    let conteudoAba = htmlVisaoGeral(d);
    if (abaAtual === "automacoes") {
        conteudoAba = htmlAbaAutomacoes(d);
    } else if (abaAtual === "historico") {
        // O sistema não guarda histórico: lista de EXEMPLO, com selo.
        conteudoAba = `<p>${htmlSeloExemplo()}</p>${htmlLinhasExemplo(textosArea.exemplos.dispositivo_historico)}`;
    }
    return `
        <div class="h-painel-topo">
            ${htmlImagemTipo(d.tipo)}
            <div>
                <h3>${escaparHtml(d.nome)}</h3>
                <p class="h-subtitulo">📍 ${escaparHtml(d.comodo_nome || "Sem ambiente")}</p>
                <p class="h-subtitulo">${NOMES_TIPOS_ESCURO[d.tipo]}</p>
            </div>
        </div>
        ${htmlAbas()}
        ${conteudoAba}
        <div class="h-botoes">
            <button type="button" class="h-botao h-botao-contorno h-botao-pequeno" data-acao="editar" data-id="${d.id}">Editar</button>
            <button type="button" class="h-botao h-botao-perigo h-botao-pequeno" data-acao="excluir" data-id="${d.id}">Excluir</button>
        </div>`;
}

function htmlPainelPorta(p) {
    return `
        <div class="h-painel-topo">
            <span class="h-imagem"><img src="/img/icones/porta.svg" alt=""></span>
            <div>
                <h3>${escaparHtml(p.nome)}</h3>
                <p class="h-subtitulo">📍 ${escaparHtml(p.comodo_nome || "Sem ambiente")}</p>
            </div>
        </div>
        <div class="h-cartao h-espaco">
            <div class="h-linha-info"><span>Porta</span><span>${p.aberta ? "Aberta" : "Fechada"}</span></div>
            <div class="h-linha-info"><span>Fechadura</span><span>${p.trancada ? "Trancada" : "Destrancada"}</span></div>
        </div>
        <p class="h-subtitulo h-espaco">Somente consulta: o sistema não tranca nem destranca portas.</p>`;
}

function desenharPainel() {
    const painel = document.getElementById("painel");
    const item = itens.find(function (i) { return i.chave === chaveSelecionada; });
    if (!item) {
        painel.innerHTML = '<p class="h-subtitulo">Escolha um dispositivo para ver os detalhes.</p>';
        return;
    }
    painel.innerHTML = item.ehPorta ? htmlPainelPorta(item.dados) : htmlPainelDispositivo(item.dados);
}


/* ---------------------------------------------------------------------
   Formulário (novo / editar)
   --------------------------------------------------------------------- */

function preencherSelects() {
    let tipos = "";
    for (const tipo in NOMES_TIPOS_ESCURO) {
        tipos += `<option value="${tipo}">${NOMES_TIPOS_ESCURO[tipo]}</option>`;
    }
    document.getElementById("dispositivo-tipo").innerHTML = tipos;
    document.getElementById("dispositivo-comodo").innerHTML = htmlOpcoesComodos(comodos, null, "Sem ambiente");
}

function mostrarCampoTemperatura() {
    const ehAr = document.getElementById("dispositivo-tipo").value === "ar_condicionado";
    document.getElementById("campo-temperatura").classList.toggle("oculto", !ehAr);
}

function abrirFormulario(dispositivo) {
    document.getElementById("formulario-dispositivo").reset();
    document.getElementById("dispositivo-id").value = dispositivo ? dispositivo.id : "";
    document.getElementById("titulo-formulario").textContent = dispositivo ? "Editar dispositivo" : "Novo dispositivo";
    if (dispositivo) {
        document.getElementById("dispositivo-nome").value = dispositivo.nome;
        document.getElementById("dispositivo-tipo").value = dispositivo.tipo;
        document.getElementById("dispositivo-comodo").value = dispositivo.comodo_id || "";
        document.getElementById("dispositivo-temperatura").value = dispositivo.temperatura || "";
    } else {
        // Novo dispositivo com um filtro aberto (ex.: Câmeras): o tipo já vem escolhido.
        const categoria = CATEGORIAS.find(function (c) { return c.id === categoriaAtual; });
        if (categoria.tipos && categoria.tipos[0] !== "porta") {
            document.getElementById("dispositivo-tipo").value = categoria.tipos[0];
        }
    }
    mostrarCampoTemperatura();
    const caixa = document.getElementById("caixa-formulario");
    caixa.classList.remove("oculto");
    caixa.scrollIntoView({ behavior: "smooth" });
}

function fecharFormulario() {
    document.getElementById("caixa-formulario").classList.add("oculto");
}

async function salvarDispositivo(evento) {
    evento.preventDefault();
    const id = document.getElementById("dispositivo-id").value;
    const dados = {
        nome: document.getElementById("dispositivo-nome").value,
        tipo: document.getElementById("dispositivo-tipo").value,
        comodo_id: document.getElementById("dispositivo-comodo").value,
        temperatura: document.getElementById("dispositivo-temperatura").value,
    };
    let resposta;
    if (id) {
        resposta = await chamarApi("PUT", `/api/devices/${id}`, dados);
    } else {
        resposta = await chamarApi("POST", "/api/devices", dados);
    }
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemDisp, resposta.dados.erro, "erro");
        return;
    }
    mostrarMensagem(caixaMensagemDisp, "Dispositivo salvo.", "sucesso");
    chaveSelecionada = `d-${resposta.dados.dispositivo.id}`;
    fecharFormulario();
    await carregarDispositivos();
}


/* ---------------------------------------------------------------------
   Cliques (um ouvinte só para a tela toda, usando data-acao / data-chave)
   --------------------------------------------------------------------- */

async function alternarDispositivo(dispositivoId) {
    if (await alternarDispositivoEscuro(dispositivoId, caixaMensagemDisp)) {
        await carregarDispositivos();
    }
}

function editarDispositivo(dispositivoId) {
    const item = itens.find(function (i) { return i.chave === `d-${dispositivoId}`; });
    abrirFormulario(item.dados);
}

async function excluirDispositivo(dispositivoId) {
    if (!confirm("Excluir este dispositivo?")) {
        return;
    }
    const resposta = await chamarApi("DELETE", `/api/devices/${dispositivoId}`);
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemDisp, resposta.dados.erro, "erro");
        return;
    }
    mostrarMensagem(caixaMensagemDisp, "Dispositivo excluído.", "sucesso");
    chaveSelecionada = null;
    await carregarDispositivos();
}

function trocarCategoria(categoriaId) {
    categoriaAtual = categoriaId;
    desenharFiltros();
    desenharLista();
}

function trocarAba(abaId) {
    abaAtual = abaId;
    desenharPainel();
}

function selecionarCartao(chave) {
    chaveSelecionada = chave;
    abaAtual = "geral";
    desenharLista();
    desenharPainel();
}

/* Um ouvinte só para a página inteira: descobre o que foi clicado pelos
   atributos data-* e chama a função certa. */
function tratarClique(evento) {
    const botao = evento.target.closest("[data-acao]");
    if (botao && botao.dataset.acao === "alternar") {
        alternarDispositivo(botao.dataset.id);
    } else if (botao && botao.dataset.acao === "editar") {
        editarDispositivo(botao.dataset.id);
    } else if (botao && botao.dataset.acao === "excluir") {
        excluirDispositivo(botao.dataset.id);
    } else if (evento.target.closest("[data-categoria]")) {
        trocarCategoria(evento.target.closest("[data-categoria]").dataset.categoria);
    } else if (evento.target.closest("[data-aba]")) {
        trocarAba(evento.target.closest("[data-aba]").dataset.aba);
    } else if (evento.target.closest("[data-chave]")) {
        selecionarCartao(evento.target.closest("[data-chave]").dataset.chave);
    }
}

/* Enter no cartão (teclado) funciona como o clique. */
function tratarTeclado(evento) {
    if (evento.key === "Enter" && evento.target.matches("[data-chave]")) {
        evento.target.click();
    }
}


async function carregarDispositivos() {
    const dispositivos = await buscarListaEscuro("/api/devices", "dispositivos");
    const portas = await buscarListaEscuro("/api/doors", "portas");
    automacoes = await buscarListaEscuro("/api/automations", "automacoes");
    itens = montarItens(dispositivos, portas);
    if (chaveSelecionada === null && itens.length > 0) {
        chaveSelecionada = itens[0].chave;   // como no Figma: o primeiro já aparece no painel
    }
    desenharNumeros();
    desenharFiltros();
    desenharLista();
    desenharPainel();
}


async function iniciarDispositivos() {
    const pagina = await iniciarPaginaEscuro("dispositivos");
    if (!pagina) {
        return;
    }
    textosArea = pagina.area.textos;
    // ?filtro=camera (ex.: vindo da aba Câmeras do roxo) já abre filtrado.
    const filtroDaUrl = new URLSearchParams(window.location.search).get("filtro");
    if (CATEGORIAS.some(function (c) { return c.id === filtroDaUrl; })) {
        categoriaAtual = filtroDaUrl;
    }
    comodos = await buscarListaEscuro("/api/rooms", "comodos");
    preencherSelects();

    document.querySelector("main").addEventListener("click", tratarClique);
    document.querySelector("main").addEventListener("keydown", tratarTeclado);
    document.getElementById("busca").addEventListener("input", desenharLista);
    document.getElementById("botao-novo").addEventListener("click", function () { abrirFormulario(null); });
    document.getElementById("botao-cancelar").addEventListener("click", fecharFormulario);
    document.getElementById("dispositivo-tipo").addEventListener("change", mostrarCampoTemperatura);
    document.getElementById("formulario-dispositivo").addEventListener("submit", salvarDispositivo);

    await carregarDispositivos();
}


iniciarDispositivos();
