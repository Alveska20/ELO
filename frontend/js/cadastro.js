/* =====================================================================
   E.L.O. — cadastro.js (página pages/cadastro.html)

   Fluxo: POST /api/auth/register -> se der certo, volta para o login
   com a mensagem "Conta criada, faça login." (o cadastro não loga sozinho).
   Toda conta nova é usuário comum (o papel nunca vem do formulário).
   O perfil de acesso vem de "Como você se identifica?":
   Mulher -> "mulher", Homem -> "homem", Prefiro não informar -> "nao_definido".
   O backend confere o valor. Depois, só a própria pessoa muda o perfil,
   em Configurações.
   ===================================================================== */

const formularioCadastro = document.getElementById("formulario-cadastro");
const caixaMensagemCadastro = document.getElementById("mensagem");


async function cadastrar(evento) {
    evento.preventDefault();

    // "Confirmar senha" (Figma 01-inicial/02-cadastro-hifi.png).
    // A conferência é só aqui no navegador, para avisar erro de digitação
    // antes de enviar. A API não recebe esse campo.
    const senha = document.getElementById("senha").value;
    const confirmacao = document.getElementById("confirmar-senha").value;
    if (senha !== confirmacao) {
        mostrarMensagem(caixaMensagemCadastro, "As senhas não são iguais.", "erro");
        return;
    }

    // A opção marcada do grupo "Como você se identifica?".
    const identificacao = formularioCadastro.querySelector("input[name='perfil_acesso']:checked");

    const dados = {
        nome: document.getElementById("nome").value,
        email: document.getElementById("email").value,
        senha: document.getElementById("senha").value,
        perfil_acesso: identificacao ? identificacao.value : "nao_definido",
    };
    const resposta = await chamarApi("POST", "/api/auth/register", dados);

    if (resposta.ok) {
        window.location.href = "/?cadastro=ok";
    } else {
        mostrarMensagem(caixaMensagemCadastro, resposta.dados.erro, "erro");
    }
}


formularioCadastro.addEventListener("submit", cadastrar);
