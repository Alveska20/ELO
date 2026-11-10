/* =====================================================================
   E.L.O. — escuro/comum.js

   Código usado por TODAS as telas escuras (pages/escuro/*.html).
   Usadas pelo perfil homem, pelo perfil não definido e pelo admin.
   Elas seguem o Figma escuro (docs/figma/06-perfil-homem/) e usam só o
   css/escuro.css: nenhuma peça do visual roxo entra aqui.

   As rotas da API são as MESMAS das páginas roxas (/api/rooms,
   /api/devices, /api/automations, /api/tags, /api/profile...). Só muda
   a forma de mostrar.

   Ordem dos <script> em cada tela escura:
     api.js → layout.js → escuro/comum.js → escuro/<página>.js
   ===================================================================== */

/* Selos dos cards com DADOS FICTÍCIOS. Os valores de exemplo vêm do
   bloco "exemplos" do content/homem.json. */
const SELO_EXEMPLO = "Dados de exemplo";
const SELO_SINCRONIZANDO = "Sincronizando…";

/* Nome de cada tipo de dispositivo (o banco guarda sem acento). */
const NOMES_TIPOS_ESCURO = {
    luz: "Luz",
    ar_condicionado: "Ar-condicionado",
    tv: "TV",
    tomada: "Tomada inteligente",
    cortina: "Cortina",
    persiana: "Persiana",
    janela: "Janela",
    sensor: "Sensor",
    camera: "Câmera",
};

/* Estados possíveis de cada tipo: [estado "ativo", estado "inativo"].
   São os mesmos do backend (dispositivos_service.ESTADOS_POR_TIPO). */
