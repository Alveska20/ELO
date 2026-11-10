/* =====================================================================
   E.L.O. — casa_comum.js
   Código usado em várias telas roxas da casa inteligente (Minha casa,
   Câmeras, Aparelhos, Avisos, Tags, Rotinas, Cômodos e Cômodo), para não
   repetir: textos dos dispositivos, interruptores, avisos da casa e a
   mensagem de "casa vazia".

   Como os dispositivos são controlados (tudo SIMULADO):
   clicar no interruptor -> PATCH /api/devices/<id>/toggle -> o backend
   troca o estado no banco -> devolve o dispositivo atualizado -> a tela
   é redesenhada com o novo estado.
   ===================================================================== */

/* Nome de cada tipo para mostrar na tela (o banco guarda sem acento). */
const NOMES_DOS_TIPOS = {
    luz: "Luz",
    ar_condicionado: "Ar-condicionado",
    tv: "TV",
    tomada: "Tomada inteligente",
    cortina: "Cortina",
    persiana: "Persiana",
    janela: "Janela",
    sensor: "Sensor",
    camera: "Câmera",
};

/* Ícone do Figma para cada tipo (os que não têm ícone próprio usam o alerta). */
const ICONES_DOS_TIPOS = {
    luz: "lampada.svg",
    ar_condicionado: "alerta.svg",
    tv: "alerta.svg",
    tomada: "tomada.svg",
    cortina: "casa.svg",
    persiana: "casa.svg",
    janela: "casa.svg",
    sensor: "sino.svg",
    camera: "camera.svg",
};

/* Texto do estado como aparece no Figma ("Desligada", "Ligada"...). */
const TEXTOS_DOS_ESTADOS = {
    ligado: "Ligado",
    desligado: "Desligado",
    aberta: "Aberta",
    fechada: "Fechada",
};


/* Tipos com nome feminino ("Luz da sala: Desligada"). */
const TIPOS_FEMININOS = ["luz", "tomada", "cortina", "persiana", "janela"];

/* "Desligada", "Ligado", "Aberta"... com o gênero do aparelho. */
function estadoNoGenero(d) {
    let texto = TEXTOS_DOS_ESTADOS[d.estado];
    if (TIPOS_FEMININOS.includes(d.tipo) && texto.endsWith("o")) {
        texto = texto.slice(0, -1) + "a";
    }
    return texto;
}

/* Linha de baixo do cartão: "Desligada · Sala" (ar: "Ligado · 22 °C · Quarto"). */
function textoDoAparelho(d) {
    const comodo = d.comodo_nome ? escaparHtml(d.comodo_nome) : "Sem cômodo";
    if (d.tipo === "ar_condicionado" && d.temperatura !== null) {
        return `${estadoNoGenero(d)} · ${d.temperatura} °C · ${comodo}`;
    }
    return `${estadoNoGenero(d)} · ${comodo}`;
}

/* Cartão de aparelho (docs/proposta/04-aparelhos.png): círculo com ícone,
   nome, estado e interruptor. comEditar = true mostra o link "Editar"
   (tela Aparelhos); o data-id do interruptor diz qual aparelho alternar. */
function htmlCardAparelho(d, comEditar) {
    const editar = comEditar
        ? `<button type="button" class="botao-link link-editar" data-editar="${d.id}">Editar</button>`
        : "";
    return `
        <div class="card card-aparelho">
            <span class="icone-redondo"><img src="/img/icones/${ICONES_DOS_TIPOS[d.tipo]}" alt=""></span>
            <div class="card-aparelho-texto">
                <strong>${escaparHtml(d.nome)}</strong>
                <span>${textoDoAparelho(d)}</span>
                ${editar}
            </div>
            <button type="button" class="interruptor" role="switch" aria-checked="${d.ativo}"
                    aria-label="Ligar ou desligar ${escaparHtml(d.nome)}" data-id="${d.id}"></button>
        </div>`;
}

/* Cartão de porta: SOMENTE CONSULTA. Sem interruptor (não existe rota
   para trancar ou destrancar); o selo "Só consulta" deixa isso claro. */
function htmlCardPorta(porta) {
    const aberta = porta.aberta ? "Aberta" : "Fechada";
    const trancada = porta.trancada ? "Trancada" : "Destrancada";
    return `
        <div class="card card-aparelho">
            <span class="icone-redondo"><img src="/img/icones/porta.svg" alt=""></span>
            <div class="card-aparelho-texto">
                <strong>${escaparHtml(porta.nome)}</strong>
                <span>${aberta} · ${trancada}</span>
            </div>
            <span class="selo">Só consulta</span>
        </div>`;
}


/* Liga os cliques de todos os interruptores dentro de "container".
   Depois de alternar, chama aoAlterar() para a página recarregar a lista. */
function ativarInterruptores(container, caixaMensagem, aoAlterar) {
    const botoes = container.querySelectorAll(".interruptor");
    for (const botao of botoes) {
        botao.addEventListener("click", async function () {
            // dataset.id lê o atributo data-id do botão.
            const resposta = await chamarApi("PATCH", `/api/devices/${botao.dataset.id}/toggle`);
            if (!resposta.ok) {
                mostrarMensagem(caixaMensagem, resposta.dados.erro, "erro");
                return;
            }
            await aoAlterar();
        });
    }
}


/* Busca os cômodos e preenche um <select> de formulário.
   textoSemComodo: primeira opção (valor vazio), ex.: "Sem cômodo". */
