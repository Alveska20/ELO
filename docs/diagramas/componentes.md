# Diagrama de componentes — E.L.O.

Mostra as **peças grandes** do sistema e quem conversa com quem.
Para abrir o desenho: GitHub e VS Code (com extensão de Mermaid) mostram o diagrama direto; ou cole o bloco em https://mermaid.live.

```mermaid
flowchart LR
    subgraph NAV[Navegador]
        HTML[Páginas HTML<br/>frontend/index.html e pages/*.html]
        CSS[CSS<br/>roxo: base · componentes · paginas<br/>escuro: escuro.css · tema-escuro.css login]
        JS[JavaScript<br/>api.js · layout.js · um JS por página<br/>saida_rapida.js]
    end

    subgraph FLASK[Backend Flask — backend/app]
        MW[Middleware<br/>middleware.py<br/>tempo + cabeçalhos de segurança]
        DEC[Decorators<br/>utils/decorators.py<br/>login · admin · mulher · área escura]
        BP[Blueprints = rotas<br/>routes/*.py]
        SV[Services = regras<br/>services/*.py]
        DBPY[db.py<br/>abre e fecha a conexão sqlite3]
        CONT[content/*.json<br/>protecao · quiz · homem]
        SES[(Sessão do Flask<br/>cookie assinado com SECRET_KEY)]
    end

    BANCO[(SQLite<br/>instance/elo.db)]
    NEUTRA((Site neutro externo<br/>saída rápida))

    HTML --> CSS
    HTML --> JS
    JS -- "fetch() + JSON<br/>/api/..." --> MW
    MW --> DEC
    DEC -- "lê usuario_id" --> SES
    DEC -- "permitido" --> BP
    DEC -. "401 / 403" .-> JS
    BP --> SV
    SV --> DBPY
    SV --> CONT
    DBPY -- "SQL escrito à mão" --> BANCO
    FLASK -- "entrega os arquivos do frontend<br/>(mesma origem, sem CORS)" --> NAV
    JS -- "sendBeacon(logout) +<br/>location.replace" --> NEUTRA
```

## Em texto

```
Navegador (HTML + CSS + JS)
   │  fetch("/api/...")  — envia e recebe JSON
   ▼
Flask
   ├─ middleware.py      → roda em TODA requisição (mede o tempo, põe cabeçalhos de segurança)
   ├─ decorators         → conferem login e permissão rota por rota (401 / 403)
   ├─ routes/ (Blueprints) → recebem a requisição e devolvem a resposta
   ├─ services/          → regras de negócio (validar, calcular, simular)
   ├─ content/*.json     → textos que a equipe edita (Proteção, quiz, visual escuro)
   └─ database/db.py     → conexão sqlite3
         ▼
      SQLite (instance/elo.db)
```

| Componente | Pasta / arquivo | Responsabilidade |
|-|-|-|
| Páginas | `frontend/index.html`, `frontend/pages/` (roxo) e `frontend/pages/escuro/` (visual escuro: homem, não definido e admin) | Estrutura de cada tela |
| Estilo | `frontend/css/` | Visual roxo (`base.css`, `componentes.css`, `paginas.css`); `escuro.css` (telas escuras); `tema-escuro.css` (login e cadastro) |
| Scripts | `frontend/js/` | Chamam a API, montam menu/cabeçalho (`layout.js`) e desenham os dados |
| Middleware | `backend/app/middleware.py` | Registro no terminal + cabeçalhos de segurança, em todas as requisições |
| Decorators | `backend/app/utils/decorators.py` | Quem pode acessar cada rota |
| Rotas | `backend/app/routes/` | Uma por assunto (auth, rooms, devices, tags, protection, men_area...) |
| Services | `backend/app/services/` | Regras de negócio, SQL e simulações |
| Conteúdo | `backend/app/content/` | Textos do doc da equipe e do Figma |
| Banco | `backend/app/database/` + `instance/elo.db` | Tabelas (`schema.sql`), conexão (`db.py`), dados de demonstração (`seed.py`) |
