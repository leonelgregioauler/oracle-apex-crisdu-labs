#!/usr/bin/env node
// Sanitiza os valores de `htmlDomId` dos arquivos .apx para IDs válidos.
//
// POR QUÊ: o `apex validate` rejeita htmlDomId com caractere inválido
// ("Invalid property (Value can not contain whitespace, comma, single quote,
// double quote or characters :, /, +,?, ^)"). Esses IDs (Static ID de colunas
// de IG/Report) frequentemente vêm com ESPAÇO e ACENTO (ex.: "Data Movimento",
// "Usuário", "Enviado para Cobrança"), herdados do heading. Um ID com espaço/
// acento não pode ser referenciado validamente em CSS/JS, então a conversão é
// segura (checado: 0 referências). Um re-export do Builder traz os IDs ruins de
// volta — por isso este script é repetível.
//
// REGRA DE SANITIZAÇÃO (decisão do projeto):
//   1. remove acentos  (NFD + remove diacríticos)   Usuário -> Usuario
//   2. espaço -> underscore                          Data Movimento -> Data_Movimento
//   3. remove qualquer outro char fora de [A-Za-z0-9_-]  (. , % + / : etc.)
//   4. colapsa "_" repetidos e remove "_" das pontas
//
// INVÁLIDO = exatamente a regra do compilador: contém espaço, vírgula, aspas
// simples/duplas ou : / + ? ^. Hífen e acento são VÁLIDOS e nunca são tocados
// (IDs como "acoes-702" costumam ser referenciados em CSS/JS).
//
// ESCOPO: SÓ altera htmlDomId INVÁLIDO. IDs válidos (inclusive válidos repetidos)
// NUNCA são tocados. Se a sanitização resultar num ID que já existe no arquivo,
// isso é só REPORTADO (aviso de possível duplicata), não alterado.
//
// Uso:
//   node scripts/apex-fix-htmldomid.mjs                 # TODOS os apps do cliente (com backup)
//   node scripts/apex-fix-htmldomid.mjs 2000            # só o app 2000
//   node scripts/apex-fix-htmldomid.mjs 2000 -check     # dry-run; só mostra o que mudaria
//   node scripts/apex-fix-htmldomid.mjs -dir "..."      # outra raiz (pasta de um app)
//
// O backup fica dentro de cada app: <app>/backup/htmldomid-fix-<ts>/.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs'
import { join, relative, resolve, extname, dirname } from 'node:path'
import { projectPaths, resolveApp, listApps } from './lib/apexlang.mjs'
import { getArg, getPositionals } from './lib/sqlcl.mjs'

const { clientRoot } = projectPaths(import.meta.url)
const argv = process.argv.slice(2)
const checkOnly = argv.includes('-check') || argv.includes('--check')

// Raízes a processar (cada uma é a pasta de UM app, com pages/ e shared-components/):
//   -dir <pasta>  => só ela;  <app>/-app => só esse app;  nada => todos os apps.
const explicitDir = getArg(argv, 'dir')
const hasApp = getArg(argv, 'app') !== undefined || getPositionals(argv).length > 0
const roots = explicitDir
  ? [resolve(explicitDir)]
  : hasApp
    ? [resolveApp(argv, clientRoot, { usage: 'node scripts/apex-fix-htmldomid.mjs 2000 -check' }).appDir]
    : listApps(clientRoot).map((a) => join(clientRoot, a))

// Só processa estas subárvores (onde ficam componentes com htmlDomId).
const SCAN_DIRS = ['pages', 'shared-components']
const SKIP_DIRS = new Set(['node_modules', '.git', '.apex', 'backup', 'scratchpad', '.apex-export-tmp', 'deployments'])

const HTMLDOMID_RE = /^(\s*htmlDomId:\s*)(\S.*?)\s*$/

