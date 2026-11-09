# CLI de automação APEXLANG / SQLcl

## O que é

Uma **CLI de automação** (toolkit de scripts Node.js) que orquestra o **SQLcl** para
automatizar o ciclo de desenvolvimento de aplicações **Oracle APEX** no formato nativo
**APEXLANG** (`.apx`): validar, exportar, importar o app inteiro ou uma página, e
opcionalmente registrar no git.

Não é um *framework* — é uma **ferramenta de linha de comando**: você roda os comandos
(`npm run ...` ou `node scripts/...`) e eles executam, por baixo, os comandos `apex`
do SQLcl numa conexão salva. Cada script é um comando; `lib/` concentra o código
compartilhado.

**Características:**

- **Um único `scripts/` + `package.json` por cliente**, servindo todos os apps dele
  (cada app numa pasta com o id como nome — ver *Estrutura de pastas*).
- **Conexão salva** (`sql -name <alias>`) em **modo thin** (JDBC puro), sem depender
  do Oracle Instant Client nativo.
- **Sobe o SQLcl pela JVM diretamente** (java + classpath + flags oficiais),
  contornando o launcher `sql.exe` que crasha no SQLcl 26.3.
- **Detecção de erros robusta**: falha alto em `ORA-/SP2-/PLS-`, versão incompatível
  do apexlang-compiler, `REFERENCE_NOT_FOUND` e opções inválidas — sem "sucesso falso".
- **Convenções e padrões embutidos**: alias padrão, `<app>/deployments/default.json`,
  resolução automática da pasta do app e do workspace.

**Arquitetura:**

- `scripts/*.mjs` — um comando por arquivo (validate, export, import, import-page…).
- `scripts/lib/*.mjs` — núcleo compartilhado: `sqlcl.mjs` (runner do SQLcl + detecção
  de erros), `apexlang.mjs` (pastas de app, deployment, páginas), `workspace.mjs`,
  `git.mjs` (git + prompt).
- `package.json` (na raiz do cliente) — atalhos `npm run` para cada comando.

---

## Estrutura de pastas

```
FAVORITA/                  <- raiz do cliente: rode os comandos AQUI
  package.json             <- npm scripts (um só para todos os apps)
  scripts/                 <- este toolkit (um só para todos os apps)
    connection.config.json <- conexão padrão do cliente
  2000/                    <- app 2000: application.apx, pages/, shared-components/, deployments/...
  20010/                   <- app 20010
```

- O **nome da pasta do app é o id da aplicação** no APEX.
- Todos os comandos recebem o **app como 1º argumento** (ou `-app <id>`) e operam
  dentro de `FAVORITA/<app>/`.
- O `export` cria a pasta do app se ela ainda não existir — para incluir um app novo
  no cliente basta `npm run export -- <id>`.
- Os caminhos são calculados a partir da localização de `scripts/`, então funciona
  de qualquer diretório de execução.

---

## Executando via npm

Todos os scripts têm um atalho no `package.json`. A regra de ouro: **os parâmetros
vão depois de `--`**. Sem o `--`, o npm não repassa o argumento.

```sh
npm run import-page -- 2000 3   # ✅ vira: node scripts/apex-import-page.mjs 2000 3
npm run import-page 2000 3      # ❌ os argumentos são ignorados
```

| npm script             | Equivalente                              | Altera o banco? |
| ---------------------- | ---------------------------------------- | --------------- |
| `npm run validate`     | `node scripts/apex-validate.mjs`         | Não             |
| `npm run fix-eol`      | `node scripts/apex-fix-eol.mjs`          | Não (edita `.apx`) |
| `npm run fix-htmldomid` | `node scripts/apex-fix-htmldomid.mjs`   | Não (edita `.apx`) |
| `npm run fix-ig-reports` | `node scripts/apex-fix-ig-reports.mjs` | ⚠️ Sim (`-check` = Não) |
| `npm run export`       | `node scripts/apex-export.mjs`           | Não             |
| `npm run import`       | `node scripts/apex-import.mjs`           | ⚠️ Sim          |
| `npm run import-page`  | `node scripts/apex-import-page.mjs`      | ⚠️ Sim          |
| `npm run import-page-commit` | `node scripts/apex-import-page-commit.mjs` | ⚠️ Sim    |
| `npm run help`         | `node scripts/help.mjs`                  | Não             |

Exemplos com parâmetros:

```sh
npm run validate -- 2000                            # valida o app 2000
npm run validate -- 2000 -nodeployment              # ignora 2000/deployments/default.json

npm run export -- 2000                              # export APEXLANG do app 2000 -> FAVORITA/2000/
npm run export -- 2000 -exptype READABLE_YAML       # outro tipo

npm run import -- 2000                              # importa FAVORITA/2000 no app 2000
npm run import -- 2000 -alias PROD_OCI              # outro ambiente
npm run import -- 2000 -id 3000                     # importa a pasta 2000 em OUTRO id

npm run import-page -- 2000 3                       # importa a página 3 do app 2000
npm run import-page -- 2000 p00002.apx              # pelo nome do arquivo

npm run import-page-commit -- 2000 3                # importa a página 3 e pede o commit
npm run import-page-commit -- 2000 3 -m "corrige filtro" # commit sem prompt
npm run import-page-commit -- 2000 3 -nocommit      # só importa, sem commitar

npm run fix-eol -- -check                           # verifica CRLF em TODOS os apps
npm run fix-htmldomid -- 2000 -check                # dry-run só no app 2000
npm run fix-ig-reports -- 2000 -check               # dry-run dos relatórios de IG do app 2000
```

As seções abaixo detalham cada comando (os mesmos argumentos valem chamando por
`node scripts/...` diretamente ou via `npm run ... --`).

---

## 1ª vez — criar a conexão salva

Só precisa fazer isto **uma vez por máquina**. A conexão fica guardada no SQLcl e é
reaproveitada depois (inclusive a senha, via `-savepwd`).

> **Importante:** use `-thin` ao abrir o SQLcl. Sem isso ele pode tentar o modo
> *thick/OCI* e falhar com `no ocijdbc23 in java.library.path` (precisaria do
> Instant Client nativo na versão certa).

```sh
# 1) Abra o SQLcl em modo thin, sem conectar
sql -thin /nolog

# 2) Conecte e salve com um nome (ex.: DEV_OCI_LEONELG). A senha será pedida e guardada.
SQL> connect -save DEV_OCI_LEONELG -savepwd roman@dbcrisdu.crisdulabs.com.br:1521/hml.snprodcrisdupri.vcnprdcrisdu.oraclevcn.com
#    (digite a senha quando solicitado)

# 3) Confirme que a conexão foi salva e sai
SQL> connmgr list
SQL> exit
```

Se o `connect` falhar (senha errada, driver thick, rede), **a conexão não é salva** —
por isso `sql -name <alias>` depois diz "Unknown connection". Corrija o erro e repita.

Depois de criada, teste:

```sh
node scripts/apex-export.mjs 2000
```

### Definir qual conexão é a padrão

O **nome** da conexão padrão (não a senha!) fica centralizado em um único arquivo
por cliente: [`scripts/connection.config.json`](connection.config.json) — vale para
todos os apps do cliente.

```json
{
  "defaultAlias": "DEV_OCI_LEONELG"
}
```

Para apontar todos os scripts para outra conexão (ex.: outro ambiente ou sistema),
basta editar o `defaultAlias` com o nome de uma conexão **já salva** no SQLcl — sem
tocar em nenhum código. A senha e os dados de conexão continuam guardados no SQLcl;
aqui vai só o apelido (alias).

Precedência (o 1º que existir vence):

1. `-alias <nome>` na linha de comando;
2. variável de ambiente `APEX_DB_ALIAS`;
3. `defaultAlias` de `scripts/connection.config.json`.

### Workspace (conectar com um usuário que não é o schema do workspace)

Se a conexão é do seu usuário pessoal (ex.: `LEONELG` com `APEX_ADMINISTRATOR_ROLE`)
e não do parsing schema do workspace dono do app (ex.: `FAVORITA`), o APEX não sabe
em qual workspace operar: o export dá `ORA-20987: Security Group ID (your workspace
identity) is invalid` e o validate/import dizem "Vários espaços de trabalho disponíveis".

Todos os scripts (`export`, `validate`, `import`, `import-page`, `import-page-commit`,
`fix-ig-reports`) resolvem isso sozinhos via `lib/workspace.mjs`: descobrem o workspace
pelo id do app, rodam `apex_util.set_workspace` na sessão e passam `-workspace <NOME>`
ao `apex validate`/`apex import`. É só contexto de sessão — não altera o banco nem
associa schema. Precedência:

1. `-workspace <NOME>` na linha de comando;
2. variável de ambiente `APEX_WORKSPACE`;
3. automático pelo id do app (`apex_applications`).

`-noworkspace` desliga. Se o app ainda não existe no destino (1º import num ambiente
novo), o modo automático não acha o workspace: passe `-workspace <NOME>`.

