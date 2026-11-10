/* =====================================================================
   E.L.O. — fale_conosco.js (pages/fale-conosco.html)

   Visual: docs/proposta/13-fale-conosco.png.
   O envio é só uma SIMULAÇÃO: o formulário NÃO chama o backend, nada é
   enviado nem salvo. Ao "enviar", a tela só confirma e limpa os campos.
   Os contatos da página são dados de exemplo (selo "Dados de exemplo").
   ===================================================================== */

const formularioFale = document.getElementById("formulario-fale");
const caixaMensagemFale = document.getElementById("mensagem");


function simularEnvio(evento) {
    evento.preventDefault();   // impede o navegador de enviar o formulário
    mostrarMensagem(caixaMensagemFale,
        "[SIMULAÇÃO] Mensagem não enviada: o E.L.O. é um projeto acadêmico e nada é enviado nem salvo.",
        "info");
    formularioFale.reset();
}


async function iniciarFaleConosco() {
    const pagina = await montarPagina({ paginaAtual: "fale-conosco" });
    if (!pagina) {
        return;
    }
    formularioFale.addEventListener("submit", simularEnvio);
}


iniciarFaleConosco();
