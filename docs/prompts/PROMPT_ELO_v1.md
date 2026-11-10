# PROMPT — E.L.O. (Escuta, Liberdade e Orientação) — Versão 1

> Cole este prompt no Claude Code dentro da pasta vazia do projeto.
> \*\*Antes de rodar:\*\* conecte o MCP do Figma no Claude Code e cole o link do Figma na seção 5.

\---

## 0\. CONTEXTO

Você vai criar a **primeira versão funcional** do E.L.O. — Escuta, Liberdade e Orientação.

O E.L.O. é uma plataforma web de **casa inteligente** (cômodos, dispositivos, automações, Tags) que tem também uma **camada de proteção e orientação** para mulheres em situação de violência doméstica.

Este é um **trabalho em grupo de faculdade (4º semestre)**. A estudante responsável está começando em **Python**. Por isso:

* o código deve ter cara de projeto de estudante bem feito, **não** de produto corporativo;
* cada parte precisa ser **simples, legível e explicável numa apresentação**;
* nada de código "mágico", abstrações desnecessárias ou arquitetura complexa;
* **todo o projeto em Python** no backend (sem Node, sem TypeScript, sem frameworks JS).

**Não tente fazer o projeto final.** Crie uma base funcional e fácil de evoluir.

\---

## 1\. PRINCÍPIO FUNDAMENTAL

A plataforma web é o produto principal. Ela deve funcionar **sem**:
hardware, Alexa, assistente de voz, dispositivos IoT reais, sensores físicos ou integrações externas.

ELO Hub e assistente de voz são **extras futuros** — apenas documentar/preparar, nunca depender deles.

\---

## 2\. TECNOLOGIAS (obrigatório)

|Camada|Tecnologia|
|-|-|
|Backend|**Python + Flask** (API REST em JSON, organizada com Blueprints)|
|Banco|**SQLite** usando o módulo `sqlite3` do Python, com SQL escrito à mão em `schema.sql` (sem ORM, para ficar explicável)|
|Autenticação|**Sessão simples do Flask** (`flask.session`) + senha com hash via `werkzeug.security`|
|Frontend|**HTML + CSS + JavaScript puro** (sem React, Vue, Bootstrap obrigatório, jQuery etc.)|
|Comunicação|JavaScript chama a API com `fetch()`; o próprio Flask serve os arquivos do frontend (mesma origem → sem CORS, cookie de sessão funciona direto)|
|Testes|**pytest** com o `test\_client` do Flask|

Não usar: microsserviços, Docker obrigatório, Kubernetes, filas, Celery, JWT, ORM, bibliotecas pesadas.
Dependências mínimas no `requirements.txt` (Flask, python-dotenv, pytest).

\---

## 3\. ESTRUTURA DO PROJETO

Use esta estrutura (pode simplificar se fizer sentido, mas mantenha responsabilidade clara por pasta):

```
elo/
├── backend/
│   ├── app/
│   │   ├── \_\_init\_\_.py          # create\_app(): cria o Flask, registra blueprints
│   │   ├── config.py            # lê variáveis do .env
│   │   ├── database/
│   │   │   ├── db.py            # abrir/fechar conexão sqlite3
│   │   │   ├── schema.sql       # CREATE TABLE de todas as tabelas
│   │   │   └── seed.py          # dados de demonstração + admin inicial
│   │   ├── routes/              # Blueprints: recebem as requisições HTTP
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── rooms.py
│   │   │   ├── devices.py
│   │   │   ├── doors.py
│   │   │   ├── automations.py
│   │   │   ├── tags.py
│   │   │   ├── protection.py
│   │   │   ├── quiz.py
│   │   │   ├── trusted\_contacts.py
│   │   │   ├── emergency.py
│   │   │   └── admin.py
│   │   ├── services/            # regras de negócio
│   │   └── utils/
│   │       └── decorators.py    # @login\_required, @admin\_required, @acesso\_mulher\_required
│   ├── tests/
│   ├── run.py                   # ponto de entrada: python run.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── index.html               # login
│   ├── pages/                   # uma página HTML por tela
│   ├── css/
│   └── js/
│       ├── api.js               # função única para chamar a API com fetch
│       └── ...                  # um JS por página
├── docs/
│   ├── figma/                   # telas do Figma organizadas em pastas por área (ver seção 5)
│   ├── conteudo/
│   │   └── pesquisa\_elo.md      # DOC DA EQUIPE: pesquisa, FAQ, quiz, contatos (colocado pela estudante)
│   └── ANALISE\_FIGMA.md         # gerado por você (ver seção 5)
├── README.md
└── .gitignore
```

