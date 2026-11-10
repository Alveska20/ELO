/* =====================================================================
   E.L.O. — tags.js (pages/tags.html) — "Minha casa", aba Tags

   Visual: docs/proposta/06-tags.png.
   Como as Tags funcionam (leitura SIMULADA pelo botão "Iniciar teste"):
     POST /api/tags/scan {"codigo": "SALA"}
     -> o backend busca a configuração da Tag -> devolve "destino"
     -> esta página abre o destino.
   Se a Tag abre a Proteção E.L.O. e a pessoa não tem esse acesso,
   a API responde 403 e a pessoa continua aqui, com a mensagem.

     listar   GET    /api/tags
     criar    POST   /api/tags
     editar   PUT    /api/tags/<id>   (ativar/desativar: {"ativo": false})
     excluir  DELETE /api/tags/<id>
   ===================================================================== */

const caixaMensagemTags = document.getElementById("mensagem");
const painelFormulario = document.getElementById("painel-formulario");
const formularioTag = document.getElementById("formulario-tag");
const campoTagId = document.getElementById("tag-id");
const campoTagFuncao = document.getElementById("tag-funcao");

/* O que cada função faz, como aparece no cartão ("• Abrir a Proteção E.L.O."). */
const TEXTOS_DAS_FUNCOES = {
    abrir_dashboard: "Abrir Minha casa",
    abrir_comodo: "Abrir o ambiente",
    abrir_protecao: "Abrir a Proteção E.L.O.",
    abrir_emergencia: "Abrir o Preciso de ajuda",
};

/* Tempo para a pessoa ler "Tag identificada" antes de ir para o destino. */
const ESPERA_ANTES_DE_ABRIR = 1200;

let tagsCarregadas = [];


/* ---------------------------------------------------------------------
   Simulação de leitura ("Iniciar teste")
   --------------------------------------------------------------------- */

async function simularLeitura(codigo) {
    const resposta = await chamarApi("POST", "/api/tags/scan", { codigo: codigo });
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!resposta.ok) {
        // 404 (não reconhecida), 400 (desativada / sem cômodo) ou 403 (sem permissão).
        mostrarMensagem(caixaMensagemTags, resposta.dados.erro, "erro");
        return;
    }
    mostrarMensagem(caixaMensagemTags, `${resposta.dados.mensagem} Abrindo...`, "sucesso");
    // setTimeout espera o tempo indicado e depois executa a função uma vez.
    setTimeout(function () {
        window.location.href = resposta.dados.destino;
    }, ESPERA_ANTES_DE_ABRIR);
}


/* ---------------------------------------------------------------------
   Cartões
   --------------------------------------------------------------------- */

function textoDaFuncao(tag) {
    let texto = TEXTOS_DAS_FUNCOES[tag.funcao];
    if (tag.funcao === "abrir_comodo") {
        texto += ` ${tag.comodo_nome || "(escolha um cômodo em Editar)"}`;
    }
    return texto;
}

function htmlCardTag(tag) {
    const classe = tag.ativo ? "card card-tag" : "card card-tag inativa";
    return `
        <div class="${classe}">
            <div class="card-tag-topo">
                <span class="icone-redondo" aria-hidden="true">((·</span>
                <div>
                    <strong>${escaparHtml(tag.nome)}</strong>
                    <span>${escaparHtml(tag.comodo_nome || "")}</span>
                </div>
            </div>
            <p class="texto-secundario">Como usar: aproxime o celular (simulado)</p>
            <p>• ${escaparHtml(textoDaFuncao(tag))}</p>
            <div class="card-tag-acoes">
                <button type="button" class="botao botao-pequeno botao-contorno" data-acao="testar" data-id="${tag.id}">Iniciar teste</button>
                <button type="button" class="botao-link link-editar" data-acao="editar" data-id="${tag.id}">Editar</button>
                <button type="button" class="interruptor" role="switch" aria-checked="${tag.ativo}"
                        aria-label="Ativar ou desativar ${escaparHtml(tag.nome)}" data-acao="ativar" data-id="${tag.id}"></button>
            </div>
        </div>`;
}

function desenharVazio() {
    document.getElementById("casa-vazia").innerHTML = htmlCasaVazia({
        titulo: "Nenhuma Tag ainda",
        texto: "Tags são atalhos físicos (tipo NFC): ao aproximar o celular, uma função abre.",
        passoAtual: 3,
        botaoTexto: "+ Nova Tag",
        botaoId: "botao-vazio",
    });
    document.getElementById("botao-vazio").addEventListener("click", function () { abrirFormulario(null); });
}

async function carregarTags() {
    const resposta = await chamarApi("GET", "/api/tags");
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemTags, resposta.dados.erro, "erro");
        return;
    }
    tagsCarregadas = resposta.dados.tags;
    const lista = document.getElementById("lista-tags");
    if (tagsCarregadas.length === 0) {
        lista.innerHTML = "";
        desenharVazio();
        return;
    }
    document.getElementById("casa-vazia").innerHTML = "";
    let html = "";
    for (const tag of tagsCarregadas) {
        html += htmlCardTag(tag);
    }
    lista.innerHTML = html;
}

