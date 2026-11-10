/* =====================================================================
   E.L.O. — escuro/tags.js (pages/escuro/tags.html)

   Minhas Tags do visual escuro. Tag = atalho físico (tipo NFC); a leitura
   é SIMULADA: "Tag identificada -> o sistema busca a configuração ->
   abre a função". A tela não existe no Figma escuro; usa só componentes dele.

     GET    /api/tags            lista
     POST   /api/tags            nova
     PUT    /api/tags/<id>       editar (ativar/desativar: {"ativo": false})
     DELETE /api/tags/<id>       excluir
     POST   /api/tags/scan       simular leitura -> { destino }

   As Tags "Proteção" e "Emergência" só funcionam para o perfil mulher:
   para quem usa o visual escuro o backend responde 403 e a mensagem aparece aqui.
   ===================================================================== */

const caixaMensagemTags = document.getElementById("mensagem");

/* Texto de cada função (o banco guarda o código). */
/* Funções que só existem para o perfil mulher (regra do backend). */
const FUNCOES_SO_PERFIL_MULHER = ["abrir_protecao", "abrir_emergencia"];

const NOMES_FUNCOES = {
    abrir_dashboard: "Abre o Início",
    abrir_comodo: "Abre um ambiente",
    abrir_protecao: "Abre a Proteção E.L.O.",
    abrir_emergencia: "Abre \"Preciso de ajuda\"",
};

const ESPERA_ANTES_DE_ABRIR = 1200;   // tempo para ler a mensagem antes de abrir
let tags = [];
let textosArea = null;       // textos do homem.json (casa_vazia)


function desenharNumeros() {
    let ativas = 0;
    for (const tag of tags) {
        if (tag.ativo) { ativas += 1; }
    }
    document.getElementById("numeros").innerHTML = `
        <div class="h-numero"><span class="rotulo">Tags</span><span class="valor">${tags.length}</span></div>
        <div class="h-numero verde"><span class="rotulo">Ativas</span><span class="valor">${ativas}</span></div>
        <div class="h-numero amarelo"><span class="rotulo">Desativadas</span><span class="valor">${tags.length - ativas}</span></div>`;
}

function htmlCartaoTag(tag) {
    let funcao = NOMES_FUNCOES[tag.funcao];
    if (tag.funcao === "abrir_comodo" && tag.comodo_nome) {
        funcao += `: ${tag.comodo_nome}`;
    }
    return `
        <article class="h-disp-card" style="cursor: default;">
            <span class="h-imagem"><img src="/img/icones/nfc.svg" alt=""></span>
            <span class="nome">${escaparHtml(tag.nome)}</span>
            <span class="h-subtitulo">Código: ${escaparHtml(tag.codigo)}</span>
            <span class="h-subtitulo">${escaparHtml(funcao)}</span>
            <div class="h-linha-info" style="border: none; padding: 4px 0 0;">
                <span class="h-status ${tag.ativo ? "ligado" : "desligado"}">${tag.ativo ? "Ativa" : "Desativada"}</span>
                ${htmlInterruptorEscuro("ativar", tag.id, tag.ativo, `Ativar ou desativar ${tag.nome}`)}
            </div>
            <div class="h-botoes" style="margin-top: 4px;">
                <button type="button" class="h-botao h-botao-pequeno" data-acao="testar" data-id="${tag.id}">Iniciar teste</button>
                <button type="button" class="h-botao h-botao-contorno h-botao-pequeno" data-acao="editar" data-id="${tag.id}">Editar</button>
                <button type="button" class="h-botao h-botao-perigo h-botao-pequeno" data-acao="excluir" data-id="${tag.id}">Excluir</button>
            </div>
        </article>`;
}

function desenharLista() {
    const lista = document.getElementById("lista");
    if (tags.length === 0) {
        // Casa vazia no estilo escuro (comum.js), no passo 3.
        lista.innerHTML = htmlCasaVaziaEscuro(textosArea.casa_vazia, {
            titulo: "Nenhuma Tag ainda",
            texto: "Tags são atalhos físicos (tipo NFC): ao aproximar o celular, uma função abre.",
            passoAtual: 3,
            botaoTexto: "+ Nova Tag",
            botaoId: "botao-vazio",
        });
        document.getElementById("botao-vazio").addEventListener("click", function () { abrirFormulario(null); });
        return;
    }
    let html = "";
    for (const tag of tags) {
        html += htmlCartaoTag(tag);
    }
    lista.innerHTML = html;
}


/* Simular leitura: o backend diz para onde ir (ou 403/404/400). */
async function simularLeitura(codigo) {
    const resposta = await chamarApi("POST", "/api/tags/scan", { codigo: codigo });
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemTags, resposta.dados.erro, "erro");
        return;
    }
    mostrarMensagem(caixaMensagemTags, `${resposta.dados.mensagem} Abrindo...`, "sucesso");
    // O destino é uma página roxa (ex.: comodo.html?id=3); o layout.js leva
    // quem usa o escuro para a tela equivalente (ambiente.html?id=3).
    setTimeout(function () {
        window.location.href = resposta.dados.destino;
    }, ESPERA_ANTES_DE_ABRIR);
}


