/* =====================================================================
   E.L.O. — layout.js
   Partes comuns de todas as páginas logadas:
   - confere quem está logado e se pode ver a página;
   - leva cada pessoa para o visual dela (roxo ou escuro);
   - monta o cabeçalho roxo (logo, menu, "Preciso de ajuda" e avatar)
     ou o menu lateral escuro;
   - monta as abas de "Minha casa", o caminho de navegação e o rodapé;
   - na Proteção E.L.O., liga o "Sair rápido" e mostra o aviso
     "Conteúdo informativo...".
   O visual roxo segue as imagens aprovadas em docs/proposta/.

   Cada página chama, no começo do seu próprio JS:
       const pagina = await montarPagina({ ... });
       if (!pagina) return;   // foi redirecionada (sem login ou sem permissão)

   Importante: esconder um item do menu NÃO protege nada sozinho.
   A proteção de verdade está no backend (decorators). Aqui só evitamos
   mostrar uma tela que daria erro 403.
   ===================================================================== */

const PAGINA_LOGIN = "/";
const PAGINA_DASHBOARD = "/pages/dashboard.html";

/* Visual de cada pessoa (campo "tema" do /api/auth/me):
     "roxo"   -> perfil mulher: casa roxa + Proteção E.L.O.
     "escuro" -> perfil homem, não definido e admin: telas de pages/escuro/
   A regra fica no backend (tema_do_usuario em auth_service.py). */
const TEMA_ROXO = "roxo";
const TEMA_ESCURO = "escuro";

/* Menu do cabeçalho roxo (docs/proposta/, todas as imagens):
   Minha casa · Proteção E.L.O. · Fale conosco.
   "mostrarPara" diz quem vê o item: "todos" ou "mulher" (perfil_acesso). */
const ITENS_MENU = [
    { id: "minha-casa", texto: "Minha casa", link: "/pages/dashboard.html", mostrarPara: "todos" },
    { id: "protecao", texto: "Proteção E.L.O.", link: "/pages/protecao.html", mostrarPara: "mulher" },
    { id: "fale-conosco", texto: "Fale conosco", link: "/pages/fale-conosco.html", mostrarPara: "todos" },
];

/* Abas de "Minha casa" (docs/proposta/01 a 06): aparecem em todas as telas
   da casa. "Rotinas" = automações. */
const ABAS_CASA = [
    { id: "inicio", texto: "Início", link: "/pages/dashboard.html" },
    { id: "cameras", texto: "Câmeras", link: "/pages/cameras.html" },
    { id: "aparelhos", texto: "Aparelhos", link: "/pages/dispositivos.html" },
    { id: "avisos", texto: "Avisos", link: "/pages/avisos.html" },
    { id: "tags", texto: "Tags", link: "/pages/tags.html" },
    { id: "rotinas", texto: "Rotinas", link: "/pages/automacoes.html" },
];

/* Menu lateral do VISUAL ESCURO (Figma 06-perfil-homem/).
   Itens do Figma: Início · Minha casa · Ambientes · Dispositivos ·
   Automações · Configurações. "Minhas Tags" foi acrescentada (decisão da
   equipe); Câmeras é um filtro de Dispositivos. Sem Proteção E.L.O.
   O admin ganha "Administração". As telas escuras ficam em pages/escuro/
   e usam só o css/escuro.css. */
const ITENS_MENU_ESCURO = [
    { id: "inicio", icone: "⌂", texto: "Início", link: "/pages/escuro/inicio.html" },
    { id: "minha-casa", icone: "◈", texto: "Minha casa", link: "/pages/escuro/minha-casa.html" },
    { id: "ambientes", icone: "▦", texto: "Ambientes", link: "/pages/escuro/ambientes.html" },
    { id: "dispositivos", icone: "▣", texto: "Dispositivos", link: "/pages/escuro/dispositivos.html" },
    { id: "automacoes", icone: "ϟ", texto: "Automações", link: "/pages/escuro/automacoes.html" },
    { id: "tags", icone: "◎", texto: "Minhas Tags", link: "/pages/escuro/tags.html" },
    { id: "configuracoes", icone: "⚙", texto: "Configurações", link: "/pages/escuro/configuracoes.html" },
];

