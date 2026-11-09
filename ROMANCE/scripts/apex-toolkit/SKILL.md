---
name: apex-toolkit
description: Orquestra o toolkit de scripts Node/SQLcl de um projeto APEXLANG (.apx) para validar, exportar e importar aplicações Oracle APEX, importar uma página, e aplicar fixes (EOL/CRLF, htmlDomId, relatórios de IG com ORA-20987). Use quando o dev falar em exportar/importar app ou página do APEX, validar o projeto APEXLANG, "subir a página X", "exportar o app", "importar pro ambiente Y", conexão salva do SQLcl, erro de import (ORA-20987, REFERENCE_NOT_FOUND, token recognition error, htmlDomId inválido, APEXlang version not supported), ou rodar os comandos npm/node do scripts/ do projeto. NÃO é para escrever a gramática APEXLANG (isso é a skill apexlang) — é para o fluxo de trabalho de export/import/validate/fix.
---

# APEX Toolkit (APEXLANG / SQLcl)

Esta skill **dirige os scripts Node de um projeto APEXLANG**, que por baixo orquestram o
**SQLcl** (modo `-thin`, conexão salva) para validar, exportar e importar aplicações
Oracle APEX no formato nativo `.apx`, além de aplicar correções que destravam o import.

**Não** reescreve nem embute os scripts: ela roda o `scripts/` **que já existe na pasta
do cliente** onde o dev está trabalhando. Estrutura (um `scripts/` + `package.json` por
cliente, servindo todos os apps dele):

```
FAVORITA/              <- raiz do cliente (rode os comandos aqui)
  package.json
  scripts/
  2000/                <- app 2000 (nome da pasta = id do app)
  20010/               <- app 20010
```

**Todo comando recebe o app como 1º argumento** (`<app>` = id = nome da pasta), ex.:
`node scripts/apex-import-page.mjs 2000 3`.

## 0. Descoberta: estou num projeto APEXLANG?

Antes de qualquer comando, confirme o contexto a partir do diretório de trabalho atual:

- Existe `scripts/apex-export.mjs` (e irmãos `apex-import*.mjs`, `apex-validate.mjs`)?
- Existe `package.json` com os npm scripts `export`/`import`/`validate`?
- Quais pastas numéricas (apps) existem ao lado de `scripts/`? Cada uma pode ter
  `deployments/default.json` (traz o `app.id` e o `workspace`) e `.apex/apexlang.json`.

Se o dev estiver dentro de uma pasta de app (ex.: `FAVORITA/2000`), suba um nível para a
**pasta que contém `scripts/`** e passe o app (`2000`) como 1º argumento. Se o dev não
disser o app e houver mais de um, pergunte. Se não houver nada disso, não é um projeto
deste toolkit — avise o dev em vez de inventar comandos.

Leia sempre o **`scripts/README.md` do projeto** quando tiver dúvida sobre um flag: ele é a
fonte de verdade e pode estar mais novo que esta skill.

## 1. Regras de segurança (leia antes de executar)

1. **Comandos que alteram o banco** exigem confirmação explícita do dev antes de rodar,
   dizendo **qual app e qual ambiente (alias)**. São eles: `import`, `import-page`,
   `import-page-commit`, `fix-ig-reports` (sem `-check`) e `fix-htmldomid` (sem `-check`).
   `validate`, `export`, `fix-eol`, e qualquer `-check` **não** alteram o banco.
2. **Ambiente certo.** O alias da conexão define o banco de destino. Antes de um import,
   confira qual alias será usado (ver §3). Importar em produção por engano é o maior risco.
   Se o dev não disse o ambiente, pergunte — não assuma.
3. **Dry-run primeiro.** Para os fixes, rode com `-check` e mostre o que seria alterado
   antes de aplicar.
4. **Confie no código de saída.** Os scripts falham alto (exit ≠ 0) em `ORA-/SP2-/PLS-`,
   versão incompatível do compilador, `REFERENCE_NOT_FOUND` e opções inválidas. Nunca
   reporte sucesso sem o comando ter saído com 0. Em erro, mostre o trecho relevante do log.