Não criar camada `schemas/` nem `models/` separadas se não forem necessárias com sqlite3 puro — se criar, explique o motivo.

\---

## 4\. EXPLICABILIDADE (requisito MUITO importante)

* Comentários em **português**, explicando o **porquê**, não só o quê.
* Explique os conceitos **somente em termos de Python e Flask** (Blueprint, decorator, dict, sessão, sqlite3). **Não fazer comparações com outras linguagens.**
* Nomes de variáveis, funções e tabelas: escolha um padrão (português **ou** inglês) e mantenha em todo o projeto.
* Funções curtas, uma responsabilidade cada.
* Sem list comprehension complicada, sem truques de Python avançado. Prefira `for` explícito quando ficar mais claro.
* Ao final, cada uma destas perguntas deve ter resposta clara no código + README:
como o frontend conversa com o backend; como a API funciona; como os dados são salvos; como funciona o login e a sessão; como funcionam as permissões (usuário × admin × acesso mulher); como as Tags funcionam; como os dispositivos são controlados; como as automações funcionam; como a área de proteção funciona; como o admin é separado do usuário.

\---

## 5\. FIGMA — BUSCAR, ORGANIZAR EM PASTAS E COMPARAR (fazer ANTES de criar as telas)

A equipe já começou o protótipo no Figma (telas iniciais, área do admin/perfis de usuário e perguntas do site/quiz).

**Link do Figma:** https://www.figma.com/design/tJhASE0koXyumjI0qnKkBV/Sem-t%C3%ADtulo?node-id=0-1\&t=EQ2LZiH9SflNYEaO-1

> O arquivo do Figma terá as duas partes (perfil mulher e perfil homem), mas \*\*por enquanto só a parte do perfil mulher está desenhada\*\*. A parte do homem será adicionada depois pela equipe:
> - a ausência das telas do homem \*\*não\*\* é erro nem "faltando no Figma";
> - se já existir alguma tela do homem, salve em `06-perfil-homem/`, mas \*\*não implemente\*\* — mantenha apenas o placeholder da seção 6.

### 5.1 Trazer o Figma para o projeto em pastas

1. Acesse o Figma pelo link acima usando o **MCP do Figma** (ex.: `get\_metadata` para listar páginas/frames, `get\_screenshot` para a imagem de cada tela, `get\_design\_context` para textos, cores e componentes).
2. Salve **cada tela como PNG** em `docs/figma/`, organizada **em pastas por área**, seguindo esta estrutura (use os nomes das páginas/frames do Figma quando fizer sentido):

```
docs/figma/
├── 01-inicial/          # splash, boas-vindas, login, cadastro
├── 02-usuario/          # dashboard, minha casa, dispositivos, portas, automações, tags, perfil
├── 03-protecao/         # proteção E.L.O., FAQ, contatos de confiança, preciso de ajuda
├── 04-quiz/             # perguntas do site / quiz
├── 05-admin/            # área administrativa, gestão de usuários e perfil de acesso
├── 06-perfil-homem/     # telas do perfil homem, se existirem
├── 99-outros/           # telas que não se encaixam em nenhuma área acima
└── INDICE\_FIGMA.md      # lista de cada arquivo: nome da tela no Figma, pasta, link/ID do frame
```

3. Nome dos arquivos: `NN-nome-da-tela.png` (ex.: `01-login.png`, `02-dashboard.png`), minúsculo, sem acento e sem espaço.
4. Se uma tela tiver textos definidos (ex.: perguntas do quiz), salve também esses textos em `.md` na mesma pasta (ex.: `04-quiz/perguntas.md`).
5. Crie apenas pastas que tenham conteúdo. Não invente telas para preencher pasta vazia.
6. Se o MCP do Figma não estiver disponível ou o link não abrir, **pare e avise** antes de continuar.

### 5.2 Comparar Figma × prompt

1. Use as telas de `docs/figma/` e compare cada tela/elemento com o que está descrito **neste prompt**, aplicando a regra:

|Situação|O que fazer|
|-|-|
|Está no prompt **e** no Figma|Implementar seguindo o visual/textos do Figma|
|Está no prompt, mas **não** no Figma|Implementar com layout simples **e avisar**|
|Está no Figma, mas **não** no prompt|**Descartar** (não implementar) e listar|
|Está nos dois, mas **diferente**|Seguir o prompt para a regra de negócio, o Figma para o visual, e listar a diferença|

2. **Perguntas do site / quiz — comparar o DOC com o Figma.**
A equipe tem o documento **`docs/conteudo/pesquisa\_elo.md`** (seção "8. Quiz educativo" para as perguntas e respostas). Esse documento é a **fonte oficial do conteúdo**; o Figma é a referência do **visual**.

|Situação|O que fazer|
|-|-|
|Pergunta está no doc **e** no Figma|Usar o texto do **doc** (perguntas, alternativas, resposta certa, explicação) no layout do Figma|
|Pergunta está no doc, mas **não** no Figma|**Adicionar** no sistema (layout simples) e **avisar** que falta no Figma|
|Pergunta está no Figma, mas **não** no doc|**Descartar** e listar|
|Pergunta está nos dois, mas com texto **diferente**|Usar o texto do **doc** e listar a diferença (o Figma precisa ser alterado)|
|Doc não traz alguma parte (ex.: explicação, resposta certa)|Usar placeholder e **avisar** o que falta|

   * Não inventar perguntas, alternativas, respostas nem explicações além do que está no doc.
   * Gravar as perguntas do doc no banco via `seed.py`.
   * Atenção: no doc, as perguntas **2, 5 e 6** não têm explicação, e não há texto de **resultado final** do quiz → usar placeholder e avisar.
   * Se `docs/conteudo/pesquisa\_elo.md` não existir, **pare e avise** antes de criar o quiz.
3. **Demais conteúdos do doc × Figma:** aplicar a mesma regra (doc = conteúdo, Figma = visual) para Proteção E.L.O., FAQ, tipos de violência e contatos de emergência (ver seção 7.13).
4. Gere `docs/ANALISE\_FIGMA.md` com as seções: **Implementado conforme Figma**, **Faltando no Figma**, **Descartado (só no Figma)**, **Divergências**, **Perguntas do quiz**, **Conexões definidas por mim** — sempre citando o arquivo da pasta (ex.: `02-usuario/02-dashboard.png`).

### 5.3 Conectar as páginas (fluxo de navegação)

As telas do Figma **ainda não estão conectadas entre si** (não há links/fluxo de protótipo). Você deve definir e implementar essas conexões:

1. Monte o fluxo de navegação entre todas as telas (Figma + telas do prompt) e salve em `docs/figma/FLUXO\_NAVEGACAO.md`, com:

   * diagrama em **Mermaid** (tela → ação/botão → tela de destino);
   * tabela: *tela de origem | botão/ação | tela de destino | regra de acesso*.
2. Regras obrigatórias do fluxo:

   * `index.html` (login) → **Dashboard** após login; link para **Cadastro** e volta para login.
   * Usuário `admin` → acesso também à **Administração**; usuário comum nunca chega lá (redirecionar para o Dashboard).
   * Menu presente em todas as páginas logadas: Dashboard, Minha Casa, Dispositivos, Automações, Minhas Tags, Perfil, Sair; **Proteção E.L.O.** só para `perfil\_acesso = mulher`; **Admin** só para admin.
   * Minha Casa → Cômodo → dispositivos do cômodo → voltar.
   * Proteção E.L.O. → Informações / FAQ / Quiz / Contatos de Confiança / Configurações de emergência.
   * Botão **PRECISO DE AJUDA** acessível de todas as páginas logadas do perfil mulher → área de emergência.
   * Botão **Sair rápido** (seção 7.14) nas páginas da Proteção E.L.O. → página neutra externa, com logout.
   * Simular leitura de Tag → página configurada na Tag.
   * Sem login → qualquer página volta para o login. Sem permissão → volta para o Dashboard com mensagem.
   * **Sair** → encerra a sessão e volta para o login.
