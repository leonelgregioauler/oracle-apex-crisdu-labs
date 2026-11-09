#!/usr/bin/env node
// Automatiza: apex export -applicationid <id> -exptype <tipo>
// rodando dentro do SQLcl conectado por uma conexão salva.
//
// Uso:
//   node scripts/apex-export.mjs <id>              # o id é o único obrigatório
//
// Exemplos:
//   node scripts/apex-export.mjs 2000
//   node scripts/apex-export.mjs 2000 -exptype READABLE_YAML
//   node scripts/apex-export.mjs 2000 -alias PROD_OCI -dir "C:\\outro\\destino"
//   node scripts/apex-export.mjs 2000 -noclean      # mantém artefatos antigos no destino
//
// Padrões embutidos: alias=defaultAlias do connection.config.json, exptype=APEXLANG.
//
// DESTINO: a pasta do app ao lado de scripts/, com o id como nome
// (ex.: FAVORITA/2000/). Os arquivos ficam DIRETO nela — application.apx, pages/,
// shared-components/, etc. A pasta é criada se ainda não existir.
//
// COMO: o apex export sempre cria uma subpasta com o nome do alias da aplicação.
// Para "achatar" (flatten) os arquivos direto no destino, o export é feito numa
// pasta temporária (.apex-export-tmp) e o conteúdo é movido para cima. Exportar
// sempre numa pasta vazia também elimina os duplicados _1, _2... (o apex só
// renomeia quando o arquivo já existe).

import { mkdirSync, existsSync, readdirSync, rmSync, renameSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { runSqlcl, getArg } from './lib/sqlcl.mjs'
import { projectPaths, resolveApp } from './lib/apexlang.mjs'
import { getDefaultAlias } from './lib/config.mjs'
import { resolveWorkspace } from './lib/workspace.mjs'

// Conexão salva padrão deste ambiente — editável em scripts/connection.config.json.
const DEFAULT_ALIAS = getDefaultAlias()

// Raiz do cliente (ex.: FAVORITA) = pasta que contém o scripts/.
const { clientRoot } = projectPaths(import.meta.url)

// Artefatos que o apex export (APEXLANG) gera. Só estes são limpos no destino.
const APEX_ARTIFACT_DIRS = ['.apex', 'deployments', 'pages', 'shared-components', 'workspace-components']
const APEX_ARTIFACT_FILE = /^(application|page-groups)(_\d+)?\.apx$/i

// Pastas/arquivos (nomes de nível raiz no destino) editados à mão que NÃO devem
// ser removidos na limpeza nem sobrescritos pela cópia do export. Mantidos como
// estão no disco.
const PRESERVE = ['deployments']

const argv = process.argv.slice(2)

// 1º argumento posicional (ou -app) é o id da aplicação = nome da pasta do app.
// A pasta não precisa existir ainda: o 1º export a cria.
const { appId: applicationId, appDir } = resolveApp(argv, clientRoot, {
  mustExist: false,
  usage: 'node scripts/apex-export.mjs 2000',
})
const noClean = argv.includes('-noclean')

const alias = getArg(argv, 'alias', process.env.APEX_DB_ALIAS || DEFAULT_ALIAS)
const expType = getArg(argv, 'exptype', 'APEXLANG')
// Destino onde os arquivos ficam direto (flatten). Padrão: <cliente>/<id>/.
const target = resolve(getArg(argv, 'dir', appDir))

if (!alias) {
  console.error('ERRO: informe a conexão salva com -alias <nome> ou a variável APEX_DB_ALIAS.')
  console.error('      Ou defina "defaultAlias" em scripts/connection.config.json.')
  console.error('      Liste conexões salvas com:  sql -name list   (ou via connmgr)')
  process.exit(2)
}

// Garante que o destino existe.
if (!existsSync(target)) {
  mkdirSync(target, { recursive: true })
  console.log(`Diretório criado: ${target}`)
}

// 1) Limpa artefatos antigos do APEX no destino (remove componentes que já não
//    existem mais na app). Preserva scripts/, logs e qualquer outro arquivo.
//    Com -noclean, artefatos antigos são mantidos (os atuais ainda são
//    sobrescritos no passo de flatten).
if (!noClean) {
  const removed = []
  let locked = false
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    const name = entry.name
    if (PRESERVE.includes(name)) continue // mantém pastas/arquivos editados à mão
    const isArtifactDir = entry.isDirectory() && APEX_ARTIFACT_DIRS.includes(name)
    const isArtifactFile = entry.isFile() && APEX_ARTIFACT_FILE.test(name)
    if (!isArtifactDir && !isArtifactFile) continue
    try {
      rmSync(join(target, name), { recursive: true, force: true })
      removed.push(name)
    } catch (err) {
      locked = true
      console.warn(`AVISO: não consegui remover "${name}" (${err.code}).`)
    }
  }
  if (removed.length) console.log(`Artefatos anteriores removidos: ${removed.join(', ')}`)
  if (locked) {
    console.warn('       Feche o Explorer/VS Code dessa pasta antes de rodar.')
  }
}

