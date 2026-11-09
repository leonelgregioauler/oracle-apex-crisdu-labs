// Helpers compartilhados pelos scripts APEXLANG (validate / import / export / fixes).
//
// ESTRUTURA (scripts centralizados por cliente):
//
//   FAVORITA/                 <- raiz do cliente (clientRoot)
//     package.json            <- npm scripts (um só para todos os apps)
//     scripts/                <- estes scripts (um só para todos os apps)
//     2000/                   <- pasta do app 2000 (appDir): application.apx, pages/, deployments/...
//     20010/                  <- pasta do app 20010
//
// Cada pasta de app tem como NOME o id numérico da aplicação. Os scripts recebem
// o app como 1º argumento posicional (ou -app <id>) e operam dentro dessa pasta.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getArg, getPositionals } from './sqlcl.mjs'

/** Caminhos a partir do `import.meta.url` de um script em scripts/. */
export function projectPaths(importMetaUrl) {
  const scriptDir = dirname(fileURLToPath(importMetaUrl))
  // Raiz do cliente (ex.: FAVORITA) = pasta que contém scripts/.
  const clientRoot = resolve(scriptDir, '..')
  return { scriptDir, clientRoot }
}

/** Lista as pastas de app (nome numérico) dentro da raiz do cliente. */
export function listApps(clientRoot) {
  if (!existsSync(clientRoot)) return []
  return readdirSync(clientRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d+$/.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => Number(a) - Number(b))
}

/**
 * Resolve o app alvo a partir dos argumentos:
 *   - `-app <id>`                 => esse id (todos os posicionais ficam em `rest`);
 *   - senão o 1º posicional        => id do app (os demais ficam em `rest`).
 *
 * Em caso de erro imprime a mensagem (com a lista de apps disponíveis) e sai com 2.
 *
 * @param {string[]} argv
 * @param {string}   clientRoot
 * @param {object}   [opts]
 * @param {boolean}  [opts.mustExist=true]  Exige que a pasta do app já exista.
 * @param {string}   [opts.usage]           Exemplo de uso para a mensagem de erro.
 * @returns {{ appId: string, appDir: string, rest: string[] }}
 */
export function resolveApp(argv, clientRoot, { mustExist = true, usage = '' } = {}) {
  const positionals = getPositionals(argv)
  const fromFlag = getArg(argv, 'app')
  const appId = String(fromFlag ?? positionals[0] ?? '').trim()
  const rest = fromFlag !== undefined ? positionals : positionals.slice(1)

  const fail = (msg) => {
    console.error(`ERRO: ${msg}`)
    if (usage) console.error(`      Ex.:  ${usage}`)
    const apps = listApps(clientRoot)
    console.error(`      Apps disponíveis em ${clientRoot}: ${apps.length ? apps.join(', ') : '(nenhum)'}`)
    process.exit(2)
  }

  if (!appId) fail('informe o id do app (= nome da pasta) como 1º argumento ou -app <id>.')
  if (!/^\d+$/.test(appId)) fail(`id do app deve ser numérico (recebido: "${appId}").`)

  const appDir = join(clientRoot, appId)
  if (mustExist && !(existsSync(appDir) && statSync(appDir).isDirectory())) {
    fail(`pasta do app não encontrada: ${appDir}`)
  }
  return { appId, appDir, rest }
}

/**
 * Resolve o arquivo de deployment a usar na validação/importação:
 *  - `-nodeployment`        => nenhum (string vazia)
 *  - `-deployment <arquivo>` => esse arquivo (absoluto)
 *  - padrão                  => <app>/deployments/default.json, se existir
 */
export function resolveDeployment(argv, appDir) {
  if (argv.includes('-nodeployment')) return ''
  const explicit = getArg(argv, 'deployment', '')
  if (explicit) return resolve(explicit)
  const def = join(appDir, 'deployments', 'default.json')
  return existsSync(def) ? def : ''
}

/** Lê o id numérico do app em <app>/deployments/default.json (campo app.id). */
export function readAppId(appDir) {
  const f = join(appDir, 'deployments', 'default.json')
  if (!existsSync(f)) return undefined
  try {
    const json = JSON.parse(readFileSync(f, 'utf8'))
    return json?.app?.id
  } catch {
    return undefined
  }
}

/**
 * Resolve o arquivo .apx de uma página a partir de:
 *  - um número (ex.: 3   -> pages/p00003-*.apx)
 *  - um nome de arquivo  (ex.: p00003-pedentrmc.apx -> pages/p00003-pedentrmc.apx)
 *  - um caminho existente (usado como está)
 * Retorna o caminho absoluto, ou undefined se não encontrar.
 */
export function resolvePageFile(arg, appDir) {
  const pagesDir = join(appDir, 'pages')

  // Número puro -> procura pNNNNN.apx OU pNNNNN-*.apx (5 dígitos, zeros à esquerda).
  if (/^\d+$/.test(arg)) {
    const base = 'p' + String(arg).padStart(5, '0') // ex.: p00001
    const match = existsSync(pagesDir)
      ? readdirSync(pagesDir).find((n) => {
          const low = n.toLowerCase()
          if (!low.endsWith('.apx')) return false
          // aceita "p00001.apx" e "p00001-qualquer-coisa.apx"
          return low === `${base}.apx` || low.startsWith(`${base}-`)
        })
      : undefined
    return match ? join(pagesDir, match) : undefined
  }

  // Caminho já existente (relativo ao cwd ou absoluto).
  if (existsSync(arg)) return resolve(arg)

  // Nome de arquivo dentro de pages/.
  const inPages = join(pagesDir, arg)
  if (existsSync(inPages)) return inPages

  return undefined
}