function buscarTagCarregada(tagId) {
    return tagsCarregadas.find(function (tag) { return tag.id === tagId; }) || null;
}


/* ---------------------------------------------------------------------
   Formulário (nova, editar e excluir)
   --------------------------------------------------------------------- */

/* O cômodo só é usado quando a função é "Abrir um cômodo". */
function mostrarOuEsconderComodo() {
    document.getElementById("campo-comodo").classList.toggle("oculto", campoTagFuncao.value !== "abrir_comodo");
}

function fecharFormulario() {
    formularioTag.reset();
    campoTagId.value = "";
    painelFormulario.classList.add("oculto");
}

/* Abre o formulário vazio (nova Tag) ou com os dados da Tag (editar). */
function abrirFormulario(tag) {
    formularioTag.reset();
    campoTagId.value = tag ? tag.id : "";
    document.getElementById("titulo-formulario").textContent = tag ? "Editar Tag" : "Nova Tag";
    if (tag) {
        document.getElementById("tag-nome").value = tag.nome;
        document.getElementById("tag-codigo").value = tag.codigo;
        campoTagFuncao.value = tag.funcao;
        document.getElementById("tag-comodo").value = tag.comodo_id || "";
        document.getElementById("tag-ativo").checked = tag.ativo;
    }
    // "Excluir" só aparece quando a Tag já existe.
    document.getElementById("botao-excluir").classList.toggle("oculto", !tag);
    mostrarOuEsconderComodo();
    painelFormulario.classList.remove("oculto");
    levarAoFormulario(formularioTag);   // casa_comum.js
}

async function salvarTag(evento) {
    evento.preventDefault();
    const dados = {
        nome: document.getElementById("tag-nome").value,
        codigo: document.getElementById("tag-codigo").value,
        funcao: campoTagFuncao.value,
        comodo_id: document.getElementById("tag-comodo").value,
        ativo: document.getElementById("tag-ativo").checked,
    };
    let resposta;
    if (campoTagId.value) {
        resposta = await chamarApi("PUT", `/api/tags/${campoTagId.value}`, dados);
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

async function alternarAtivo(tagId) {
    const tag = buscarTagCarregada(tagId);
    const resposta = await chamarApi("PUT", `/api/tags/${tagId}`, { ativo: !tag.ativo });
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemTags, resposta.dados.erro, "erro");
        return;
    }
    await carregarTags();
}

async function excluirTag() {
    if (!confirm("Excluir esta Tag?")) {
        return;
    }
    const resposta = await chamarApi("DELETE", `/api/tags/${campoTagId.value}`);
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemTags, resposta.dados.erro, "erro");
        return;
    }
    mostrarMensagem(caixaMensagemTags, resposta.dados.mensagem, "sucesso");
    fecharFormulario();
    await carregarTags();
}

/* Um ouvinte para a lista inteira: o data-acao diz qual botão foi clicado. */
function tratarCliqueNaLista(evento) {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) {
        return;
    }
    const tag = buscarTagCarregada(Number(botao.dataset.id));
    if (botao.dataset.acao === "testar") {
        simularLeitura(tag.codigo);
    } else if (botao.dataset.acao === "ativar") {
        alternarAtivo(tag.id);
    } else if (botao.dataset.acao === "editar") {
        abrirFormulario(tag);
    }
}


/* As funções "Abrir a Proteção E.L.O." e "Abrir Preciso de ajuda" só
   existem para o perfil mulher (o backend recusa as outras pessoas com 403).
   Hoje só o perfil mulher usa o visual roxo; isto é uma garantia a mais. */
function tirarFuncoesDaProtecao(usuario) {
    if (usuario.perfil_acesso === "mulher") {
        return;
    }
    for (const valor of ["abrir_protecao", "abrir_emergencia"]) {
        const opcao = campoTagFuncao.querySelector(`option[value='${valor}']`);
        if (opcao) {
            opcao.remove();
        }
    }
}


async function iniciarTags() {
    const pagina = await montarPagina({ paginaAtual: "minha-casa", abaCasa: "tags" });
    if (!pagina) {
        return;
    }
    tirarFuncoesDaProtecao(pagina.usuario);
    await preencherSelectComodos(document.getElementById("tag-comodo"), "Escolha o cômodo");
    campoTagFuncao.addEventListener("change", mostrarOuEsconderComodo);
    formularioTag.addEventListener("submit", salvarTag);
    document.getElementById("botao-cancelar").addEventListener("click", fecharFormulario);
    document.getElementById("botao-excluir").addEventListener("click", excluirTag);
    document.getElementById("botao-nova").addEventListener("click", function () { abrirFormulario(null); });
    document.getElementById("lista-tags").addEventListener("click", tratarCliqueNaLista);
    await carregarTags();
}


iniciarTags();
