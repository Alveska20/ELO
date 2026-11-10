# Índice das telas do Figma — E.L.O.

Arquivo do Figma: https://www.figma.com/design/tJhASE0koXyumjI0qnKkBV/ExpoTech
(o arquivo foi renomeado de "Sem título" para "ExpoTech"; a chave é a mesma. Página única "Page 1"; para abrir um frame, troque o `node-id` no link — ex.: `?node-id=36-23`)

Os PNGs desta pasta foram exportados do Figma em 2026-11-07. O visual roxo do sistema segue as imagens aprovadas em `docs/proposta/`, que partem destes frames.

Legenda:
- **hifi** = alta fidelidade (visual final, com cores).
- **lofi** = baixa fidelidade (rascunho de layout).
- **-rascunho** = primeiro rascunho do mesmo lofi (sem o cabeçalho do site). A referência é o arquivo sem `-rascunho`.
- **-roxo** = login/cadastro desenhados no estilo roxo (frames `68:*`). **Não são usados**: a equipe decidiu usar o login/cadastro **escuros** (frames `75:*`) para todos os perfis.

Pastas criadas só quando há conteúdo. **Ainda não existe** no Figma: administração (`05-admin`).
A série escura "Sua casa mais inteligente" (frames `75:*`) é a referência do **visual escuro** (perfil homem, perfil não definido e admin) e fica em `06-perfil-homem/`.

## 01-inicial — login, cadastro e recuperação de senha

Login e cadastro **escuros** = referência para **todos os perfis** (são neutros). Recuperar senha: não implementado (fora dos requisitos do projeto).

| Arquivo | Frame no Figma | ID do frame |
|-|-|-|
| `01-inicial/01-login-hifi.png` | Login — Alta fidelidade (estilo escuro) | `75:962` |
| `01-inicial/01-login-lofi.png` | Login — Baixa fidelidade (estilo escuro) | `75:1982` |
| `01-inicial/01-login-roxo-hifi.png` | lofi_Inicio (login, estilo roxo, com cores) | `68:234` |
| `01-inicial/01-login-roxo-lofi.png` | lofi_Inicio (login, estilo roxo, rascunho cinza) | `68:101` |
| `01-inicial/02-cadastro-hifi.png` | Cadastro — Alta fidelidade (estilo escuro) | `75:996` |
| `01-inicial/02-cadastro-lofi.png` | Cadastro — Baixa fidelidade (estilo escuro) | `75:2002` |
| `01-inicial/02-cadastro-roxo-hifi.png` | lofi_Inicio (cadastro, estilo roxo, com cores) | `68:216` |
| `01-inicial/02-cadastro-roxo-lofi.png` | lofi_Inicio (cadastro, estilo roxo, rascunho cinza) | `68:195` |
| `01-inicial/03-recuperar-senha-hifi.png` | Recuperar senha — Alta fidelidade | `75:1035` |
| `01-inicial/03-recuperar-senha-lofi.png` | Recuperar senha — Baixa fidelidade | `75:2027` |

> Os quatro frames `68:*` se chamam "lofi_Inicio" no Figma (mesmo nome do `1:2` da Proteção); foram identificados pelo conteúdo (LOGIN / CADASTRO).

## 02-usuario — casa inteligente (perfis mulher e não definido)

| Arquivo | Frame no Figma | ID do frame |
|-|-|-|
| `02-usuario/01-casa-inicio-lofi.png` | Lofi_smartinicio | `47:602` |
| `02-usuario/01-casa-inicio-lofi-rascunho.png` | Lofi_smartinicio (rascunho) | `43:167` |
| `02-usuario/02-cameras-lofi.png` | Lofi_Cameras | `49:757` |
| `02-usuario/02-cameras-lofi-rascunho.png` | Lofi_cameras (rascunho) | `43:272` |
| `02-usuario/03-aparelhos-lofi.png` | Lofi_Aparelhos | `49:878` |
| `02-usuario/03-aparelhos-lofi-rascunho.png` | Lofi_aparelhos (rascunho) | `44:392` |
| `02-usuario/04-avisos-lofi.png` | Lofi_Avisos | `49:1091` |
| `02-usuario/04-avisos-lofi-rascunho.png` | Lofi_avisos (rascunho) | `45:469` |
| `02-usuario/05-tags-lofi.png` | Lofi_Tags | `49:1276` |
| `02-usuario/05-tags-lofi-rascunho.png` | Lofi_tags (rascunho) | `45:526` |

