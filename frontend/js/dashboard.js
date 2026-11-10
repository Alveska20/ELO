/* =====================================================================
   E.L.O. — dashboard.js (pages/dashboard.html) — "Minha casa", aba Início

   Visual: docs/proposta/01-minha-casa-inicio.png e 02-minha-casa-vazia.png.
   Junta dados de rotas que já existem:
     GET  /api/dashboard               status geral e Tags ativas
     GET  /api/rooms                   "Ambientes da casa"
     GET  /api/devices                 câmeras, "Controles rápidos" e avisos
     GET  /api/doors                   porta principal e avisos
     GET  /api/automations             "Rotinas"
     POST /api/automations/<id>/run    botão "Executar" (simulação)

   "Consumo de energia" e "Moradores" mostram DADOS DE EXEMPLO (fixos neste
   arquivo, com o selo "Dados de exemplo"); só o nome da pessoa é real.

   Os modos Em casa / Fora / Desarmar são SIMULAÇÃO: só trocam o texto
   da faixa. Nada é salvo e nenhum sensor muda.
   Sem nenhum cômodo, a tela mostra a "casa vazia" no lugar do resumo.
   ===================================================================== */

const caixaMensagemCasa = document.getElementById("mensagem");

let usuarioLogado = null;   // preenchido em iniciarMinhaCasa (card "Moradores")

/* Quantos itens cabem em cada bloco, como na imagem aprovada. */
const MAXIMO_CONTROLES = 6;
const MAXIMO_AMBIENTES = 3;   // + o card "+ Novo cômodo"
const MAXIMO_AVISOS = 2;      // a lista completa fica na aba Avisos

/* Texto da faixa em cada modo (simulação). */
const TEXTOS_DOS_MODOS = {
    "em-casa": "Modo em casa: sensores internos desativados",
    "fora": "Modo fora: todos os sensores ativados",
    "desarmar": "Alarme desarmado",
};

/* DADOS DE EXEMPLO dos cards "Consumo de energia" e "Moradores": o sistema
   não mede energia nem tem outros moradores. Os valores seguem os do visual
   escuro (homem.json → exemplos): hoje 8,4 kWh, "Morador A" e "Moradora B". */
const EXEMPLO_CONSUMO = {
    hoje: "8,4 kWh",
    media: "7,9 kWh",
    semana: [
        { dia: "Seg", kwh: 7.2 },
        { dia: "Ter", kwh: 8.6 },
        { dia: "Qua", kwh: 6.6 },
        { dia: "Qui", kwh: 9.1 },
        { dia: "Sex", kwh: 8.0 },
        { dia: "Sáb", kwh: 7.4 },
        { dia: "Hoje", kwh: 8.4 },
    ],
};

const EXEMPLO_MORADORES = [
    { nome: "Morador A", papel: "Morador" },
    { nome: "Moradora B", papel: "Moradora" },
];

/* Verbo de cada estado, para descrever o que uma rotina faz. */
const VERBOS_DOS_ESTADOS = {
    ligado: "liga",
    desligado: "desliga",
    aberta: "abre",
    fechada: "fecha",
};


/* ---------------------------------------------------------------------
   Faixa de status e modos (simulação)
   --------------------------------------------------------------------- */

function trocarModo(evento) {
    const botao = evento.target.closest("button[data-modo]");
    if (!botao) {
        return;
    }
    for (const modo of document.querySelectorAll("#modos .modo")) {
        const escolhido = modo === botao;
        modo.classList.toggle("ativo", escolhido);
        modo.setAttribute("aria-pressed", String(escolhido));
    }
    document.getElementById("status-modo").textContent = TEXTOS_DOS_MODOS[botao.dataset.modo];
}


/* ---------------------------------------------------------------------
   Os 4 números
   --------------------------------------------------------------------- */

function htmlNumero(rotulo, valor, detalhe, link) {
    return `
        <a class="card card-numero" href="${link}">
            <span class="rotulo-numero">${rotulo}</span>
            <span class="numero">${valor}</span>
            <span class="detalhe-numero">${detalhe}</span>
        </a>`;
}

