/* =====================================================================
   E.L.O. — protecao.js (pages/protecao.html)
   Visual: docs/proposta/07-protecao-inicio.png

   Como a área de proteção funciona:
   - só abre para perfil_acesso = mulher (o backend responde 403 para
     os outros, e o layout.js manda de volta a Minha casa);
   - os textos vêm de GET /api/protection (content/protecao.json), que
     o layout.js já carrega com a opção "protecao: true";
   - toda página da área tem o botão "Sair rápido" e o aviso
     "Conteúdo informativo..." no fim do conteúdo.
   Acessar a área não significa que a pessoa seja vítima: é um espaço
   de informação e prevenção, e nada sobre o acesso é registrado.
   ===================================================================== */

/* Ícone de cada card, pela página que ele abre (dentro do círculo lilás). */
const ICONES_DOS_CARDS = {
    "protecao-violencia.html": "escudo.svg",
    "protecao-quiz.html": "lampada-quiz.svg",
    "protecao-faq.html": "pergunta.svg",
    "protecao-contatos.html": "pessoas.svg",
    "protecao-orientacoes.html": "apoio.svg",
    "protecao-configuracoes.html": "sirene.svg",
};


/* Card da imagem 07: círculo com ícone, título, texto e "SAIBA MAIS →". */
function htmlCardAtalho(card) {
    return `
        <a class="card card-atalho" href="/pages/${card.pagina}">
            <span class="icone-redondo"><img src="/img/icones/${ICONES_DOS_CARDS[card.pagina]}" alt=""></span>
            <h3>${htmlTexto(card.titulo)}</h3>
            <p>${htmlTexto(card.texto)}</p>
            <span class="link-seta">SAIBA MAIS →</span>
        </a>`;
}


function preencherInicio(inicio) {
    document.getElementById("rotulo").textContent = inicio.rotulo;
    document.getElementById("titulo").textContent = inicio.titulo;
    document.getElementById("texto").textContent = inicio.texto;
    document.getElementById("destaque").textContent = inicio.destaque;
    document.getElementById("destaque-continuacao").textContent = inicio.destaque_continuacao;
    document.getElementById("faixa-titulo").textContent = inicio.faixa_titulo;
    document.getElementById("faixa-texto").textContent = inicio.faixa_texto;

    let html = "";
    for (const card of inicio.cards) {
        html += htmlCardAtalho(card);
    }
    document.getElementById("cards").innerHTML = html;
}


async function iniciarProtecao() {
    const pagina = await montarPagina({ paginaAtual: "protecao", exige: "mulher", protecao: true });
    if (!pagina) {
        return;
    }
    preencherInicio(pagina.conteudo.inicio);
}


iniciarProtecao();