3. Toda tela deve ter caminho de ida **e** de volta (nenhuma página "sem saída").
4. Se uma conexão não estiver clara pelo Figma nem pelo prompt, crie a navegação mais simples e liste em `ANALISE\_FIGMA.md` na seção **Conexões definidas por mim** para a equipe validar (e, se quiser, replicar no protótipo do Figma).
5. O frontend deve seguir exatamente o `FLUXO\_NAVEGACAO.md`.

Não invente telas que não estejam nem no prompt nem no Figma.

\---

## 6\. AUTENTICAÇÃO E PERFIS

* Cadastro, login e logout com **sessão do Flask**.
* Senha salva **somente com hash** (`generate\_password\_hash` / `check\_password\_hash`).
* Dois papéis: `usuario` e `admin`. Usuário comum **não** acessa rotas nem páginas administrativas (bloquear no backend, não só esconder no frontend).
* O primeiro admin é criado pelo `seed.py` usando `ADMIN\_EMAIL` e `ADMIN\_SENHA` do `.env` (nunca senha fixa no código).

### Perfil de acesso (definido pelo admin)

Cada usuário tem um campo `perfil\_acesso` com os valores: `nao\_definido` (padrão), `mulher`, `homem`.

* **Somente o admin** pode alterar esse campo (tela de administração de usuários).
* `perfil\_acesso = mulher` → libera a área **Proteção E.L.O.** (e quiz, contatos de confiança, "Preciso de Ajuda").
* `perfil\_acesso = homem` → segue apenas a parte de casa inteligente. A experiência específica para homens **ainda será definida**: criar apenas uma página com `\[FUNCIONALIDADE A SER DEFINIDA — PERFIL HOMEM]`.
* `nao\_definido` → apenas casa inteligente.
* A verificação deve existir **no backend** (decorator `@acesso\_mulher\_required`) e no frontend (esconder o menu).
* **Nesta versão, priorizar a experiência do perfil mulher.**

> Importante: o gênero é usado \*\*somente\*\* para liberar acesso à área de proteção. As \*\*Tags nunca\*\* usam gênero para identificação.

\---

## 7\. FUNCIONALIDADES (Prioridade 1 — implementar agora)

Use **dados de demonstração** (seed) em tudo que ainda não tiver conteúdo real.

### 7.1 Dashboard

Após o login: saudação, nº de dispositivos, dispositivos ativos, nº de cômodos, automações, status geral da casa, atalhos.

### 7.2 Minha Casa / Cômodos

CRUD de cômodos (ex.: Sala, Quarto, Cozinha, Banheiro). Dentro de cada cômodo, listar seus dispositivos.

### 7.3 Dispositivos

CRUD + alterar estado. Tipos: luz, ar-condicionado, TV, tomada inteligente, cortina, persiana, janela, sensor, câmera. Tudo **simulado**: clicar em "Desligar" chama a API, que atualiza o estado no banco, e a tela é atualizada.

### 7.4 Portas

Somente **consulta**: aberta/fechada e trancada/destrancada. **Não** implementar trancar/destrancar.

### 7.5 Automações

Campos: nome, descrição, gatilho, horário (opcional), ações, dispositivos envolvidos, ativo/inativo. Botão "Executar (simulação)" que aplica as ações nos dispositivos simulados. Exemplo no seed: **Modo Noite** (apagar luzes, fechar cortinas, ajustar ar, verificar portas e janelas).

### 7.6 Minhas Tags (aba própria e visível no menu)

Tags são atalhos físicos tipo NFC. CRUD + ativar/desativar. Campos: nome, função, cômodo/recurso associado, status.
Simular a leitura com um campo/botão "Simular leitura da Tag":
`Tag identificada → sistema busca a configuração → usuário é redirecionado para a função`.
Exemplos no seed: Sala (abrir ambiente Sala), Proteção (abrir Proteção E.L.O. — só funciona para perfil mulher), Emergência (abrir fluxo de emergência).

### 7.7 Proteção E.L.O. (somente perfil mulher)

Área de orientação e prevenção. **Não assumir que a pessoa é vítima** só por acessar. Estrutura para: informações, orientações, FAQ, quiz, contatos de confiança, configurações de emergência, botão "PRECISO DE AJUDA". **Conteúdo vindo de `docs/conteudo/pesquisa\_elo.md`** (ver seção 7.13); placeholder só no que o doc não cobre.