---

## Demais vezes — conexão já existe

Com a conexão salva, é só rodar o script passando **o id da aplicação**. O alias
(`defaultAlias`) e o tipo (`APEXLANG`) já são padrão embutido.

```sh
# Export APEXLANG do app 2000 -> FAVORITA/2000/
node scripts/apex-export.mjs 2000
```

Sobrescreva algo só quando precisar:

```sh
node scripts/apex-export.mjs 2000 -exptype READABLE_YAML     # outro tipo
node scripts/apex-export.mjs 2000 -alias PROD_OCI            # outro ambiente
node scripts/apex-export.mjs 2000 -dir "C:\\caminho\\destino" # outro diretório
node scripts/apex-export.mjs 2000 -noclean                   # mantém export antigo
```

### Onde o export é gerado

O destino é a **pasta do app ao lado de `scripts/`**, com o id como nome
(`FAVORITA/2000/`). Os arquivos ficam **direto nessa pasta** (`application.apx`,
`pages/`, `shared-components/`, etc.). Se a pasta não existir, é criada.

Como o `apex export` sempre cria uma subpasta com o nome do alias da aplicação,
o script exporta primeiro para uma pasta temporária (`<app>/.apex-export-tmp`) e
depois **move o conteúdo para cima** (flatten), removendo a temporária no fim.

### Export "por cima" (padrão)

O `apex export` **nunca sobrescreve**: se o destino já existe, ele cria arquivos
duplicados com sufixo `_1`, `_2`, `_3`... O script evita isso de duas formas:

1. **Exporta sempre numa pasta temporária vazia** (`.apex-export-tmp`) — como o
   destino do `apex` está vazio, ele nunca gera `_N`. Os arquivos são movidos
   (flatten) para o destino final, sobrescrevendo os atuais.
2. **Limpa artefatos antigos do destino antes** (a não ser com `-noclean`), para
   remover componentes que foram **apagados** na aplicação e não viriam no novo
   export.

> **Por que isso é necessário (comprovado):** rodando o `apex export` do SQLcl
> por linha de comando **duas vezes no mesmo diretório** (APEX 26.2), a 2ª
> execução gera `application_1.apx` ao lado do `application.apx` — ele **não**
> sobrescreve. A extensão "APEX Export" do SQL Developer parece sobrescrever
> porque ela gerencia a pasta de destino por conta própria antes de gravar; o
> comando cru `apex export` não faz isso. O script apenas replica, por fora, o
> que a extensão faz por dentro.

`-noclean` mantém no destino os artefatos que já estavam lá (os atuais ainda são
sobrescritos; só os componentes apagados é que não são removidos).

A remoção é **seletiva e segura**: só apaga os artefatos do APEX na pasta do app —
os `.apx` da raiz (`application.apx`, `page-groups.apx`) e as pastas `.apex`,
`pages`, `shared-components`, `workspace-components` (`deployments` é preservada,
pois é editada à mão). Tudo o mais é preservado: `backup/`, logs, `*.md`, etc. Os
outros apps do cliente e o `scripts/` nunca são tocados.

- Use `-noclean` para manter o comportamento acumulativo.
- No Windows, **feche o Explorer/VS Code** que estiver com a pasta aberta antes
  de rodar — senão a remoção falha ("Device or resource busy") e os duplicados
  voltam a aparecer. O script avisa quando isso acontece.

Conferir conexões salvas a qualquer momento:

```sh
sql -thin /nolog
SQL> connmgr list
SQL> exit
```

---

## Argumento comum: o app

| Argumento        | Descrição                                                                  |
| ---------------- | -------------------------------------------------------------------------- |
| `<app>` (1ª posição) / `-app <id>` | Id da aplicação = nome da pasta em `FAVORITA/` (ex.: `2000`). |

Se o app não for informado ou a pasta não existir, o script lista os apps
disponíveis e sai com código 2. Exceções: `export` e `fix-ig-reports` não exigem que
a pasta exista; `fix-eol` e `fix-htmldomid` tratam o app como opcional (sem ele,
varrem todos os apps).

---

## Comando: `apex-export.mjs`

Automatiza `apex export -applicationid <id> -dir <dir> -exptype <tipo>`.

Uso: `node scripts/apex-export.mjs <app> [flags]` — o **app é o único obrigatório**.