## 03-protecao — Proteção E.L.O. (perfil mulher)

| Arquivo | Frame no Figma | ID do frame |
|-|-|-|
| `03-protecao/01-protecao-inicio-hifi.png` | HFI_inicio | `36:23` |
| `03-protecao/01-protecao-inicio-lofi.png` | lofi_Inicio | `1:2` |
| `03-protecao/02-situacoes-violencia-hifi.png` | HFI_Situaçoes_violencia | `36:97` |
| `03-protecao/02-situacoes-violencia-lofi.png` | Lofi_Situaçoes_violencia | `4:6` |
| `03-protecao/03-perguntas-frequentes-hifi.png` | HFI_Perguntas | `42:93` |
| `03-protecao/04-contatos-confianca-hifi.png` | HFI_Contato | `37:466` |
| `03-protecao/04-contatos-confianca-lofi.png` | Lofi_contato | `18:219` |
| `03-protecao/05-preciso-de-ajuda-hifi.png` | HFI_Ajuda | `37:565` |
| `03-protecao/05-preciso-de-ajuda-lofi.png` | Lofi_Ajuda | `18:11` |

## 04-quiz — perguntas do site

| Arquivo | Frame no Figma | ID do frame |
|-|-|-|
| `04-quiz/01-quiz-hifi.png` | HFI_Quiz | `37:208` |
| `04-quiz/01-quiz-lofi.png` | Lofi_quiz | `18:124` |
| `04-quiz/perguntas.md` | textos do quiz que estão no Figma | `37:208` |

## 06-perfil-homem — casa inteligente do perfil homem (estilo escuro, menu lateral)

No sistema: Ambientes = cômodos, Detalhe do ambiente = página do cômodo, Configurações = Meu Perfil.

| Arquivo | Frame no Figma | ID do frame |
|-|-|-|
| `06-perfil-homem/01-inicio-hifi.png` | HF · 01 Início | `75:142` |
| `06-perfil-homem/01-inicio-lofi.png` | Desktop - 8 | `75:1064` |
| `06-perfil-homem/02-minha-casa-hifi.png` | HF · 02 Minha casa | `75:301` |
| `06-perfil-homem/02-minha-casa-lofi.png` | Desktop - 2 | `75:1187` |
| `06-perfil-homem/03-ambientes-hifi.png` | HF · 03 Ambientes | `75:423` |
| `06-perfil-homem/03-ambientes-lofi.png` | Desktop - 3 | `75:1324` |
| `06-perfil-homem/04-ambiente-detalhe-hifi.png` | Frame 3 (detalhe do ambiente "Sala") | `75:1598` |
| `06-perfil-homem/04-ambiente-detalhe-lofi.png` | Frame 2 (detalhe do ambiente, rascunho) | `75:1516` |
| `06-perfil-homem/05-dispositivos-hifi.png` | HF · 04 Dispositivos | `75:581` |
| `06-perfil-homem/05-dispositivos-lofi.png` | Desktop - 4 | `75:1613` |
| `06-perfil-homem/06-automacoes-hifi.png` | HF · 05 Automações | `75:771` |
| `06-perfil-homem/06-automacoes-lofi.png` | Desktop - 5 | `75:1801` |
| `06-perfil-homem/07-configuracoes-hifi.png` | HF · 06 Configurações | `75:866` |
| `06-perfil-homem/07-configuracoes-lofi.png` | Desktop - 7 | `75:1889` |

> Os frames "Desktop - N" e "Frame 2/3" não têm nome descritivo no Figma; o par hifi/lofi foi identificado pelos textos de cada tela.

## 99-outros

| Arquivo | Frame no Figma | ID do frame |
|-|-|-|
| `99-outros/01-fale-conosco-hifi.png` | HFI_Fale_conosco | `37:342` |
| `99-outros/01-fale-conosco-lofi.png` | Lofi_fale_conosco | `19:305` |
| `99-outros/02-moodboard.png` | MoodBoard (paleta e referências) | `50:1416` |
| `99-outros/03-guia-tipografia.png` | Desktop - 1 (guia de tipografia) | `50:1440` |

Total: 49 telas em PNG.
