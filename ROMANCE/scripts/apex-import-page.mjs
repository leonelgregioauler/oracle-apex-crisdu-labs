#!/usr/bin/env node
// Automatiza a importação de UMA página do projeto APEXLANG para o APEX.
// Por baixo roda: apex import -input <app> -files pages/pNNNNN-*.apx -id <id>
// dentro do SQLcl conectado por uma conexão salva.
//
// ⚠️  ATENÇÃO: isto MODIFICA o aplicativo no banco de destino. Confira o alias.
//
// Como funciona o import de UMA página: o -input aponta para a PASTA do app
// (para o compilador enxergar os componentes compartilhados, ex. @/standard e
// @/text) e o -files seleciona só o .apx da página — relativo ao -input. Importar
// o arquivo isolado (-input no próprio .apx) falha com REFERENCE_NOT_FOUND, pois
// os templates compartilhados vivem no nível da aplicação.
//
// Argumentos posicionais: <app> <página>
//   app    = id do app = nome da pasta ao lado de scripts/ (ex.: 2000) (obrigatório)
//   página = número (ex.: 3) ou nome/caminho do arquivo .apx (obrigatório)
//
// Uso:
//   node scripts/apex-import-page.mjs 2000 3                 # página 3 do app 2000
//   node scripts/apex-import-page.mjs 2000 p00003-pedentrmc.apx
//   node scripts/apex-import-page.mjs 2000 3 -id 3000        # importa em OUTRO id de app
//   node scripts/apex-import-page.mjs 2000 3 -nodeployment   # ignora o deployment
//
// Padrões: alias=defaultAlias do connection.config.json, id=<app>,
//          deployment=<app>/deployments/default.json (se existir).

import { existsSync } from 'node:fs'
import { relative } from 'node:path'
import { runSqlcl, getArg } from './lib/sqlcl.mjs'
import { projectPaths, resolveApp, resolveDeployment, resolvePageFile } from './lib/apexlang.mjs'
import { getDefaultAlias } from './lib/config.mjs'
import { resolveWorkspace } from './lib/workspace.mjs'

// Conexão salva padrão — editável em scripts/connection.config.json.
const DEFAULT_ALIAS = getDefaultAlias()
const { clientRoot } = projectPaths(import.meta.url)

const argv = process.argv.slice(2)
const alias = getArg(argv, 'alias', process.env.APEX_DB_ALIAS || DEFAULT_ALIAS)

// Posicionais: <app> <página>.
const USAGE = 'node scripts/apex-import-page.mjs 2000 3'
const { appId, appDir, rest } = resolveApp(argv, clientRoot, { usage: USAGE })
const pageArg = rest[0]
// id de destino: -id, senão o próprio id do app (nome da pasta).
const id = String(getArg(argv, 'id', appId))
const deployment = resolveDeployment(argv, appDir)

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
console.log('> App (pasta)    :', appDir)
console.log('> Página         :', pageFile)
console.log('> Id destino     :', id)
if (deployment) console.log('> Deployment     :', deployment)
console.log('> Workspace      :', ws.label)
console.log('> Comando        :', fullCmd)
console.log('---')

const { hadError, code } = await runSqlcl({ alias, commands: [...ws.sessionCommands, fullCmd], cwd: appDir })

if (hadError) {
  console.error(`\n✖ Import da página falhou (exit=${code}). Veja a saída acima.`)
  console.error('  Se for erro de importação parcial, tente o apex-import.mjs (app inteiro).')
  process.exit(1)
}

console.log('\n✔ Import da página concluído.')
