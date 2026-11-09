#!/usr/bin/env node
// Imprime a ajuda dos scripts npm, lendo a chave "scriptsHelp" do package.json.
// Mantém a documentação em um lugar só (o package.json). Rode com: npm run help

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8'))
const help = pkg.scriptsHelp || {}

console.log(`\nScripts APEX / SQLcl do projeto "${pkg.name}"\n`)

if (help._regra) {
  console.log(help._regra)
  console.log('')
}

// Maior nome de script, para alinhar as colunas.
const names = Object.keys(help).filter((k) => k !== '_regra')
const width = names.reduce((m, n) => Math.max(m, n.length), 0)

for (const name of names) {
  console.log(`  ${name.padEnd(width)}  ${help[name]}`)
}

console.log('\nDetalhes completos: scripts/README.md\n')