/* Página roxa -> página escura equivalente.
   Se uma pessoa do visual escuro abrir uma página roxa (pelo login, por um
   link salvo ou pelo destino de uma Tag), ela é levada para a tela escura.
   Assim os dois visuais nunca se misturam. */
const PAGINAS_ESCURAS = {
    "/pages/dashboard.html": "/pages/escuro/inicio.html",
    "/pages/casa.html": "/pages/escuro/ambientes.html",
    "/pages/comodo.html": "/pages/escuro/ambiente.html",
    "/pages/dispositivos.html": "/pages/escuro/dispositivos.html",
    "/pages/automacoes.html": "/pages/escuro/automacoes.html",
    "/pages/tags.html": "/pages/escuro/tags.html",
    "/pages/perfil.html": "/pages/escuro/configuracoes.html",
    "/pages/cameras.html": "/pages/escuro/dispositivos.html?filtro=camera",
    "/pages/avisos.html": "/pages/escuro/dispositivos.html",
    "/pages/fale-conosco.html": "/pages/escuro/inicio.html",   // Fale conosco existe só no roxo
};


/* ---------------------------------------------------------------------
   Permissões
   --------------------------------------------------------------------- */

function usuarioPodeVer(usuario, quem) {
    if (quem === "todos") {
        return true;
    }
    if (quem === "admin") {
        return usuario.papel === "admin";
    }
    if (quem === TEMA_ESCURO || quem === TEMA_ROXO) {
        return usuario.tema === quem;
    }
    // "mulher": compara com o perfil de acesso definido pelo admin.
    return usuario.perfil_acesso === quem;
}


/* ---------------------------------------------------------------------
   Cabeçalho
   --------------------------------------------------------------------- */

/* Os links do menu único que a pessoa pode ver. */
function htmlItensMenu(usuario, paginaAtual) {
    let html = "";
    for (const item of ITENS_MENU) {
        if (!usuarioPodeVer(usuario, item.mostrarPara)) {
            continue;
        }
        const classeAtivo = item.id === paginaAtual ? " ativo" : "";
        // aria-current avisa leitores de tela qual é a página atual.
        const atual = item.id === paginaAtual ? ' aria-current="page"' : "";
        html += `<li><a class="menu-link${classeAtivo}" href="${item.link}"${atual}>${item.texto}</a></li>`;
    }
    return html;
}

/* Botão "Preciso de ajuda": só para o perfil mulher. */
function htmlBotaoAjuda(usuario) {
    if (usuario.perfil_acesso !== "mulher") {
        return "";
    }
    return '<a class="botao botao-ajuda" href="/pages/protecao-ajuda.html">Preciso de ajuda</a>';
}

/* Avatar com a inicial do nome, que abre "Configurações" e "Sair".
   <details> abre e fecha sozinho ao clicar, sem JavaScript, e o leitor de
   tela entende que é algo que se expande. */
function htmlAvatar(usuario, paginaAtual) {
    const inicial = escaparHtml(usuario.nome.charAt(0).toUpperCase());
    const configuracoesAtual = paginaAtual === "perfil" ? ' aria-current="page"' : "";
    return `
        <details class="avatar-menu">
            <summary class="avatar" title="${escaparHtml(usuario.nome)}">
                <span aria-hidden="true">${inicial}</span>
                <span class="so-leitor-de-tela">Conta de ${escaparHtml(usuario.nome)}</span>
            </summary>
            <ul class="avatar-opcoes">
                <li><a href="/pages/perfil.html"${configuracoesAtual}>Configurações</a></li>
                <li><button type="button" class="botao-link" id="botao-sair">Sair</button></li>
            </ul>
        </details>`;
}

