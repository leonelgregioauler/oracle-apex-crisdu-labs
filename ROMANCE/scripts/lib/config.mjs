// Configuração centralizada das conexões dos scripts APEXLANG.
//
// A conexão salva padrão (DEFAULT_ALIAS) fica em scripts/connection.config.json
// — um arquivo JSON editável por qualquer um (usuário ou TI) SEM mexer no código.
// Basta ter a conexão criada no SQLcl (connmgr / connect -save, veja README) e
// apontar o campo "defaultAlias" para o nome dela.
//
// Precedência do alias nos scripts continua a mesma:
//   -alias <nome>  >  $APEX_DB_ALIAS  >  defaultAlias (deste arquivo)

import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// scripts/connection.config.json fica um nível acima de scripts/lib/.
const CONFIG_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'connection.config.json')

/**
 * Lê o alias da conexão padrão do connection.config.json.
 * Retorna undefined se o arquivo não existir, estiver inválido ou sem o campo —
 * nesses casos o script exige -alias/APEX_DB_ALIAS e mostra o erro de sempre.
 *
 * @returns {string | undefined}
 */
export function getDefaultAlias() {
  if (!existsSync(CONFIG_FILE)) return undefined
  try {
    const json = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'))
    const alias = json?.defaultAlias
    return typeof alias === 'string' && alias.trim() ? alias.trim() : undefined
  } catch {
    return undefined
  }
}
