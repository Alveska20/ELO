/* =====================================================================
   E.L.O. — protecao_textos.js
   Usado por 3 páginas só de leitura da Proteção E.L.O.:
     protecao-orientacoes.html  (doc, seção 5)
     protecao-violencia.html    (doc, seção 6)
     protecao-faq.html          (doc, seção 7)

   Cada HTML tem <body data-pagina="..."> e este arquivo desenha o
   conteúdo certo. Os textos vêm de GET /api/protection
   (backend/app/content/protecao.json), sem nenhum texto inventado aqui.
   ===================================================================== */

/* Nome de cada página no caminho de navegação ("Proteção E.L.O. > ..."). */
const NOMES_DAS_PAGINAS = {
    orientacoes: "Orientações",
    violencia: "Situações de violência",
    faq: "Perguntas frequentes",
};


/* Lista que abre e fecha (<details>/<summary>, sem JavaScript). */
function htmlSanfona(titulo, texto) {
    return htmlSanfonaHtml(titulo, htmlTexto(texto));
}

/* Igual à htmlSanfona, mas recebe o texto já pronto em HTML (seguro). */
function htmlSanfonaHtml(titulo, textoHtml) {
    return `
        <details class="sanfona">
            <summary>${htmlTexto(titulo)}</summary>
            <p>${textoHtml}</p>
        </details>`;
}


function desenharOrientacoes(conteudo) {
    const orientacoes = conteudo.orientacoes;
    document.getElementById("introducao").innerHTML = htmlTexto(orientacoes.objetivo);
    let html = "";
    for (const item of orientacoes.itens) {
        html += `<div class="card card-atalho"><h3>${htmlTexto(item.titulo)}</h3><p>${htmlTexto(item.texto)}</p></div>`;
    }
    document.getElementById("lista").innerHTML = html;
}


/* Imagem 08: as 6 sanfonas (física... vicária). A nota editorial do doc
   aparece dentro da última sanfona ("Violência vicária"). */
function desenharViolencia(conteudo) {
    const violencia = conteudo.tipos_violencia;
    document.getElementById("introducao").innerHTML =
        `${htmlTexto(violencia.subtitulo)} ${htmlTexto(violencia.texto)}`;
    let html = "";
    violencia.tipos.forEach(function (tipo, posicao) {
        let texto = htmlTexto(tipo.texto);
        if (posicao === violencia.tipos.length - 1) {
            texto += `</p><p class="nota-editorial"><strong>Nota:</strong> ${htmlTexto(violencia.nota_editorial)}`;
        }
        html += htmlSanfonaHtml(tipo.titulo, texto);
    });
    document.getElementById("lista").innerHTML = html;
    document.getElementById("fechamento-titulo").textContent = violencia.fechamento_titulo;
}


function desenharFaq(conteudo) {
    const faq = conteudo.faq;
    document.getElementById("introducao").innerHTML = htmlTexto(faq.subtitulo);
    let html = "";
    for (const item of faq.perguntas) {
        html += htmlSanfona(item.pergunta, item.resposta);
    }
    document.getElementById("lista").innerHTML = html;
}


async function iniciarPaginaDeTexto() {
    // dataset.pagina lê o atributo data-pagina do <body>.
    const qualPagina = document.body.dataset.pagina;

    const pagina = await montarPagina({
        paginaAtual: "protecao",
        exige: "mulher",
        protecao: true,
        breadcrumb: NOMES_DAS_PAGINAS[qualPagina],
    });
    if (!pagina) {
        return;
    }

    if (qualPagina === "orientacoes") {
        desenharOrientacoes(pagina.conteudo);
    } else if (qualPagina === "violencia") {
        desenharViolencia(pagina.conteudo);
    } else if (qualPagina === "faq") {
        desenharFaq(pagina.conteudo);
    }
}


iniciarPaginaDeTexto();