### 7.8 Quiz (somente perfil mulher)

Educativo, **sem diagnóstico de violência**. Estrutura: pergunta, alternativas, resposta, resultado, explicação. Perguntas guardadas no banco. **Conteúdo: as 6 perguntas da seção 8 de `pesquisa\_elo.md`**, conforme a seção 5.2. **Não salvar as respostas da usuária no banco** (só mostrar o resultado na tela) — o doc pede não guardar histórico de quiz sem necessidade.

### 7.9 Contatos de Confiança (somente perfil mulher)

CRUD: nome, telefone, relação. Dados fictícios no seed. Antes do primeiro cadastro, mostrar um aviso de consentimento explicando para que os dados servem e que podem ser excluídos a qualquer momento (cuidado de privacidade do doc, seção 11).

### 7.10 PRECISO DE AJUDA (somente perfil mulher)

Botão destacado que abre a área de emergência: selecionar ações configuradas, ver contatos, **simular** envio de alerta e **simular** compartilhamento de localização. Mensagens como `\[SIMULAÇÃO] Alerta enviado para contato configurado.` Sem ligações, SMS ou integração com serviços oficiais.

### 7.13 Conteúdo do doc `pesquisa\_elo.md` — onde usar

|Seção do doc|Onde entra no sistema|
|-|-|
|5. Área "Proteção ELO" (sinais de alerta, como buscar ajuda, rede de apoio, plano de segurança, apoio a terceiros)|Páginas de informações/orientações da Proteção E.L.O.|
|6. Tipos de violência (física, psicológica, sexual, patrimonial, moral, vicária) + nota editorial|Página "Tipos de violência" dentro da Proteção E.L.O.|
|7. FAQ sugerido (8 perguntas)|Página FAQ|
|8. Quiz educativo (6 perguntas)|Quiz (seção 7.8)|
|9. Contatos e recursos de emergência|Página de contatos úteis + área "Preciso de Ajuda" (apenas exibir; **sem ligar/enviar nada**)|
|11. Cuidados editoriais (aviso de que o conteúdo não substitui emergência/atendimento)|**Aviso visível** no rodapé de todas as páginas da Proteção E.L.O.|
|3 e 4. Casa inteligente e segurança digital|Pode ser usado em textos de ajuda das páginas de dispositivos (opcional)|
|10. Ideias extras — **botão de saída rápida**|**Implementar agora** (seção 7.14)|
|10. Demais ideias extras (modo discreto, mapa, glossário etc.)|**Não implementar agora** — listar no README como funcionalidades futuras|
|1, 2, 12, 13|Não exibir no sistema; a seção 12 (fontes) vai no README|

* Copiar os textos **como estão no doc**, sem reescrever o sentido e sem acrescentar informação.
* Guardar os textos em arquivos simples (ex.: `backend/app/content/\*.json`) ou no banco via `seed.py`, para a equipe conseguir editar depois sem mexer no código.
* Nos contatos de emergência, manter o alerta do doc: **conferir canais oficiais antes de publicar**.

### 7.14 Botão de SAÍDA RÁPIDA (somente perfil mulher)

Botão para sair rapidamente da área sensível caso alguém se aproxime.

* Botão **fixo e sempre visível** (ex.: canto superior direito) em **todas as páginas da Proteção E.L.O.**, FAQ, quiz, contatos de confiança e "Preciso de Ajuda". Texto curto, ex.: **"Sair rápido"**.
* Atalho de teclado: apertar **Esc** duas vezes seguidas também aciona a saída.
* Ao acionar, em JavaScript puro (arquivo próprio, ex.: `js/saida\_rapida.js`):

  1. chamar `/api/auth/logout` com `navigator.sendBeacon` (encerra a sessão sem esperar resposta);
  2. redirecionar com `window.location.replace(...)` (assim o botão "Voltar" não retorna para a página sensível);
  3. destino: uma página **neutra externa**, configurável em um único lugar (ex.: constante `URL\_SAIDA\_RAPIDA` em `saida\_rapida.js`, valor padrão um site de previsão do tempo).
