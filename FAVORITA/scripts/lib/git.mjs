// Helpers de git para os scripts APEXLANG: rodar `git` e pedir, de forma
// OBRIGATÓRIA e interativa, a mensagem de commit.
//
// Uso:
//   import { runGit, isGitRepo, promptRequired } from './lib/git.mjs'
//   const msg = await promptRequired('Mensagem do commit: ')
//   await runGit(['add', '-A'], { cwd })
//   await runGit(['commit', '-m', msg], { cwd })

import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

/**
 * Executa um comando git e devolve o resultado.
 *
 * @param {string[]} args            Argumentos do git (ex.: ['commit', '-m', msg]).
 * @param {object}   [opts]
 * @param {string}   [opts.cwd]      Diretório do repositório.
 * @param {boolean}  [opts.echo=true] Imprime a saída do git no console.
 * @returns {Promise<{code:number, stdout:string, stderr:string, hadError:boolean}>}
 */
export function runGit(args, { cwd = process.cwd(), echo = true } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })

    let out = ''
    let err = ''
    child.stdout.on('data', (d) => {
      const s = d.toString()
      out += s
      if (echo) stdout.write(s)
    })
    child.stderr.on('data', (d) => {
      const s = d.toString()
      err += s
      if (echo) process.stderr.write(s)
    })

    child.on('error', reject)
    child.on('close', (code) => {
      resolve({ code: code ?? 0, stdout: out, stderr: err, hadError: code !== 0 })
    })
  })
}

/** Retorna true se `cwd` está dentro de um repositório git. */
export async function isGitRepo(cwd) {
  const { code } = await runGit(['rev-parse', '--is-inside-work-tree'], { cwd, echo: false })
  return code === 0
}

/**
 * Pede um texto ao usuário e NÃO retorna enquanto ele vier vazio — o prompt é
 * obrigatório. Cancelar com Ctrl+C aborta o processo (sem commitar).
 *
 * @param {string} question  Texto exibido ao usuário.
 * @param {object} [opts]
 * @param {number} [opts.maxLen=72]  Aviso (não bloqueia) se o assunto passar disso.
 * @returns {Promise<string>}  O texto digitado, já com trim.
 */
export async function promptRequired(question, { maxLen = 72 } = {}) {
  const rl = createInterface({ input: stdin, output: stdout })
  // Ctrl+C durante o prompt: encerra limpo, sem commit.
  rl.on('SIGINT', () => {
    rl.close()
    console.error('\n✖ Operação cancelada pelo usuário (nenhum commit feito).')
    process.exit(130)
  })

  try {
    while (true) {
      const answer = (await rl.question(question)).trim()
      if (!answer) {
        console.error('  A mensagem é obrigatória. Digite algo (ou Ctrl+C para cancelar).')
        continue
      }
      if (answer.length > maxLen) {
        console.warn(`  (aviso) a 1ª linha tem ${answer.length} caracteres; o ideal é até ${maxLen}.`)
      }
      return answer
    }
  } finally {
    rl.close()
  }
}