| Argumento / Flag  | Padrão                      | Descrição                               |
| ----------------- | --------------------------- | --------------------------------------- |
| `<app>` (posição) | — (obrigatório)             | ID da aplicação APEX (e nome da pasta)  |
| `-alias`          | `$APEX_DB_ALIAS` ou `defaultAlias` | Conexão salva do SQLcl           |
| `-dir`            | `FAVORITA/<app>/`           | Destino (arquivos ficam direto nele)    |
| `-exptype`        | `APEXLANG`                  | Tipo de export                          |
| `-noclean`        | (desligado)                 | Não remove o export anterior            |

---

## Comando: `apex-validate.mjs`

Automatiza `apex validate -input <pasta> [-deployment <arquivo>]`. **Não altera
nada no banco** — só verifica se o projeto APEXLANG compila. Erros de compilação
são impressos e o script sai com código ≠ 0.

```sh
node scripts/apex-validate.mjs 2000                    # valida FAVORITA/2000
node scripts/apex-validate.mjs 2000 -nodeployment      # ignora deployments/default.json
node scripts/apex-validate.mjs 2000 -input "C:\\outra" # valida outra pasta/zip/.apx
```

| Argumento / Flag | Padrão                              | Descrição                         |
| ---------------- | ----------------------------------- | --------------------------------- |
| `<app>` (posição) | — (obrigatório)                    | App (pasta e id para o workspace) |
| `-input`         | `FAVORITA/<app>/`                   | Pasta, `.zip` ou `.apx` a validar |
| `-deployment`    | `<app>/deployments/default.json` (se existir) | Arquivo de deployment   |
| `-nodeployment`  | (desligado)                         | Não usa nenhum deployment         |
| `-alias`         | `$APEX_DB_ALIAS` ou `defaultAlias`  | Conexão salva do SQLcl            |

---

## Comando: `apex-fix-eol.mjs` / `apex-fix-htmldomid.mjs` (editam `.apx`, não o banco)

Pré-import, quando o `validate` acusa `token recognition error at '\r\n'` (CRLF) ou
`htmlDomId` inválido (espaço/acento).

```sh
node scripts/apex-fix-eol.mjs -check            # verifica TODOS os apps do cliente
node scripts/apex-fix-eol.mjs 2000              # converte só o app 2000
node scripts/apex-fix-htmldomid.mjs 2000 -check # dry-run no app 2000
node scripts/apex-fix-htmldomid.mjs             # aplica em todos os apps (com backup)
```

| Argumento / Flag | Padrão              | Descrição                                       |
| ---------------- | ------------------- | ----------------------------------------------- |
| `<app>` (posição) | (todos os apps)    | Limita a um app                                  |
| `-check`         | (desligado)         | Dry-run: só lista; não grava                     |
| `-dir <pasta>`   | —                   | Outra raiz                                       |

O `fix-htmldomid` grava backup em `<app>/backup/htmldomid-fix-<ts>/` (`-ts <rótulo>`
define o `<ts>`; padrão `manual`).

Regra de "inválido" do `fix-htmldomid` = a do compilador: espaço, vírgula, aspas
simples/duplas ou `: / + ? ^`. **Hífen e acento são válidos e nunca são alterados**
(IDs como `acoes-702` costumam ser usados em CSS/JS). Os inválidos são sanitizados:
sem acento, espaço → `_`, demais caracteres fora de `[A-Za-z0-9_-]` removidos.

---

## Comando: `apex-fix-ig-reports.mjs` ⚠️ altera o banco (`-check` não altera)

Resolve o erro de importação **`ORA-20987: ... must not have more than one "primary"
saved report`**. Ele acontece quando um Interactive Grid tem relatórios NÃO-primários
de usuário (tipo **SESSION** ou **PRIVATE**) que apontam para o primário como *base*:
isso impede o import de substituir o primário, e o APEX acaba criando um segundo
primário. Serve para **qualquer relatório em qualquer página** (varre o app inteiro).

O que faz (nunca toca em `PRIMARY`):

- **Fase A** — purga as **sessões APEX expiradas** donas de relatórios `SESSION`
  (`apex_session.delete_session`, com contexto de workspace via `create_session`).
- **Fase B** — apaga relatórios `PRIVATE` órfãos via `apex_ig.delete_report`.

Não mexe (só reporta): `ALTERNATIVE` (definido no `.apx`, o import reconcilia; a API
nem apaga), `SESSION` de sessão **ativa** (desloga usuário logado — use `-force-active`
para incluir), e `SESSION` de sessão já sumida (sem API para apagar).

