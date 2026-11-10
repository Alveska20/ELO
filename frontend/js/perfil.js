/* =====================================================================
   E.L.O. — perfil.js (pages/perfil.html)

   Configurações do perfil mulher (docs/proposta/14-configuracoes.png).
   Só o bloco "Perfil e conta" funciona; os blocos "Em breve" são HTML
   desativado e não chamam a API.

     ver     GET /api/profile
     salvar  PUT /api/profile   {"nome", "email", "telefone", "perfil_acesso"}

   A própria pessoa escolhe aqui "Como você se identifica?"
   (Mulher / Homem / Prefiro não informar). O backend aceita só esses 3
   valores. O admin não altera o perfil de ninguém, e o papel nunca vem
   de formulário. Se a escolha muda o visual (roxo <-> escuro), a página
   leva a pessoa para a tela inicial do visual novo.
   ===================================================================== */

const caixaMensagemPerfil = document.getElementById("mensagem");

let temaAtual = null;   // "roxo" ou "escuro", para saber se o visual mudou


function preencherFormulario(usuario) {
    document.getElementById("perfil-nome").value = usuario.nome;
    document.getElementById("perfil-email").value = usuario.email;
    document.getElementById("perfil-telefone").value = usuario.telefone || "";
    // Marca a opção de "Como você se identifica?" que está salva.
    const opcao = document.querySelector(`input[name='perfil_acesso'][value='${usuario.perfil_acesso}']`);
    if (opcao) {
        opcao.checked = true;
    }
}


async function salvarPerfil(evento) {
    evento.preventDefault();
    const dados = {
        nome: document.getElementById("perfil-nome").value,
        email: document.getElementById("perfil-email").value,
        telefone: document.getElementById("perfil-telefone").value,
        perfil_acesso: document.querySelector("input[name='perfil_acesso']:checked").value,
    };
    const resposta = await chamarApi("PUT", "/api/profile", dados);
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemPerfil, resposta.dados.erro, "erro");
        return;
    }
    // Mudou o visual (ex.: de Mulher para Homem)? Vai para a tela inicial;
    // o layout.js leva para o visual certo.
    if (resposta.dados.usuario.tema !== temaAtual) {
        window.location.replace(PAGINA_DASHBOARD);
        return;
    }
    preencherFormulario(resposta.dados.usuario);
    mostrarMensagem(caixaMensagemPerfil, "Dados salvos.", "sucesso");
}


async function iniciarPerfil() {
    const pagina = await montarPagina({ paginaAtual: "perfil" });
    if (!pagina) {
        return;
    }
    temaAtual = pagina.usuario.tema;
    preencherFormulario(pagina.usuario);
    document.getElementById("formulario-perfil").addEventListener("submit", salvarPerfil);
}


iniciarPerfil();
