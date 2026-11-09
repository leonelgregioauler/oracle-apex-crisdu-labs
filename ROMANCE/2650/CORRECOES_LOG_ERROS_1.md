# Correções do `apex validate` — App 2650 ROMANCE (LOG_ERROS_1.txt)

**Data:** 09/11/2026
**Origem:** `LOG_ERROS_1.txt`, com 348 erros de compilação APEXLANG
**Resultado:** `node scripts/apex-validate.mjs 2650` → **0 erros** ("Validação bem-sucedida")
**Banco:** nada foi importado. Só os arquivos `.apx` foram alterados.

---

## Resumo

| # | Tipo de erro | Páginas | Correção | Muda comportamento? |
|---|---|---|---|---|
| 1 | `INVALID_PROPERTY htmlDomId` (289×) | 71 arquivos | IDs sanitizados com `fix-htmldomid` | Não (exceto se JS/CSS usar os IDs antigos) |
| 2 | `INVALID_EXTERNAL_IDENTIFIER` | 164 | Nome do item `"P164_USERNAME<TAB>"` → `P164_USERNAME` | Não |
| 3 | `INVALID_PROPERTY targetUrl` "Multiline text not allowed" (+ cascata) | 127 | `targetUrl` em uma linha só | Não |
| 4 | `REFERENCE_NOT_FOUND` templates por ID numérico (+ `templateOptions` em cascata) | 490, 811, 813 | Trocados por templates do tema (`@/...`) | Não (visual equivalente) |
| 5 | `MISSING_REQUIRED_PROPERTY buttonTemplate` | 811 | `buttonTemplate: @/text` | Não |
| 6 | `REFERENCE_NOT_FOUND` botão em condição | 245 | Removido `whenButtonPressed` (processo já tem condição `never`) | Não |
| 7 | `REFERENCE_NOT_FOUND @/corrigir` | 373 | DA `Confirma` removida (botão `CORRIGIR` não existe) | Não (DA órfã) |
| 8 | `MISSING_REQUIRED_PROPERTY flexRegistryTable` | Shared Components | `EBA_CUST_FLEX_REGISTRY`, igual ao app 2001 | Não |
| 9 | `DUPLICATED_COMPONENT buttonName` (12×) | 43, 60, 69, 152, 207, 282 | Botão duplicado renomeado | Não (ver p69) |
| 10 | `DUPLICATED_COMPONENT column TELEFONE` | 280 | Quebra de controle repetida removida do saved report | Não |
| 11 | `COMPONENT_NOT_FOUND` process/branch (7×) | 0 (Global) | 6 processos e 1 branch removidos | Não (código morto) |
| 12 | Import: `ORA-20999` LOV Function Body não suportada (12×) | 38, 41, 45, 46, 63, 94, 104, 142, 150, 217 | `functionBody` → `staticValues STATIC2` | Não |

---

## Detalhamento

### 1. `htmlDomId` inválido (289 ocorrências, 71 arquivos)

- **Correção:** `node scripts/apex-fix-htmldomid.mjs 2650` (tira acentos, troca espaço por `_`, remove caracteres proibidos).
- **Backup:** `2650/backup/htmldomid-fix-manual/`.

> **Atenção (IDs repetidos):** 33 IDs sanitizados ficaram iguais a outro `htmlDomId` da mesma página. Não bloqueia validate nem import, mas o id no DOM deixa de ser único. Se algum JS/CSS usa esses IDs, ajuste à mão:
>
> | Página | IDs repetidos |
> |---|---|
> | 10 | `Produto_do_Varejo`, `Usuario_Cadastrou` |
> | 80 | `Ano_Pgto`, `Descricao_da_Origem`, `Tipo_Entrada` |
> | 81 | `Descricao_de_Origem` |
> | 184 | `Despesa`, `Lucro`, `Venda_Favorita`, `Comissoes_Gerente`, `Comissoes_Representantes`, `Notas_novas`, `Nro_de_Acertos`, `Pepinos_Novos`, `Pepinos_Pagos`, `Resultado_da_Semana`, `Saldo_Acumulado`, `Total_Cobranca`, `Total_Mercadorias`, `Total_Transferencias`, `Total_Venda_Favorita`, `Total_de_Despesas`, `Valor_Liquido` |
> | 203, 421 | `Dinheiro_recebido`, `Entradas_Banco`, `Saidas_Diversas` |
> | 295 | `Dinheiro_recebido`, `Entradas_Banco`, `Saidas_Diversas`, `Venda_Para_Romance` |
>
> Na **p184**, `% Despesa`, `% Lucro` e `% Venda Favorita` viraram `Despesa`, `Lucro` e `Venda_Favorita` (o `%` é removido).

