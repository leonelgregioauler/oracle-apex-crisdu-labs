// Contexto de workspace APEX para os scripts.
//
// POR QUÊ: quando a conexão é de um schema que NÃO é o parsing schema do
// workspace dono do app (ex.: usuário pessoal com APEX_ADMINISTRATOR_ROLE):
//  - `apex export` e as APIs APEX falham com
//      ORA-20987: APEX - Security Group ID (your workspace identity) is invalid.
//    (e o export mostra "Exportando o Espaço de Trabalho null");
//  - `apex validate` / `apex import` enxergam vários workspaces e NÃO fazem nada:
//      "Vários espaços de trabalho disponíveis; use a opção workspaceId ou workspace."
//
// SOLUÇÃO (as duas coisas, conforme o comando):
//  - apex_util.set_workspace na sessão — só contexto de sessão, não altera o
//    banco nem associa o schema ao workspace (export, APIs);
//  - opção -workspace <NOME> no comando (validate, import).
// Funciona se o usuário conectado for parsing schema do workspace OU tiver
// APEX_ADMINISTRATOR_ROLE.
//
// Resolução do nome (o 1º que existir vence):
//   1. -workspace <NOME>        (linha de comando)
//   2. $APEX_WORKSPACE          (variável de ambiente)
//   3. auto: consulta o workspace do app pelo id (apex_applications) — 1 ida
//      extra ao banco, rápida.
// Se não resolver (ex.: 1º import de um app que ainda não existe no destino),
// segue sem workspace — o comportamento antigo; se o SQLcl reclamar de vários
// workspaces, o script falha e pede -workspace <NOME>.
// -noworkspace desliga tudo.

import { runSqlcl, getArg } from './sqlcl.mjs'

const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`

/**
 * Resolve o workspace a usar.
 *
 * @param {object} opts
 * @param {string}   opts.alias   Conexão salva (para a consulta automática).
 * @param {string[]} opts.argv    Argumentos do script (-workspace / -noworkspace).
 * @param {string|number} [opts.appId]  Id do app (modo automático).
 * @returns {Promise<{ name: string, label: string, sessionCommands: string[], cmdOption: string }>}
 *   name            : nome do workspace ('' se não resolvido/desligado);
 *   label           : texto para o log ("> Workspace : ...");
 *   sessionCommands : linhas a rodar ANTES do comando (set_workspace);
 *   cmdOption       : ' -workspace "NOME"' para anexar ao apex validate/import ('' se não houver).
 */
export async function resolveWorkspace({ alias, argv, appId }) {
  const none = (label) => ({ name: '', label, sessionCommands: [], cmdOption: '' })

  if (argv.includes('-noworkspace')) return none('(desligado: -noworkspace)')

  let name = getArg(argv, 'workspace', process.env.APEX_WORKSPACE || '').trim()
  let origem = 'informado'

  if (!name) {
    const id = appId !== undefined && appId !== null && /^\d+$/.test(String(appId)) ? String(appId) : ''
    if (!id) return none('(não resolvido: sem id de app — use -workspace <NOME> se precisar)')
    name = await lookupWorkspace(alias, id)
    origem = `auto pelo app ${id}`
    if (!name) return none(`(app ${id} não encontrado no banco — seguindo sem workspace; use -workspace <NOME> se precisar)`)
  }

  return {
    name,
    label: `${name} (${origem})`,
    sessionCommands: [`begin apex_util.set_workspace(p_workspace => ${sqlStr(name)}); end;`, '/'],
    cmdOption: ` -workspace "${name}"`,
  }
}

/** Consulta o nome do workspace dono do app (silenciosa). '' se não achar. */
async function lookupWorkspace(alias, id) {
  const { stdout } = await runSqlcl({
    alias,
    echo: false,
    preamble: ['set heading off', 'set feedback off', 'set pagesize 0', 'set verify off'],
    commands: [`select 'WS=' || max(workspace) from apex_applications where application_id = ${id};`],
  })
  const m = stdout.match(/^WS=(\S*)\s*$/m)
  return m ? m[1] : ''
}