async function preencherSelectComodos(select, textoSemComodo) {
    const resposta = await chamarApi("GET", "/api/rooms");
    let html = `<option value="">${textoSemComodo}</option>`;
    if (resposta.ok) {
        for (const comodo of resposta.dados.comodos) {
            html += `<option value="${comodo.id}">${escaparHtml(comodo.nome)}</option>`;
        }
    }
    select.innerHTML = html;
}


/* Desenha uma lista de aparelhos em cartões e liga os interruptores
   (tela Cômodo). */
function desenharDispositivos(container, dispositivos, caixaMensagem, aoAlterar) {
    if (dispositivos.length === 0) {
        container.innerHTML = '<p class="texto-secundario">Nenhum aparelho neste cômodo.</p>';
        return;
    }
    let html = "";
    for (const dispositivo of dispositivos) {
        html += htmlCardAparelho(dispositivo, false);
    }
    container.innerHTML = html;
    ativarInterruptores(container, caixaMensagem, aoAlterar);
}


/* ---------------------------------------------------------------------
   Casa vazia (docs/proposta/02-minha-casa-vazia.png)
   Mesma mensagem em Minha casa, Cômodos, Aparelhos, Rotinas e Tags:
   um título, um texto, os 3 passos (Cômodos -> Aparelhos e câmeras ->
   Rotinas e Tags) com o passo atual em destaque, e um botão.
   --------------------------------------------------------------------- */

/* Textos dos passos: docs/proposta/02-minha-casa-vazia.png */
const PASSOS_DA_CASA = [
    { titulo: "Cômodos", texto: "Sala, quarto, cozinha..." },
    { titulo: "Aparelhos e câmeras", texto: "Luzes, ar, cortinas, câmeras" },
    { titulo: "Rotinas e Tags", texto: "Automações e atalhos" },
];

/* opcoes:
     titulo, texto   o que aparece no topo do card
     passoAtual      1, 2 ou 3 (o passo em destaque)
     botaoTexto      ex.: "+ Adicionar cômodo"
     botaoLink       link do botão (se o botão leva para outra página), OU
     botaoId         id do botão (se a própria página trata o clique) */
function htmlCasaVazia(opcoes) {
    let passos = "";
    PASSOS_DA_CASA.forEach(function (passo, posicao) {
        const numero = posicao + 1;
        let classe = "passo";
        let etiqueta = `Passo ${numero}`;
        if (numero === opcoes.passoAtual) {
            classe += " atual";
        } else if (numero < opcoes.passoAtual) {
            classe += " feito";
            etiqueta = `✓ Passo ${numero}`;   // passo já cumprido
        }
        passos += `
            <li class="${classe}"${numero === opcoes.passoAtual ? ' aria-current="step"' : ""}>
                <span class="passo-etiqueta">${etiqueta}</span>
                <strong>${passo.titulo}</strong>
                <span>${passo.texto}</span>
            </li>`;
    });

    let botao = "";
    if (opcoes.botaoLink) {
        botao = `<a class="botao" href="${opcoes.botaoLink}">${opcoes.botaoTexto}</a>`;
    } else if (opcoes.botaoId) {
        botao = `<button type="button" class="botao" id="${opcoes.botaoId}">${opcoes.botaoTexto}</button>`;
    }

    return `
        <section class="card casa-vazia">
            <h2>${opcoes.titulo}</h2>
            <p>${opcoes.texto}</p>
            <ol class="passos">${passos}</ol>
            ${botao}
        </section>`;
}

/* Botão da casa vazia que leva ao formulário da própria página:
   rola até ele e põe o cursor no primeiro campo. */
function levarAoFormulario(formulario) {
    formulario.scrollIntoView({ behavior: "smooth" });
    const primeiroCampo = formulario.querySelector("input:not([type=hidden]), select, textarea");
    if (primeiroCampo) {
        primeiroCampo.focus();
    }
}


/* ---------------------------------------------------------------------
   Avisos da casa (docs/proposta/05-avisos.png), calculados no navegador
   a partir do estado REAL dos dispositivos e das portas. Nada é salvo.
     verde    ("ok")      porta fechada e trancada
     vermelho ("alerta")  porta aberta ou destrancada, janela aberta
     amarelo  ("atencao") sensor de movimento ligado
   --------------------------------------------------------------------- */

function avisosDasPortas(portas) {
    const avisos = [];
    for (const porta of portas) {
        if (porta.aberta) {
            avisos.push({ texto: `${porta.nome} aberta`, nivel: "alerta" });
        } else if (!porta.trancada) {
            avisos.push({ texto: `${porta.nome} destrancada`, nivel: "alerta" });
        } else {
            avisos.push({ texto: `${porta.nome} trancada`, nivel: "ok" });
        }
    }
    return avisos;
}

function avisosDosDispositivos(dispositivos) {
    const avisos = [];
    for (const d of dispositivos) {
        if (d.tipo === "janela" && d.estado === "aberta") {
            avisos.push({ texto: `${d.nome} aberta`, nivel: "alerta" });
        }
    }
    for (const d of dispositivos) {
        if (d.tipo === "sensor" && d.ativo) {
            avisos.push({ texto: `${d.nome} ligado`, nivel: "atencao" });
        }
    }
    return avisos;
}

/* Lista completa: primeiro as portas, depois janelas e sensores. */
function gerarAvisos(dispositivos, portas) {
    return avisosDasPortas(portas).concat(avisosDosDispositivos(dispositivos));
}

/* Uma linha de aviso com a bolinha colorida. */
function htmlAviso(aviso) {
    return `<div class="aviso-linha ${aviso.nivel}"><span class="bolinha" aria-hidden="true"></span>${escaparHtml(aviso.texto)}</div>`;
}