/* A "Porta principal": a porta com "principal" no nome, ou a primeira. */
function escolherPortaPrincipal(portas) {
    const principal = portas.find(function (p) { return p.nome.toLowerCase().includes("principal"); });
    return principal || portas[0] || null;
}

function textoDaPorta(porta) {
    if (!porta) {
        return "—";
    }
    if (porta.aberta) {
        return "Aberta";
    }
    return porta.trancada ? "Trancada" : "Destrancada";
}

function contarLigados(dispositivos, tipo) {
    return dispositivos.filter(function (d) { return d.tipo === tipo && d.ativo; }).length;
}

function desenharNumeros(resumo, dispositivos, portas) {
    const cameras = dispositivos.filter(function (d) { return d.tipo === "camera"; });
    let html = "";
    html += htmlNumero("Câmeras online", `${contarLigados(dispositivos, "camera")}/${cameras.length}`,
        "Câmeras", "/pages/cameras.html");
    html += htmlNumero("Porta principal", textoDaPorta(escolherPortaPrincipal(portas)),
        "Só consulta", "/pages/dispositivos.html?filtro=portas");
    // "Movimentos registrados" = sensores de movimento ligados agora (simulados).
    html += htmlNumero("Movimentos registrados", contarLigados(dispositivos, "sensor"),
        "Ver avisos", "/pages/avisos.html");
    html += htmlNumero("Tags ativas", resumo.tags_ativas, "Minhas Tags", "/pages/tags.html");
    document.getElementById("numeros").innerHTML = html;
}


/* ---------------------------------------------------------------------
   Controles rápidos (luzes, ar e cortina, até 6)
   --------------------------------------------------------------------- */

function escolherControlesRapidos(dispositivos) {
    const luzes = dispositivos.filter(function (d) { return d.tipo === "luz"; });
    const outros = dispositivos.filter(function (d) {
        return d.tipo === "ar_condicionado" || d.tipo === "cortina";
    });
    return luzes.slice(0, 4).concat(outros).slice(0, MAXIMO_CONTROLES);
}

function desenharControles(dispositivos) {
    const lugar = document.getElementById("controles-rapidos");
    const escolhidos = escolherControlesRapidos(dispositivos);
    if (escolhidos.length === 0) {
        lugar.innerHTML = '<p class="texto-secundario">Nenhum aparelho ainda. '
            + '<a href="/pages/dispositivos.html">Adicionar em Aparelhos</a>.</p>';
        return;
    }
    let html = "";
    for (const d of escolhidos) {
        html += `
            <div class="controle">
                <span>${escaparHtml(d.nome)}</span>
                <button type="button" class="interruptor" role="switch" aria-checked="${d.ativo}"
                        aria-label="Ligar ou desligar ${escaparHtml(d.nome)}" data-id="${d.id}"></button>
            </div>`;
    }
    lugar.innerHTML = html;
    // casa_comum.js: o clique chama o PATCH /toggle e depois recarrega a tela.
    ativarInterruptores(lugar, caixaMensagemCasa, carregarTudo);
}


/* ---------------------------------------------------------------------
   Ambientes da casa (cômodos), avisos e rotinas
   --------------------------------------------------------------------- */

function desenharAmbientes(comodos, dispositivos) {
    let html = "";
    for (const comodo of comodos.slice(0, MAXIMO_AMBIENTES)) {
        const ligados = dispositivos.filter(function (d) { return d.comodo_id === comodo.id && d.ativo; }).length;
        let detalhe = `${comodo.total_dispositivos} dispositivo(s)`;
        if (ligados > 0) {
            detalhe += ` · ${ligados} ligado(s)`;
        }
        html += `
            <a class="ambiente-mini" href="/pages/comodo.html?id=${comodo.id}">
                <strong>${escaparHtml(comodo.nome)}</strong>
                <span>${detalhe}</span>
            </a>`;
    }
    html += '<a class="ambiente-mini ambiente-novo" href="/pages/casa.html#novo">+ Novo cômodo</a>';
    document.getElementById("ambientes").innerHTML = html;
}

