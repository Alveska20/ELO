/* =====================================================================
   E.L.O. — api.js
   Função única para o frontend conversar com o backend (a API Flask).

   Como o frontend conversa com o backend:
   1. A página chama, por exemplo: chamarApi("PATCH", "/api/devices/3/toggle")
   2. fetch() envia a requisição HTTP para o Flask, junto com o cookie
      da sessão (é ele que diz ao backend quem está logado).
   3. O Flask responde em JSON.
   4. Esta função devolve um objeto simples:
        { ok: true/false, status: 200/400/401..., dados: {...} }
   Em caso de erro, a mensagem está em resposta.dados.erro
   (o backend sempre manda os erros no formato {"erro": "..."}).
   ===================================================================== */

async function chamarApi(metodo, url, dados) {
    const opcoes = {
        method: metodo,
        // "same-origin": envia o cookie da sessão. Funciona porque o próprio
        // Flask entrega as páginas: frontend e API estão no mesmo endereço.
        credentials: "same-origin",
        headers: {},
    };

    // Só GET não tem corpo. Nos outros métodos, os dados vão como JSON.
    if (dados !== undefined) {
        opcoes.headers["Content-Type"] = "application/json";
        opcoes.body = JSON.stringify(dados);
    }

    // "await" espera a resposta chegar antes de continuar.
    // try/catch: se o servidor estiver desligado, fetch() dá erro
    // e caímos no catch em vez de travar a página.
    try {
        const resposta = await fetch(url, opcoes);
        const corpo = await resposta.json();
        return { ok: resposta.ok, status: resposta.status, dados: corpo };
    } catch (erro) {
        return {
            ok: false,
            status: 0,
            dados: { erro: "Não foi possível falar com o servidor. Ele está ligado?" },
        };
    }
}


/* Protege contra textos que pareçam código HTML.

   Os nomes que a pessoa digita (ex.: nome de um cômodo) voltam da API e
   são colocados na página. Se alguém cadastrar o nome
   "<img src=x onerror=alert(1)>", sem esta função o navegador executaria
   isso como código. escaparHtml troca < > & " ' por versões que aparecem
   como texto comum. Use SEMPRE que colocar dados da API dentro de innerHTML.
*/
function escaparHtml(texto) {
    if (texto === null || texto === undefined) {
        return "";
    }
    return String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}


/* Mostra uma mensagem (sucesso, erro ou informação) dentro de um elemento.
   tipo: "sucesso", "erro" ou "info" (classes do componentes.css). */
function mostrarMensagem(elemento, texto, tipo) {
    elemento.innerHTML = `<div class="mensagem mensagem-${tipo}" role="status">${escaparHtml(texto)}</div>`;
}
