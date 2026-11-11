/* =====================================================================
   E.L.O. — perfil.js (pages/perfil.html)

   Configurações do perfil mulher (docs/proposta/14-configuracoes.png).
   Só o bloco "Perfil e conta" funciona; os blocos "Em breve" são HTML
   desativado e não chamam a API.

     ver     GET /api/profile
     salvar  PUT /api/profile   {"nome", "email", "telefone"[, "perfil_acesso"]}

   O perfil de acesso é definido UMA única vez (a regra fica no backend,
   que responde 403 a qualquer troca; aqui só escondemos os botões):
   - já definido ("mulher"/"homem"): mostra só "Perfil: Mulher/Homem";
   - "nao_definido": mostra Mulher e Homem e pede confirmação, num aviso
     dentro da própria página, antes de salvar.
   O admin não altera o perfil de ninguém, e o papel nunca vem de
   formulário. Se a escolha muda o visual (roxo <-> escuro), a página
   leva a pessoa para a tela inicial do visual novo.
   ===================================================================== */

const caixaMensagemPerfil = document.getElementById("mensagem");

const NOMES_DOS_PERFIS = { mulher: "Mulher", homem: "Homem" };

let temaAtual = null;          // "roxo" ou "escuro", para saber se o visual mudou
let perfilAtual = null;        // perfil_acesso salvo
let dadosAguardando = null;    // dados à espera da confirmação


function preencherFormulario(usuario) {
    perfilAtual = usuario.perfil_acesso;
    document.getElementById("perfil-nome").value = usuario.nome;
    document.getElementById("perfil-email").value = usuario.email;
    document.getElementById("perfil-telefone").value = usuario.telefone || "";

    const definido = perfilAtual !== "nao_definido";
    document.getElementById("perfil-definido").classList.toggle("oculto", !definido);
    document.getElementById("perfil-escolha").classList.toggle("oculto", definido);
    if (definido) {
        document.getElementById("perfil-definido-texto").textContent =
            `Perfil: ${NOMES_DOS_PERFIS[perfilAtual] || perfilAtual}`;
    }
    fecharConfirmacao();
}


function lerFormulario() {
    return {
        nome: document.getElementById("perfil-nome").value,
        email: document.getElementById("perfil-email").value,
        telefone: document.getElementById("perfil-telefone").value,
    };
}


function abrirConfirmacao(dados) {
    dadosAguardando = dados;
    document.getElementById("perfil-confirmacao-texto").textContent =
        `Você escolheu "${NOMES_DOS_PERFIS[dados.perfil_acesso]}". Depois de salvar, ` +
        "o perfil não poderá ser alterado. Deseja continuar?";
    document.getElementById("perfil-confirmacao").classList.remove("oculto");
    document.getElementById("perfil-confirmar").focus();
}


function fecharConfirmacao() {
    dadosAguardando = null;
    document.getElementById("perfil-confirmacao").classList.add("oculto");
}


async function enviarPerfil(dados) {
    const resposta = await chamarApi("PUT", "/api/profile", dados);
    if (!resposta.ok) {
        fecharConfirmacao();
        mostrarMensagem(caixaMensagemPerfil, resposta.dados.erro, "erro");
        return;
    }
    // Mudou o visual (ex.: de "não definido" para Mulher)? Vai para a tela
    // inicial; o layout.js leva para o visual certo.
    if (resposta.dados.usuario.tema !== temaAtual) {
        window.location.replace(PAGINA_DASHBOARD);
        return;
    }
    preencherFormulario(resposta.dados.usuario);
    mostrarMensagem(caixaMensagemPerfil, "Dados salvos.", "sucesso");
}


async function salvarPerfil(evento) {
    evento.preventDefault();
    const dados = lerFormulario();

    // Só quem ainda está "não definido" manda o perfil, e só depois de confirmar.
    const escolha = document.querySelector("input[name='perfil_acesso']:checked");
    if (perfilAtual === "nao_definido" && escolha) {
        dados.perfil_acesso = escolha.value;
        abrirConfirmacao(dados);
        return;
    }
    await enviarPerfil(dados);
}


async function confirmarPerfil() {
    if (dadosAguardando) {
        await enviarPerfil(dadosAguardando);
    }
}


async function iniciarPerfil() {
    const pagina = await montarPagina({ paginaAtual: "perfil" });
    if (!pagina) {
        return;
    }
    temaAtual = pagina.usuario.tema;
    preencherFormulario(pagina.usuario);
    document.getElementById("formulario-perfil").addEventListener("submit", salvarPerfil);
    document.getElementById("perfil-confirmar").addEventListener("click", confirmarPerfil);
    document.getElementById("perfil-cancelar").addEventListener("click", fecharConfirmacao);
}


iniciarPerfil();