* Explicar a **limitação** (texto do doc, seção 10) em uma frase discreta perto do botão ou na página de informações: *a saída rápida leva a uma página neutra, mas não apaga o histórico do navegador nem garante que a atividade não seja vista.*
* Comentar bem o código: por que `replace` e não `href`, por que `sendBeacon`.
* Incluir no `FLUXO\_NAVEGACAO.md` e na seção **Conexões definidas por mim** se o Figma não tiver o botão.

### 7.11 Meu Perfil

Nome, e-mail, telefone, configurações, preferências, privacidade. (O usuário **não** altera o próprio `perfil\_acesso`.)

### 7.12 Administração

Área separada para gerenciar: usuários (incluindo `perfil\_acesso`), dispositivos, cômodos, Tags e informações gerais.

**Regra de privacidade:** o admin **não** pode ver alertas de emergência, contatos de confiança nem respostas do quiz dos usuários. Não criar rota nem tela que exponha isso.

\---

## 8\. API (prefixo `/api`)

Ajuste se necessário, mas mantenha REST simples e retorne JSON:

```
POST   /api/auth/register      POST /api/auth/login      POST /api/auth/logout    GET /api/auth/me
GET    /api/dashboard
GET|POST        /api/rooms           PUT|DELETE /api/rooms/<id>
GET|POST        /api/devices         PUT|DELETE /api/devices/<id>    PATCH /api/devices/<id>/toggle
GET             /api/doors
GET|POST        /api/automations     PUT|DELETE /api/automations/<id>  POST /api/automations/<id>/run
GET|POST        /api/tags            PUT|DELETE /api/tags/<id>         POST /api/tags/scan
GET             /api/protection                     (mulher)
GET             /api/quiz  POST /api/quiz/answer    (mulher)
GET|POST        /api/trusted-contacts  PUT|DELETE /api/trusted-contacts/<id>   (mulher)
POST            /api/emergency                      (mulher)
GET|PUT         /api/profile
GET             /api/admin/users     PUT /api/admin/users/<id>/perfil-acesso   (admin)
```

Respostas de erro padronizadas: `{"erro": "mensagem"}` com status HTTP correto (400, 401, 403, 404).

\---

## 9\. BANCO DE DADOS

Tabelas mínimas em `schema.sql`: usuarios, comodos, dispositivos, portas, automacoes, automacao\_dispositivos, tags, contatos\_confianca, quiz\_perguntas, quiz\_alternativas, alertas\_emergencia, configuracoes\_protecao.
Cada dado pertence a um usuário (`usuario\_id`) — um usuário nunca vê dados de outro.
Comandos: `python -m app.database.seed` (ou equivalente) cria o banco e popula dados de demonstração.

\---

## 10\. FRONTEND

* Funcional, limpo, responsivo, simples.
* Telas que existem no Figma: seguir o visual do Figma. Telas que não existem: layout simples e consistente.
* Um `api.js` central com função `chamarApi(metodo, url, dados)` usando `fetch` + `credentials: "same-origin"`.
* Menu lateral/superior com: Dashboard, Minha Casa, Dispositivos, Automações, **Minhas Tags**, Proteção E.L.O. (só mulher), Perfil, Admin (só admin), Sair.

\---

## 11\. CONTEÚDO NÃO DEFINIDO

**Não inventar**: textos institucionais, estatísticas, informações jurídicas, números de telefone oficiais, informações médicas, serviços públicos, textos legais, fontes.
Usar placeholders: `\[ADICIONAR TEXTO AQUI]`, `\[ADICIONAR CONTEÚDO DO FAQ AQUI]`, `\[ADICIONAR PERGUNTA DO QUIZ AQUI]`, `\[ADICIONAR TEXTO DA ÁREA DE PROTEÇÃO AQUI]`, `\[FUNCIONALIDADE A SER DEFINIDA]`.
Exceção: **o conteúdo de `docs/conteudo/pesquisa\_elo.md` (inclusive telefones e contatos da seção 9) deve ser usado**, pois foi pesquisado pela equipe. Textos já definidos no Figma também podem ser usados (seção 5). Fora isso, nada de inventar.

\---

## 12\. EXTRAS (Prioridade 3 — só documentar)

* **ELO Hub**: smart display (tela, microfone, alto-falante, indicador luminoso, assistente, conexão com a plataforma). Apenas descrever no README como futuro.
* **Assistente de voz**: exemplos "ELO, acenda a luz da sala", "ELO, ative o modo noite". Não implementar reconhecimento de voz; documentar como futuro.

