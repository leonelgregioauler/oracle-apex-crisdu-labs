#!/usr/bin/env node
// Limpa relatórios de Interactive Grid que travam o import de páginas com
// ORA-20987 ("... must not have more than one 'primary' saved report").
//
// POR QUÊ: ao importar uma página, o APEX tenta substituir o relatório PRIMARY
// (do desenvolvedor) do IG. Qualquer relatório NÃO-primário que aponte para esse
// primário como "base" (relatórios de usuário: SESSION/PRIVATE) impede a exclusão
// do primário antigo — então o import cria um segundo primário → ORA-20987.
// A correção é remover esses relatórios não-primários órfãos ANTES do import.
//
// O QUE FAZ (seguro, nunca toca em PRIMARY):
//   FASE A — purga as SESSÕES APEX EXPIRADAS donas de relatórios do tipo SESSION
//            (apex_session.delete_session). Remove os relatórios SESSION órfãos.
//   FASE B — apaga relatórios PRIVATE órfãos via apex_ig.delete_report(app, id).
//
// NÃO MEXE (apenas reporta como aviso):
//   - PRIMARY                      (relatório do app)
//   - ALTERNATIVE                  (definido no .apx; o import reconcilia; a API
//                                   apex_ig.delete_report nem apaga — dá ORA-01403)
//   - SESSION de sessão ATIVA      (apagaria a view de um usuário logado agora)
//   - SESSION órfã (sessão sumiu)  (não há API p/ apagar sem a sessão; raro)
//
// Serve para QUALQUER relatório em QUALQUER página do app (varre tudo). Dá para
// limitar a uma página com -page.
//
// Uso:
//   node scripts/apex-fix-ig-reports.mjs 2000            # aplica no app 2000
//   node scripts/apex-fix-ig-reports.mjs 2000 -check     # dry-run: só mostra o que faria
//   node scripts/apex-fix-ig-reports.mjs 2000 -page 305  # só a página 305
//   node scripts/apex-fix-ig-reports.mjs 2000 -alias PROD_OCI
//   node scripts/apex-fix-ig-reports.mjs 2000 -force-active   # TAMBÉM purga sessões ATIVAS (⚠ desloga usuários)
//
// O app (1º posicional ou -app) é o id da aplicação no banco. Só mexe no banco,
// então a pasta do app não precisa existir.

import { runSqlcl, getArg } from './lib/sqlcl.mjs'
import { projectPaths, resolveApp } from './lib/apexlang.mjs'
import { getDefaultAlias } from './lib/config.mjs'
import { resolveWorkspace } from './lib/workspace.mjs'

const { clientRoot } = projectPaths(import.meta.url)
const argv = process.argv.slice(2)

const checkOnly = argv.includes('-check') || argv.includes('--check')
const forceActive = argv.includes('-force-active')
const alias = getArg(argv, 'alias', process.env.APEX_DB_ALIAS || getDefaultAlias())
const { appId: appIdStr } = resolveApp(argv, clientRoot, {
  mustExist: false,
  usage: 'node scripts/apex-fix-ig-reports.mjs 2000 -check',
})
const appId = Number(appIdStr)
const pageArg = getArg(argv, 'page', '')
const pageId = pageArg ? Number(pageArg) : undefined

if (!alias) {
  console.error('Erro: defina a conexão com -alias <nome>, $APEX_DB_ALIAS ou connection.config.json.')
  process.exit(2)
}
if (pageArg && !Number.isFinite(pageId)) {
  console.error(`Erro: -page inválido: ${pageArg}`)
  process.exit(2)
}

const q = "'"
const pageFilter = pageId !== undefined ? `and r.page_id = ${pageId}` : ''
const pageFilter2 = pageId !== undefined ? `and page_id = ${pageId}` : ''
// Em -force-active, a Fase A também purga sessões ATIVAS (não só expiradas).
const sessaoCond = forceActive ? '1=1' : 'ws.session_idle_timeout_on < sysdate'

console.log(`> Conexão : ${alias}`)
console.log(`> App     : ${appId}${pageId !== undefined ? `  | Página: ${pageId}` : ''}`)
console.log(`> Modo    : ${checkOnly ? 'DRY-RUN (-check, nada gravado)' : 'APLICANDO'}${forceActive ? '  | -force-active (purga sessões ATIVAS também)' : ''}`)
console.log('---')