5. **A regra do `--`.** Via `npm run`, os parâmetros vão **depois de `--`**. Sem o `--`, o
   npm ignora o argumento. Chamando por `node scripts/...` direto, passe os args normalmente.

## 2. Os comandos

Rode via `npm run <script> -- <args>` **ou** `node scripts/<arquivo>.mjs <args>` (equivalentes).
Prefira `node scripts/...` para evitar a pegadinha do `--`.

| Comando | Script | Altera o banco? | O que faz |
| --- | --- | --- | --- |
| `validate` | `apex-validate.mjs` | Não | Valida se o projeto APEXLANG compila. |
| `export` | `apex-export.mjs` | Não | Exporta o app (APEXLANG) para a pasta do projeto. |
| `import` | `apex-import.mjs` | ⚠️ Sim | Importa o **app inteiro**. |
| `import-page` | `apex-import-page.mjs` | ⚠️ Sim | Importa **uma página**. |
| `import-page-commit` | `apex-import-page-commit.mjs` | ⚠️ Sim | Importa uma página + `git commit` obrigatório. |
| `fix-ig-reports` | `apex-fix-ig-reports.mjs` | ⚠️ Sim (`-check` não) | Resolve `ORA-20987` (múltiplos primary saved reports de IG). |
| `fix-htmldomid` | `apex-fix-htmldomid.mjs` | Não (edita `.apx`) | Sanitiza `htmlDomId` inválido (espaço/acento) nos `.apx`. |
| `fix-eol` | `apex-fix-eol.mjs` | Não (edita `.apx`) | Normaliza `.apx` para LF (remove CRLF que quebra o lexer). |

### export — `apex-export.mjs <app> [flags]`
`<app>` é o único obrigatório. Exporta para `<cliente>/<app>/` (flatten), sobrescrevendo;
cria a pasta se não existir (é assim que se adiciona um app novo ao cliente).
- `-alias <nome>` ambiente (ver §3) · `-exptype <tipo>` (padrão `APEXLANG`) ·
  `-dir <pasta>` outro destino · `-noclean` mantém o export anterior (pode gerar `_1`, `_2`).
- Antes de rodar no Windows, peça pra **fechar o Explorer/VS Code** na pasta, senão a
  limpeza falha com "Device or resource busy".

### validate — `apex-validate.mjs <app> [flags]`
- `-input <pasta|.zip|.apx>` (padrão: a pasta do app) · `-deployment <arquivo>`
  (padrão `<app>/deployments/default.json`) · `-nodeployment` · `-alias <nome>`.

### import — `apex-import.mjs <app> [flags]` ⚠️
- Destino = o próprio `<app>`; `-id <outro>` importa a pasta em outro id · `-input` ·
  `-deployment` · `-nodeployment` · `-alias`.

### import-page — `apex-import-page.mjs <app> <página> [flags]` ⚠️
- `<página>` obrigatório: número (`3`) ou arquivo (`p00003.apx`). Destino = `<app>`
  (`-id` sobrescreve). Também `-deployment`/`-nodeployment`/`-alias`.
- Por baixo: `apex import -input <pasta do app> -files <página>`. O `-input` aponta para a
  **pasta do app** (para o compilador enxergar `@/standard`, `@/text` etc.) e `-files`
  seleciona só o `.apx` da página. Importar o arquivo isolado dá `REFERENCE_NOT_FOUND`.

### import-page-commit — `apex-import-page-commit.mjs <app> <página> [flags]` ⚠️
- Igual ao `import-page`, mas commita após o import dar certo (`git add` só da pasta do
  app). `-m "<msg>"` evita o prompt; `-nocommit` só importa. Requer a pasta do app dentro
  de um repo git (ou use `-nocommit`).

### fix-ig-reports — `apex-fix-ig-reports.mjs <app> [flags]` ⚠️ (`-check` não altera)
Resolve `ORA-20987: ... must not have more than one "primary" saved report`. Varre o app,
purga sessões APEX expiradas donas de reports `SESSION` e apaga reports `PRIVATE` órfãos.
Nunca toca em `PRIMARY`/`ALTERNATIVE`.
- `-check` dry-run · `-page <n>` · `-force-active` (⚠️ purga também sessões ativas,
  desloga usuários) · `-alias`.
