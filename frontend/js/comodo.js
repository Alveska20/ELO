/* =====================================================================
   E.L.O. — comodo.js (pages/comodo.html?id=N)

   GET /api/rooms/<id> devolve o cômodo + os aparelhos e portas dele.
   Esta página também é o destino da Tag "Sala" (leitura simulada).
   Os cartões são os mesmos da aba Aparelhos (htmlCardAparelho e
   htmlCardPorta, em casa_comum.js).
   ===================================================================== */

const caixaMensagemComodo = document.getElementById("mensagem");

// O id vem da barra de endereço: comodo.html?id=3
const comodoIdDaUrl = new URLSearchParams(window.location.search).get("id");


async function carregarComodo() {
    const resposta = await chamarApi("GET", `/api/rooms/${comodoIdDaUrl}`);
    if (!resposta.ok) {
        // 404: cômodo não existe ou é de outra pessoa.
        document.getElementById("nome-comodo").textContent = "Cômodo não encontrado";
        mostrarMensagem(caixaMensagemComodo, resposta.dados.erro, "erro");
        return;
    }

    const dados = resposta.dados;
    document.getElementById("nome-comodo").textContent = dados.comodo.nome;
    document.title = `${dados.comodo.nome} — E.L.O.`;

    desenharDispositivos(document.getElementById("lista-dispositivos"),
        dados.dispositivos, caixaMensagemComodo, carregarComodo);

    const listaPortas = document.getElementById("lista-portas");
    if (dados.portas.length === 0) {
        listaPortas.innerHTML = '<p class="texto-secundario">Nenhuma porta neste cômodo.</p>';
        return;
    }
    let html = "";
    for (const porta of dados.portas) {
        html += htmlCardPorta(porta);
    }
    listaPortas.innerHTML = html;
}


async function iniciarComodo() {
    const pagina = await montarPagina({ paginaAtual: "minha-casa", abaCasa: "aparelhos" });
    if (!pagina) {
        return;
    }
    await carregarComodo();
}


iniciarComodo();