```sh
node scripts/apex-fix-ig-reports.mjs 2000 -check         # dry-run: lista o que faria (não grava)
node scripts/apex-fix-ig-reports.mjs 2000                # aplica no app 2000
node scripts/apex-fix-ig-reports.mjs 2000 -page 305      # só a página 305
node scripts/apex-fix-ig-reports.mjs 2000 -force-active  # ⚠ purga também sessões ATIVAS
```

| Argumento / Flag | Padrão                              | Descrição                                   |
| ---------------- | ----------------------------------- | ------------------------------------------- |
| `<app>` (posição) / `-app` | — (obrigatório)           | App alvo (id no banco)                      |
| `-check`         | (desligado)                         | Dry-run: só lista; não grava nada           |
| `-page <n>`      | (todas)                             | Limita a uma página                         |
| `-force-active`  | (desligado)                         | Purga também sessões **ativas** (⚠ desloga) |
| `-alias`         | `$APEX_DB_ALIAS` ou `defaultAlias`  | Conexão salva do SQLcl                      |

> **Fluxo típico:** rode com `-check` para ver os bloqueadores → rode sem `-check`
> para limpar → `node scripts/apex-import-page.mjs <app> <pág>`.

---

## Comando: `apex-import.mjs` ⚠️ altera o banco

Automatiza `apex import -input <pasta> -id <id> [-deployment <arquivo>]` —
importa o **aplicativo inteiro** para o APEX. Confira o `-alias` (ambiente) antes.

```sh
node scripts/apex-import.mjs 2000                  # importa FAVORITA/2000 no app 2000
node scripts/apex-import.mjs 2000 -alias PROD_OCI  # outro ambiente
node scripts/apex-import.mjs 2000 -id 3000         # importa a pasta 2000 no app 3000
```

| Argumento / Flag | Padrão                              | Descrição                            |
| ---------------- | ----------------------------------- | ------------------------------------ |
| `<app>` (posição) | — (obrigatório)                    | Pasta do app a importar              |
| `-id`            | o próprio `<app>`                   | Id do app de destino                 |
| `-input`         | `FAVORITA/<app>/`                   | Pasta, `.zip` ou `.apx` a importar   |
| `-deployment`    | `<app>/deployments/default.json` (se existir) | Arquivo de deployment      |
| `-nodeployment`  | (desligado)                         | Não usa nenhum deployment            |
| `-alias`         | `$APEX_DB_ALIAS` ou `defaultAlias`  | Conexão salva do SQLcl               |

---

## Comando: `apex-import-page.mjs` ⚠️ altera o banco

Importa **uma página** de um app.

```sh
node scripts/apex-import-page.mjs 2000 3                 # página 3 do app 2000
node scripts/apex-import-page.mjs 2000 p00003.apx        # pelo nome do arquivo
node scripts/apex-import-page.mjs 2000 3 -id 3000        # importa no app 3000
```

| Argumento / Flag | Padrão                              | Descrição                                  |
| ---------------- | ----------------------------------- | ------------------------------------------ |
| `<app>` (1ª posição) | — (obrigatório)                 | Pasta do app                               |
| `<página>` (2ª posição) | — (obrigatório)              | Número (ex.: `3`) ou arquivo `.apx`        |
| `-id`            | o próprio `<app>`                   | Id do app de destino                       |
| `-deployment`    | `<app>/deployments/default.json` (se existir) | Arquivo de deployment            |
| `-nodeployment`  | (desligado)                         | Não usa nenhum deployment                  |
| `-alias`         | `$APEX_DB_ALIAS` ou `defaultAlias`  | Conexão salva do SQLcl                     |

> **Como funciona:** o comando roda `apex import -input <pasta do app> -files <página>`.
> O `-input` aponta para a **pasta do app** (para o compilador enxergar os
> componentes compartilhados, ex.: `@/standard` e `@/text`) e o `-files` seleciona
> **só o `.apx` da página**. Importar o arquivo isolado (`-input` no próprio `.apx`)
> falha com `REFERENCE_NOT_FOUND`, porque os templates compartilhados vivem no nível
> da aplicação. Isso **exige SQLcl com apexlang-compiler ≥ versão do APEX do banco**
> (ver *Solução de problemas*).

---

## Comando: `apex-import-page-commit.mjs` ⚠️ altera o banco

Igual ao `apex-import-page.mjs`, mas **registra no git** após o import dar certo:
pede (de forma **obrigatória**) a mensagem e faz `git add -A -- .` (só a pasta do
app) + `git commit`. Se o import falhar, **não commita**.