- **Fluxo:** `-check` → aplicar sem `-check` → `import-page`.

### fix-htmldomid / fix-eol — `[<app>] [flags]`
Pré-import, quando o `validate` acusa `htmlDomId` inválido ou `token recognition error at '\r\n'`.
- Sem `<app>`, varrem **todos** os apps do cliente; com `<app>`, só ele.
- Ambos aceitam `-check` (dry-run) e `-dir <pasta>`. `fix-htmldomid` faz backup antes de gravar.

## 3. Conexão e ambiente (alias)

Os scripts usam uma **conexão salva do SQLcl** (`sql -name <alias>`, modo thin, senha
guardada). O **alias** escolhe o banco. Precedência (o 1º que existir vence):

1. `-alias <nome>` na linha de comando;
2. variável de ambiente `APEX_DB_ALIAS`;
3. `defaultAlias` em `scripts/connection.config.json`.

Para saber o ambiente atual, leia `scripts/connection.config.json` (campo `defaultAlias`) e
o `<app>/deployments/default.json` (`app.id`, `workspace.name`). Para trocar o ambiente padrão,
edite só o `defaultAlias` com o nome de uma conexão **já salva** no SQLcl — não há senha no
repo. Para um comando pontual em outro ambiente, use `-alias <nome>`.

Listar conexões salvas: `sql -thin /nolog` → `connmgr list` → `exit`.

### Criar a conexão (1ª vez por máquina)
Guie o dev — isto é interativo e **não** deve ser rodado por você sem o dev digitar a senha:
```sh
sql -thin /nolog
SQL> connect -save <ALIAS> -savepwd <user>@<host>:1521/<service>
SQL> connmgr list
SQL> exit
```
Use sempre `-thin` (sem ele o SQLcl tenta thick/OCI e falha com `no ocijdbc23 in java.library.path`).
Se o `connect` falhar, a conexão **não** é salva e `sql -name <alias>` depois diz "Unknown connection".

## 4. Fluxos típicos

- **Subir uma página:** `validate` → (se acusar) `fix-eol`/`fix-htmldomid` → confirmar
  app+alias → `import-page <app> <n>` (ou `import-page-commit <app> <n> -m "..."` se quiser versionar).
- **Import travado com ORA-20987:** `fix-ig-reports -check` → revisar → `fix-ig-reports` →
  `import-page <app> <n>`.
- **Puxar o estado do banco para o repo:** `export <app>` (feche VS Code/Explorer na pasta antes).
- **Promover o app inteiro para outro ambiente:** confirmar alias/id → `import <app> -alias <AMBIENTE>`.

## 5. Solução de problemas

| Sintoma | Causa / correção |
| --- | --- |
| `Unknown connection <alias>` | Conexão não foi salva (connect falhou). Refaça a 1ª vez (§3). |
| `no ocijdbc23 in java.library.path` | SQLcl em modo thick. Os scripts já forçam `-thin`; se aparecer, cheque o SQLcl. |
| `ORA-01017: invalid username/password` | Senha errada ao criar a conexão. Refaça `connect -save`. |
| `APEXlang version ... is not supported by this SQLcl version` | apexlang-compiler do SQLcl mais antigo que o APEX do banco. Atualize o SQLcl (`winget upgrade --id Oracle.SQLcl`). |
| `REFERENCE_NOT_FOUND: @/...` | Página importada isolada. Use `import-page` (que faz `-input <projeto> -files <página>`), não `apex import` cru no `.apx`. |
| `token recognition error at: '\r\n'` | `.apx` em CRLF. Rode `fix-eol`. |
| `htmlDomId ... can not contain whitespace...` | `htmlDomId` com espaço/acento. Rode `fix-htmldomid`. |
| `ORA-20987 ... more than one "primary" saved report` | Reports de IG travando o import. Rode `fix-ig-reports` (§2). |
| Export gerou `application_1.apx` | Rodou com `-noclean` ou pasta estava aberta/travada. Feche a pasta e re-exporte sem `-noclean`. |