function desenharAvisos(dispositivos, portas) {
    const avisos = gerarAvisos(dispositivos, portas);   // casa_comum.js
    const lugar = document.getElementById("avisos");
    if (avisos.length === 0) {
        lugar.innerHTML = '<p class="texto-secundario">Nenhum aviso agora.</p>';
        return;
    }
    let html = "";
    for (const aviso of avisos.slice(0, MAXIMO_AVISOS)) {
        html += htmlAviso(aviso);
    }
    lugar.innerHTML = html;
}

/* "Apaga luzes, fecha cortinas, ar a 22 °C": resumo das ações da rotina. */
function descreverRotina(automacao) {
    if (automacao.descricao) {
        return automacao.descricao;
    }
    const partes = [];
    for (const acao of automacao.acoes) {
        if (acao.temperatura) {
            partes.push(`${acao.dispositivo_nome.toLowerCase()} a ${acao.temperatura} °C`);
        } else {
            partes.push(`${VERBOS_DOS_ESTADOS[acao.novo_estado]} ${acao.dispositivo_nome.toLowerCase()}`);
        }
    }
    const texto = partes.join(", ");
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function desenharRotinas(automacoes) {
    const lugar = document.getElementById("rotinas");
    if (automacoes.length === 0) {
        lugar.innerHTML = '<p class="texto-secundario">Nenhuma rotina ainda. '
            + '<a href="/pages/automacoes.html">Criar em Rotinas</a>.</p>';
        return;
    }
    let html = "";
    for (const automacao of automacoes) {
        html += `
            <div class="rotina">
                <div>
                    <strong>${escaparHtml(automacao.nome)}</strong>
                    <span>${escaparHtml(descreverRotina(automacao))}</span>
                </div>
                <button type="button" class="botao" data-executar="${automacao.id}">▶ Executar</button>
            </div>`;
    }
    lugar.innerHTML = html;
}

/* Um ouvinte só para todos os botões "Executar" (data-executar = id). */
async function executarRotina(evento) {
    const botao = evento.target.closest("button[data-executar]");
    if (!botao) {
        return;
    }
    const resposta = await chamarApi("POST", `/api/automations/${botao.dataset.executar}/run`);
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemCasa, resposta.dados.erro, "erro");
        return;
    }
    // A mensagem do backend já começa com [SIMULAÇÃO].
    mostrarMensagem(caixaMensagemCasa, resposta.dados.mensagem, "sucesso");
    await carregarTudo();
}


/* ---------------------------------------------------------------------
   Consumo de energia e Moradores (dados de exemplo)
   --------------------------------------------------------------------- */

/* Gráfico de barras simples: a altura de cada barra é proporcional ao
   maior valor da semana; a barra de hoje fica verde. */
function desenharConsumo() {
    const maior = Math.max(...EXEMPLO_CONSUMO.semana.map(function (d) { return d.kwh; }));
    let barras = "";
    for (const dia of EXEMPLO_CONSUMO.semana) {
        const altura = Math.round((dia.kwh / maior) * 100);
        const hoje = dia.dia === "Hoje" ? " hoje" : "";
        barras += `
            <div class="barra-consumo${hoje}" title="${String(dia.kwh).replace(".", ",")} kWh">
                <span style="height: ${altura}%;"></span>
                <small>${dia.dia}</small>
            </div>`;
    }
    document.getElementById("consumo").innerHTML = `
        <div class="consumo-numeros">
            <div><span>Hoje</span><strong>${EXEMPLO_CONSUMO.hoje}</strong></div>
            <div><span>Média da semana</span><strong>${EXEMPLO_CONSUMO.media}</strong></div>
        </div>
        <div class="barras-consumo" role="img"
             aria-label="Gráfico de consumo dos últimos 7 dias (dados de exemplo)">${barras}</div>`;
}