/* ---------------------------------------------------------------------
   Formulário
   --------------------------------------------------------------------- */

function mostrarCampoComodo() {
    const ehComodo = document.getElementById("tag-funcao").value === "abrir_comodo";
    document.getElementById("campo-comodo").classList.toggle("oculto", !ehComodo);
}

function abrirFormulario(tag) {
    document.getElementById("formulario-tag").reset();
    document.getElementById("tag-id").value = tag ? tag.id : "";
    document.getElementById("titulo-formulario").textContent = tag ? "Editar Tag" : "Nova Tag";
    if (tag) {
        document.getElementById("tag-nome").value = tag.nome;
        document.getElementById("tag-codigo").value = tag.codigo;
        document.getElementById("tag-funcao").value = tag.funcao;
        document.getElementById("tag-comodo").value = tag.comodo_id || "";
        document.getElementById("tag-ativo").checked = tag.ativo;
    }
    mostrarCampoComodo();
    document.getElementById("caixa-formulario").classList.remove("oculto");
    document.getElementById("tag-nome").focus();
}

function fecharFormulario() {
    document.getElementById("caixa-formulario").classList.add("oculto");
}

async function salvarTag(evento) {
    evento.preventDefault();
    const id = document.getElementById("tag-id").value;
    const dados = {
        nome: document.getElementById("tag-nome").value,
        codigo: document.getElementById("tag-codigo").value,
        funcao: document.getElementById("tag-funcao").value,
        comodo_id: document.getElementById("tag-comodo").value,
        ativo: document.getElementById("tag-ativo").checked,
    };
    let resposta;
    if (id) {
        resposta = await chamarApi("PUT", `/api/tags/${id}`, dados);
    } else {
        resposta = await chamarApi("POST", "/api/tags", dados);
    }
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemTags, resposta.dados.erro, "erro");
        return;
    }
    mostrarMensagem(caixaMensagemTags, "Tag salva.", "sucesso");
    fecharFormulario();
    await carregarTags();
}


async function tratarClique(evento) {
    const botao = evento.target.closest("[data-acao]");
    if (!botao || !botao.dataset.id) {
        return;
    }
    const tag = tags.find(function (t) { return t.id === Number(botao.dataset.id); });
    if (botao.dataset.acao === "testar") {
        await simularLeitura(tag.codigo);
    } else if (botao.dataset.acao === "ativar") {
        const resposta = await chamarApi("PUT", `/api/tags/${tag.id}`, { ativo: !tag.ativo });
        if (!resposta.ok) {
            mostrarMensagem(caixaMensagemTags, resposta.dados.erro, "erro");
            return;
        }
        await carregarTags();
    } else if (botao.dataset.acao === "editar") {
        abrirFormulario(tag);
    } else if (botao.dataset.acao === "excluir") {
        if (!confirm("Excluir esta Tag?")) {
            return;
        }
        const resposta = await chamarApi("DELETE", `/api/tags/${tag.id}`);
        if (!resposta.ok) {
            mostrarMensagem(caixaMensagemTags, resposta.dados.erro, "erro");
            return;
        }
        await carregarTags();
    }
}


async function carregarTags() {
    tags = await buscarListaEscuro("/api/tags", "tags");
    desenharNumeros();
    desenharLista();
}


async function iniciarTags() {
    const pagina = await iniciarPaginaEscuro("tags");
    if (!pagina) {
        return;
    }
    textosArea = pagina.area.textos;
    let opcoes = "";
    // No visual escuro (homem, não definido e admin) o formulário NÃO
    // oferece "Abre a Proteção E.L.O." nem "Abre Preciso de ajuda" (o
    // backend também recusa, com 403). Os nomes ficam em NOMES_FUNCOES só
    // para mostrar Tags com essas funções que já existam no banco.
    for (const funcao in NOMES_FUNCOES) {
        if (FUNCOES_SO_PERFIL_MULHER.includes(funcao)) {
            continue;
        }
        opcoes += `<option value="${funcao}">${NOMES_FUNCOES[funcao]}</option>`;
    }
    document.getElementById("tag-funcao").innerHTML = opcoes;
    const comodos = await buscarListaEscuro("/api/rooms", "comodos");
    document.getElementById("tag-comodo").innerHTML = htmlOpcoesComodos(comodos, null, "Escolha um ambiente");

    document.querySelector("main").addEventListener("click", tratarClique);
    document.getElementById("botao-nova").addEventListener("click", function () { abrirFormulario(null); });
    document.getElementById("botao-cancelar").addEventListener("click", fecharFormulario);
    document.getElementById("tag-funcao").addEventListener("change", mostrarCampoComodo);
    document.getElementById("formulario-tag").addEventListener("submit", salvarTag);
    document.getElementById("formulario-leitura").addEventListener("submit", function (evento) {
        evento.preventDefault();
        simularLeitura(document.getElementById("codigo-lido").value);
    });

    await carregarTags();
}


iniciarTags();