/* Cabeçalho roxo: logo horizontal, menu, "Preciso de ajuda" e avatar. */
function montarCabecalho(usuario, paginaAtual) {
    document.getElementById("cabecalho").innerHTML = `
        <header class="cabecalho">
            <div class="container cabecalho-linha">
                <a class="cabecalho-marca" href="${PAGINA_DASHBOARD}">
                    <img src="/img/logo-elo-horizontal.png" alt="E.L.O. — ir para Minha casa">
                </a>
                <button type="button" class="botao botao-pequeno cabecalho-menu-botao"
                        id="botao-menu" aria-expanded="false" aria-controls="menu-principal">Menu</button>
                <nav class="menu" id="menu-principal" aria-label="Menu principal">
                    <ul>${htmlItensMenu(usuario, paginaAtual)}</ul>
                </nav>
                ${htmlBotaoAjuda(usuario)}
                ${htmlAvatar(usuario, paginaAtual)}
            </div>
        </header>`;

    document.getElementById("botao-sair").addEventListener("click", sair);
    document.getElementById("botao-menu").addEventListener("click", alternarMenuCelular);
}

/* ---------------------------------------------------------------------
   Visual escuro: menu lateral e rodapé das telas de pages/escuro/
   --------------------------------------------------------------------- */

/* Se a pessoa usa o visual escuro e abriu uma página ROXA da casa, devolve
   o endereço da tela escura (mantendo o "?id=..." ou o "?aviso=..."). Senão, null. */
function paginaEscura(usuario) {
    if (usuario.tema !== TEMA_ESCURO) {
        return null;
    }
    const destino = PAGINAS_ESCURAS[window.location.pathname];
    if (!destino) {
        return null;
    }
    if (destino.includes("?")) {
        return destino;
    }
    return destino + window.location.search;
}

function montarMenuLateral(usuario, idAtivo) {
    let itensHtml = "";
    for (const item of ITENS_MENU_ESCURO) {
        const classeAtivo = item.id === idAtivo ? " ativo" : "";
        const atual = item.id === idAtivo ? ' aria-current="page"' : "";
        // O ícone é só enfeite (aria-hidden): o leitor de tela lê só o texto.
        itensHtml += `<li><a class="menu-lateral-link${classeAtivo}" href="${item.link}"${atual}>`
            + `<span class="menu-lateral-icone" aria-hidden="true">${item.icone}</span>${item.texto}</a></li>`;
    }
    // O admin também usa o visual escuro e tem o item "Administração".
    if (usuario.papel === "admin") {
        const classeAtivo = idAtivo === "admin" ? " ativo" : "";
        const atual = idAtivo === "admin" ? ' aria-current="page"' : "";
        itensHtml += `<li><a class="menu-lateral-link${classeAtivo}" href="/pages/escuro/admin.html"${atual}>`
            + '<span class="menu-lateral-icone" aria-hidden="true">✦</span>Administração</a></li>';
    }
    itensHtml += '<li><button type="button" class="menu-lateral-link" id="botao-sair">Sair</button></li>';

    // O id "menu-principal" é o mesmo do cabeçalho roxo: assim a função
    // alternarMenuCelular() serve para os dois menus.
    document.getElementById("cabecalho").innerHTML = `
        <aside class="menu-lateral">
            <a class="menu-lateral-marca" href="/pages/escuro/inicio.html">
                <strong>ELO</strong>
                <span>Sua casa mais inteligente</span>
            </a>
            <button type="button" class="h-botao h-botao-pequeno menu-lateral-botao"
                    id="botao-menu" aria-expanded="false" aria-controls="menu-principal">Menu</button>
            <nav id="menu-principal" aria-label="Menu principal">
                <ul>${itensHtml}</ul>
            </nav>
        </aside>`;

    document.getElementById("botao-sair").addEventListener("click", sair);
    document.getElementById("botao-menu").addEventListener("click", alternarMenuCelular);
}

