/* =====================================================================
   E.L.O. — quiz.js (pages/protecao-quiz.html)
   Visual: docs/proposta/10-quiz.png

   Como o quiz funciona:
   1. GET /api/quiz traz só as perguntas ATIVAS, sem a resposta certa,
      e o "total" para o contador ("1 de 10").
   2. Ao escolher uma alternativa: POST /api/quiz/answer
      {"pergunta_id", "letra"} -> o backend diz se acertou, qual era a
      certa e a explicação.
   3. A contagem de acertos fica só nesta página (variável "acertos").
      NADA é salvo no banco: ao sair da página, o resultado some.
   ===================================================================== */

const caixaQuiz = document.getElementById("quiz");
const caixaMensagemQuiz = document.getElementById("mensagem");

let perguntas = [];
let textoResultado = "";
let posicaoAtual = 0;   // índice da pergunta na lista (0 = primeira)
let acertos = 0;


/* ---------------------------------------------------------------------
   Pergunta
   --------------------------------------------------------------------- */

/* O texto de cada pergunta vem como "Cenário 1 — Controle do celular: Toda
   noite...". Separamos no primeiro ": " para mostrar o título em cima e a
   situação embaixo, como na imagem (o quiz.json não muda). */
function separarTituloESituacao(texto) {
    const posicao = texto.indexOf(": ");
    if (posicao === -1) {
        return { titulo: "", situacao: texto };
    }
    return { titulo: texto.slice(0, posicao), situacao: texto.slice(posicao + 2) };
}

/* Barra de progresso e "1 de 10". */
function atualizarProgresso() {
    const porcentagem = Math.round(((posicaoAtual + 1) / perguntas.length) * 100);
    document.getElementById("barra").style.width = `${porcentagem}%`;
    document.getElementById("contador").textContent = `${posicaoAtual + 1} de ${perguntas.length}`;
}

function mostrarPergunta() {
    const pergunta = perguntas[posicaoAtual];
    const partes = separarTituloESituacao(pergunta.texto);

    let alternativas = "";
    for (const alternativa of pergunta.alternativas) {
        // A letra fica só para o leitor de tela; na tela aparece o círculo.
        alternativas += `
            <button type="button" class="quiz-alternativa" data-letra="${escaparHtml(alternativa.letra)}">
                <span class="quiz-circulo" aria-hidden="true"></span>
                <span class="so-leitor-de-tela">${escaparHtml(alternativa.letra)})</span>
                ${htmlTexto(alternativa.texto)}
            </button>`;
    }

    caixaQuiz.innerHTML = `
        <h2 class="quiz-titulo">${htmlTexto(partes.titulo)}</h2>
        <p class="quiz-situacao">${htmlTexto(partes.situacao)}</p>
        <div class="quiz-alternativas" id="alternativas">${alternativas}</div>
        <div id="correcao"></div>`;

    atualizarProgresso();
    document.getElementById("alternativas").addEventListener("click", responder);
}


async function responder(evento) {
    const botao = evento.target.closest("button[data-letra]");
    if (!botao) {
        return;
    }
    const pergunta = perguntas[posicaoAtual];
    const resposta = await chamarApi("POST", "/api/quiz/answer", {
        pergunta_id: pergunta.id,
        letra: botao.dataset.letra,
    });
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemQuiz, resposta.dados.erro, "erro");
        return;
    }
    mostrarCorrecao(resposta.dados, botao.dataset.letra);
}


/* Pinta a certa de verde (e a escolhida de vermelho, se errou),
   trava as alternativas e mostra a explicação. */
function mostrarCorrecao(correcao, letraEscolhida) {
    if (correcao.correta) {
        acertos = acertos + 1;
    }

    const botoes = document.querySelectorAll(".quiz-alternativa");
    for (const botao of botoes) {
        botao.disabled = true;
        if (botao.dataset.letra === correcao.resposta_certa) {
            botao.classList.add("certa");
        } else if (botao.dataset.letra === letraEscolhida) {
            botao.classList.add("errada");
        }
    }

    const ehUltima = posicaoAtual === perguntas.length - 1;
    const textoBotao = ehUltima ? "Ver resultado" : "Próxima pergunta";
    // As letras não aparecem na tela (só os círculos): a certa fica em verde.
    const titulo = correcao.correta ? "Resposta certa!" : "Não é essa. A resposta mais adequada está marcada em verde.";
    const classe = correcao.correta ? "mensagem-sucesso" : "mensagem-info";

    document.getElementById("correcao").innerHTML = `
        <div class="mensagem ${classe}">
            <strong>${titulo}</strong>
            <p style="margin: 4px 0 0;">${htmlTexto(correcao.explicacao)}</p>
        </div>
        <button type="button" class="botao" id="botao-proxima">${textoBotao}</button>`;

    document.getElementById("botao-proxima").addEventListener("click", avancar);
}


function avancar() {
    posicaoAtual = posicaoAtual + 1;
    if (posicaoAtual < perguntas.length) {
        mostrarPergunta();
    } else {
        mostrarResultado();
    }
}


/* ---------------------------------------------------------------------
   Resultado (não é salvo em lugar nenhum)
   --------------------------------------------------------------------- */

function mostrarResultado() {
    document.getElementById("progresso").classList.add("oculto");
    caixaQuiz.innerHTML = `
        <h3>Você acertou ${acertos} de ${perguntas.length}.</h3>
        <p>${htmlTexto(textoResultado)}</p>
        <div class="formulario-botoes">
            <button type="button" class="botao" id="botao-refazer">Refazer quiz</button>
            <a class="botao botao-contorno" href="/pages/protecao.html">Voltar para a Proteção E.L.O.</a>
        </div>`;
    document.getElementById("botao-refazer").addEventListener("click", recomecar);
}


function recomecar() {
    posicaoAtual = 0;
    acertos = 0;
    document.getElementById("progresso").classList.remove("oculto");
    mostrarPergunta();
}


async function iniciarQuiz() {
    const pagina = await montarPagina({
        paginaAtual: "protecao", exige: "mulher", protecao: true, breadcrumb: "Quiz educativo",
    });
    if (!pagina) {
        return;
    }

    const textos = pagina.conteudo.quiz;
    document.getElementById("instrucao").textContent = textos.instrucao;
    document.getElementById("acolhimento-titulo").textContent = textos.acolhimento_titulo;
    document.getElementById("acolhimento-texto").textContent = textos.acolhimento_texto;

    const resposta = await chamarApi("GET", "/api/quiz");
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemQuiz, resposta.dados.erro, "erro");
        return;
    }
    perguntas = resposta.dados.perguntas;
    textoResultado = resposta.dados.texto_resultado;

    if (perguntas.length === 0) {
        caixaQuiz.innerHTML = "<p>Nenhuma pergunta ativa no momento.</p>";
        return;
    }
    mostrarPergunta();
}


iniciarQuiz();
