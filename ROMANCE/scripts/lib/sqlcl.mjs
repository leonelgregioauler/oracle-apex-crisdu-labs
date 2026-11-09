// Helper para rodar comandos no SQLcl usando uma conexão salva (-name <alias>).
//
// Uso:
//   import { runSqlcl } from './lib/sqlcl.mjs'
//   const { code, stdout } = await runSqlcl({ alias: 'MINHA_CONN', commands: ['apex export ...'] })
//
// Observações:
// - NÃO usa o launcher nativo `sql.exe` — ele crasha em algumas máquinas no
//   SQLcl 26.3. Em vez disso sobe a JVM direto (java -cp lib\* MainClass), com
//   os mesmos flags --add-opens que o script `sql` oficial usa. Isso evita o
//   crash e garante o apexlang-compiler embutido (precisa casar com o APEX do banco).
// - Requer JDK 17+ (via JAVA_HOME; senão usa `java` do PATH).
// - SQLcl localizado via SQLCL_HOME, senão na instalação padrão do winget
//   (%LOCALAPPDATA%\...\Oracle.SQLcl...\sqlcl).
// - A conexão `alias` precisa existir (crie com `connmgr` / `conn -save`, veja README).
// - Conecta sempre em modo thin (flag -thin) para não depender do Oracle
//   Instant Client nativo.

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, delimiter } from 'node:path'

const MAIN_CLASS = 'oracle.dbtools.raptor.scriptrunner.cmdline.SqlCli'

/** Localiza a pasta de instalação do SQLcl (SQL_HOME). */
function resolveSqlHome() {
  if (process.env.SQLCL_HOME && existsSync(process.env.SQLCL_HOME)) {
    return process.env.SQLCL_HOME
  }
  // Instalação padrão do winget (Oracle.SQLcl) — caminho estável entre upgrades.
  const local = process.env.LOCALAPPDATA
  if (local) {
    const wg = join(
      local, 'Microsoft', 'WinGet', 'Packages',
      'Oracle.SQLcl_Microsoft.Winget.Source_8wekyb3d8bbwe', 'sqlcl',
    )
    if (existsSync(wg)) return wg
  }
  return undefined
}

/** Caminho do executável `java` (JAVA_HOME tem prioridade; senão o do PATH). */
function resolveJavaBin() {
  const exe = process.platform === 'win32' ? 'java.exe' : 'java'
  if (process.env.JAVA_HOME) {
    const j = join(process.env.JAVA_HOME, 'bin', exe)
    if (existsSync(j)) return j
  }
  return exe
}

// Padrões que indicam erro na saída do SQLcl.
const ERROR_PATTERNS = [
  /ORA-\d{5}/,          // erros do banco
  /SP2-\d{4}/,          // erros do SQL*Plus/SQLcl
  /PLS-\d{5}/,          // erros PL/SQL
  /^Error\b/im,         // mensagens genéricas "Error ..."
  /Usage:\s*APEX EXPORT/i, // sintaxe inválida do apex export
  /is not supported by this SQLcl version/i, // APEXLang do SQLcl < versão do banco
  /Upgrade SQLcl to a version compatible/i,   // (mesma mensagem, 2ª linha)
  /Opção não reconhecida/i,  // flag inválida (ex.: -files no validate)
  /Token inesperado/i,       // argumento mal posicionado na linha de comando
  /Opção Incorreta/i,        // variação de "opção inválida" do SQLcl
  /REFERENCE_NOT_FOUND/,     // referência APEXLang não resolvida (ex.: import de página isolada)
  /Vários espaços de trabalho disponíveis/i, // validate/import sem -workspace (conexão vê vários workspaces) — não fez nada
  /Multiple workspaces/i,                    // (mesma mensagem, SQLcl em inglês)
]