function montarRodapeEscuro() {
    document.getElementById("rodape").innerHTML = `
        <footer class="h-rodape">ELO · Sua casa mais inteligente · Projeto acadêmico</footer>`;
}

/* No celular, o botão "Menu" abre e fecha a lista de links. */
function alternarMenuCelular() {
    const menu = document.getElementById("menu-principal");
    const botao = document.getElementById("botao-menu");
    const abriu = menu.classList.toggle("aberto");
    botao.setAttribute("aria-expanded", String(abriu));
}

async function sair() {
    await chamarApi("POST", "/api/auth/logout");
    // replace: a página atual sai do histórico, então o botão "Voltar"
    // do navegador não reabre uma tela de quem já saiu.
    window.location.replace(PAGINA_LOGIN);
}


/* ---------------------------------------------------------------------
   Caminho de navegação e rodapé
   --------------------------------------------------------------------- */

/* Texto vindo do conteudo (protecao.json, quiz.json) pronto para a tela.
   Placeholders como "[ADICIONAR TEXTO AQUI]" ganham destaque amarelo
   (classe .placeholder), para a equipe ver o que falta preencher. */
function htmlTexto(texto) {
    const seguro = escaparHtml(texto);
    if (seguro.startsWith("[") && seguro.endsWith("]")) {
        return `<span class="placeholder">${seguro}</span>`;
    }
    return seguro;
}


/* Abas de "Minha casa" (Início · Câmeras · Aparelhos · Avisos · Tags · Rotinas).
   Só aparecem nas páginas que têm <div id="abas-casa">. */
function montarAbasCasa(abaAtual) {
    const lugar = document.getElementById("abas-casa");
    if (!lugar) {
        return;
    }
    let html = "";
    for (const aba of ABAS_CASA) {
        const ativa = aba.id === abaAtual;
        const classe = ativa ? "aba ativa" : "aba";
        const atual = ativa ? ' aria-current="page"' : "";
        html += `<a class="${classe}" href="${aba.link}"${atual}>${aba.texto}</a>`;
    }
    lugar.innerHTML = `<nav class="abas" aria-label="Partes da casa">${html}</nav>`;
}

/* "Proteção E.L.O. › Perguntas frequentes" nas subpáginas da Proteção. */
function montarBreadcrumb(nomeDaPagina) {
    const lugar = document.getElementById("breadcrumb");
    if (!lugar || !nomeDaPagina) {
        return;
    }
    lugar.innerHTML = `
        <nav class="breadcrumb" aria-label="Você está em">
            <a href="/pages/protecao.html">Proteção E.L.O.</a> › ${escaparHtml(nomeDaPagina)}
        </nav>`;
}

/* Rodapé de todas as telas roxas: logo completa + texto (docs/proposta/). */
function montarRodape() {
    document.getElementById("rodape").innerHTML = `
        <footer class="rodape">
            <img src="/img/logo-elo.png" alt="E.L.O. — Central de auxílio à mulher">
            <p>Projeto acadêmico de apoio e informação para mulheres.</p>
            <p>Em situação de emergência, ligue 190. Para orientação, ligue 180.</p>
        </footer>`;
}

/* Aviso "Conteúdo informativo..." no fim do conteúdo das páginas da
   Proteção (acima do rodapé, como nas imagens 07 a 12). */
function mostrarAvisoProtecao(texto) {
    const principal = document.querySelector("main");
    principal.insertAdjacentHTML("beforeend", `<p class="aviso-protecao">${escaparHtml(texto)}</p>`);
}