// ---------- DRY-RUN: só varre e classifica ----------
const checkSql = `
set linesize 240
set pagesize 500
col region_name format a38
col type format a12
col situacao format a9
col user_name format a16
col acao_planejada format a26
prompt === Relatórios de IG NÃO-primários (app ${appId}${pageId !== undefined ? `, pg ${pageId}` : ''}) ===
select r.page_id, r.region_name, r.type, r.report_id,
       case when r.session_id is null then null
            when s.apex_session_id is null then ${q}SUMIU${q}
            when s.session_idle_timeout_on < sysdate then ${q}EXPIRADA${q}
            else ${q}ATIVA${q} end situacao,
       s.user_name,
       case
         when r.type = ${q}ALTERNATIVE${q} then ${q}PULAR (definido no app)${q}
         when r.type = ${q}PRIVATE${q}     then ${q}DELETAR REPORT${q}
         when r.type = ${q}SESSION${q} and s.apex_session_id is null then ${q}PULAR (sessao sumiu)${q}
         when r.type = ${q}SESSION${q} and s.session_idle_timeout_on < sysdate then ${q}PURGAR SESSAO${q}
         when r.type = ${q}SESSION${q} then ${forceActive ? `${q}PURGAR SESSAO (ativa)${q}` : `${q}PULAR (sessao ativa)${q}`}
         else ${q}PULAR${q}
       end acao_planejada
  from apex_appl_page_ig_rpts r
  left join apex_workspace_sessions s on s.apex_session_id = r.session_id
 where r.application_id = ${appId} and r.type <> ${q}PRIMARY${q} ${pageFilter}
 order by r.page_id, r.type;
prompt
prompt (dry-run: nada foi alterado. rode sem -check para aplicar.)
`

// ---------- APLICAR: purga sessões + apaga PRIVATE ----------
const applySql = `
set serveroutput on
set linesize 240
declare
  l_purged  number := 0;
  l_deleted number := 0;
  l_failed  number := 0;
  l_skipped number := 0;
begin
  apex_session.create_session(p_app_id => ${appId}, p_page_id => 1, p_username => 'SCRIPT_FIX');

  -- FASE A: purgar sessões donas de relatórios SESSION (${forceActive ? 'ativas + expiradas' : 'somente expiradas'})
  for s in (
    select distinct r.session_id
      from apex_appl_page_ig_rpts r
      join apex_workspace_sessions ws on ws.apex_session_id = r.session_id
     where r.application_id = ${appId} and r.type = ${q}SESSION${q} ${pageFilter}
       and ${sessaoCond}
  ) loop
    begin
      apex_session.delete_session(p_session_id => s.session_id);
      l_purged := l_purged + 1;
      dbms_output.put_line(${q}FASE A: sessao purgada -> ${q}||s.session_id);
    exception when others then
      l_failed := l_failed + 1;
      dbms_output.put_line(${q}FASE A FALHA sessao ${q}||s.session_id||${q}: ${q}||substr(sqlerrm,1,120));
    end;
  end loop;
  commit;

  -- FASE B: apagar relatórios PRIVATE órfãos (nunca PRIMARY; ALTERNATIVE fica)
  for r in (
    select report_id, type, page_id
      from apex_appl_page_ig_rpts
     where application_id = ${appId} and type = ${q}PRIVATE${q} ${pageFilter2}
  ) loop
    begin
      apex_ig.delete_report(p_application_id => ${appId}, p_report_id => r.report_id);
      l_deleted := l_deleted + 1;
      dbms_output.put_line(${q}FASE B: PRIVATE pg ${q}||r.page_id||${q} id ${q}||r.report_id||${q} removido${q});
    exception when others then
      l_failed := l_failed + 1;
      dbms_output.put_line(${q}FASE B FALHA report ${q}||r.report_id||${q} (pg ${q}||r.page_id||${q}): ${q}||substr(sqlerrm,1,120));
    end;
  end loop;
  commit;

  dbms_output.put_line(${q}==== RESUMO: sessoes_purgadas=${q}||l_purged||${q} private_apagados=${q}||l_deleted||${q} falhas=${q}||l_failed);
end;
/

prompt === ESTADO FINAL: relatórios NÃO-primários remanescentes (app ${appId}${pageId !== undefined ? `, pg ${pageId}` : ''}) ===
set pagesize 500
col region_name format a40
col type format a12
col situacao format a9
select r.page_id, r.region_name, r.type, r.report_id,
       case when r.session_id is null then null
            when s.apex_session_id is null then ${q}SUMIU${q}
            when s.session_idle_timeout_on < sysdate then ${q}EXPIRADA${q}
            else ${q}ATIVA${q} end situacao
  from apex_appl_page_ig_rpts r
  left join apex_workspace_sessions s on s.apex_session_id = r.session_id
 where r.application_id = ${appId} and r.type <> ${q}PRIMARY${q} ${pageFilter}
 order by r.page_id, r.type;
prompt
prompt (restantes acima, se houver, sao ALTERNATIVE definidos no .apx ou SESSION de sessao ativa/sumida.)
`

const sql = checkOnly ? checkSql : applySql
// Workspace da sessão (evita ORA-20987 "Security Group ID ... is invalid" nas
// views/APIs APEX quando a conexão não é o parsing schema do workspace).
const ws = await resolveWorkspace({ alias, argv, appId: appId })
console.log(`> Workspace: ${ws.label}`)
const { hadError } = await runSqlcl({ alias, commands: [...ws.sessionCommands, ...sql.split('\n')] })
if (hadError) {
  console.error('\n⚠ Houve erro na execução (veja a saída do SQLcl acima).')
  process.exit(1)
}
console.log(checkOnly ? '\n✔ Dry-run concluído.' : '\n✔ Limpeza concluída.')
