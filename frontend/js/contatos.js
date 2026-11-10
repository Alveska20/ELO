/* =====================================================================
   E.L.O. — contatos.js (pages/protecao-contatos.html)
   Visual: docs/proposta/11-contatos-confianca.png

   Contatos de confiança (somente perfil mulher):
     listar        GET    /api/trusted-contacts   -> { consentimento, contatos }
     consentir     POST   /api/trusted-contacts/consent
     criar         POST   /api/trusted-contacts   {"nome", "telefone", "relacao"}
     editar        PUT    /api/trusted-contacts/<id>
     excluir       DELETE /api/trusted-contacts/<id>

   Privacidade (doc, seção 11): antes do primeiro cadastro, a usuária lê
   o aviso de consentimento e clica em "Li e aceito". Sem isso, o
   formulário nem aparece (e a API também recusa o cadastro).

   Plano de segurança: caixas de marcar só nesta tela. As marcações não
   são enviadas nem salvas (somem ao sair da página).
   ===================================================================== */

const caixaMensagemContatos = document.getElementById("mensagem");
const formularioContato = document.getElementById("formulario-contato");
const campoContatoId = document.getElementById("contato-id");

let contatosCarregados = [];


/* Plano de segurança (doc, seção 5) em forma de lista para marcar.
   Os itens vêm do protecao.json; as marcações não são salvas. */
function mostrarPlanoDeSeguranca(plano) {
    document.getElementById("plano-texto").textContent = plano.texto;
    let html = "";
    for (const item of plano.itens) {
        html += `<label class="campo-checkbox plano-item"><input type="checkbox"> ${htmlTexto(item)}</label>`;
    }
    document.getElementById("plano-itens").innerHTML = html;
}


/* Um contato: círculo com a inicial, nome, "telefone · relação",
   e os botões redondos de editar (lápis) e excluir (lixeira). */
function htmlContato(contato) {
    let relacao = "";
    if (contato.relacao) {
        relacao = ` · ${escaparHtml(contato.relacao)}`;
    }
    return `
        <div class="card contato">
            <span class="avatar-contato" aria-hidden="true">${escaparHtml(contato.nome.charAt(0).toUpperCase())}</span>
            <div class="contato-texto">
                <strong>${escaparHtml(contato.nome)}</strong>
                <span>${escaparHtml(contato.telefone)}${relacao}</span>
            </div>
            <button type="button" class="botao-redondo" data-acao="editar" data-id="${contato.id}"
                    aria-label="Editar ${escaparHtml(contato.nome)}">✎</button>
            <button type="button" class="botao-redondo" data-acao="excluir" data-id="${contato.id}"
                    aria-label="Excluir ${escaparHtml(contato.nome)}">🗑</button>
        </div>`;
}


async function carregarContatos() {
    const resposta = await chamarApi("GET", "/api/trusted-contacts");
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemContatos, resposta.dados.erro, "erro");
        return;
    }

    // Sem consentimento: mostra só o aviso. Com consentimento: a lista e o formulário.
    const temConsentimento = resposta.dados.consentimento;
    document.getElementById("caixa-consentimento").classList.toggle("oculto", temConsentimento);
    document.getElementById("area-contatos").classList.toggle("oculto", !temConsentimento);

    contatosCarregados = resposta.dados.contatos;
    const lista = document.getElementById("lista-contatos");
    if (contatosCarregados.length === 0) {
        lista.innerHTML = '<p class="texto-secundario">Nenhum contato cadastrado.</p>';
        return;
    }
    let html = "";
    for (const contato of contatosCarregados) {
        html += htmlContato(contato);
    }
    lista.innerHTML = html;
}


async function aceitarConsentimento() {
    const resposta = await chamarApi("POST", "/api/trusted-contacts/consent");
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemContatos, resposta.dados.erro, "erro");
        return;
    }
    await carregarContatos();
}


/* Fecha e limpa o formulário. */
function limparFormulario() {
    formularioContato.reset();
    campoContatoId.value = "";
    formularioContato.classList.add("oculto");
}

/* Abre o formulário vazio ("+ Adicionar contato"). */
function abrirFormularioNovo() {
    limparFormulario();
    document.getElementById("titulo-formulario").textContent = "Adicionar contato";
    formularioContato.classList.remove("oculto");
    document.getElementById("contato-nome").focus();
}

/* Abre o formulário com os dados do contato (lápis). */
function prepararEdicao(contatoId) {
    const contato = contatosCarregados.find(function (c) { return c.id === contatoId; });
    campoContatoId.value = contato.id;
    document.getElementById("contato-nome").value = contato.nome;
    document.getElementById("contato-telefone").value = contato.telefone;
    document.getElementById("contato-relacao").value = contato.relacao || "";
    document.getElementById("titulo-formulario").textContent = "Editar contato";
    formularioContato.classList.remove("oculto");
    document.getElementById("contato-nome").focus();
}


async function salvarContato(evento) {
    evento.preventDefault();
    const dados = {
        nome: document.getElementById("contato-nome").value,
        telefone: document.getElementById("contato-telefone").value,
        relacao: document.getElementById("contato-relacao").value,
    };

    let resposta;
    if (campoContatoId.value) {
        resposta = await chamarApi("PUT", `/api/trusted-contacts/${campoContatoId.value}`, dados);
    } else {
        resposta = await chamarApi("POST", "/api/trusted-contacts", dados);
    }

    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemContatos, resposta.dados.erro, "erro");
        return;
    }
    mostrarMensagem(caixaMensagemContatos, "Contato salvo.", "sucesso");
    limparFormulario();
    await carregarContatos();
}


async function excluirContato(contatoId) {
    if (!confirm("Excluir este contato? Os dados dele serão apagados do sistema.")) {
        return;
    }
    const resposta = await chamarApi("DELETE", `/api/trusted-contacts/${contatoId}`);
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemContatos, resposta.dados.erro, "erro");
        return;
    }
    mostrarMensagem(caixaMensagemContatos, resposta.dados.mensagem, "sucesso");
    await carregarContatos();
}


function tratarCliqueNaLista(evento) {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) {
        return;
    }
    const contatoId = Number(botao.dataset.id);
    if (botao.dataset.acao === "editar") {
        prepararEdicao(contatoId);
    } else if (botao.dataset.acao === "excluir") {
        excluirContato(contatoId);
    }
}


async function iniciarContatos() {
    const pagina = await montarPagina({
        paginaAtual: "protecao", exige: "mulher", protecao: true, breadcrumb: "Contatos de confiança",
    });
    if (!pagina) {
        return;
    }
    const conteudo = pagina.conteudo;
    document.getElementById("subtitulo").textContent = conteudo.contatos_confianca.subtitulo;
    document.getElementById("texto-consentimento").innerHTML = htmlTexto(conteudo.contatos_confianca.aviso_consentimento);
    mostrarPlanoDeSeguranca(conteudo.contatos_confianca.plano_seguranca);

    document.getElementById("botao-aceitar").addEventListener("click", aceitarConsentimento);
    document.getElementById("botao-adicionar").addEventListener("click", abrirFormularioNovo);
    formularioContato.addEventListener("submit", salvarContato);
    document.getElementById("botao-cancelar").addEventListener("click", limparFormulario);
    document.getElementById("lista-contatos").addEventListener("click", tratarCliqueNaLista);
    await carregarContatos();
}


iniciarContatos();