### 2. Nome do item com TAB (p164)

- **Erro:** `Invalid external identifier: P164_USERNAME` (caractere restrito).
- **Causa:** o nome do item no banco era `P164_USERNAME` seguido de um TAB.
- **Correção:** `pageItem P164_USERNAME`. Nenhuma outra referência usava o nome com TAB.

### 3. `targetUrl` multilinha (p127)

- **Botão:** `inclui-fornecedores` ("Fornecedores").
- **Correção:** o bloco de 3 linhas virou `targetUrl: javascript: fnc_popup_fornecedor();`, igual ao botão `filial` logo acima.

### 4. Templates referenciados por ID numérico

IDs de templates que não existem no tema do app (páginas trazidas de outro ambiente). Mapeados pelo tipo do componente e pelas template options:

| Página | Componente | ID antigo | Novo |
|---|---|---|---|
| 813 | página (modal) `dialogTemplate` | 5855450919158148 | `@/modal-dialog` |
| 813 | região do relatório | 5881703786158159 | `@/standard` |
| 813 | template do classic report | 5900850206158166 | `@/standard` |
| 811 | página `pageTemplate` | 5856572467158148 | `@/standard` |
| 811 | regiões `combinação-produtos-sacolas`, `filtros`, `sacolas`, `solicitações-produtos-sacolas` | 5882751179158159 | `@/standard` (usam `t-Region--accent1`/`scrollBody`) |
| 811 | label dos 7 itens de filtro | 5924290377158176 | `@/optional` |
| 490 | região `itens` (só itens hidden) | 638558701236465758 | `@/blank-with-attributes` (igual às outras regiões da página) |

### 5. Botão `filtrar` sem template (p811)

- **Correção:** `buttonTemplate: @/text` (padrão do app).

### 6. Processo `reset-page` (p245)

- **Erro:** `Value not found: 340099312412549534` (botão inexistente em `whenButtonPressed`).
- **Correção:** removida a linha `whenButtonPressed`. O processo continua com condição `never`, ou seja, já não executava.

### 7. DA `Confirma` (p373)

- **Erro:** `Reference not found: @/corrigir`.
- **Causa:** a DA dispara no clique do botão `CORRIGIR` (confirm "Confirma a revisão?" + submit com request `CORRIGIR`), mas o botão não existe na página e nenhum processo usa esse request.
- **Correção:** DA removida. Se o botão for recriado, a DA precisa voltar.

### 8. Component Setting do plugin `flexField`

- **Correção:** `settings { flexRegistryTable: EBA_CUST_FLEX_REGISTRY }`, o mesmo valor do app 2001. Confirme que a tabela existe no schema do 2650.

### 9. Botões com `buttonName` duplicado

Sempre foi renomeado um botão do tipo *redirect* (não usa o `REQUEST`), exceto na p69:

| Página | Botão renomeado | Novo nome | Ação |
|---|---|---|---|
| 43 | `create-2` ("Cadastrar Cheque", condição `never`) | `CREATE_2` | redirect p44 |
| 43 | `create-3` ("Múltiplos Cheque", condição `never`) | `CREATE_3` | redirect p79 |
| 60 | `cancel-2` (condição `never`) | `CANCEL_2` | redirect p60 |
| 152 | `cancel-2` (condição `never`) | `CANCEL_2` | redirect p152 |
| 207 | `cancel-2` (condição `never`) | `CANCEL_2` | redirect p207 |
| 282 | `cancel-2` (condição `never`) | `CANCEL_2` | redirect p282 |
| 69 | `save-2` ("Confirmar", região Concluir) | `UPDATE` | submit |

