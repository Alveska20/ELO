/* =====================================================================
   E.L.O. — cameras.js (pages/cameras.html) — "Minha casa", aba Câmeras

   Visual: docs/proposta/03-cameras.png. Câmeras são dispositivos do tipo
   "camera", TUDO SIMULADO: não existe vídeo. O selo mostra "SIMULAÇÃO"
   (ligada) ou "DESLIGADA", e a data/hora é a do computador da pessoa.
     listar          GET    /api/devices?tipo=camera
     criar           POST   /api/devices   {"nome", "tipo": "camera", "comodo_id"}
     editar          PUT    /api/devices/<id>
     excluir         DELETE /api/devices/<id>
     ligar/desligar  PATCH  /api/devices/<id>/toggle (casa_comum.js)
   ===================================================================== */

const caixaMensagemCameras = document.getElementById("mensagem");
const painelFormulario = document.getElementById("painel-formulario");
const formularioCamera = document.getElementById("formulario-camera");
const campoCameraId = document.getElementById("camera-id");

let camerasCarregadas = [];


/* Data e hora no formato da imagem: 09/11/2026, 15:30 */
function dataHoraAtual() {
    return new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function htmlCardCamera(camera) {
    const selo = camera.ativo ? "SIMULAÇÃO" : "DESLIGADA";
    const classeImagem = camera.ativo ? "camera-imagem" : "camera-imagem desligada";
    return `
        <div class="card card-camera">
            <div class="${classeImagem}" role="img" aria-label="Câmera simulada, sem imagem real">
                <span class="camera-selo">${selo}</span>
                <span class="camera-data">${dataHoraAtual()}</span>
            </div>
            <div class="card-camera-linha">
                <strong title="${escaparHtml(camera.nome)}">${escaparHtml(camera.comodo_nome || camera.nome)}</strong>
                <button type="button" class="interruptor" role="switch" aria-checked="${camera.ativo}"
                        aria-label="Ligar ou desligar ${escaparHtml(camera.nome)}" data-id="${camera.id}"></button>
            </div>
            <button type="button" class="botao-link link-editar" data-editar="${camera.id}">Editar</button>
        </div>`;
}

async function carregarCameras() {
    const resposta = await chamarApi("GET", "/api/devices?tipo=camera");
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemCameras, resposta.dados.erro, "erro");
        return;
    }
    camerasCarregadas = resposta.dados.dispositivos;
    let html = "";
    for (const camera of camerasCarregadas) {
        html += htmlCardCamera(camera);
    }
    // O "+" tracejado da imagem, para adicionar uma câmera.
    html += '<button type="button" class="card-adicionar" id="botao-adicionar" aria-label="Adicionar câmera">+</button>';

    const lista = document.getElementById("lista-cameras");
    lista.innerHTML = html;
    ativarInterruptores(lista, caixaMensagemCameras, carregarCameras);   // casa_comum.js
    document.getElementById("botao-adicionar").addEventListener("click", function () { abrirFormulario(null); });
}

/* Atualiza só o texto da data/hora a cada minuto, sem redesenhar os cards. */
function atualizarRelogios() {
    const agora = dataHoraAtual();
    for (const elemento of document.querySelectorAll(".camera-data")) {
        elemento.textContent = agora;
    }
}


/* ---------------------------------------------------------------------
   Formulário (nova câmera ou editar)
   --------------------------------------------------------------------- */

function abrirFormulario(camera) {
    formularioCamera.reset();
    campoCameraId.value = camera ? camera.id : "";
    document.getElementById("titulo-formulario").textContent = camera ? "Editar câmera" : "Nova câmera";
    if (camera) {
        document.getElementById("camera-nome").value = camera.nome;
        document.getElementById("camera-comodo").value = camera.comodo_id || "";
    }
    // "Excluir" só aparece quando a câmera já existe.
    document.getElementById("botao-excluir").classList.toggle("oculto", !camera);
    painelFormulario.classList.remove("oculto");
    levarAoFormulario(formularioCamera);   // casa_comum.js
}

function fecharFormulario() {
    formularioCamera.reset();
    painelFormulario.classList.add("oculto");
}

function editarPeloCartao(evento) {
    const botao = evento.target.closest("button[data-editar]");
    if (!botao) {
        return;
    }
    const camera = camerasCarregadas.find(function (c) { return c.id === Number(botao.dataset.editar); });
    abrirFormulario(camera);
}

async function salvarCamera(evento) {
    evento.preventDefault();
    const dados = {
        nome: document.getElementById("camera-nome").value,
        tipo: "camera",
        comodo_id: document.getElementById("camera-comodo").value,
    };
    let resposta;
    if (campoCameraId.value) {
        resposta = await chamarApi("PUT", `/api/devices/${campoCameraId.value}`, dados);
    } else {
        resposta = await chamarApi("POST", "/api/devices", dados);
    }
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemCameras, resposta.dados.erro, "erro");
        return;
    }
    mostrarMensagem(caixaMensagemCameras, "Câmera salva.", "sucesso");
    fecharFormulario();
    await carregarCameras();
}

async function excluirCamera() {
    if (!confirm("Excluir esta câmera?")) {
        return;
    }
    const resposta = await chamarApi("DELETE", `/api/devices/${campoCameraId.value}`);
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemCameras, resposta.dados.erro, "erro");
        return;
    }
    mostrarMensagem(caixaMensagemCameras, resposta.dados.mensagem, "sucesso");
    fecharFormulario();
    await carregarCameras();
}


async function iniciarCameras() {
    const pagina = await montarPagina({ paginaAtual: "minha-casa", abaCasa: "cameras" });
    if (!pagina) {
        return;
    }
    await preencherSelectComodos(document.getElementById("camera-comodo"), "Sem cômodo");
    formularioCamera.addEventListener("submit", salvarCamera);
    document.getElementById("botao-cancelar").addEventListener("click", fecharFormulario);
    document.getElementById("botao-excluir").addEventListener("click", excluirCamera);
    document.getElementById("lista-cameras").addEventListener("click", editarPeloCartao);
    await carregarCameras();
    // setInterval repete a função a cada 60 000 ms (1 minuto).
    setInterval(atualizarRelogios, 60000);
}


iniciarCameras();
