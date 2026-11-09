#!/usr/bin/env node
// Automatiza: apex validate -input <pasta> [-deployment <arquivo>]
// Valida se o projeto APEXLANG compila, rodando dentro do SQLcl conectado por
// uma conexão salva. NÃO altera nada no banco — só verifica.
//
// Uso:
//   node scripts/apex-validate.mjs <app>                      # valida a pasta do app (ex.: 2000)
//   node scripts/apex-validate.mjs <app> -input "C:\\outra"   # valida outra pasta/zip/.apx
//   node scripts/apex-validate.mjs <app> -nodeployment        # ignora deployments/default.json
//   node scripts/apex-validate.mjs <app> -alias PROD_OCI      # usa outra conexão
//
// <app> = id do app = nome da pasta ao lado de scripts/ (ex.: FAVORITA/2000).
// Padrões: alias=defaultAlias do connection.config.json, input=pasta do app,
//          deployment=<app>/deployments/default.json (se existir).

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { runSqlcl, getArg } from './lib/sqlcl.mjs'
import { projectPaths, resolveApp, resolveDeployment } from './lib/apexlang.mjs'
import { getDefaultAlias } from './lib/config.mjs'
import { resolveWorkspace } from './lib/workspace.mjs'

// Conexão salva padrão — editável em scripts/connection.config.json.
const DEFAULT_ALIAS = getDefaultAlias()
const { clientRoot } = projectPaths(import.meta.url)

const argv = process.argv.slice(2)
const alias = getArg(argv, 'alias', process.env.APEX_DB_ALIAS || DEFAULT_ALIAS)

// App: 1º posicional (ou -app). Define a pasta e o id (para achar o workspace).
const { appId, appDir } = resolveApp(argv, clientRoot, { usage: 'node scripts/apex-validate.mjs 2000' })
// input: -input; padrão = pasta do app.
const input = resolve(getArg(argv, 'input', appDir))
const deployment = resolveDeployment(argv, appDir)

if (!alias) {
  console.error('ERRO: informe a conexão salva com -alias <nome> ou a variável APEX_DB_ALIAS.')
  console.error('      Ou defina "defaultAlias" em scripts/connection.config.json.')
  process.exit(2)
}
if (!existsSync(input)) {
  console.error(`ERRO: entrada não encontrada: ${input}`)
  process.exit(2)
}

// Monta o comando apex validate. Paths entre aspas (o caminho tem espaços).
const parts = [`apex validate -input "${input}"`]
if (deployment) parts.push(`-deployment "${deployment}"`)
const cmd = parts.join(' ')

// Workspace da sessão (evita ORA-20987 "Security Group ID ... is invalid").
const ws = await resolveWorkspace({ alias, argv, appId })
// validate/import exigem -workspace no próprio comando quando a conexão vê vários workspaces.
const fullCmd = cmd + ws.cmdOption

console.log('> SQLcl / conexão:', alias)
console.log('> App            :', appId)
console.log('> Entrada        :', input)
if (deployment) console.log('> Deployment     :', deployment)
console.log('> Workspace      :', ws.label)
console.log('> Comando        :', fullCmd)
console.log('---')

const { hadError, code } = await runSqlcl({ alias, commands: [...ws.sessionCommands, fullCmd], cwd: appDir })

if (hadError) {
  console.error(`\n✖ Validação encontrou erros (exit=${code}). Veja a saída acima.`)
  process.exit(1)
}

console.log('\n✔ Validação concluída sem erros.')
