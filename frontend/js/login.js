/* =====================================================================
   E.L.O. — login.js (página index.html)

   Fluxo: a pessoa digita e-mail e senha -> POST /api/auth/login ->
   se der certo, o Flask cria a sessão (cookie) e vamos para o Dashboard.
   ===================================================================== */

const formularioLogin = document.getElementById("formulario-login");
const caixaMensagemLogin = document.getElementById("mensagem");


/* Se a pessoa já está logada, não faz sentido mostrar o login de novo. */
async function irParaDashboardSeJaLogado() {
    const resposta = await chamarApi("GET", "/api/auth/me");
    if (resposta.ok) {
        window.location.replace("/pages/dashboard.html");
    }
}


/* Mensagem vinda do cadastro: /?cadastro=ok */
function mostrarAvisoDeCadastro() {
    const parametros = new URLSearchParams(window.location.search);
    if (parametros.get("cadastro") === "ok") {
        mostrarMensagem(caixaMensagemLogin, "Conta criada, faça login.", "sucesso");
    }
}


async function entrar(evento) {
    // Sem isto, o formulário recarregaria a página (comportamento padrão do HTML).
    evento.preventDefault();

    const dados = {
        email: document.getElementById("email").value,
        senha: document.getElementById("senha").value,
    };
    const resposta = await chamarApi("POST", "/api/auth/login", dados);

    if (resposta.ok) {
        window.location.replace("/pages/dashboard.html");
    } else {
        mostrarMensagem(caixaMensagemLogin, resposta.dados.erro, "erro");
    }
}


formularioLogin.addEventListener("submit", entrar);
mostrarAvisoDeCadastro();
irParaDashboardSeJaLogado();
