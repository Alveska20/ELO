# PROMPT — E.L.O. — Versão 2 (atualização)

> Cole/rode este prompt no Claude Code dentro de `C:\\projetos\\elo`.
> \*\*Antes de rodar:\*\* confira se o MCP do Figma está conectado (`/mcp`) e se o `docs/conteudo/pesquisa\_elo.md` está na versão mais recente do grupo.

\---

## 0\. CONTEXTO

A **versão 1** do E.L.O. já existe e funciona nesta pasta (backend Flask + SQLite, frontend HTML/CSS/JS puro, testes com pytest).
Esta é uma **atualização**, não um projeto novo.

Antes de qualquer coisa, leia:

* `PROMPT\_ELO\_v1.md` — **todas as regras da v1 continuam valendo** (tecnologias, explicabilidade, comentários em português, não inventar conteúdo, privacidade, saída rápida, nenhum comando git etc.);
* `README.md`, `docs/ANALISE\_FIGMA.md`, `docs/figma/INDICE\_FIGMA.md`, `docs/figma/FLUXO\_NAVEGACAO.md` e `docs/PENDENCIAS.md`.

Regras desta atualização:

* **Alterar só o necessário.** Não reescrever arquivos que não precisam mudar.
* Manter o mesmo estilo de código, os mesmos nomes e a mesma organização da v1.
* Tudo o que já funciona deve continuar funcionando (os testes atuais devem continuar passando).

**Link do Figma (o mesmo da v1):** https://www.figma.com/design/tJhASE0koXyumjI0qnKkBV/ExpoTech?node-id=0-1\&t=qu5JGrd4jURUcCXe-1

\---

## 1\. RESSINCRONIZAR O FIGMA (fazer primeiro)

1. Liste de novo todas as páginas/frames do Figma (MCP: `get\_metadata`).
2. Compare com o `INDICE\_FIGMA.md` pelo **ID do frame** e classifique cada um:

   * **novo** (não está no índice) — ex.: telas do perfil homem;
   * **alterado** (mesmo ID, mas textos/visual diferentes);
   * **removido** (está no índice, mas não existe mais no Figma);
   * **sem mudança**.
3. Baixe em PNG só os **novos** e **alterados**, nas pastas da v1 (`01-inicial/`, `02-usuario/`, `03-protecao/`, `04-quiz/`, `05-admin/`, `06-perfil-homem/`, `99-outros/`), seguindo o mesmo padrão de nomes.
4. Atualize o `INDICE\_FIGMA.md`.

\---

## 2\. ANÁLISE DA ATUALIZAÇÃO — e PARAR

Acrescente ao `docs/ANALISE\_FIGMA.md` uma seção **"Atualização v2"** com:

* telas novas, alteradas e removidas;
* para cada uma, a regra da v1 aplicada (implementar / avisar / descartar / divergência);
* itens do `PENDENCIAS.md` que o Figma novo resolve;
* o que a parte do **perfil homem** precisa (telas, dados, rotas) e o que **não tem conteúdo definido** (nem no Figma, nem no doc).

**Depois disso, PARE.** Mostre um resumo curto e espere a aprovação da estudante antes de alterar qualquer código.

\---

## 3\. PERFIL HOMEM

Implementar a área do perfil homem conforme as telas do Figma, com estas regras:

**Acesso**

* Só para `perfil\_acesso = homem`.
* Criar o decorator `@acesso\_homem\_required` (mesmo padrão do `@acesso\_mulher\_required`) e usar em todas as rotas novas.
* Frontend: a área aparece no menu/Dashboard **só** para o perfil homem (substituindo o card "Meu espaço" e a página de placeholder, se o Figma indicar).
* O perfil homem **continua sem acesso** à Proteção E.L.O. e a qualquer dado da área da mulher. O perfil mulher, o não definido e o admin **não** acessam a área do homem.

**Conteúdo**

* Visual: seguir o Figma.
* Textos de títulos, botões e chamadas: podem vir do Figma.
* Qualquer texto sobre **violência, leis, números de telefone, serviços ou orientações** só pode vir do `pesquisa\_elo.md`. Se o Figma tiver esse tipo de texto e ele **não** estiver no doc, use placeholder `\[ADICIONAR TEXTO AQUI — validar com o doc]` e liste em `PENDENCIAS.md`.
* Não inventar conteúdo.

**Funcionalidades**

* Se uma tela do homem precisar de algo que já existe (ex.: quiz, FAQ), **reaproveitar** a estrutura da v1 (ex.: um quiz separado em `content/quiz\_homem.json`), sem misturar com os dados da área da mulher.
* Se uma tela exigir funcionalidade nova sem regra definida, criar só a estrutura com `\[FUNCIONALIDADE A SER DEFINIDA]` e listar em `PENDENCIAS.md`.
* Se precisar de tabela nova no banco, criar no `schema.sql` **e** garantir que o banco existente possa ser atualizado sem apagar os dados (explicar como no README).

\---

## 4\. OUTRAS ATUALIZAÇÕES DO FIGMA

Para as telas **alteradas** ou **novas** que não são do perfil homem (ex.: login, cadastro, admin, se já tiverem sido desenhadas):

* atualizar só o **visual** (HTML/CSS) para seguir o Figma;
* não mudar regras de negócio nem rotas;
* telas **removidas** do Figma não são apagadas do sistema: apenas registre na análise.

\---

## 5\. CONTEÚDO DO DOC

Se o `pesquisa\_elo.md` tiver mudado desde a v1 (ex.: novas perguntas do quiz na seção 8, explicações, textos dos cards):

* atualizar `content/quiz.json` e `content/protecao.json` a partir do doc;
* o doc continua sendo a **fonte oficial** do conteúdo;
* atualizar o quiz no banco com `python -m app.database.recarregar\_quiz` (sem apagar os outros dados).

\---

## 6\. TESTES

* Rodar **todos** os testes da v1: devem continuar passando.
* Novos testes:

  * perfil homem acessa as rotas da área do homem (200);
  * mulher, não definido, admin e sem login são bloqueados (403 / 401);
  * perfil homem continua bloqueado na Proteção E.L.O. (403);
  * nenhuma rota de admin mostra dados da área do homem que sejam pessoais (mesma regra de privacidade da v1).

\---

## 7\. DOCUMENTAÇÃO

Atualizar:

* `docs/figma/FLUXO\_NAVEGACAO.md` (telas e conexões novas);
* `docs/PENDENCIAS.md` (marcar `\[x]` o que foi resolvido e acrescentar o que surgiu);
* `README.md` (perfil homem, novas rotas, como atualizar o banco se houver tabela nova, tabela de testes).

\---

## 8\. ORDEM DE EXECUÇÃO

Ao final de **cada** etapa, mostre um resumo curto (para a estudante ir entendendo parte por parte):

1. Ressincronizar o Figma (seção 1)
2. Análise da atualização — **parar e esperar aprovação** (seção 2)
3. Backend do perfil homem (decorator, rotas, services, banco se precisar)
4. Frontend do perfil homem
5. Outras atualizações visuais do Figma (seção 4)
6. Conteúdo do doc (seção 5)
7. Testes (seção 6)
8. Documentação (seção 7)
9. Rodar todos os testes e conferir se o sistema sobe sem erro

Ao final, entregue:

* o que mudou nesta versão (arquivos novos e alterados);
* o que ficou com placeholder;
* comandos para rodar o projeto.

**Não executar nenhum comando git.** A estudante vai subir no GitHub manualmente depois.

