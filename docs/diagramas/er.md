# Diagrama ER (entidade-relacionamento) — E.L.O.

Mostra as **tabelas** do banco SQLite e como elas se ligam. É o mesmo conteúdo de `backend/app/database/schema.sql`, em forma de desenho.

Como ler as ligações:
- `||--o{` = "um para muitos": **um** usuário tem **zero ou muitos** cômodos;
- `|o--o{` = o lado de cá pode ficar vazio (ex.: um dispositivo pode estar sem cômodo);
- `||--o|` = "um para zero ou um": cada usuária tem no máximo uma linha de configurações de proteção.

```mermaid
erDiagram
    usuarios ||--o{ comodos : "tem"
    usuarios ||--o{ dispositivos : "tem"
    usuarios ||--o{ portas : "tem"
    usuarios ||--o{ automacoes : "tem"
    usuarios ||--o{ tags : "tem"
    usuarios ||--o{ contatos_confianca : "cadastra (mulher)"
    usuarios ||--o| configuracoes_protecao : "configura (mulher)"
    usuarios ||--o{ alertas_emergencia : "simula (mulher)"

    comodos |o--o{ dispositivos : "fica em"
    comodos |o--o{ portas : "fica em"
    comodos |o--o{ tags : "abre"

    automacoes ||--o{ automacao_dispositivos : "tem ações"
    dispositivos ||--o{ automacao_dispositivos : "recebe ação"

    quiz_perguntas ||--|{ quiz_alternativas : "tem 3"

    usuarios {
        INTEGER id PK
        TEXT nome
        TEXT email UK
        TEXT senha_hash "só o hash, nunca a senha"
        TEXT telefone
        TEXT papel "usuario | admin"
        TEXT perfil_acesso "nao_definido | mulher | homem"
        TEXT criado_em
    }
    comodos {
        INTEGER id PK
        INTEGER usuario_id FK
        TEXT nome
    }
    dispositivos {
        INTEGER id PK
        INTEGER usuario_id FK
        INTEGER comodo_id FK "pode ser NULL"
        TEXT nome
        TEXT tipo "luz, tv, camera..."
        TEXT estado "ligado | desligado | aberta | fechada"
        INTEGER temperatura
    }
    portas {
        INTEGER id PK
        INTEGER usuario_id FK
        INTEGER comodo_id FK
        TEXT nome
        INTEGER aberta "0 ou 1"
        INTEGER trancada "0 ou 1"
    }
    automacoes {
        INTEGER id PK
        INTEGER usuario_id FK
        TEXT nome
        TEXT descricao
        TEXT gatilho "manual | horario"
        TEXT horario
        INTEGER verificar_portas
        INTEGER ativo
    }
    automacao_dispositivos {
        INTEGER id PK
        INTEGER automacao_id FK
        INTEGER dispositivo_id FK
        TEXT novo_estado
        INTEGER temperatura
    }
    tags {
        INTEGER id PK
        INTEGER usuario_id FK
        TEXT nome
        TEXT codigo "único por usuário"
        TEXT funcao "abrir_dashboard | abrir_comodo | abrir_protecao | abrir_emergencia"
        INTEGER comodo_id FK
        INTEGER ativo
    }
    quiz_perguntas {
        INTEGER id PK
        INTEGER ordem UK
        TEXT texto
        TEXT explicacao
        INTEGER ativo
    }
    quiz_alternativas {
        INTEGER id PK
        INTEGER pergunta_id FK
        TEXT letra "A, B ou C"
        TEXT texto
        INTEGER correta "0 ou 1"
    }
    contatos_confianca {
        INTEGER id PK
        INTEGER usuario_id FK
        TEXT nome
        TEXT telefone
        TEXT relacao
    }
    configuracoes_protecao {
        INTEGER usuario_id PK, FK
        INTEGER consentimento_contatos
        TEXT consentimento_em
        INTEGER acao_alertar_contatos
        INTEGER acao_compartilhar_localizacao
    }
    alertas_emergencia {
        INTEGER id PK
        INTEGER usuario_id FK
        TEXT tipo "alerta_contatos | compartilhar_localizacao"
        TEXT criado_em
    }
```

## Pontos para explicar na apresentação

- **Cada dado tem dono:** quase toda tabela tem `usuario_id`. As consultas sempre filtram por ele (`WHERE usuario_id = ?`), então um usuário nunca vê os dados de outro.
- **Apagar em cascata:** `ON DELETE CASCADE` apaga os cômodos, dispositivos etc. quando o usuário é apagado. `ON DELETE SET NULL` deixa o dispositivo "sem cômodo" quando o cômodo é apagado, em vez de apagar o dispositivo.
- **O quiz não tem `usuario_id`:** as perguntas são iguais para todas, e **as respostas não são salvas** (doc, seção 11).
- **O visual escuro não tem tabela própria:** perfil homem, perfil não definido e admin usam as mesmas tabelas da casa. A diferença está só no `perfil_acesso` (e no `papel`) e no visual.
- **Não existe tabela de log:** o middleware só imprime no terminal; nada de requisição é guardado no banco.
