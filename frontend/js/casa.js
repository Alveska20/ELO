/* =====================================================================
   E.L.O. — casa.js (pages/casa.html) — tela "Gerenciar cômodos"

   CRUD de cômodos:
     listar   GET    /api/rooms
     criar    POST   /api/rooms        {"nome": "Sala"}
     renomear PUT    /api/rooms/<id>   {"nome": "Sala de estar"}
     excluir  DELETE /api/rooms/<id>   (os dispositivos ficam "sem cômodo")
   ===================================================================== */

const caixaMensagemCasa = document.getElementById("mensagem");
const formularioComodo = document.getElementById("formulario-comodo");
const campoComodoId = document.getElementById("comodo-id");
const campoComodoNome = document.getElementById("comodo-nome");
const botaoCancelarComodo = document.getElementById("botao-cancelar");

// Guarda a última lista recebida, para achar o cômodo ao clicar em "Renomear".
let comodosCarregados = [];


/* Cartão do cômodo no mesmo estilo dos cartões de Aparelhos: círculo com
   ícone, nome, quantos aparelhos tem, "Abrir →" e o link discreto
   "Renomear" (o "Excluir" fica dentro do formulário). */
function htmlCardComodo(comodo) {
    return `
        <div class="card card-aparelho">
            <span class="icone-redondo"><img src="/img/icones/casa.svg" alt=""></span>
            <div class="card-aparelho-texto">
                <strong>${escaparHtml(comodo.nome)}</strong>
                <span>${comodo.total_dispositivos} dispositivo(s)</span>
                <button type="button" class="botao-link link-editar" data-acao="editar" data-id="${comodo.id}">Renomear</button>
            </div>
            <a class="link-seta" href="/pages/comodo.html?id=${comodo.id}">Abrir →</a>
        </div>`;
}


async function carregarComodos() {
    const resposta = await chamarApi("GET", "/api/rooms");
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemCasa, resposta.dados.erro, "erro");
        return;
    }
    comodosCarregados = resposta.dados.comodos;

    const lista = document.getElementById("lista-comodos");
    if (comodosCarregados.length === 0) {
        // Casa vazia (casa_comum.js): o botão leva ao formulário logo abaixo.
        lista.innerHTML = "";
        document.getElementById("casa-vazia").innerHTML = htmlCasaVazia({
            titulo: "Sua casa ainda está vazia",
            texto: "Comece cadastrando os cômodos da sua casa. Depois, adicione os dispositivos de cada um.",
            passoAtual: 1,
            botaoTexto: "+ Adicionar cômodo",
            botaoId: "botao-vazio",
        });
        document.getElementById("botao-vazio").addEventListener("click", function () {
            levarAoFormulario(formularioComodo);
        });
        return;
    }
    document.getElementById("casa-vazia").innerHTML = "";
    let html = "";
    for (const comodo of comodosCarregados) {
        html += htmlCardComodo(comodo);
    }
    lista.innerHTML = html;
}


/* Volta o formulário para o modo "Novo cômodo". */
function limparFormulario() {
    formularioComodo.reset();
    campoComodoId.value = "";
    document.getElementById("titulo-formulario").textContent = "Novo cômodo";
    botaoCancelarComodo.classList.add("oculto");
    document.getElementById("botao-excluir").classList.add("oculto");
}


/* Coloca o formulário em modo de edição com os dados do cômodo. */
function prepararEdicao(comodoId) {
    for (const comodo of comodosCarregados) {
        if (comodo.id === comodoId) {
            campoComodoId.value = comodo.id;
            campoComodoNome.value = comodo.nome;
        }
    }
    document.getElementById("titulo-formulario").textContent = "Renomear cômodo";
    botaoCancelarComodo.classList.remove("oculto");
    // "Excluir" só aparece ao renomear um cômodo que já existe.
    document.getElementById("botao-excluir").classList.remove("oculto");
    levarAoFormulario(formularioComodo);   // casa_comum.js
}


async function salvarComodo(evento) {
    evento.preventDefault();
    const dados = { nome: campoComodoNome.value };

    // Com id = edição (PUT); sem id = cômodo novo (POST).
    let resposta;
    if (campoComodoId.value) {
        resposta = await chamarApi("PUT", `/api/rooms/${campoComodoId.value}`, dados);
    } else {
        resposta = await chamarApi("POST", "/api/rooms", dados);
    }

    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemCasa, resposta.dados.erro, "erro");
        return;
    }
    mostrarMensagem(caixaMensagemCasa, "Cômodo salvo.", "sucesso");
    limparFormulario();
    await carregarComodos();
}


/* Botão "Excluir" do formulário (o cômodo em edição). */
async function excluirComodo() {
    // confirm() mostra uma caixa "OK / Cancelar" do próprio navegador.
    if (!confirm("Excluir este cômodo? Os dispositivos dele não serão apagados, só ficarão sem cômodo.")) {
        return;
    }
    const resposta = await chamarApi("DELETE", `/api/rooms/${campoComodoId.value}`);
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemCasa, resposta.dados.erro, "erro");
        return;
    }
    mostrarMensagem(caixaMensagemCasa, resposta.dados.mensagem, "sucesso");
    limparFormulario();
    await carregarComodos();
}


/* Um único "ouvinte" na lista inteira: o link "Renomear" de cada cartão
   tem data-acao="editar". Assim não é preciso ligar um evento em cada
   botão toda vez que a lista é redesenhada. */
function tratarCliqueNaLista(evento) {
    const botao = evento.target.closest("button[data-acao='editar']");
    if (botao) {
        prepararEdicao(Number(botao.dataset.id));
    }
}


async function iniciarCasa() {
    const pagina = await montarPagina({ paginaAtual: "minha-casa", abaCasa: "aparelhos" });
    if (!pagina) {
        return;
    }
    formularioComodo.addEventListener("submit", salvarComodo);
    botaoCancelarComodo.addEventListener("click", limparFormulario);
    document.getElementById("botao-excluir").addEventListener("click", excluirComodo);
    document.getElementById("lista-comodos").addEventListener("click", tratarCliqueNaLista);
    await carregarComodos();
    // Veio do "+ Novo cômodo" / "+ Adicionar cômodo" de Minha casa?
    if (window.location.hash === "#novo") {
        levarAoFormulario(formularioComodo);
    }
}


iniciarCasa();
