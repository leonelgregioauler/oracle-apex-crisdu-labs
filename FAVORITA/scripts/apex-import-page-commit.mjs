#!/usr/bin/env node
// Igual ao apex-import-page.mjs, mas registra o resultado no git: após o import
// dar certo, pede (de forma OBRIGATÓRIA) a mensagem e faz `git add` + `git commit`.
// Por baixo roda: apex import -input <app> -files pages/pNNNNN-*.apx -id <id>
//
// ⚠️  ATENÇÃO: isto MODIFICA o aplicativo no banco de destino. Confira o alias.
//
// Fluxo:
//   1) importa a página (igual ao apex-import-page.mjs);
//   2) se o import FALHAR, aborta e NÃO commita (não registra estado quebrado);
//   3) se der certo, abre um prompt que TRAVA até você digitar a mensagem;
//   4) roda `git add -A -- .` (só a pasta do app) + `git commit -m "<mensagem>"`.
//
// Argumentos posicionais: <app> <página>
//   app    = id do app = nome da pasta ao lado de scripts/ (ex.: 2000) (obrigatório)
//   página = número (ex.: 3) ou nome/caminho do arquivo .apx (obrigatório)
//
// Uso:
//   node scripts/apex-import-page-commit.mjs 2000 3                 # importa e abre o prompt
//   node scripts/apex-import-page-commit.mjs 2000 3 -id 3000        # importa em OUTRO id
//   node scripts/apex-import-page-commit.mjs 2000 3 -m "corrige X"  # pula o prompt
//   node scripts/apex-import-page-commit.mjs 2000 3 -nocommit       # importa e NÃO commita
//
// Padrões: alias=defaultAlias do connection.config.json, id=<app>,
//          deployment=<app>/deployments/default.json (se existir).

import { existsSync } from 'node:fs'
import { relative } from 'node:path'
import { runSqlcl, getArg } from './lib/sqlcl.mjs'
import { projectPaths, resolveApp, resolveDeployment, resolvePageFile } from './lib/apexlang.mjs'
import { runGit, isGitRepo, promptRequired } from './lib/git.mjs'
import { getDefaultAlias } from './lib/config.mjs'
import { resolveWorkspace } from './lib/workspace.mjs'

// Conexão salva padrão — editável em scripts/connection.config.json.
const DEFAULT_ALIAS = getDefaultAlias()
const { clientRoot } = projectPaths(import.meta.url)

const argv = process.argv.slice(2)
const alias = getArg(argv, 'alias', process.env.APEX_DB_ALIAS || DEFAULT_ALIAS)

// Posicionais: <app> <página>.
const USAGE = 'node scripts/apex-import-page-commit.mjs 2000 3'
const { appId, appDir, rest } = resolveApp(argv, clientRoot, { usage: USAGE })
const pageArg = rest[0]
// id de destino: -id, senão o próprio id do app (nome da pasta).
const id = String(getArg(argv, 'id', appId))
const deployment = resolveDeployment(argv, appDir)

// Opções de commit: -nocommit pula o git; -m/--message passa a mensagem sem prompt.
const noCommit = argv.includes('-nocommit')
const msgFromFlag = getArg(argv, 'm') ?? getArg(argv, 'message')

if (!alias) {
  console.error('ERRO: informe a conexão salva com -alias <nome> ou a variável APEX_DB_ALIAS.')
  console.error('      Ou defina "defaultAlias" em scripts/connection.config.json.')
  process.exit(2)
}
if (!pageArg) {
  console.error('ERRO: informe a página depois do app (número ou arquivo .apx).')
  console.error(`      Ex.:  ${USAGE}`)
  process.exit(2)
}

const pageFile = resolvePageFile(pageArg, appDir)
if (!pageFile || !existsSync(pageFile)) {
  console.error(`ERRO: página não encontrada para "${pageArg}" em ${appDir}\\pages.`)
  console.error('      Passe o número (ex.: 3) ou o nome do arquivo (ex.: p00003-pedentrmc.apx).')
  process.exit(2)
}
if (!/^\d+$/.test(id)) {
  console.error(`ERRO: -id deve ser numérico (recebido: ${id}).`)
  process.exit(2)
}

// Se vamos commitar, exige um repositório git (na pasta do app ou acima dela,
// ex.: FAVORITA/) ANTES de mexer no banco — assim não importamos para depois
// descobrir que não dá pra commitar.
if (!noCommit && !(await isGitRepo(appDir))) {
  console.error('ERRO: a pasta do app não está dentro de um repositório git.')
  console.error(`      Rode "git init" em ${clientRoot} (ou em ${appDir}) ou use -nocommit para só importar.`)
  process.exit(2)
}

// Caminho da página RELATIVO à pasta do app, com barras normais (o -files
// é resolvido a partir do -input; caminho absoluto com espaços quebra o parser).
const relPage = relative(appDir, pageFile).split('\\').join('/')

// Monta o comando: -input dá o contexto do APP INTEIRO (para resolver os
// componentes compartilhados, ex. @/standard) e -files escolhe só esta página.
const parts = [`apex import -input "${appDir}" -files "${relPage}" -id ${id}`]
if (deployment) parts.push(`-deployment "${deployment}"`)
const cmd = parts.join(' ')

// Workspace da sessão (evita ORA-20987 "Security Group ID ... is invalid").
const ws = await resolveWorkspace({ alias, argv, appId: id })
// validate/import exigem -workspace no próprio comando quando a conexão vê vários workspaces.
const fullCmd = cmd + ws.cmdOption

console.log('> SQLcl / conexão:', alias, '  ⚠️  este comando ALTERA o aplicativo')
console.log('> Workspace      :', ws.label)
console.log('> App (pasta)    :', appDir)
console.log('> Página         :', pageFile)
console.log('> Id destino     :', id)
if (deployment) console.log('> Deployment     :', deployment)
console.log('> Commit git     :', noCommit ? 'NÃO (-nocommit)' : 'sim, após o import (só a pasta do app)')
console.log('> Comando        :', fullCmd)
console.log('---')

const { hadError, code } = await runSqlcl({ alias, commands: [...ws.sessionCommands, fullCmd], cwd: appDir })

if (hadError) {
  console.error(`\n✖ Import da página falhou (exit=${code}). Veja a saída acima.`)
  console.error('  Nenhum commit foi feito. Se for erro de importação parcial, tente o apex-import.mjs.')
  process.exit(1)
}

console.log('\n✔ Import da página concluído.')

if (noCommit) {
  console.log('(-nocommit) nada foi commitado.')
  process.exit(0)
}

// --- Commit no git ---------------------------------------------------------
// Mensagem: via -m/--message, senão prompt OBRIGATÓRIO (trava até digitar).
const message = (msgFromFlag ?? '').trim() || (await promptRequired('Mensagem do commit: '))

console.log('---')
// Só a pasta do app ("-- ."), para não levar junto alterações de outros apps
// do mesmo cliente quando o repositório git é a pasta do cliente.
await runGit(['add', '-A', '--', '.'], { cwd: appDir })
const { hadError: commitFailed } = await runGit(['commit', '-m', message], { cwd: appDir })

if (commitFailed) {
  console.error('\n✖ O commit falhou (veja a saída acima). O import no banco já foi aplicado.')
  process.exit(1)
}

console.log('\n✔ Commit criado com sucesso.')
