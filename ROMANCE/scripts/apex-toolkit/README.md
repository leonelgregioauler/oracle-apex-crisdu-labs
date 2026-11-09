# Skill: apex-toolkit

Skill do Claude Code que dirige o toolkit de scripts Node/SQLcl de um projeto
**APEXLANG** (`.apx`): validar, exportar e importar aplicações Oracle APEX,
importar uma página e aplicar fixes que destravam o import.

Ela **não embute os scripts** — orquestra o `scripts/` que já existe na pasta do cliente (ex.: `FAVORITA/`),
compartilhado por todos os apps dele (`FAVORITA/2000`, `FAVORITA/20010`…). Funciona em qualquer pasta de cliente
desse toolkit.

## Instalação (uma vez por máquina)

1. Copie a pasta `apex-toolkit` para `~/.claude/skills/apex-toolkit/`
   (Windows: `C:\Users\<voce>\.claude\skills\apex-toolkit\`).
   Para atualizar, substitua a pasta inteira pela nova.
2. Abra o Claude Code na pasta do cliente (a que contém `scripts/` e as pastas dos apps).
3. A conexão com o banco é por máquina, via **conexão salva do SQLcl** (modo thin).
   Siga o passo "Criar a conexão (1ª vez)" na `SKILL.md` / no `scripts/README.md`
   do projeto. A senha fica guardada no SQLcl, nunca no repositório.

## Como usar

Fale naturalmente com o Claude. Exemplos de gatilho:

- "valida o projeto"
- "exporta o app 2650"
- "sobe a página 3" / "importa a página 5 em homologação"
- "o import travou com ORA-20987" / "deu REFERENCE_NOT_FOUND"
- "qual ambiente está configurado?"

O Claude confirma **app + ambiente (alias)** antes de qualquer comando que altere o
banco e roda os fixes em `-check` (dry-run) antes de aplicar.

## Pré-requisitos

- SQLcl instalado, com `apexlang-compiler` ≥ versão do APEX do banco.
- Node.js (para os `scripts/*.mjs`).
- Uma conexão salva no SQLcl (ver `SKILL.md`), e o `scripts/connection.config.json`
  do projeto apontando para o alias certo.

> A fonte de verdade de cada comando é o `scripts/README.md` **do projeto**; a skill
> segue ele. Se um projeto tiver flags novos, o README do projeto manda.