function htmlMorador(nome, papel, inicial) {
    return `
        <div class="morador">
            <span class="morador-inicial">${escaparHtml(inicial.toUpperCase())}</span>
            <div><strong>${escaparHtml(nome)}</strong><span>${escaparHtml(papel)}</span></div>
        </div>`;
}

/* A própria pessoa (dado real) como administradora da casa + moradores de exemplo. */
function desenharMoradores(usuario) {
    const primeiroNome = usuario.nome.split(" ")[0];
    let html = htmlMorador(primeiroNome, "Você · Administradora da casa", primeiroNome.charAt(0));
    for (const morador of EXEMPLO_MORADORES) {
        // "Morador A" mostra "A" no círculo, como na imagem aprovada.
        html += htmlMorador(morador.nome, morador.papel, morador.nome.slice(-1));
    }
    document.getElementById("moradores").innerHTML = html;
}


/* Casa sem cômodos: troca o resumo pela mensagem com os 3 passos. */
function desenharCasaVazia() {
    document.getElementById("subtitulo").textContent = "Vamos montar a sua casa.";
    document.getElementById("resumo-casa").classList.add("oculto");
    document.getElementById("casa-vazia").innerHTML = htmlCasaVazia({
        titulo: "Sua casa ainda está vazia",
        texto: "Comece cadastrando os cômodos da sua casa. Depois, adicione os aparelhos de cada um.",
        passoAtual: 1,
        botaoTexto: "+ Adicionar cômodo",
        botaoLink: "/pages/casa.html#novo",
    });
}


/* ---------------------------------------------------------------------
   Carregar
   --------------------------------------------------------------------- */

/* Busca uma lista; se der erro, mostra a mensagem e devolve []. */
async function buscarLista(url, chave) {
    const resposta = await chamarApi("GET", url);
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemCasa, resposta.dados.erro, "erro");
        return [];
    }
    return resposta.dados[chave];
}

async function carregarTudo() {
    const resposta = await chamarApi("GET", "/api/dashboard");
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemCasa, resposta.dados.erro, "erro");
        return;
    }
    const resumo = resposta.dados;
    if (resumo.total_comodos === 0) {
        desenharCasaVazia();
        return;
    }

    // As listas não dependem uma da outra: Promise.all busca todas ao
    // mesmo tempo e espera todas chegarem.
    const [comodos, dispositivos, portas, automacoes] = await Promise.all([
        buscarLista("/api/rooms", "comodos"),
        buscarLista("/api/devices", "dispositivos"),
        buscarLista("/api/doors", "portas"),
        buscarLista("/api/automations", "automacoes"),
    ]);

    document.getElementById("casa-vazia").innerHTML = "";
    document.getElementById("resumo-casa").classList.remove("oculto");
    document.getElementById("status-geral").textContent = resumo.status_geral;
    desenharNumeros(resumo, dispositivos, portas);
    desenharControles(dispositivos);
    desenharAmbientes(comodos, dispositivos);
    desenharAvisos(dispositivos, portas);
    desenharRotinas(automacoes);
    desenharConsumo();
    desenharMoradores(usuarioLogado);
}


async function iniciarMinhaCasa() {
    const pagina = await montarPagina({ paginaAtual: "minha-casa", abaCasa: "inicio" });
    if (!pagina) {
        return;   // foi redirecionada (login ou visual escuro)
    }
    // Só o primeiro nome, como na imagem aprovada ("Olá, Maria").
    usuarioLogado = pagina.usuario;
    const primeiroNome = pagina.usuario.nome.split(" ")[0];
    document.getElementById("saudacao").textContent = `Olá, ${primeiroNome}`;
    document.getElementById("status-modo").textContent = TEXTOS_DOS_MODOS["em-casa"];
    document.getElementById("modos").addEventListener("click", trocarModo);
    document.getElementById("rotinas").addEventListener("click", executarRotina);
    await carregarTudo();
}


iniciarMinhaCasa();
