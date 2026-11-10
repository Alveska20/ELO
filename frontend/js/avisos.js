/* =====================================================================
   E.L.O. — avisos.js (pages/avisos.html) — "Minha casa", aba Avisos

   Visual: docs/proposta/05-avisos.png. A lista é montada no navegador a
   partir do estado REAL da casa (nenhuma rota nova, nada é salvo):
     GET /api/devices   janelas abertas e sensores de movimento ligados
     GET /api/doors     portas trancadas, destrancadas ou abertas
   As regras (verde, vermelho e amarelo) ficam em gerarAvisos(), no
   js/casa_comum.js, a mesma função usada no bloco "Avisos" de Minha casa.
   ===================================================================== */

const caixaMensagemAvisos = document.getElementById("mensagem");


async function carregarAvisos() {
    const [respostaDispositivos, respostaPortas] = await Promise.all([
        chamarApi("GET", "/api/devices"),
        chamarApi("GET", "/api/doors"),
    ]);
    if (!respostaDispositivos.ok || !respostaPortas.ok) {
        const falhou = respostaDispositivos.ok ? respostaPortas : respostaDispositivos;
        mostrarMensagem(caixaMensagemAvisos, falhou.dados.erro, "erro");
        return;
    }

    const avisos = gerarAvisos(respostaDispositivos.dados.dispositivos, respostaPortas.dados.portas);
    const lista = document.getElementById("lista-avisos");
    if (avisos.length === 0) {
        lista.innerHTML = '<p class="texto-secundario">Nenhum aviso agora: não há portas, janelas nem sensores cadastrados.</p>';
        return;
    }
    let html = "";
    for (const aviso of avisos) {
        html += htmlAviso(aviso);
    }
    lista.innerHTML = html;
}


async function iniciarAvisos() {
    const pagina = await montarPagina({ paginaAtual: "minha-casa", abaCasa: "avisos" });
    if (!pagina) {
        return;
    }
    await carregarAvisos();
}


iniciarAvisos();