/**
 * Executa uma lista de comandos numa sessão SQLcl autenticada por alias.
 *
 * @param {object} opts
 * @param {string} opts.alias            Alias da conexão salva do SQLcl.
 * @param {string[]} opts.commands       Comandos a executar (sem o `exit` final).
 * @param {string}  [opts.cwd]           Diretório de trabalho do processo sql.
 * @param {boolean} [opts.echo=true]     Imprime a saída do SQLcl no console.
 * @param {string[]} [opts.preamble]     Comandos SET antes dos principais.
 * @returns {Promise<{code:number, stdout:string, stderr:string, hadError:boolean}>}
 */
export function runSqlcl({
  alias,
  commands,
  cwd = process.cwd(),
  echo = true,
  preamble = ['set define off', 'whenever sqlerror exit failure', 'whenever oserror exit failure'],
}) {
  if (!alias) throw new Error('alias da conexão é obrigatório')
  if (!Array.isArray(commands) || commands.length === 0) {
    throw new Error('informe ao menos um comando')
  }

  const sqlHome = resolveSqlHome()
  if (!sqlHome) {
    throw new Error(
      'SQLcl não encontrado. Defina SQLCL_HOME ou instale via winget (Oracle.SQLcl).',
    )
  }
  const javaBin = resolveJavaBin()
  // Classpath: todos os jars de lib e lib\ext (onde fica o apexlang-compiler).
  const classpath = [join(sqlHome, 'lib', '*'), join(sqlHome, 'lib', 'ext', '*')].join(delimiter)

  return new Promise((resolve, reject) => {
    // Flags da JVM copiados do launcher `sql` oficial (sem eles o SQLcl quebra
    // com InaccessibleObjectException de java.prefs/java.lang).
    const jvmArgs = [
      '--add-opens=java.prefs/java.util.prefs=ALL-UNNAMED',
      '--add-opens=java.base/java.lang=ALL-UNNAMED',
      '--enable-native-access=ALL-UNNAMED',
      '-Djava.awt.headless=true',
      `-Dsqlcl.home=${sqlHome}`,
      '-Doracle.sqlcl.skipOracleHome=true',
      '-cp', classpath,
      MAIN_CLASS,
    ]
    // -S (silent) reduz o banner; -thin força o driver JDBC thin (evita o modo
    // thick/OCI, que exige o Instant Client nativo — causa do erro
    // "no ocijdbc23 in java.library.path"); -name usa a conexão salva.
    const child = spawn(javaBin, [...jvmArgs, '-S', '-thin', '-name', alias], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (d) => {
      const s = d.toString()
      stdout += s
      if (echo) process.stdout.write(s)
    })
    child.stderr.on('data', (d) => {
      const s = d.toString()
      stderr += s
      if (echo) process.stderr.write(s)
    })

    child.on('error', reject)
    child.on('close', (code) => {
      const combined = stdout + '\n' + stderr
      const hadError = code !== 0 || ERROR_PATTERNS.some((re) => re.test(combined))
      resolve({ code: code ?? 0, stdout, stderr, hadError })
    })

    // Alimenta os comandos via stdin e encerra com exit.
    const script = [...preamble, ...commands, 'exit'].join('\n') + '\n'
    child.stdin.write(script)
    child.stdin.end()
  })
}

/** Lê o valor de um argumento no formato `-chave valor` ou `--chave=valor`. */
export function getArg(argv, name, fallback = undefined) {
  const flag = `-${name}`
  const flagLong = `--${name}=`
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === flag && i + 1 < argv.length) return argv[i + 1]
    if (argv[i].startsWith(flagLong)) return argv[i].slice(flagLong.length)
  }
  return fallback
}

// Flags que recebem valor (`-flag valor`): o valor NÃO é argumento posicional.
// (Sem isso, em `import-page 2000 3 -m "msg"` o "msg" virava posicional.)
const VALUE_FLAGS = new Set([
  'alias', 'app', 'id', 'dir', 'input', 'exptype', 'deployment',
  'workspace', 'page', 'm', 'message', 'ts',
])

/** Argumentos posicionais (sem "-"), ignorando os valores das flags com valor. */
export function getPositionals(argv) {
  const out = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('-')) {
      if (!a.includes('=') && VALUE_FLAGS.has(a.replace(/^-+/, ''))) i++ // pula o valor
      continue
    }
    out.push(a)
  }
  return out
}
