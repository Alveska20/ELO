/* =====================================================================
   E.L.O. — escuro/admin.js (pages/escuro/admin.html) — somente papel = admin

   O admin usa o visual escuro, então a Administração também é escura.

   Como o admin é separado do usuário:
   - o item "Administração" só aparece no menu para papel = admin (layout.js);
   - esta página exige admin (quem não é volta para a tela inicial);
   - e, o mais importante, TODAS as rotas /api/admin usam @admin_required
     no backend: um usuário comum recebe 403 mesmo chamando a URL direto.

     informações gerais  GET    /api/admin/overview
     usuários            GET    /api/admin/users   (só para ver o perfil de cada conta)
     cômodos             GET / DELETE /api/admin/rooms[/<id>]
     dispositivos        GET / DELETE /api/admin/devices[/<id>]
     Tags                GET / DELETE /api/admin/tags[/<id>]

   Perfil de acesso: o admin NÃO altera o perfil de ninguém.
   Quem escolhe é a própria pessoa, em "Como você se identifica?" (cadastro
   e Configurações). Aqui o perfil só aparece. As contas com perfil "não
   definido" aparecem num quadro de AVISO, sem botões.

   Privacidade: não existe rota de admin para contatos de confiança,
   alertas de emergência ou quiz, então esta tela nem tem como mostrá-los.
   ===================================================================== */

const caixaMensagemAdmin = document.getElementById("mensagem");

/* Nome de cada perfil de acesso na tabela (só leitura). */
const NOMES_DOS_PERFIS = {
    nao_definido: "Não definido",
    mulher: "Mulher",
    homem: "Homem",
};

/* Texto do quadro de aviso das contas "não definido". */
const AVISO_CONTAS_NOVAS = "Estas contas ainda não definiram o perfil. "
    + "Peça para a pessoa escolher em Configurações > Como você se identifica?";


/* ---------------------------------------------------------------------
   Seções (botões em pílula no topo)
   --------------------------------------------------------------------- */

function trocarSecao(evento) {
    const botao = evento.target.closest("button[data-secao]");
    if (!botao) {
        return;
    }
    for (const aba of document.querySelectorAll("#abas-admin .h-filtro")) {
        aba.classList.toggle("ativo", aba === botao);
        aba.setAttribute("aria-pressed", String(aba === botao));
    }
    for (const secao of document.querySelectorAll(".secao-admin")) {
        secao.classList.toggle("oculto", secao.id !== botao.dataset.secao);
    }
}


/* ---------------------------------------------------------------------
   Usuários (com destaque para as contas novas "não definido")
   --------------------------------------------------------------------- */

/* Conta nova = usuário comum que ainda está com o perfil "não definido". */
function ehContaNova(usuario) {
    return usuario.papel !== "admin" && usuario.perfil_acesso === "nao_definido";
}

/* Quadro de AVISO acima das seções: as contas que ainda estão com o
   perfil "não definido". Só informa (não tem botões). */
function desenharContasNovas(usuarios) {
    const novas = usuarios.filter(ehContaNova);
    const lugar = document.getElementById("contas-novas");
    if (novas.length === 0) {
        lugar.innerHTML = "";
        return;
    }
    let linhas = "";
    for (const usuario of novas) {
        linhas += `
            <div class="h-conta-nova">
                <div>
                    <strong>${escaparHtml(usuario.nome)}</strong>
                    <span class="h-subtitulo">${escaparHtml(usuario.email)}</span>
                </div>
            </div>`;
    }
    lugar.innerHTML = `
        <section class="h-cartao h-destaque" aria-label="Contas novas" role="status">
            <h2><span class="h-selo-nova">Aviso</span> ${novas.length} conta(s) com perfil "não definido"</h2>
            <p class="h-subtitulo">${AVISO_CONTAS_NOVAS}</p>
            ${linhas}
        </section>`;
}

async function carregarUsuarios() {
    const resposta = await chamarApi("GET", "/api/admin/users");
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemAdmin, resposta.dados.erro, "erro");
        return;
    }
    const usuarios = resposta.dados.usuarios;
    desenharContasNovas(usuarios);

    let linhas = "";
    for (const usuario of usuarios) {
        const nova = ehContaNova(usuario);
        const selo = nova ? ' <span class="h-selo-nova">Novo</span>' : "";
        linhas += `
            <tr${nova ? ' class="h-linha-nova"' : ""}>
                <td>${escaparHtml(usuario.nome)}${selo}</td>
                <td>${escaparHtml(usuario.email)}</td>
                <td>${usuario.papel === "admin" ? "Admin" : "Usuário"}</td>
                <td>${NOMES_DOS_PERFIS[usuario.perfil_acesso]}</td>
            </tr>`;
    }
    document.getElementById("tabela-usuarios").innerHTML = `
        <table class="h-tabela">
            <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Perfil de acesso</th></tr></thead>
            <tbody>${linhas}</tbody>
        </table>`;
}

/* ---------------------------------------------------------------------
   Cômodos, dispositivos e Tags (tabelas com o dono de cada item)
   --------------------------------------------------------------------- */

/* Monta uma tabela genérica.
   colunas: lista de { titulo, campo }  (campo = nome da chave no JSON)
   tipoItem: "rooms", "devices" ou "tags" (usado na URL do DELETE) */