\---

## 13\. TESTES (pytest)

Poucos testes, simples e comentados:

* cadastro e login funcionam; senha errada retorna 401;
* rota protegida sem login retorna 401;
* usuário comum em rota admin retorna 403;
* usuário sem `perfil\_acesso = mulher` em `/api/protection` retorna 403;
* alterar estado de dispositivo funciona;
* simular leitura de Tag retorna o destino certo;
* admin não tem rota para ver alertas de emergência.

Usar banco SQLite temporário nos testes.

\---

## 14\. README.md (técnico, em português)

Conteúdo:

1. O que é o E.L.O.
2. Tecnologias utilizadas
3. **Diagrama de arquitetura** (em Mermaid e também em texto), mostrando:
`Navegador (HTML/CSS/JS) → fetch → Flask (Blueprints → Services) → sqlite3 → SQLite`, e onde ficam sessão e permissões.
4. Estrutura de pastas (com uma linha explicando cada uma)
5. Como instalar (venv, `pip install -r requirements.txt`)
6. Como configurar o `.env`
7. Como criar o banco e rodar o seed
8. Como iniciar o backend e acessar o frontend
9. Como rodar os testes
10. Usuários de demonstração (e-mails fictícios; senha vem do `.env`)
11. Funcionalidades futuras (Figma, perfil homem, ELO Hub, voz)

Outras seções serão definidas depois pela equipe — deixar o README fácil de estender.

\---

## 15\. GIT

Criar `.gitignore` (venv, `\_\_pycache\_\_`, `.env`, `\*.db`, `.pytest\_cache`), `README.md` e `.env.example`.
Não incluir senhas, tokens, chaves, credenciais ou dados pessoais reais.
O projeto será publicado no **GitHub pela própria estudante, manualmente**. Por isso:

* **NÃO** executar nenhum comando git: nada de `git init`, `git add`, `git commit`, `git push`, `git remote`, criar branch ou repositório.
* **NÃO** usar `gh` nem qualquer integração com GitHub.
* Apenas deixar o projeto **pronto para ser versionado** (`.gitignore` correto, sem segredos, sem `\*.db`, sem `venv`).
* No resumo final, liste **sem executar** os comandos que a estudante vai rodar depois para subir o projeto (`git init`, `git add .`, `git commit -m "..."`, `git remote add origin <URL>`, `git push -u origin main`), com uma linha explicando cada um.

\---

## 16\. ORDEM DE EXECUÇÃO

Execute nesta ordem e, **ao final de cada etapa, mostre um resumo curto** do que foi criado e como aquela parte funciona (para a estudante ir entendendo parte por parte):

1. Buscar o Figma pelo link, salvar as telas em pastas em `docs/figma/` e gerar `INDICE\_FIGMA.md` e `docs/ANALISE\_FIGMA.md`, e definir o fluxo de navegação em `FLUXO\_NAVEGACAO.md`
2. Estrutura de pastas + `requirements.txt` + `.env.example` + `.gitignore`
3. Banco (`schema.sql`, `db.py`, `seed.py`)
4. Autenticação, sessão e decorators de permissão
5. Rotas e services de casa inteligente (cômodos, dispositivos, portas, automações, Tags)
6. Rotas de proteção (proteção, quiz, contatos, emergência) com `@acesso\_mulher\_required`
7. Perfil e Administração
8. Frontend (seguindo a análise do Figma e o fluxo de navegação)
9. Testes
10. README técnico
11. Rodar os testes e confirmar que o app sobe sem erro

Ao final, entregue:

* lista do que foi implementado;
* lista do que ficou com placeholder;
* resumo do `ANALISE\_FIGMA.md` (faltando / descartado / divergências);
* comandos para rodar o projeto.
* comandos git para a estudante subir no GitHub manualmente (apenas listar, não executar).

\---

## 17\. REGRA FINAL

* Não terminar o projeto inteiro agora: é a **base**.
* Não criar funcionalidades não pedidas.
* Não inventar conteúdo.
* Não criar complexidade desnecessária.
* Não depender de ELO Hub nem de assistente de voz.

**Prioridade absoluta: base funcional, simples, organizada, explicável e fácil de evoluir.**