```sh
node scripts/apex-import-page-commit.mjs 2000 3                   # importa e abre o prompt
node scripts/apex-import-page-commit.mjs 2000 3 -m "corrige X"    # mensagem via flag (sem prompt)
node scripts/apex-import-page-commit.mjs 2000 3 -nocommit         # só importa, sem commitar
```

| Argumento / Flag | Padrão                              | Descrição                                  |
| ---------------- | ----------------------------------- | ------------------------------------------ |
| (todos do `apex-import-page.mjs`) | —                  | Mesmos argumentos de app/página/id/deployment |
| `-m` / `--message` | — (abre o prompt obrigatório)     | Mensagem do commit sem prompt              |
| `-nocommit`      | (desligado)                         | Importa e não commita                      |

> O prompt da mensagem é **obrigatório**: trava até você digitar algo não-vazio.
> `Ctrl+C` cancela sem commitar. Requer que a pasta do app esteja dentro de um
> repositório git (ex.: `git init` em `FAVORITA/`) — ou use `-nocommit`.

---

## Estrutura do `scripts/`

- `lib/sqlcl.mjs` — helper genérico `runSqlcl()` que roda comandos no SQLcl
  (sempre `-thin`) e detecta erros (ORA-/SP2-/PLS-, versão incompatível,
  `REFERENCE_NOT_FOUND`, opção inválida). Sobe o SQLcl pela JVM diretamente
  (contornando o `sql.exe` que crasha no 26.3). Também `getArg()` / `getPositionals()`.
- `lib/apexlang.mjs` — helpers comuns (raiz do cliente, listar/resolver a pasta do
  app, resolver o deployment, ler o `app.id`, achar o `.apx` de uma página).
- `lib/workspace.mjs` — resolve o workspace do app e monta o `set_workspace`
  / `-workspace` (ver "Workspace" acima).
- `lib/config.mjs` — lê o `defaultAlias` de `connection.config.json`.
- `lib/git.mjs` — helpers de git (`runGit`, `isGitRepo`) e o prompt obrigatório
  de mensagem de commit (`promptRequired`).
- `apex-export.mjs` — exporta o app (APEXLANG) para a pasta do app.
- `apex-validate.mjs` — valida se o app compila (não altera o banco).
- `apex-import.mjs` — importa o aplicativo inteiro ⚠️.
- `apex-import-page.mjs` — importa uma página ⚠️.
- `apex-import-page-commit.mjs` — importa uma página + commit obrigatório ⚠️.
- `apex-fix-eol.mjs` / `apex-fix-htmldomid.mjs` — correções nos `.apx`.
- `apex-fix-ig-reports.mjs` — limpa relatórios de IG que travam o import ⚠️.
- `help.mjs` — `npm run help` (lê `scriptsHelp` do `package.json`).

---

## Solução de problemas

| Sintoma                                         | Causa provável / correção                                              |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| `ERRO: informe o id do app ...` / `pasta do app não encontrada` | Falta o app como 1º argumento, ou a pasta `FAVORITA/<app>` não existe. A mensagem lista os apps disponíveis. Para um app novo, rode `export` primeiro. |
| `Unknown connection <alias>`                    | Conexão não foi salva (o `connect` falhou). Refaça a 1ª vez.          |
| `no ocijdbc23 in java.library.path`             | SQLcl em modo thick/OCI. Use `-thin` (os scripts já forçam).           |
| `ORA-01017: invalid username/password`          | Senha incorreta ao criar a conexão. Refaça o `connect -save`.         |
| `APEXlang version ... is not supported by this SQLcl version` | O apexlang-compiler embutido no SQLcl é mais antigo que o APEX do banco. Atualize o SQLcl (`winget upgrade --id Oracle.SQLcl`) até o apexlang-compiler ficar ≥ a versão do APEX. |
| `REFERENCE_NOT_FOUND: @/...` ao importar página | Página importada isolada, sem contexto do app. Os scripts já usam `-input <pasta do app> -files <página>`; garanta que está chamando pelo script (não `apex import -input <arquivo>` cru). |
| `ORA-20987: ... Security Group ID (your workspace identity) is invalid` / export de "Espaço de Trabalho null" | Conexão com schema fora do workspace do app. Os scripts já setam o workspace; se o app não existir no banco, passe `-workspace <NOME>`. |
| `Vários espaços de trabalho disponíveis; use a opção workspaceId ou workspace` | Mesma causa, no validate/import. Os scripts já passam `-workspace`; se não resolver sozinho, use `-workspace <NOME>`. |
