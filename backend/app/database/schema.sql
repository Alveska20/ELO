-- =====================================================================
-- E.L.O. — tabelas do banco SQLite
--
-- Este arquivo é executado pelo seed.py. Ele APAGA as tabelas antigas
-- e cria tudo de novo, por isso rodar o seed reinicia o banco.
--
-- Padrões usados em todas as tabelas:
-- - id INTEGER PRIMARY KEY AUTOINCREMENT: número único criado pelo banco.
-- - usuario_id: dono do dado. Toda consulta filtra por ele, assim
--   um usuário nunca vê os dados de outro.
-- - Campos "sim/não" são INTEGER com 0 (não) ou 1 (sim), porque o
--   SQLite não tem um tipo booleano próprio.
-- - ON DELETE CASCADE: ao apagar o "pai", os "filhos" são apagados
--   juntos (ex.: apagar um usuário apaga os cômodos dele).
-- - CHECK (...): o banco recusa valores fora da lista permitida.
-- =====================================================================

-- A ordem dos DROP é a inversa da criação: primeiro as tabelas
-- que dependem de outras.
DROP TABLE IF EXISTS alertas_emergencia;
DROP TABLE IF EXISTS configuracoes_protecao;
DROP TABLE IF EXISTS contatos_confianca;
DROP TABLE IF EXISTS quiz_alternativas;
DROP TABLE IF EXISTS quiz_perguntas;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS automacao_dispositivos;
DROP TABLE IF EXISTS automacoes;
DROP TABLE IF EXISTS portas;
DROP TABLE IF EXISTS dispositivos;
DROP TABLE IF EXISTS comodos;
DROP TABLE IF EXISTS usuarios;


-- ---------------------------------------------------------------------
-- Usuários
-- papel: 'usuario' ou 'admin' (quem pode entrar na Administração).
-- perfil_acesso: escolhido no cadastro ("Como você se identifica?") e
--   alterado só pela própria pessoa, em Configurações. 'mulher' libera a Proteção E.L.O.
--   O papel NUNCA vem do cadastro: todo cadastro é 'usuario'.
-- A senha NUNCA é salva: guardamos só o hash (senha embaralhada).
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nome          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    senha_hash    TEXT    NOT NULL,
    telefone      TEXT,
    papel         TEXT    NOT NULL DEFAULT 'usuario'
                  CHECK (papel IN ('usuario', 'admin')),
    perfil_acesso TEXT    NOT NULL DEFAULT 'nao_definido'
                  CHECK (perfil_acesso IN ('nao_definido', 'mulher', 'homem')),
    criado_em     TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ---------------------------------------------------------------------
-- Casa inteligente
-- ---------------------------------------------------------------------

-- Cômodos: Sala, Quarto, Cozinha...
CREATE TABLE comodos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome       TEXT    NOT NULL
);

-- Dispositivos simulados.
-- estado: 'ligado'/'desligado' para luz, ar, TV, tomada, sensor e câmera;
--         'aberta'/'fechada' para cortina, persiana e janela.
-- temperatura: só usada pelo ar-condicionado (fica NULL nos outros).
-- comodo_id pode ser NULL: se o cômodo for apagado, o dispositivo fica
-- "sem cômodo" em vez de sumir (ON DELETE SET NULL).
CREATE TABLE dispositivos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    comodo_id   INTEGER REFERENCES comodos(id) ON DELETE SET NULL,
    nome        TEXT    NOT NULL,
    tipo        TEXT    NOT NULL
                CHECK (tipo IN ('luz', 'ar_condicionado', 'tv', 'tomada',
                                'cortina', 'persiana', 'janela', 'sensor', 'camera')),
    estado      TEXT    NOT NULL
                CHECK (estado IN ('ligado', 'desligado', 'aberta', 'fechada')),
    temperatura INTEGER
);

-- Portas: somente consulta (o sistema não tranca nem destranca).
CREATE TABLE portas (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    comodo_id  INTEGER REFERENCES comodos(id) ON DELETE SET NULL,
    nome       TEXT    NOT NULL,
    aberta     INTEGER NOT NULL DEFAULT 0 CHECK (aberta IN (0, 1)),
    trancada   INTEGER NOT NULL DEFAULT 1 CHECK (trancada IN (0, 1))
);

