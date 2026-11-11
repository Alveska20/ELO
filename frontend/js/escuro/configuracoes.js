/* =====================================================================
   E.L.O. — escuro/configuracoes.js (pages/escuro/configuracoes.html)

   Tela "Configurações" do visual escuro (Figma 06-perfil-homem/07-configuracoes-hifi.png).
   No sistema ela faz o papel do "Meu Perfil".

     GET  /api/profile                dados da pessoa
     PUT  /api/profile                salvar nome, e-mail e telefone, ou
                                      só o perfil_acesso (definição única)
     GET  /api/automations            "Automações padrão"
     PUT  /api/automations/<id>       ativar/pausar ({"ativo": ...})

   O perfil de acesso é definido UMA única vez (a regra fica no backend,
   que responde 403 a qualquer troca; aqui só escondemos os botões):
   - já definido ("mulher"/"homem"): mostra só "Perfil: Mulher/Homem";
   - "nao_definido": mostra Mulher e Homem e pede confirmação, num aviso
     dentro da própria página, antes de salvar.
   O admin não muda o perfil de ninguém, e o papel nunca vem de formulário.
   Se a escolha leva ao visual roxo (Mulher), a página manda a pessoa para
   a tela inicial roxa.
   ===================================================================== */

const caixaMensagemConfig = document.getElementById("mensagem");

const NOMES_DOS_PERFIS = { mulher: "Mulher", homem: "Homem" };
let escolhaAguardando = null;   // perfil à espera da confirmação


/* Blocos do Figma que o sistema não tem (endereço, preferências, segurança,
   integrações, aparência): mostram os DADOS FICTÍCIOS do
   homem.json (exemplos); o HTML já põe o selo "Dados de exemplo" em cada um. */
function desenharBlocosDeExemplo(exemplos) {
    document.getElementById("casa-endereco").innerHTML =
        `<p>${escaparHtml(exemplos.endereco)}<br><span class="h-subtitulo">${escaparHtml(exemplos.cidade)}</span></p>`;
    document.getElementById("preferencias").innerHTML = htmlLinhasExemplo(exemplos.preferencias);
    // "Dispositivos conectados" existe no sistema: leva à tela de Dispositivos.
    document.getElementById("seguranca").innerHTML = htmlLinhasExemplo(exemplos.seguranca.slice(0, 1))
        + '<div class="h-linha-info"><a href="/pages/escuro/dispositivos.html">Dispositivos conectados</a><span>&gt;</span></div>'
        + htmlLinhasExemplo(exemplos.seguranca.slice(1));
    document.getElementById("integracoes").innerHTML = htmlLinhasExemplo(exemplos.integracoes);
    document.getElementById("aparencia").innerHTML = htmlLinhasExemplo(exemplos.aparencia);
}


/* ---------------------------------------------------------------------
   Perfil e conta
   --------------------------------------------------------------------- */

function desenharPerfil(usuario) {
    document.getElementById("perfil-nome").textContent = usuario.nome;
    document.getElementById("perfil-papel").textContent = usuario.papel === "admin" ? "Administrador" : "Usuário";
    document.getElementById("avatar-grande").textContent = usuario.nome.charAt(0).toUpperCase();
    document.getElementById("perfil-campo-nome").value = usuario.nome;
    document.getElementById("perfil-campo-email").value = usuario.email;
    document.getElementById("perfil-campo-telefone").value = usuario.telefone || "";

    // "Como você se identifica?": só aparece enquanto o perfil não foi definido.
    const definido = usuario.perfil_acesso !== "nao_definido";
    document.getElementById("perfil-definido").classList.toggle("oculto", !definido);
    document.getElementById("formulario-identificacao").classList.toggle("oculto", definido);
    if (definido) {
        document.getElementById("perfil-definido-texto").textContent =
            `Perfil: ${NOMES_DOS_PERFIS[usuario.perfil_acesso] || usuario.perfil_acesso}`;
    }
    fecharConfirmacaoIdentificacao();
}


/* "Salvar" não envia direto: abre o aviso de confirmação dentro da página. */
function pedirConfirmacaoIdentificacao(evento) {
    evento.preventDefault();
    const escolha = document.querySelector("input[name='perfil_acesso']:checked");
    if (!escolha) {
        return;
    }
    escolhaAguardando = escolha.value;
    document.getElementById("identificacao-confirmacao-texto").textContent =
        `Você escolheu "${NOMES_DOS_PERFIS[escolhaAguardando]}". Depois de salvar, ` +
        "o perfil não poderá ser alterado. Deseja continuar?";
    document.getElementById("identificacao-confirmacao").classList.remove("oculto");
    document.getElementById("identificacao-confirmar").focus();
}