> **p69:** os dois botões `SAVE` fazem submit, e o processo `Process Row of FECHAMENTOSSEMANAIS` (Automatic Row Processing) grava com esse request. O "Confirmar" passou a `UPDATE`, que o ARP também trata como update, e ganhou `databaseAction: update` explícito. Nenhum processo/branch da página testa `REQUEST = 'SAVE'`.

### 10. Quebra de controle duplicada (p280)

- **Causa:** o saved report do IR tinha `controlBreak TELEFONE` duas vezes (seq 1 e 2).
- **Correção:** removida a segunda; `TEMPOTOTAL` passou de seq 3 para 2.

### 11. Processos e branch na Global Page (p0)

- **Erro:** `Component: process adjust-calendar-date-* not found` (6×) e `Component: branch not found`.
- **Causa:** a Global Page não suporta processos nem branches. Eram processos legados de calendário (`apex_util.*_calendar`, "Generated 13/08/09"), todos com condição `never`, e um branch para a página 0.
- **Correção:** removidos.

---

## Correções do import — 09/11/2026

O validate passava com 0 erros, mas o import falhou no banco.

### 12. `ORA-20999` LOV Function Body não suportada (p38 e mais 9 páginas)

- **Erro:** `'Function Body returning SQL Query' List of Values not supported for this type!` (p00038.apx, linha 85, coluna `COMPROVADO`)
- **Causa:** colunas `selectList` de relatório tabular tinham uma **lista estática** gravada como `type: functionBody`. É um defeito do export, o mesmo do item 11 do app 2001. O validate aceita, mas o banco rejeita no import.
- **Correção:** `type: functionBody` + `plsqlFunctionBody:` → `type: staticValues` + `staticValues: STATIC2:` (`STATIC2` mantém a ordem original). Foram corrigidas todas as ocorrências do app, não só a da p38, para os imports das outras páginas não pararem no mesmo erro:

| Página | Valores |
|---|---|
| 38, 41, 46 | `STATIC2:Sem Comprovante;S,Cópia;C,Em Mãos;M` |
| 45 | `STATIC2:Sem Comprovante;S,Cópia;C,Com Gerente;G,Em Mãos;M` |
| 41, 94, 217 | `STATIC2:Dinheiro;DD,Cheque;CC,Cheque Pré Depósito;CD,Cheque Pré Resgate;CR,Em Mãos;M` |
| 63 | `STATIC2:Outros;O,Fatura;F,Investimento;I` |
| 150 | `STATIC2:Fatura;F,Investimento;I,Outros;O` |
| 104 | `STATIC2:Não;N,Sim;S` |
| 142 | `STATIC2:Em Mãos;M` |
| 217 | `STATIC2:Depósito;D,Boleto;B` |

- **Verificação:** os demais blocos `type: functionBody` do app são PL/SQL de verdade (page items, a coluna `TIPOCONTA` da p472, que retorna SQL, e as validações da p546). Não foram alterados.
- **Impacto:** nenhum. As colunas mostram os mesmos valores.

---

## Testar antes do import

- [ ] **p69:** botão "Confirmar" grava o fechamento (mensagem "Fechamento incluído/atualizado!").
- [ ] **p811 / p813:** conferir o visual da página/modal e dos filtros com os templates novos.
- [ ] **p164:** item `P164_USERNAME` (nome mudou no banco, sem o TAB).
- [ ] **p184, p203, p295, p421 e demais da tabela do item 1:** se houver JS/CSS usando os Static IDs antigos, ajustar.

## Advertências restantes (não bloqueiam)

- 455 `PROPERTY_DEPRECATED`
- 71 `INVALID_LOV`
- 71 `FILE_IGNORED` (arquivos do backup em `2650/backup/htmldomid-fix-manual`)
- 1 `FILENAME_MISMATCH`

## Backups

- `2650/backup/htmldomid-fix-manual/`: item 1 (gerado pelo script).
- Itens 2 a 11 não têm backup próprio. As alterações são pontuais e estão descritas acima.