function htmlTabela(itens, colunas, tipoItem) {
    if (itens.length === 0) {
        return '<p class="h-subtitulo">Nada cadastrado.</p>';
    }
    let cabecalho = "";
    for (const coluna of colunas) {
        cabecalho += `<th>${coluna.titulo}</th>`;
    }
    let linhas = "";
    for (const item of itens) {
        let celulas = "";
        for (const coluna of colunas) {
            celulas += `<td>${escaparHtml(item[coluna.campo])}</td>`;
        }
        linhas += `
            <tr>${celulas}
                <td><button type="button" class="h-botao h-botao-perigo h-botao-pequeno"
                        data-acao="excluir" data-tipo="${tipoItem}" data-id="${item.id}">Excluir</button></td>
            </tr>`;
    }
    return `
        <table class="h-tabela">
            <thead><tr>${cabecalho}<th></th></tr></thead>
            <tbody>${linhas}</tbody>
        </table>`;
}

async function carregarComodos() {
    const resposta = await chamarApi("GET", "/api/admin/rooms");
    if (resposta.ok) {
        document.getElementById("tabela-comodos").innerHTML = htmlTabela(resposta.dados.comodos, [
            { titulo: "Cômodo", campo: "nome" },
            { titulo: "Dono", campo: "dono_nome" },
            { titulo: "E-mail do dono", campo: "dono_email" },
        ], "rooms");
    }
}

async function carregarDispositivos() {
    const resposta = await chamarApi("GET", "/api/admin/devices");
    if (resposta.ok) {
        document.getElementById("tabela-dispositivos").innerHTML = htmlTabela(resposta.dados.dispositivos, [
            { titulo: "Dispositivo", campo: "nome" },
            { titulo: "Tipo", campo: "tipo" },
            { titulo: "Estado", campo: "estado" },
            { titulo: "Cômodo", campo: "comodo_nome" },
            { titulo: "Dono", campo: "dono_nome" },
        ], "devices");
    }
}

async function carregarTags() {
    const resposta = await chamarApi("GET", "/api/admin/tags");
    if (resposta.ok) {
        // A coluna "Status" precisa de texto; o JSON traz true/false.
        const tags = resposta.dados.tags;
        for (const tag of tags) {
            tag.status = tag.ativo ? "Ativa" : "Desativada";
        }
        document.getElementById("tabela-tags").innerHTML = htmlTabela(tags, [
            { titulo: "Tag", campo: "nome" },
            { titulo: "Código", campo: "codigo" },
            { titulo: "Função", campo: "funcao" },
            { titulo: "Status", campo: "status" },
            { titulo: "Dono", campo: "dono_nome" },
        ], "tags");
    }
}

async function excluirItem(tipoItem, itemId) {
    if (!confirm("Excluir este item? Isso afeta a conta do usuário dono dele.")) {
        return;
    }
    const resposta = await chamarApi("DELETE", `/api/admin/${tipoItem}/${itemId}`);
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemAdmin, resposta.dados.erro, "erro");
        return;
    }
    mostrarMensagem(caixaMensagemAdmin, resposta.dados.mensagem, "sucesso");
    await carregarTudo();
}


/* ---------------------------------------------------------------------
   Informações gerais
   --------------------------------------------------------------------- */

async function carregarInformacoesGerais() {
    const resposta = await chamarApi("GET", "/api/admin/overview");
    if (!resposta.ok) {
        return;
    }
    const dados = resposta.dados;
    const porPerfil = dados.usuarios_por_perfil;
    const numeros = [
        ["Usuários", dados.total_usuarios],
        ["Administradores", dados.total_admins],
        ["Perfil mulher", porPerfil.mulher],
        ["Perfil homem", porPerfil.homem],
        ["Perfil não definido", porPerfil.nao_definido],
        ["Cômodos", dados.total_comodos],
        ["Dispositivos", dados.total_dispositivos],
        ["Automações", dados.total_automacoes],
        ["Tags", dados.total_tags],
    ];
    let html = "";
    // Cada item é um par [legenda, valor]; os colchetes separam os dois.
    for (const [legenda, valor] of numeros) {
        html += `<div class="h-numero"><span class="rotulo">${legenda}</span><span class="valor">${valor}</span></div>`;
    }
    document.getElementById("informacoes-gerais").innerHTML = html;
}


/* ---------------------------------------------------------------------
   Início
   --------------------------------------------------------------------- */

function tratarCliqueNaPagina(evento) {
    const botao = evento.target.closest("button[data-acao]");
    if (!botao) {
        return;
    }
    // O único botão das tabelas é "Excluir" (cômodos, dispositivos e Tags).
    if (botao.dataset.acao === "excluir") {
        excluirItem(botao.dataset.tipo, botao.dataset.id);
    }
}

async function carregarTudo() {
    await carregarUsuarios();
    await carregarComodos();
    await carregarDispositivos();
    await carregarTags();
    await carregarInformacoesGerais();
}

async function iniciarAdmin() {
    // escuro: true = menu lateral escuro (layout.js); exige: "admin" = só papel admin.
    const pagina = await montarPagina({ paginaAtual: "admin", exige: "admin", escuro: true });
    if (!pagina) {
        return;
    }
    const avatar = document.getElementById("avatar");
    avatar.textContent = pagina.usuario.nome.charAt(0).toUpperCase();
    avatar.title = pagina.usuario.nome;

    document.getElementById("abas-admin").addEventListener("click", trocarSecao);
    document.querySelector("main").addEventListener("click", tratarCliqueNaPagina);
    await carregarTudo();
}


iniciarAdmin();
