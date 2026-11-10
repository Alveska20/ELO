/* =====================================================================
   E.L.O. — saida_rapida.js
   Botão "Sair rápido": sai da área sensível na hora, caso alguém se aproxime.

   Aparece em todas as páginas da Proteção E.L.O. (Proteção, Orientações,
   Tipos de violência, FAQ, Quiz, Contatos, Configurações e Preciso de ajuda).
   O js/layout.js chama iniciarSaidaRapida() nessas páginas.

   Duas formas de acionar:
   - clicar no botão "Sair rápido" (contornado, no canto direito, logo
     abaixo do cabeçalho: docs/proposta/07 a 12). Ele fica fixo na tela,
     então continua à mão mesmo quando a página rola;
   - apertar Esc duas vezes seguidas.

   Limitação (doc da equipe, seção 10): leva a uma página neutra, mas NÃO
   apaga o histórico do navegador nem garante que a atividade não seja vista.
   Essa frase aparece embaixo do botão quando o mouse passa por ele ou
   quando ele recebe o foco do teclado (e o leitor de tela sempre a lê).
   ===================================================================== */

/* Página neutra para onde a saída rápida leva.
   É o ÚNICO lugar para trocar o destino (padrão: previsão do tempo). */
const URL_SAIDA_RAPIDA = "https://www.climatempo.com.br/";

/* Tempo máximo entre os dois "Esc" para contar como atalho (em milissegundos). */
const INTERVALO_ESC_DUPLO = 800;

let horaDoUltimoEsc = 0;


function sairRapido() {
    // 1. Encerra a sessão SEM esperar resposta.
    //    navigator.sendBeacon manda um POST para o servidor e não espera nada
    //    de volta. Um fetch() comum poderia ser cancelado quando a página
    //    muda logo em seguida; o sendBeacon foi feito justamente para enviar
    //    algo "de saída", e o navegador garante o envio mesmo trocando de página.
    if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/auth/logout");
    } else {
        // Navegadores muito antigos: keepalive tem o mesmo efeito.
        fetch("/api/auth/logout", { method: "POST", credentials: "same-origin", keepalive: true });
    }

    // 2. Vai para a página neutra com replace(), e não com location.href.
    //    location.href = "..." ADICIONA a página nova no histórico: o botão
    //    "Voltar" do navegador traria a pessoa de volta para a página sensível.
    //    location.replace("...") TROCA a página atual no histórico: o "Voltar"
    //    não retorna para cá.
    window.location.replace(URL_SAIDA_RAPIDA);
}


/* Esc duas vezes seguidas (em menos de 0,8 s) aciona a saída. */
function verificarAtalhoTeclado(evento) {
    if (evento.key !== "Escape") {
        return;
    }
    const agora = Date.now();
    if (agora - horaDoUltimoEsc < INTERVALO_ESC_DUPLO) {
        sairRapido();
    }
    horaDoUltimoEsc = agora;
}


/* Coloca o botão na página e liga o atalho. textoLimitacao vem do
   content/protecao.json (saida_rapida.limitacao). */
function iniciarSaidaRapida(textoLimitacao) {
    const caixa = document.createElement("div");
    caixa.className = "saida-rapida";
    caixa.innerHTML = `
        <button type="button" class="botao botao-contorno saida-rapida-botao" id="botao-saida-rapida"
                aria-describedby="saida-rapida-dica">
            Sair rápido
        </button>
        <span class="saida-rapida-dica" id="saida-rapida-dica">Atalho: Esc duas vezes. ${escaparHtml(textoLimitacao)}</span>`;

    // prepend: coloca o botão como primeiro item da página, para quem navega
    // pelo teclado (Tab) chegar nele antes de qualquer outra coisa.
    document.body.prepend(caixa);
    document.body.classList.add("com-saida-rapida");

    document.getElementById("botao-saida-rapida").addEventListener("click", sairRapido);
    document.addEventListener("keydown", verificarAtalhoTeclado);
}
