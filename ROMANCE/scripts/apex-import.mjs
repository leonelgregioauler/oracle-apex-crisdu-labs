#!/usr/bin/env node
// Automatiza: apex import -input <pasta> [-id <id>] [-deployment <arquivo>]
// Importa o aplicativo APEXLANG INTEIRO para o APEX, rodando dentro do SQLcl
// conectado por uma conexão salva.
//
// ⚠️  ATENÇÃO: isto MODIFICA o aplicativo no banco de destino. Confira o alias
//     (ambiente) antes de rodar.
//
// Uso:
//   node scripts/apex-import.mjs <app>                   # importa a pasta do app para o id <app>
//   node scripts/apex-import.mjs 2000                    # ex.: FAVORITA/2000 -> app 2000
//   node scripts/apex-import.mjs 2000 -id 3000           # importa a pasta 2000 em OUTRO id (3000)
//   node scripts/apex-import.mjs 2000 -input "C:\\x"     # importa outra pasta/zip/.apx
//   node scripts/apex-import.mjs 2000 -alias PROD_OCI    # outro ambiente
//   node scripts/apex-import.mjs 2000 -nodeployment      # ignora deployments/default.json
//
// <app> = id do app = nome da pasta ao lado de scripts/ (ex.: FAVORITA/2000).
// O id de destino é o próprio <app>; -id <outro> sobrescreve.
//
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

// App: 1º posicional (ou -app) -> pasta FAVORITA/<app>.
const { appId, appDir } = resolveApp(argv, clientRoot, { usage: 'node scripts/apex-import.mjs 2000' })
// id de destino: -id, senão o próprio id do app (nome da pasta).
const id = String(getArg(argv, 'id', appId))
// input: só por -input; padrão = pasta do app.
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
if (!/^\d+$/.test(id)) {
  console.error(`ERRO: -id deve ser numérico (recebido: ${id}).`)
  process.exit(2)
}

// Monta o comando apex import. Paths entre aspas (o caminho tem espaços).
const parts = [`apex import -input "${input}" -id ${id}`]
if (deployment) parts.push(`-deployment "${deployment}"`)
const cmd = parts.join(' ')

// Workspace da sessão (evita ORA-20987 "Security Group ID ... is invalid").
const ws = await resolveWorkspace({ alias, argv, appId: id })
// validate/import exigem -workspace no próprio comando quando a conexão vê vários workspaces.
const fullCmd = cmd + ws.cmdOption

console.log('> SQLcl / conexão:', alias, '  ⚠️  este comando ALTERA o aplicativo')
console.log('> App (pasta)    :', appDir)
console.log('> Entrada        :', input)
console.log('> Id destino     :', id)
if (deployment) console.log('> Deployment     :', deployment)
console.log('> Workspace      :', ws.label)
console.log('> Comando        :', fullCmd)
console.log('---')

const { hadError, code } = await runSqlcl({ alias, commands: [...ws.sessionCommands, fullCmd], cwd: appDir })

if (hadError) {
  console.error(`\n✖ Import falhou (exit=${code}). Veja a saída acima.`)
  process.exit(1)
}

console.log('\n✔ Import do aplicativo concluído.')
