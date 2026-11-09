#!/usr/bin/env node
// Normaliza o fim de linha dos arquivos .apx para LF (\n).
//
// POR QUÊ: o `apex validate` (lexer do APEXLANG) rejeita o caractere CR (\r).
// Arquivos salvos em CRLF (ex.: regravados por PowerShell Set-Content/Out-File
// ou por editor configurado com EOL=CRLF) geram milhares de erros
// "token recognition error at: '\r\n'". Este script converte CRLF (e CR solto)
// para LF, deixando os .apx prontos para validar/importar.
//
// SEGURANÇA: a conversão é feita byte a byte (0x0D/0x0A). Como em UTF-8 esses
// bytes nunca aparecem dentro de um caractere multibyte, não altera o encoding
// nem remove BOM — só troca as quebras de linha. Só regrava o arquivo se mudou.
//
// Uso:
//   node scripts/apex-fix-eol.mjs            # converte os .apx de TODOS os apps do cliente
//   node scripts/apex-fix-eol.mjs 2000       # só o app 2000
//   node scripts/apex-fix-eol.mjs 2000 -check  # NÃO grava; lista pendências e sai 1 se houver
//   node scripts/apex-fix-eol.mjs -dir "C:\\outra\\pasta"   # outra raiz
//
// Padrão: raiz = pasta do app (se informado) ou a pasta do cliente (que contém
//          scripts/ e as pastas de app). Ignora node_modules, .git, .apex,
//          backup, deployments, scripts.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve, extname } from 'node:path'
import { projectPaths, resolveApp } from './lib/apexlang.mjs'
import { getArg, getPositionals } from './lib/sqlcl.mjs'

const { clientRoot } = projectPaths(import.meta.url)

const argv = process.argv.slice(2)
const checkOnly = argv.includes('-check') || argv.includes('--check')
// App opcional: com ele, só a pasta do app; sem ele, todos os apps do cliente.
const hasApp = getArg(argv, 'app') !== undefined || getPositionals(argv).length > 0
const baseDir = hasApp
  ? resolveApp(argv, clientRoot, { usage: 'node scripts/apex-fix-eol.mjs 2000 -check' }).appDir
  : clientRoot
const root = resolve(getArg(argv, 'dir', baseDir))

// Pastas que nunca devem ser tocadas pela normalização.
const SKIP_DIRS = new Set(['node_modules', '.git', '.apex', 'backup', 'deployments', 'scratchpad', '.apex-export-tmp', 'scripts'])
// Extensões alvo. Mantido em .apx de propósito (é o que o validate consome).
const EXTS = new Set(['.apx'])

const CR = 0x0d
const LF = 0x0a

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      yield* walk(join(dir, entry.name))
    } else if (EXTS.has(extname(entry.name).toLowerCase())) {
      yield join(dir, entry.name)
    }
  }
}

/** Troca CRLF e CR solto por LF, byte a byte. Retorna null se não mudou. */
function toLf(buf) {
  if (!buf.includes(CR)) return null
  const out = Buffer.allocUnsafe(buf.length)
  let j = 0
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === CR) {
      // CRLF: pula o CR (o LF seguinte é copiado na próxima iteração).
      // CR solto: vira LF.
      if (buf[i + 1] !== LF) out[j++] = LF
    } else {
      out[j++] = buf[i]
    }
  }
  return out.subarray(0, j)
}

let scanned = 0
const changed = []
for (const file of walk(root)) {
  scanned++
  const fixed = toLf(readFileSync(file))
  if (fixed === null) continue
  changed.push(relative(clientRoot, file).replace(/\\/g, '/'))
  if (!checkOnly) writeFileSync(file, fixed)
}

console.log(`> Raiz    : ${root}`)
console.log(`> .apx    : ${scanned} verificados`)

if (checkOnly) {
  if (changed.length === 0) {
    console.log('\n✔ Todos os .apx já estão em LF.')
    process.exit(0)
  }
  console.log(`\n✖ ${changed.length} arquivo(s) com CRLF/CR (precisam de fix-eol):`)
  for (const f of changed) console.log(`  - ${f}`)
  console.log('\nRode:  npm run fix-eol')
  process.exit(1)
}

if (changed.length === 0) {
  console.log('\n✔ Nada a converter — todos os .apx já estavam em LF.')
} else {
  console.log(`\n✔ Convertidos para LF: ${changed.length} arquivo(s).`)
  for (const f of changed) console.log(`  - ${f}`)
}