// 2) Pasta temporária (vazia) para o export. O apex criará staging/<alias>/...
const staging = join(target, '.apex-export-tmp')
rmSync(staging, { recursive: true, force: true })
mkdirSync(staging, { recursive: true })

// 3) Assume o workspace do app na sessão ANTES do export (evita ORA-20987
//    "Security Group ID ... is invalid" ao conectar com um schema que não é o
//    parsing schema do workspace). Detalhes em lib/workspace.mjs.
const ws = await resolveWorkspace({ alias, argv, appId: applicationId })

// 4) Export para o staging.
const exportCmd =
  `apex export -applicationid ${applicationId} -dir "${staging}" -exptype ${expType}`

console.log('> SQLcl / conexão:', alias)
console.log('> Destino        :', target)
console.log('> Workspace      :', ws.label)
console.log('> Comando        :', exportCmd)
console.log('---')

const { hadError, code } = await runSqlcl({
  alias,
  commands: [...ws.sessionCommands, exportCmd],
})

if (hadError) {
  rmSync(staging, { recursive: true, force: true })
  console.error(`\n✖ Export falhou (exit=${code}). Verifique a saída acima.`)
  process.exit(1)
}

// 4) Achata: move o conteúdo da subpasta do alias para o destino, sobrescrevendo.
//    A pasta do alias é a que contém application.apx (ou o próprio staging, caso
//    o apex tenha gravado direto nele).
let srcFolder = staging
if (!existsSync(join(staging, 'application.apx'))) {
  const sub = readdirSync(staging, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(staging, e.name))
    .find((p) => existsSync(join(p, 'application.apx')))
  if (sub) srcFolder = sub
}

let moved = 0
let moveLocked = false
for (const entry of readdirSync(srcFolder)) {
  const to = join(target, entry)
  // Preservados só são pulados se JÁ existem no destino (edição à mão a manter).
  // Na primeira execução eles ainda não existem: deixa a cópia do export passar
  // (ex.: a pasta "deployments" gerada pelo export).
  if (PRESERVE.includes(entry) && existsSync(to)) continue
  const from = join(srcFolder, entry)
  try {
    rmSync(to, { recursive: true, force: true }) // garante a sobreposição
    renameSync(from, to)
    moved++
  } catch (err) {
    moveLocked = true
    console.warn(`AVISO: não consegui mover "${entry}" (${err.code}).`)
  }
}

// 5) Remove o staging temporário.
rmSync(staging, { recursive: true, force: true })

if (moveLocked) {
  console.error('\n✖ Export gerado, mas falhou ao mover alguns arquivos para o')
  console.error('  destino (pasta aberta no Explorer/VS Code?). Feche e rode de novo.')
  process.exit(1)
}

console.log(`\n✔ Export concluído (${moved} itens) em: ${target}`)