function fecharConfirmacaoIdentificacao() {
    escolhaAguardando = null;
    document.getElementById("identificacao-confirmacao").classList.add("oculto");
}

/* Confirmado: salva só a resposta de "Como você se identifica?" (PUT parcial). */
async function salvarIdentificacao() {
    if (!escolhaAguardando) {
        return;
    }
    const resposta = await chamarApi("PUT", "/api/profile", { perfil_acesso: escolhaAguardando });
    if (!resposta.ok) {
        fecharConfirmacaoIdentificacao();
        mostrarMensagem(caixaMensagemConfig, resposta.dados.erro, "erro");
        return;
    }
    // Mudou para o visual roxo? Vai para a tela inicial (o layout.js leva para o lugar certo).
    if (resposta.dados.usuario.tema !== "escuro") {
        window.location.replace(PAGINA_DASHBOARD);
        return;
    }
    desenharPerfil(resposta.dados.usuario);
    mostrarMensagem(caixaMensagemConfig, "Alterações salvas.", "sucesso");
}

function abrirEdicao() {
    document.getElementById("formulario-perfil").classList.remove("oculto");
    document.getElementById("botao-salvar").disabled = false;
    document.getElementById("perfil-campo-nome").focus();
}

async function salvarPerfil(evento) {
    evento.preventDefault();
    const dados = {
        nome: document.getElementById("perfil-campo-nome").value,
        email: document.getElementById("perfil-campo-email").value,
        telefone: document.getElementById("perfil-campo-telefone").value,
    };
    const resposta = await chamarApi("PUT", "/api/profile", dados);
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemConfig, resposta.dados.erro, "erro");
        return;
    }
    desenharPerfil(resposta.dados.usuario);
    document.getElementById("formulario-perfil").classList.add("oculto");
    document.getElementById("botao-salvar").disabled = true;
    mostrarMensagem(caixaMensagemConfig, "Alterações salvas.", "sucesso");
}


/* ---------------------------------------------------------------------
   Automações padrão (dado real: as automações da pessoa)
   --------------------------------------------------------------------- */

async function desenharAutomacoes() {
    const automacoes = await buscarListaEscuro("/api/automations", "automacoes");
    let html = "";
    for (const a of automacoes) {
        html += `
            <div class="h-linha-info">
                <span>${escaparHtml(a.nome)}</span>
                ${htmlInterruptorEscuro("ativar", a.id, a.ativo, `Ativar ou pausar ${a.nome}`)}
            </div>`;
    }
    document.getElementById("automacoes").innerHTML = html || '<p class="h-subtitulo">Nenhuma automação cadastrada.</p>';
}

async function alternarAutomacao(evento) {
    const botao = evento.target.closest("[data-acao='ativar']");
    if (!botao) {
        return;
    }
    const ligado = botao.getAttribute("aria-checked") === "true";
    const resposta = await chamarApi("PUT", `/api/automations/${botao.dataset.id}`, { ativo: !ligado });
    if (!resposta.ok) {
        mostrarMensagem(caixaMensagemConfig, resposta.dados.erro, "erro");
        return;
    }
    await desenharAutomacoes();
}


async function iniciarConfiguracoes() {
    const pagina = await iniciarPaginaEscuro("configuracoes");
    if (!pagina) {
        return;
    }
    const resposta = await chamarApi("GET", "/api/profile");
    if (resposta.ok) {
        desenharPerfil(resposta.dados.usuario);
    }
    desenharBlocosDeExemplo(pagina.area.textos.exemplos);
    await desenharAutomacoes();

    document.getElementById("botao-editar").addEventListener("click", abrirEdicao);
    document.getElementById("formulario-perfil").addEventListener("submit", salvarPerfil);
    document.getElementById("automacoes").addEventListener("click", alternarAutomacao);
    document.getElementById("formulario-identificacao").addEventListener("submit", pedirConfirmacaoIdentificacao);
    document.getElementById("identificacao-confirmar").addEventListener("click", salvarIdentificacao);
    document.getElementById("identificacao-cancelar").addEventListener("click", fecharConfirmacaoIdentificacao);
}


iniciarConfiguracoes();