function sanitize(v) {
  let s = v.normalize('NFD').replace(/[̀-ͯ]/g, '') // 1. acentos
  s = s.replace(/\s+/g, '_')            // 2. espaço -> _
  s = s.replace(/[^A-Za-z0-9_-]/g, '')   // 3. outros inválidos
  s = s.replace(/_+/g, '_').replace(/^_+|_+$/g, '') // 4. colapsa/trim _
  return s
}

function isValidId(v) {
  // Regra do apex validate: sem espaço, vírgula, aspas, : / + ? ^
  return !/[\s,'":/+?^]/.test(v)
}

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue
      yield* walk(join(dir, e.name))
    } else if (extname(e.name).toLowerCase() === '.apx') {
      yield join(dir, e.name)
    }
  }
}

let filesChanged = 0
let idsChanged = 0
const dupWarnings = []
const backups = []

for (const root of roots) {
  // Backup com timestamp passado via -ts (para agrupar com outros fixes), senão fixo.
  const BK = join(root, 'backup', `htmldomid-fix-${getArg(argv, 'ts', 'manual')}`)
  const idsBefore = idsChanged

  for (const dir of SCAN_DIRS) {
    const base = join(root, dir)
    let files
    try { files = [...walk(base)] } catch { continue }

    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      const lines = text.split('\n')

      // Coleta todos os htmlDomId do arquivo. Válidos ficam intactos; inválidos
      // recebem valor sanitizado. Nada de desduplicar válidos.
      const hits = []
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(HTMLDOMID_RE)
        if (!m) continue
        const orig = m[2]
        const valid = isValidId(orig)
        hits.push({ i, prefix: m[1], orig, valid, finalId: valid ? orig : (sanitize(orig) || 'id') })
      }
      if (hits.length === 0) continue

      // Aviso (não altera): sanitização que colide com outro htmlDomId do arquivo.
      const allFinal = hits.map((h) => h.finalId)
      for (const h of hits) {
        if (h.valid) continue
        const count = allFinal.filter((x) => x === h.finalId).length
        if (count > 1) {
          dupWarnings.push({ file: relative(clientRoot, file).replace(/\\/g, '/'), from: h.orig, to: h.finalId })
        }
      }

      // Aplica só nos inválidos (onde o valor muda).
      let changedHere = 0
      for (const h of hits) {
        if (h.valid || h.finalId === h.orig) continue
        lines[h.i] = `${h.prefix}${h.finalId}`
        changedHere++
      }
      if (changedHere === 0) continue

      filesChanged++
      idsChanged += changedHere
      if (!checkOnly) {
        const dest = join(BK, relative(root, file))
        mkdirSync(dirname(dest), { recursive: true })
        copyFileSync(file, dest)
        writeFileSync(file, lines.join('\n'))
      }
    }
  }

  if (!checkOnly && idsChanged > idsBefore) backups.push(BK)
}

console.log(`> Raiz   : ${roots.length ? roots.join(' | ') : `(nenhum app em ${clientRoot})`}`)
console.log(`> Modo   : ${checkOnly ? 'DRY-RUN (-check, nada gravado)' : 'APLICANDO'}`)
console.log(`> Arquivos com mudança : ${filesChanged}`)
console.log(`> htmlDomId alterados   : ${idsChanged}`)
for (const bk of backups) console.log(`> Backup : ${relative(clientRoot, bk).replace(/\\/g, '/')}`)

if (dupWarnings.length) {
  const uniq = [...new Map(dupWarnings.map((d) => [`${d.file}|${d.to}`, d])).values()]
  console.log(`\n⚠ ${uniq.length} ID(s) sanitizado(s) coincidem com outro htmlDomId no mesmo arquivo`)
  console.log('  (NÃO alterados — apenas aviso; resolver só se quiser DOM id único):')
  for (const d of uniq) console.log(`  - ${d.file}: "${d.from}" -> ${d.to} (duplicado)`)
} else {
  console.log('\n(nenhuma duplicata de ID introduzida)')
}