/* Mostra em "Minha casa" (ou no Início escuro) o aviso de quem foi mandado de volta por falta de permissão. */
function mostrarAvisoDaUrl() {
    const lugar = document.getElementById("aviso-global");
    // URLSearchParams lê os parâmetros depois do "?" na barra de endereço.
    const parametros = new URLSearchParams(window.location.search);
    if (lugar && parametros.get("aviso") === "sem-permissao") {
        mostrarMensagem(lugar, "Você não tem permissão para acessar essa página.", "erro");
    }
}


/* ---------------------------------------------------------------------
   Função principal, chamada por todas as páginas logadas.

   opcoes:
     paginaAtual  id do item do menu a destacar (ex.: "minha-casa")
     abaCasa      id da aba de Minha casa a destacar (ex.: "cameras")
     exige        "todos" (padrão), "admin", "mulher", "roxo" ou "escuro"
     protecao     true nas páginas da Proteção E.L.O.: carrega os textos,
                  mostra o aviso "Conteúdo informativo..." e liga o "Sair rápido"
     breadcrumb   nome da subpágina da Proteção (ex.: "Quiz educativo")

     escuro       true nas telas de pages/escuro/: monta o menu lateral escuro
                  em vez do cabeçalho roxo

   Devolve { usuario, conteudo } ou null se a pessoa foi redirecionada.
   --------------------------------------------------------------------- */
/* Passos 1 a 3 de montarPagina: quem está logado e se pode ver a página.
   Devolve o usuário, ou null se a pessoa foi redirecionada. */
async function conferirAcesso(exige) {
    // 1. Quem está logado? Sem sessão, a API responde 401.
    const resposta = await chamarApi("GET", "/api/auth/me");
    if (!resposta.ok) {
        window.location.replace(PAGINA_LOGIN);
        return null;
    }
    const usuario = resposta.dados.usuario;

    // 2. Visual escuro numa página roxa da casa? Vai para a tela escura.
    const destinoEscuro = paginaEscura(usuario);
    if (destinoEscuro) {
        window.location.replace(destinoEscuro);
        return null;
    }

    // 3. Pode ver esta página? Senão, volta a "Minha casa" com mensagem
    //    (quem usa o escuro é levado de lá para o Início escuro, pelo passo 2).
    if (!usuarioPodeVer(usuario, exige)) {
        window.location.replace(PAGINA_DASHBOARD + "?aviso=sem-permissao");
        return null;
    }
    return usuario;
}

/* Passo 4: nas páginas da Proteção, busca os textos (content/protecao.json)
   e liga o "Sair rápido". Devolve o conteúdo, ou null se não tem permissão. */
async function carregarProtecao() {
    const resposta = await chamarApi("GET", "/api/protection");
    if (!resposta.ok) {
        window.location.replace(PAGINA_DASHBOARD + "?aviso=sem-permissao");
        return null;
    }
    iniciarSaidaRapida(resposta.dados.saida_rapida.limitacao);   // js/saida_rapida.js
    return resposta.dados;
}

async function montarPagina(opcoes) {
    const usuario = await conferirAcesso(opcoes.exige || "todos");
    if (!usuario) {
        return null;
    }

    let conteudo = null;
    if (opcoes.protecao) {
        conteudo = await carregarProtecao();
        if (!conteudo) {
            return null;
        }
    }

    // 5. Telas escuras (pages/escuro/): menu lateral escuro.
    if (opcoes.escuro) {
        montarMenuLateral(usuario, opcoes.paginaAtual);
        montarRodapeEscuro();
        mostrarAvisoDaUrl();
        return { usuario: usuario, conteudo: null };
    }

    // 6. Demais páginas: cabeçalho roxo, abas da casa, caminho e rodapé.
    montarCabecalho(usuario, opcoes.paginaAtual);
    montarAbasCasa(opcoes.abaCasa);
    montarBreadcrumb(opcoes.breadcrumb);
    montarRodape();
    if (conteudo) {
        mostrarAvisoProtecao(conteudo.aviso_rodape.texto);
    }
    mostrarAvisoDaUrl();
    return { usuario: usuario, conteudo: conteudo };
}