-- Automações (ex.: Modo Noite).
-- gatilho: 'manual' (só pelo botão) ou 'horario' (usa o campo horario, "HH:MM").
-- verificar_portas: 1 = ao executar, informa portas abertas/destrancadas
-- e janelas abertas.
CREATE TABLE automacoes (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id       INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome             TEXT    NOT NULL,
    descricao        TEXT,
    gatilho          TEXT    NOT NULL DEFAULT 'manual'
                     CHECK (gatilho IN ('manual', 'horario')),
    horario          TEXT,
    verificar_portas INTEGER NOT NULL DEFAULT 0 CHECK (verificar_portas IN (0, 1)),
    ativo            INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
);

-- Ações de cada automação: "este dispositivo deve ficar neste estado".
-- Uma automação tem várias linhas aqui (uma por dispositivo envolvido).
CREATE TABLE automacao_dispositivos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    automacao_id   INTEGER NOT NULL REFERENCES automacoes(id) ON DELETE CASCADE,
    dispositivo_id INTEGER NOT NULL REFERENCES dispositivos(id) ON DELETE CASCADE,
    novo_estado    TEXT    NOT NULL
                   CHECK (novo_estado IN ('ligado', 'desligado', 'aberta', 'fechada')),
    temperatura    INTEGER
);

-- Tags (atalhos físicos tipo NFC, simulados).
-- codigo: o que a Tag "transmite" ao ser lida. Único por usuário.
-- funcao: para onde a leitura leva:
--   'abrir_dashboard', 'abrir_comodo' (usa comodo_id),
--   'abrir_protecao' e 'abrir_emergencia' (só perfil mulher).
-- As Tags NUNCA usam gênero para identificar ninguém.
CREATE TABLE tags (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome       TEXT    NOT NULL,
    codigo     TEXT    NOT NULL,
    funcao     TEXT    NOT NULL
               CHECK (funcao IN ('abrir_dashboard', 'abrir_comodo',
                                 'abrir_protecao', 'abrir_emergencia')),
    comodo_id  INTEGER REFERENCES comodos(id) ON DELETE SET NULL,
    ativo      INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
    UNIQUE (usuario_id, codigo)
);


-- ---------------------------------------------------------------------
-- Proteção E.L.O. (somente perfil mulher)
-- O admin NÃO tem rota para ler estas tabelas (regra de privacidade).
-- ---------------------------------------------------------------------

-- Perguntas do quiz. Só as que têm ativo = 1 aparecem e são contadas.
-- ordem: posição da pergunta no quiz (1, 2, 3...).
CREATE TABLE quiz_perguntas (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ordem      INTEGER NOT NULL UNIQUE,
    texto      TEXT    NOT NULL,
    explicacao TEXT    NOT NULL,
    ativo      INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
);

-- Alternativas de cada pergunta (A, B, C...). correta = 1 marca a certa.
-- As respostas da usuária NÃO são salvas em lugar nenhum.
CREATE TABLE quiz_alternativas (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    pergunta_id INTEGER NOT NULL REFERENCES quiz_perguntas(id) ON DELETE CASCADE,
    letra       TEXT    NOT NULL,
    texto       TEXT    NOT NULL,
    correta     INTEGER NOT NULL DEFAULT 0 CHECK (correta IN (0, 1))
);

-- Contatos de confiança: só nome, telefone e relação (o mínimo necessário).
CREATE TABLE contatos_confianca (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome       TEXT    NOT NULL,
    telefone   TEXT    NOT NULL,
    relacao    TEXT
);

-- Configurações de emergência: uma linha por usuária.
-- consentimento_contatos: 1 depois que ela aceita o aviso de privacidade
-- mostrado antes do primeiro contato de confiança.
-- As duas "acao_" dizem o que o botão PRECISO DE AJUDA simula.
CREATE TABLE configuracoes_protecao (
    usuario_id                    INTEGER PRIMARY KEY
                                  REFERENCES usuarios(id) ON DELETE CASCADE,
    consentimento_contatos        INTEGER NOT NULL DEFAULT 0
                                  CHECK (consentimento_contatos IN (0, 1)),
    consentimento_em              TEXT,
    acao_alertar_contatos         INTEGER NOT NULL DEFAULT 1
                                  CHECK (acao_alertar_contatos IN (0, 1)),
    acao_compartilhar_localizacao INTEGER NOT NULL DEFAULT 0
                                  CHECK (acao_compartilhar_localizacao IN (0, 1))
);

-- Registro das simulações de alerta. Guarda só o tipo e a hora:
-- nenhuma localização, mensagem ou relato (cuidado do doc, seção 11).
CREATE TABLE alertas_emergencia (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo       TEXT    NOT NULL
               CHECK (tipo IN ('alerta_contatos', 'compartilhar_localizacao')),
    criado_em  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