const ESTADOS_TIPOS_ESCURO = {
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

const TEXTOS_ESTADOS_ESCURO = {
    ligado: "Ligado",
    desligado: "Desligado",
    aberta: "Aberta",
    fechada: "Fechada",
};

/* Ícone de cada tipo (no Figma são fotos; o CSS deixa o ícone branco). */
const ICONES_TIPOS_ESCURO = {
    luz: "lampada.svg",
    ar_condicionado: "alerta.svg",
    tv: "alerta.svg",
    tomada: "tomada.svg",
    cortina: "casa.svg",
    persiana: "casa.svg",
    janela: "casa.svg",
    sensor: "sino.svg",
    camera: "camera.svg",
};


/* ---------------------------------------------------------------------
   Abrir a página
   --------------------------------------------------------------------- */

/* Coloca os textos do content/homem.json nos elementos marcados com
   data-texto="bloco.chave" (ex.: data-texto="ambientes.titulo").
   Se a chave não existir no JSON, fica o texto que já está no HTML. */
function aplicarTextosEscuro(textos) {
    for (const elemento of document.querySelectorAll("[data-texto]")) {
        const partes = elemento.dataset.texto.split(".");
        const bloco = textos[partes[0]];
        if (bloco && bloco[partes[1]]) {
            elemento.innerHTML = htmlTexto(bloco[partes[1]]);   // htmlTexto: layout.js
        }
    }
}

/* Chamada no começo de cada tela do homem.
   1. montarPagina (layout.js): confere login e visual (escuro) e monta o menu lateral;
   2. GET /api/men-area: textos do Figma + números da casa + ambientes
      + temperatura do ar + dados de exemplo (textos.exemplos);
   3. põe os textos e a inicial do nome no círculo do canto.
   Devolve { usuario, area } ou null (se a pessoa foi redirecionada). */
async function iniciarPaginaEscuro(paginaAtual) {
    const pagina = await montarPagina({ paginaAtual: paginaAtual, exige: "escuro", escuro: true });
    if (!pagina) {
        return null;
    }

    const resposta = await chamarApi("GET", "/api/men-area");
    if (!resposta.ok) {
        return null;
    }
    aplicarTextosEscuro(resposta.dados.textos);

    const avatar = document.getElementById("avatar");
    if (avatar) {
        avatar.textContent = pagina.usuario.nome.charAt(0).toUpperCase();
        avatar.title = pagina.usuario.nome;
    }
    return { usuario: pagina.usuario, area: resposta.dados };
}


/* ---------------------------------------------------------------------
   Peças de HTML
   --------------------------------------------------------------------- */

/* Selo discreto "Dados de exemplo" (ou "Sincronizando…"), para que um
   valor fictício nunca pareça dado real. */
function htmlSeloExemplo(texto) {
    return `<span class="h-selo-exemplo">${escaparHtml(texto || SELO_EXEMPLO)}</span>`;
}

/* Linhas "rótulo ....... valor" a partir de uma lista de pares
   [["Tema", "Escuro"], ...] (dados de exemplo do homem.json). */
function htmlLinhasExemplo(pares) {
    let html = "";
    for (const [rotulo, valor] of pares) {
        html += `<div class="h-linha-info"><span>${escaparHtml(rotulo)}</span><span class="h-subtitulo">${escaparHtml(valor)}</span></div>`;
    }
    return html;
}

/* Casa vazia no estilo escuro (mesma mensagem do roxo, docs/proposta/02-casa-vazia.png).
   textos = bloco "casa_vazia" do homem.json.
   opcoes: titulo, texto, passoAtual (1 a 3), botaoTexto e botaoLink OU botaoId. */
function htmlCasaVaziaEscuro(textos, opcoes) {
    let passos = "";
    for (let numero = 1; numero <= 3; numero++) {
        let classe = "h-passo";
        let etiqueta = `Passo ${numero}`;
        if (numero === opcoes.passoAtual) {
            classe += " atual";
        } else if (numero < opcoes.passoAtual) {
            classe += " feito";
            etiqueta = `✓ Passo ${numero}`;
        }
        passos += `
            <li class="${classe}"${numero === opcoes.passoAtual ? ' aria-current="step"' : ""}>
                <span class="h-passo-etiqueta">${etiqueta}</span>
                <strong>${escaparHtml(textos[`passo${numero}_titulo`])}</strong>
                <span>${escaparHtml(textos[`passo${numero}_texto`])}</span>
            </li>`;
    }
    let botao = "";
    if (opcoes.botaoLink) {
        botao = `<a class="h-botao" href="${opcoes.botaoLink}">${opcoes.botaoTexto}</a>`;
    } else if (opcoes.botaoId) {
        botao = `<button type="button" class="h-botao" id="${opcoes.botaoId}">${opcoes.botaoTexto}</button>`;
    }
    return `
        <section class="h-cartao h-casa-vazia">
            <h2>${escaparHtml(opcoes.titulo || textos.titulo)}</h2>
            <p>${escaparHtml(opcoes.texto || textos.texto)}</p>
            <ol class="h-passos">${passos}</ol>
            ${botao}
        </section>`;
}

/* Interruptor do Figma escuro. role="switch" + aria-checked: o leitor de
   tela anuncia "ligado"/"desligado". data-acao e data-id: a página decide
   o que fazer no clique. */
function htmlInterruptorEscuro(acao, id, ligado, rotulo) {
    return `<button type="button" class="h-interruptor" role="switch" aria-checked="${ligado}"
                data-acao="${acao}" data-id="${id}" aria-label="${escaparHtml(rotulo)}"></button>`;
}

/* Quadro com o ícone do tipo (no Figma é a foto do aparelho). */
function htmlImagemTipo(tipo) {
    return `<span class="h-imagem"><img src="/img/icones/${ICONES_TIPOS_ESCURO[tipo]}" alt=""></span>`;
}

/* "● Ligado" / "● Desligado" com a cor certa. */
function htmlStatusDispositivo(dispositivo) {
    const classe = dispositivo.ativo ? "ligado" : "desligado";
    return `<span class="h-status ${classe}">${TEXTOS_ESTADOS_ESCURO[dispositivo.estado]}</span>`;
}

/* Opções de <select> com os cômodos (para os formulários). */
function htmlOpcoesComodos(comodos, selecionadoId, textoVazio) {
    let html = `<option value="">${escaparHtml(textoVazio)}</option>`;
    for (const comodo of comodos) {
        const marcado = comodo.id === selecionadoId ? " selected" : "";
        html += `<option value="${comodo.id}"${marcado}>${escaparHtml(comodo.nome)}</option>`;
    }
    return html;
}


/* ---------------------------------------------------------------------
   Chamadas à API usadas em várias telas
   --------------------------------------------------------------------- */

/* Liga/desliga (ou abre/fecha) um dispositivo. Tudo SIMULADO: o backend só
   troca o estado no banco. Devolve true se deu certo. */
async function alternarDispositivoEscuro(dispositivoId, caixaMensagem) {
    const resposta = await chamarApi("PATCH", `/api/devices/${dispositivoId}/toggle`);
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagem, resposta.dados.erro, "erro");
        return false;
    }
    return true;
}

/* GET simples que devolve a lista de dentro da resposta (ou [] se der erro).
   Ex.: buscarListaEscuro("/api/rooms", "comodos") */
async function buscarListaEscuro(url, chave) {
    const resposta = await chamarApi("GET", url);
    if (!resposta.ok) {
        return [];
    }
    return resposta.dados[chave];
}
