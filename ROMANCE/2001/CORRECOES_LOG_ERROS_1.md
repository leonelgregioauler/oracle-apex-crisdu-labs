# Correções do `apex validate` — App 2001 ROMANCE (LOG_ERROS_1.txt)

**Data:** 06/11/2026
**Origem:** `LOG_ERROS_1.txt`, com 364 erros de compilação APEXLANG
**Resultado:** `node scripts/apex-validate.mjs 2001` → **0 erros** ("Validação bem-sucedida")
**Banco:** nada foi importado. Só os arquivos `.apx` foram alterados.

---

## Resumo

| # | Tipo de erro | Páginas | Correção | Muda comportamento? |
|---|---|---|---|---|
| 1 | `INVALID_PROPERTY htmlDomId` (343×) | 75 arquivos | IDs sanitizados com `fix-htmldomid` | Não (exceto se JS/CSS usar os IDs antigos) |
| 2 | `INVALID_PROPERTY pages` "Invalid integer: 830" (+ `MISSING_REQUIRED_PROPERTY` em cascata) | 0 (Global) | `" 830"` → `830` | Não |
| 3 | `INVALID_PROPERTY item` "Multiline text not allowed" (+ cascata) | 163 | Condição `itemIsNull` → `rowsReturned` | **Sim** |
| 4 | `REFERENCE_NOT_FOUND` template (+ `templateOptions` em cascata) | 755 | `template: @/optional` | Não |
| 5 | `REFERENCE_NOT_FOUND` LOV | 172 | Nova LOV compartilhada `USUARIOS` | **Sim** (antes a LOV não existia) |
| 6 | `LOV_NOT_FOUND storage - type` | 802 | `TABLE` → `appTempFiles`, e o processo passa a ler de `APEX_APPLICATION_TEMP_FILES` | **Sim** (origem dos arquivos) |
| 7 | `MISSING_REQUIRED_PROPERTY affectedElements` (2×) | 737 | 2 ações Refresh removidas | Não (ações sem alvo) |
| 8 | `MISSING_REQUIRED_PROPERTY lov - type` | 79 | Coluna virou texto simples | Não |
| 9 | `DUPLICATED_COMPONENT buttonName CANCEL` (10×) | 8, 11, 37, 115, 319 | Um botão renomeado para `CANCEL_2` em cada página | Não |
| 10 | Import: `ORA-20987` LOV `usuarios` não encontrada | 172 | Importar o app completo antes da página | Não |
| 11 | Import: `ORA-20999` LOV Function Body não suportada | 11, 71 | `functionBody` → `staticValues STATIC2` | Não |
| 12 | Import: `ORA-40441` erro de sintaxe JSON | 400 | `linkTarget` do plugin `slideTooltip` informado explicitamente | Não |

Também foram registrados **Developer Comments** no APEX (`developer-comments.apx`) para as páginas 0, 8, 11, 37, 71, 79, 400, 115, 163, 172, 319, 737, 755 e 802.

---

## Detalhamento

### 1. `htmlDomId` inválido (343 ocorrências, 75 arquivos)

- **Erro:** `Value can not contain whitespace, comma, single quote, double quote or characters :, /, +, ?, ^`
- **Causa:** Static IDs de colunas e regiões com espaço, ponto ou acento (ex.: `Hist. Pontos`, `Região Vendedora`).
- **Correção:** `node scripts/apex-fix-htmldomid.mjs 2001`. O script tira acentos, troca espaço por `_` e remove os caracteres proibidos (ex.: `Região Vendedora` → `Regiao_Vendedora`). A lista completa de antes/depois está no [Apêndice](#apêndice--htmldomid-alterados).
- **Páginas (qtde):** 7 (23), 12 (3), 16 (8), 17 (3), 22 (4), 25 (9), 36 (12), 37 (1), 41 (25), 42 (1), 48 (3), 53 (8), 57 (8), 58 (8), 59 (8), 61 (1), 62 (2), 68 (1), 69 (1), 70 (2), 71 (2), 74 (6), 87 (1), 91 (3), 95 (1), 97 (3), 102 (1), 113 (10), 114 (2), 115 (1), 116 (1), 122 (5), 125 (2), 130 (2), 136 (2), 144 (8), 148 (2), 153 (7), 159 (2), 165 (7), 166 (1), 169 (4), 170 (4), 171 (4), 174 (15), 177 (1), 184 (1), 188 (10), 191 (2), 194 (3), 197 (4), 201 (2), 202 (1), 204 (1), 205 (2), 213 (4), 214 (19), 217 (1), 219 (2), 224 (1), 227 (2), 229 (2), 235 (1), 246 (7), 247 (2), 304 (4), 318 (10), 319 (1), 326 (1), 394 (9), 402 (1), 459 (1), 491 (16), 560 (1), 576 (4).

> **Atenção (IDs repetidos):** 17 IDs sanitizados ficaram iguais a outro `htmlDomId` da mesma página. Isso não bloqueia o validate nem o import, mas o id no DOM deixa de ser único. Se algum JS/CSS usa esses IDs, ajuste à mão:
>
> | Página | IDs repetidos |
> |---|---|
> | 7 | `Hist_Pontos`, `Nome_Representante`, `Regiao_Vendedora`, `Vendedora_Ativa`, `CNPJ_Mei`, `CPF_sem_Formatacao`, `Nome_Abreviado` |
> | 188 | `Debitos_Novos`, `Debitos_Recebidos`, `Total_Resgate`, `Vlr_Comissao` |
> | 491 | `Debitos_Novos`, `Debitos_Recebidos`, `Total_Resgate`, `Vlr_Comissao`, `Perc_Venda`, `Referente_a` |

### 2. Lista de páginas com valor inválido (p0 — Global Page)

- **Erro:** `Invalid property (Invalid integer:  830): pages` (linha 698) e, em cascata, `Missing required parameter (5107): serverSideCondition - pages` (linha 566).
- **Causa:** na condição `currentPageNotInList` do item `P0_IDFILIAL`, a lista de páginas tinha o valor `" 830"` (com espaço, entre aspas).
- **Correção:** `" 830"` → `830`.

### 3. Condição do botão `CREATE` "Importar Arquivo" (p163)

- **Erro:** `Invalid property (Multiline text not allowed): item` e, em cascata, `Missing required parameter (5103): serverSideCondition - item`.
- **Causa:** a condição era `itemIsNull`, mas o campo `item` continha uma query SQL.
- **Correção:** tipo trocado para `rowsReturned`, mantendo a mesma query:

```sql
SELECT 1
FROM DUAL
WHERE :P163_ROWID IS NULL
AND :P163_CONTROLE IS NULL
```

- **Impacto:** antes, o APEX avaliava um "item" com nome inválido, que é sempre nulo, e o botão **aparecia sempre**. Agora o botão só aparece quando `P163_ROWID` e `P163_CONTROLE` estão nulos, que é o que a query pretendia.

### 4. Template de label inexistente (p755)

- **Erro:** `Value not found: 5924156466158176` e, em cascata, `Invalid property: templateOptions`.
- **Causa:** o item `P755_RUT` referenciava por ID numérico um template que não existe no tema.
- **Correção:** `template: @/optional`, igual aos outros itens da região `informações`.

### 5. LOV da coluna `IDUSUARIO` do Interactive Report (p172)

- **Erro:** `Value not found: 2979067112646053309`
- **Causa:** a coluna `plainTextBasedOnLov` usava uma LOV compartilhada que foi apagada. Coluna de IR **só aceita LOV compartilhada**: com LOV inline o validate dá `Invalid property: type/sqlQuery`.
- **Correção:** criada a LOV compartilhada `shared-components/lovs/usuarios.apx` (name `USUARIOS`, tipo `legacySqlQuery`), e a coluna passou a usar `lov: @usuarios`:

```sql
select pck_romance.fnc_nomeusuario(usuario) display_value
     , idusuario return_value
  from usuarios
 order by 1
```

- **Impacto:** a coluna "Usuário" mostra o nome do usuário a partir de `IDUSUARIO`.

### 6. Upload de mídias `P802_MIDIA_ARQUIVO` (p802)

- **Erro:** `Invalid LOV required parameter: storage - type (string)`. Valores válidos: `appTempFiles`, `blobCol`.
- **Causa:** `storage { type: TABLE }` (armazenamento legado em `WWV_FLOW_FILES`) não é aceito no APEXlang.
- **Correção:**
  - item: `storage { type: appTempFiles  purgeFileAt: endOfRequest }`
  - processo de upload: a leitura do arquivo passou de `wwv_flow_files` para `apex_application_temp_files`:

```sql
-- antes
select filename, blob_content into l_filename, l_blob
  from wwv_flow_files
 where name = l_files(i) and flow_id = :APP_ID and created_by = :APP_USER and rownum = 1;

-- depois
select filename, blob_content into l_filename, l_blob
  from apex_application_temp_files
 where name = l_files(i) and application_id = :APP_ID and rownum = 1;
```

- O filtro `created_by` saiu porque os temp files já são da sessão. O split por `:` para múltiplos arquivos continua igual.
- **Impacto:** muda a origem dos arquivos enviados. Teste o upload antes do import.

### 7. Ações Refresh sem alvo (p737)

- **Erro:** `Missing required parameter (85): affectedElements - selectionType` (linhas 1545 e 1553).
- **Causa:** na DA `seleciona-período-semanal-ciclo`, as ações `native-refresh` (seq 60, true) e `native-refresh-2` (seq 50, false) não tinham elemento afetado, porque a região alvo foi apagada. Um Refresh sem alvo não faz nada.
- **Correção:** as duas ações foram removidas. O resto da DA não mudou.

### 8. Coluna `OBSERVACAO` sem LOV (p79)

- **Erro:** `Missing required parameter (373): lov - type (string)`
- **Causa:** coluna de classic report do tipo `plainTextBasedOnLov` sem LOV definida.
- **Correção:** removido o `type: plainTextBasedOnLov`. A coluna volta a ser texto simples, como as outras colunas `OBSERVACAO` da página.

### 9. Botões `CANCEL` duplicados (p8, p11, p37, p115, p319)

- **Erro:** `Duplicated component within parent scope. For properties: identification.buttonName: CANCEL`
- **Causa:** dois botões com `buttonName: CANCEL` na mesma página.
- **Correção:** um botão de cada página foi renomeado para `CANCEL_2`. Sempre foi escolhido um botão do tipo *redirect*, que não usa o `REQUEST`:

| Página | Botão renomeado | Região | Ação |
|---|---|---|---|
| 8 | `cancel` ("Cancelar") | Telefones | redirect p8 |
| 11 | `cancel-2` ("Voltar") | Cadastro de Produtos | redirect p10 |
| 37 | `cancel-2` ("Cancel", condição `never`) | Itens da Nota | redirect p37 |
| 115 | `cancel-2` ("Voltar") | Ações | redirect p113 |
| 319 | `cancel-2` ("Cancel", condição `never`) | Itens da Devolução | redirect p319 |

> Na **p8** o `cancel-2` ("Voltar") faz **submit**, e as branches da página testam `v('REQUEST') = 'CANCEL'`. Por isso ele manteve o nome `CANCEL` e foi o outro botão que mudou.

---

## Correções do import (LOG_ERROS_2.txt) — 08/11/2026

O validate passava com 0 erros, mas o import falhou no banco em dois pontos.

### 10. `ORA-20987` ao importar só a p172

- **Comando:** `npm run import-page -- 2001 172`
- **Erro:** `Referenced component not found in the APEX application. Component Type: lov, Identifier: usuarios`
- **Causa:** a LOV compartilhada `USUARIOS` (item 5) é nova e só existe nos arquivos. O `import-page` sobe apenas a página, e a página referencia uma LOV que ainda não está no banco.
- **Correção:** nenhuma no código. A LOV vai para o banco no **import da aplicação completa**. Depois disso, o `import-page 172` funciona normalmente.

### 11. `ORA-20999` ao importar a aplicação completa (p11, p71)

- **Erro:** `'Function Body returning SQL Query' List of Values not supported for this type!` (p00011.apx, linha 89)
- **Causa:** duas colunas `selectList` de relatório tabular tinham uma **lista estática** gravada como `type: functionBody`. Isso é um defeito do export. O validate aceita, mas o banco rejeita no import, porque coluna de relatório não suporta LOV do tipo "Function Body returning SQL Query".
- **Correção:** `type: functionBody` + `plsqlFunctionBody:` → `type: staticValues` + `staticValues: STATIC2:` (`STATIC2` mantém a ordem original dos valores):

| Página | Coluna | Valores |
|---|---|---|
| 11 | `ATIVO` | `STATIC2:Sim;S,Não;N` |
| 71 | `TIPO` | `STATIC2:Outros;O,Fatura;F,Investimento;I` |

- **Verificação:** foram conferidos todos os blocos `lov { type: functionBody }` do app. Os outros 8 casos são **page items** (p102, p290, p459, p631, p673, p683, p716, p819) com função PL/SQL que retorna SQL de verdade, que é um uso suportado. Não foram alterados.
- **Impacto:** nenhum. As colunas mostram os mesmos valores.

### 12. `ORA-40441` ao importar a aplicação completa (p400)

- **Erro:** `ORA-40441: erro de sintaxe JSON` (p00400.apx, linha 113, região `por-data`)
- **Causa:** as regiões `por-data` e `por-distribuidor` usam o plugin `slideTooltip` (COM_ORACLE_APEX_SLIDETOOLTIP). O atributo 5 do plugin, `linkTarget`, é obrigatório, do tipo *Link to target page/URL*, e tem default `#&ENAME.`. Como o valor no banco era igual ao default, o export **omitiu** o atributo. No import, o default é aplicado de novo, e o importador tenta ler `#&ENAME.` como link em JSON, o que falha.
- **Correção:** `linkTarget` informado explicitamente nas duas regiões, como URL e com o mesmo valor:

```
linkTarget: {
    type: url
    url: #&ENAME.
}
```

- **Verificação:** varri todas as regiões de plugin do app. O `slideTooltip` é o único plugin com default de link fora do formato JSON, e só a p400 o usa.
- **Impacto:** nenhum. O valor do link é o mesmo de antes. Para reverter, basta remover o bloco `linkTarget` das duas regiões.

> Ordem para subir: **import da aplicação completa** primeiro (cria a LOV `USUARIOS`). Depois disso, `import-page` de qualquer página funciona.

---

## Testar antes do import

- [ ] **p163:** o botão "Importar Arquivo" só aparece com `P163_ROWID` e `P163_CONTROLE` nulos.
- [ ] **p802:** upload de uma e de várias mídias (imagem/vídeo) até o bucket.
- [ ] **p172:** coluna "Usuário" do relatório de histórico mostra o nome.
- [ ] **p7, p188, p491:** se houver JS/CSS usando os Static IDs antigos, ajustar.

## Advertências restantes (não bloqueiam)

O validate ainda mostra 680 advertências:

- 591 `PROPERTY_DEPRECATED`: slots `body-3`, `regionBody`, `topAndBottom`, `legacyOrphanComponents`; `saveStateBeforeBranching`; `showAllOnSameLine`/`hidePageItemsOnSameLine`
- 75 `FILE_IGNORED`: os arquivos do backup em `2001/backup/htmldomid-fix-manual`
- 12 `INVALID_LOV`: slots inválidos (`CLOSE`, `REGION_POSITION_03` na p704) e template options inválidas (p840, `t-Button--hot`)
- 2 `FILENAME_MISMATCH`: p237 (`p00237-imprime-nf.apx`) e p192

## Observação sobre o script de validate

O `apex-validate.mjs` imprime "✔ Validação concluída sem erros" e sai com código 0 **mesmo quando o compilador lista erros**. Para saber se passou, confira se há linhas `Erro:` na saída ou se aparece "Validação bem-sucedida".

## Backups

- `2001/backup/htmldomid-fix-manual/`: item 1 (gerado pelo script)
- Itens 2 a 9 não têm backup próprio. As alterações são pontuais e estão descritas acima.

---

## Apêndice — `htmlDomId` alterados

<details>
<summary>343 alterações (clique para expandir)</summary>

| Arquivo | Antes | Depois |
|---|---|---|
| p00007.apx | `Hist. Pontos` | `Hist_Pontos` |
| p00007.apx | `Nome Representante` | `Nome_Representante` |
| p00007.apx | `Problema de Região` | `Problema_de_Regiao` |
| p00007.apx | `Região Vendedora` | `Regiao_Vendedora` |
| p00007.apx | `Vendedora Ativa` | `Vendedora_Ativa` |
| p00007.apx | `CNPJ Mei` | `CNPJ_Mei` |
| p00007.apx | `CPF sem Formatação` | `CPF_sem_Formatacao` |
| p00007.apx | `Cód. Repres.` | `Cod_Repres` |
| p00007.apx | `Hist. Pontos` | `Hist_Pontos` |
| p00007.apx | `Nome Abreviado` | `Nome_Abreviado` |
| p00007.apx | `Nome Gerente` | `Nome_Gerente` |
| p00007.apx | `Qtd Regiões` | `Qtd_Regioes` |
| p00007.apx | `CNPJ Mei` | `CNPJ_Mei` |
| p00007.apx | `CPF sem Formatação` | `CPF_sem_Formatacao` |
| p00007.apx | `Hist. Pontos` | `Hist_Pontos` |
| p00007.apx | `Nome Abreviado` | `Nome_Abreviado` |
| p00007.apx | `Nome Representante` | `Nome_Representante` |
| p00007.apx | `Região Vendedora` | `Regiao_Vendedora` |
| p00007.apx | `Vendedora Ativa` | `Vendedora_Ativa` |
| p00007.apx | `CNPJ Mei` | `CNPJ_Mei` |
| p00007.apx | `CPF sem Formatação` | `CPF_sem_Formatacao` |
| p00007.apx | `Hist. Pontos` | `Hist_Pontos` |
| p00007.apx | `Nome Abreviado` | `Nome_Abreviado` |
| p00012.apx | `Data Transferência` | `Data_Transferencia` |
| p00012.apx | `Representante Destino` | `Representante_Destino` |
| p00012.apx | `Representante Origem` | `Representante_Origem` |
| p00016.apx | `Qtd Distribuido` | `Qtd_Distribuido` |
| p00016.apx | `Qtd Sugerida` | `Qtd_Sugerida` |
| p00016.apx | `Região de Venda` | `Regiao_de_Venda` |
| p00016.apx | `Valor Carga + COM Comissão` | `Valor_Carga_COM_Comissao` |
| p00016.apx | `Valor Carga + SEM Comissão` | `Valor_Carga_SEM_Comissao` |
| p00016.apx | `Valor Sugerido.` | `Valor_Sugerido` |
| p00016.apx | `Valor com Comissão` | `Valor_com_Comissao` |
| p00016.apx | `Valor sem Comissão` | `Valor_sem_Comissao` |
| p00017.apx | `Data Movimento` | `Data_Movimento` |
| p00017.apx | `Repres. Destino` | `Repres_Destino` |
| p00017.apx | `Repres. Origem` | `Repres_Origem` |
| p00022.apx | `Data Confirmação` | `Data_Confirmacao` |
| p00022.apx | `Data Recebimento` | `Data_Recebimento` |
| p00022.apx | `Filial Destino` | `Filial_Destino` |
| p00022.apx | `Tipo NF` | `Tipo_NF` |
| p00025.apx | `Qtd EGG` | `Qtd_EGG` |
| p00025.apx | `Qtd EXGG` | `Qtd_EXGG` |
| p00025.apx | `Qtd G` | `Qtd_G` |
| p00025.apx | `Qtd GG` | `Qtd_GG` |
| p00025.apx | `Qtd M` | `Qtd_M` |
| p00025.apx | `Qtd P` | `Qtd_P` |
| p00025.apx | `Qtd PP` | `Qtd_PP` |
| p00025.apx | `Qtd TOTAL` | `Qtd_TOTAL` |
| p00025.apx | `Qtd U` | `Qtd_U` |
| p00036.apx | `CPF. Vend.` | `CPF_Vend` |
| p00036.apx | `Cidade. Vend.` | `Cidade_Vend` |
| p00036.apx | `Doc Estrangeiro` | `Doc_Estrangeiro` |
| p00036.apx | `Enviado para Cobrança` | `Enviado_para_Cobranca` |
| p00036.apx | `ID Repres Atende` | `ID_Repres_Atende` |
| p00036.apx | `Idsemana Atual` | `Idsemana_Atual` |
| p00036.apx | `Qtd Notas` | `Qtd_Notas` |
| p00036.apx | `Região de Venda` | `Regiao_de_Venda` |
| p00036.apx | `Repres. Atende` | `Repres_Atende` |
| p00036.apx | `Semana Cobrança` | `Semana_Cobranca` |
| p00036.apx | `Semana Distribuição` | `Semana_Distribuicao` |
| p00036.apx | `Situação Vendedora` | `Situacao_Vendedora` |
| p00037.apx | `Data Correção` | `Data_Correcao` |
| p00041.apx | `ED EGG` | `ED_EGG` |
| p00041.apx | `ED EXGG` | `ED_EXGG` |
| p00041.apx | `ED G` | `ED_G` |
| p00041.apx | `ED GG` | `ED_GG` |
| p00041.apx | `ED M` | `ED_M` |
| p00041.apx | `ED P` | `ED_P` |
| p00041.apx | `ED PP` | `ED_PP` |
| p00041.apx | `ED TOTAL` | `ED_TOTAL` |
| p00041.apx | `ED U` | `ED_U` |
| p00041.apx | `EF EGG` | `EF_EGG` |
| p00041.apx | `EF EXGG` | `EF_EXGG` |
| p00041.apx | `EF G` | `EF_G` |
| p00041.apx | `EF GG` | `EF_GG` |
| p00041.apx | `EF M` | `EF_M` |
| p00041.apx | `EF P` | `EF_P` |
| p00041.apx | `EF PP` | `EF_PP` |
| p00041.apx | `EF U` | `EF_U` |
| p00041.apx | `ER EGG` | `ER_EGG` |
| p00041.apx | `ER EXGG` | `ER_EXGG` |
| p00041.apx | `ER G` | `ER_G` |
| p00041.apx | `ER GG` | `ER_GG` |
| p00041.apx | `ER M` | `ER_M` |
| p00041.apx | `ER P` | `ER_P` |
| p00041.apx | `ER PP` | `ER_PP` |
| p00041.apx | `ER U` | `ER_U` |
| p00042.apx | `Data Movimento` | `Data_Movimento` |
| p00048.apx | `Criada em` | `Criada_em` |
| p00048.apx | `Data do Bloqueio` | `Data_do_Bloqueio` |
| p00048.apx | `Status da Conta` | `Status_da_Conta` |
| p00053.apx | `Data Movimento` | `Data_Movimento` |
| p00053.apx | `Qtd EGG` | `Qtd_EGG` |
| p00053.apx | `Qtd G` | `Qtd_G` |
| p00053.apx | `Qtd GG` | `Qtd_GG` |
| p00053.apx | `Qtd M` | `Qtd_M` |
| p00053.apx | `Qtd P` | `Qtd_P` |
| p00053.apx | `Qtd PP` | `Qtd_PP` |
| p00053.apx | `Qtd U` | `Qtd_U` |
| p00057.apx | `Data Movimento` | `Data_Movimento` |
| p00057.apx | `Qtd EGG` | `Qtd_EGG` |
| p00057.apx | `Qtd G` | `Qtd_G` |
| p00057.apx | `Qtd GG` | `Qtd_GG` |
| p00057.apx | `Qtd M` | `Qtd_M` |
| p00057.apx | `Qtd P` | `Qtd_P` |
| p00057.apx | `Qtd PP` | `Qtd_PP` |
| p00057.apx | `Qtd U` | `Qtd_U` |
| p00058.apx | `Data Movimento` | `Data_Movimento` |
| p00058.apx | `Qtd EGG` | `Qtd_EGG` |
| p00058.apx | `Qtd G` | `Qtd_G` |
| p00058.apx | `Qtd GG` | `Qtd_GG` |
| p00058.apx | `Qtd M` | `Qtd_M` |
| p00058.apx | `Qtd P` | `Qtd_P` |
| p00058.apx | `Qtd PP` | `Qtd_PP` |
| p00058.apx | `Qtd U` | `Qtd_U` |
| p00059.apx | `Data Movimento` | `Data_Movimento` |
| p00059.apx | `Qtd EGG` | `Qtd_EGG` |
| p00059.apx | `Qtd G` | `Qtd_G` |
| p00059.apx | `Qtd GG` | `Qtd_GG` |
| p00059.apx | `Qtd M` | `Qtd_M` |
| p00059.apx | `Qtd P` | `Qtd_P` |
| p00059.apx | `Qtd PP` | `Qtd_PP` |
| p00059.apx | `Qtd U` | `Qtd_U` |
| p00061.apx | `Valor Pago` | `Valor_Pago` |
| p00062.apx | `Data Pagamento` | `Data_Pagamento` |
| p00062.apx | `Valor Pago` | `Valor_Pago` |
| p00068.apx | `Descrição da Origem` | `Descricao_da_Origem` |
| p00069.apx | `Filial Destino` | `Filial_Destino` |
| p00070.apx | `Descrição da Origem` | `Descricao_da_Origem` |
| p00070.apx | `Tipo Entrada` | `Tipo_Entrada` |
| p00071.apx | `Filial Destino` | `Filial_Destino` |
| p00071.apx | `Filial Origem` | `Filial_Origem` |
| p00074.apx | `Débitos Novos` | `Debitos_Novos` |
| p00074.apx | `Débitos Recebidos` | `Debitos_Recebidos` |
| p00074.apx | `Perc Venda` | `Perc_Venda` |
| p00074.apx | `Referente a` | `Referente_a` |
| p00074.apx | `Total Resgate` | `Total_Resgate` |
| p00074.apx | `Vlr Comissão` | `Vlr_Comissao` |
| p00087.apx | `Filial Destino` | `Filial_Destino` |
| p00091.apx | `Fator Conversor` | `Fator_Conversor` |
| p00091.apx | `Notas novas` | `Notas_novas` |
| p00091.apx | `Nro de Acertos` | `Nro_de_Acertos` |
| p00095.apx | `Nome Consultora` | `Nome_Consultora` |
| p00097.apx | `% Venda Favorita` | `Venda_Favorita` |
| p00097.apx | `Total Cobrança` | `Total_Cobranca` |
| p00097.apx | `Total Venda Favorita` | `Total_Venda_Favorita` |
| p00102.apx | `Data Movimento` | `Data_Movimento` |
| p00113.apx | `Qtd EGG` | `Qtd_EGG` |
| p00113.apx | `Qtd G` | `Qtd_G` |
| p00113.apx | `Qtd GG` | `Qtd_GG` |
| p00113.apx | `Qtd M` | `Qtd_M` |
| p00113.apx | `Qtd P` | `Qtd_P` |
| p00113.apx | `Qtd PP` | `Qtd_PP` |
| p00113.apx | `Qtd U` | `Qtd_U` |
| p00113.apx | `Total COM Comissão` | `Total_COM_Comissao` |
| p00113.apx | `Total Peças` | `Total_Pecas` |
| p00113.apx | `Total SEM Comissão` | `Total_SEM_Comissao` |
| p00114.apx | `Data Movimento` | `Data_Movimento` |
| p00114.apx | `Qtd Pecas` | `Qtd_Pecas` |
| p00115-devoluções-de-distribuidor.apx | `Data da Correção` | `Data_da_Correcao` |
| p00116.apx | `Data Movimento` | `Data_Movimento` |
| p00122.apx | `ED TOTAL` | `ED_TOTAL` |
| p00122.apx | `ED U` | `ED_U` |
| p00122.apx | `EF U` | `EF_U` |
| p00122.apx | `ER U` | `ER_U` |
| p00122.apx | `Posto Avançado` | `Posto_Avancado` |
| p00125.apx | `Data Movimento` | `Data_Movimento` |
| p00125.apx | `Posto Avançado` | `Posto_Avancado` |
| p00130.apx | `EF U` | `EF_U` |
| p00130.apx | `Posto Avançado` | `Posto_Avancado` |
| p00136.apx | `Semana Cobrança` | `Semana_Cobranca` |
| p00136.apx | `Semana Distribuição` | `Semana_Distribuicao` |
| p00144.apx | `Data Movimento` | `Data_Movimento` |
| p00144.apx | `Qtd EGG` | `Qtd_EGG` |
| p00144.apx | `Qtd G` | `Qtd_G` |
| p00144.apx | `Qtd GG` | `Qtd_GG` |
| p00144.apx | `Qtd M` | `Qtd_M` |
| p00144.apx | `Qtd P` | `Qtd_P` |
| p00144.apx | `Qtd PP` | `Qtd_PP` |
| p00144.apx | `Qtd U` | `Qtd_U` |
| p00148.apx | `Data Movimento` | `Data_Movimento` |
| p00148.apx | `Posto Avançado` | `Posto_Avancado` |
| p00153.apx | `Alvo da Região` | `Alvo_da_Regiao` |
| p00153.apx | `Alvo em Aberto` | `Alvo_em_Aberto` |
| p00153.apx | `Cod Representante` | `Cod_Representante` |
| p00153.apx | `Notas da Região` | `Notas_da_Regiao` |
| p00153.apx | `Notas em Aberto` | `Notas_em_Aberto` |
| p00153.apx | `Região de Venda` | `Regiao_de_Venda` |
| p00153.apx | `Semana Cobrança` | `Semana_Cobranca` |
| p00159.apx | `Data Movimento` | `Data_Movimento` |
| p00159.apx | `Posto Avançado` | `Posto_Avancado` |
| p00165.apx | `Comissão Alterada` | `Comissao_Alterada` |
| p00165.apx | `Data Acerto` | `Data_Acerto` |
| p00165.apx | `Pedido Favorita` | `Pedido_Favorita` |
| p00165.apx | `Quitado/Pepino` | `QuitadoPepino` |
| p00165.apx | `Rep Atende` | `Rep_Atende` |
| p00165.apx | `Semana Cobrança` | `Semana_Cobranca` |
| p00165.apx | `Semana Distribuição` | `Semana_Distribuicao` |
| p00166.apx | `Semana Cobrança` | `Semana_Cobranca` |
| p00169.apx | `Nr Nota` | `Nr_Nota` |
| p00169.apx | `Região de Venda` | `Regiao_de_Venda` |
| p00169.apx | `Semana Cobrança` | `Semana_Cobranca` |
| p00169.apx | `Semana Distribuição` | `Semana_Distribuicao` |
| p00170.apx | `Quitado/Pepino` | `QuitadoPepino` |
| p00170.apx | `Região Venda` | `Regiao_Venda` |
| p00170.apx | `Semana Cobrança` | `Semana_Cobranca` |
| p00170.apx | `Semana Distribuição` | `Semana_Distribuicao` |
| p00171.apx | `Dt Liberado Filial` | `Dt_Liberado_Filial` |
| p00171.apx | `Dt Liberado Repres` | `Dt_Liberado_Repres` |
| p00171.apx | `Filial Orig` | `Filial_Orig` |
| p00171.apx | `Representante Orig` | `Representante_Orig` |
| p00174.apx | `Boleto Original` | `Boleto_Original` |
| p00174.apx | `Data Cancelamento` | `Data_Cancelamento` |
| p00174.apx | `Data Emissão` | `Data_Emissao` |
| p00174.apx | `Data Vencimento` | `Data_Vencimento` |
| p00174.apx | `Enviado para Recuperar Ass.` | `Enviado_para_Recuperar_Ass` |
| p00174.apx | `Negociação Vencida` | `Negociacao_Vencida` |
| p00174.apx | `Nro Comprovante` | `Nro_Comprovante` |
| p00174.apx | `Promotor Liberou` | `Promotor_Liberou` |
| p00174.apx | `Qtd Boletos Negociados` | `Qtd_Boletos_Negociados` |
| p00174.apx | `Quitado Via Depósito` | `Quitado_Via_Deposito` |
| p00174.apx | `Quitado s/ Comp. de Dep.` | `Quitado_s_Comp_de_Dep` |
| p00174.apx | `Recuperar Assinatura` | `Recuperar_Assinatura` |
| p00174.apx | `Restrição SPC` | `Restricao_SPC` |
| p00174.apx | `Situação Pedido` | `Situacao_Pedido` |
| p00174.apx | `Valor Total` | `Valor_Total` |
| p00177.apx | `perc Venda` | `perc_Venda` |
| p00184.apx | `Usuário Cadastrou` | `Usuario_Cadastrou` |
| p00188.apx | `Débitos Novos` | `Debitos_Novos` |
| p00188.apx | `Débitos Recebidos` | `Debitos_Recebidos` |
| p00188.apx | `Total Resgate` | `Total_Resgate` |
| p00188.apx | `Vlr Comissão` | `Vlr_Comissao` |
| p00188.apx | `Débitos Novos` | `Debitos_Novos` |
| p00188.apx | `Débitos Recebidos` | `Debitos_Recebidos` |
| p00188.apx | `Perc Venda` | `Perc_Venda` |
| p00188.apx | `Referente a` | `Referente_a` |
| p00188.apx | `Total Resgate` | `Total_Resgate` |
| p00188.apx | `Vlr Comissão` | `Vlr_Comissao` |
| p00191.apx | `Dias Atrasado` | `Dias_Atrasado` |
| p00191.apx | `Repres Ativo` | `Repres_Ativo` |
| p00194.apx | `Enviado para Cobrança` | `Enviado_para_Cobranca` |
| p00194.apx | `Recup. Promi./Enviar SPC` | `Recup_PromiEnviar_SPC` |
| p00194.apx | `Ult. Pgto` | `Ult_Pgto` |
| p00197.apx | `Promis. Recebida` | `Promis_Recebida` |
| p00197.apx | `Sit. Boleto` | `Sit_Boleto` |
| p00197.apx | `Sit. Promissória` | `Sit_Promissoria` |
| p00197.apx | `Valor Total` | `Valor_Total` |
| p00201.apx | `Data Correção` | `Data_Correcao` |
| p00201.apx | `Nr Nota` | `Nr_Nota` |
| p00202.apx | `Estoque destino` | `Estoque_destino` |
| p00204.apx | `Em Mãos` | `Em_Maos` |
| p00205.apx | `Data Correção` | `Data_Correcao` |
| p00205.apx | `Nr Nota` | `Nr_Nota` |
| p00213.apx | `Data Recebimento` | `Data_Recebimento` |
| p00213.apx | `Filial Destino` | `Filial_Destino` |
| p00213.apx | `Situação Recebimento` | `Situacao_Recebimento` |
| p00213.apx | `Tipo NF` | `Tipo_NF` |
| p00214.apx | `Qtd EGG` | `Qtd_EGG` |
| p00214.apx | `Qtd EGG Receb.` | `Qtd_EGG_Receb` |
| p00214.apx | `Qtd EXGG` | `Qtd_EXGG` |
| p00214.apx | `Qtd EXGG Receb.` | `Qtd_EXGG_Receb` |
| p00214.apx | `Qtd G` | `Qtd_G` |
| p00214.apx | `Qtd G Receb.` | `Qtd_G_Receb` |
| p00214.apx | `Qtd GG` | `Qtd_GG` |
| p00214.apx | `Qtd GG Receb.` | `Qtd_GG_Receb` |
| p00214.apx | `Qtd M` | `Qtd_M` |
| p00214.apx | `Qtd M Receb.` | `Qtd_M_Receb` |
| p00214.apx | `Qtd P` | `Qtd_P` |
| p00214.apx | `Qtd P Receb.` | `Qtd_P_Receb` |
| p00214.apx | `Qtd PP` | `Qtd_PP` |
| p00214.apx | `Qtd PP Receb.` | `Qtd_PP_Receb` |
| p00214.apx | `Qtd TOTAL` | `Qtd_TOTAL` |
| p00214.apx | `Qtd Total Receb.` | `Qtd_Total_Receb` |
| p00214.apx | `Qtd U` | `Qtd_U` |
| p00214.apx | `Qtd U Receb.` | `Qtd_U_Receb` |
| p00214.apx | `Total Item Receb.` | `Total_Item_Receb` |
| p00217.apx | `Obs Favorita` | `Obs_Favorita` |
| p00219.apx | `Total Nota` | `Total_Nota` |
| p00219.apx | `Valor Devido` | `Valor_Devido` |
| p00224.apx | `Valor Pago` | `Valor_Pago` |
| p00227.apx | `Rep, Atende` | `Rep_Atende` |
| p00227.apx | `Tipo Alt.` | `Tipo_Alt` |
| p00229.apx | `ID SITE` | `ID_SITE` |
| p00229.apx | `Região de Venda` | `Regiao_de_Venda` |
| p00235.apx | `Região de Venda` | `Regiao_de_Venda` |
| p00246.apx | `Alvo da Região` | `Alvo_da_Regiao` |
| p00246.apx | `Alvo em Aberto` | `Alvo_em_Aberto` |
| p00246.apx | `Cod Representante` | `Cod_Representante` |
| p00246.apx | `Notas da Região` | `Notas_da_Regiao` |
| p00246.apx | `Notas em Aberto` | `Notas_em_Aberto` |
| p00246.apx | `Região de Venda` | `Regiao_de_Venda` |
| p00246.apx | `Semana Cobrança` | `Semana_Cobranca` |
| p00247.apx | `Data Movimento` | `Data_Movimento` |
| p00247.apx | `Posto Avançado` | `Posto_Avancado` |
| p00304.apx | `Quitado/Pepino` | `QuitadoPepino` |
| p00304.apx | `Região Venda` | `Regiao_Venda` |
| p00304.apx | `Semana Cobrança` | `Semana_Cobranca` |
| p00304.apx | `Semana Distribuição` | `Semana_Distribuicao` |
| p00318.apx | `Qtd EGG` | `Qtd_EGG` |
| p00318.apx | `Qtd G` | `Qtd_G` |
| p00318.apx | `Qtd GG` | `Qtd_GG` |
| p00318.apx | `Qtd M` | `Qtd_M` |
| p00318.apx | `Qtd P` | `Qtd_P` |
| p00318.apx | `Qtd PP` | `Qtd_PP` |
| p00318.apx | `Qtd U` | `Qtd_U` |
| p00318.apx | `Total COM Comissão` | `Total_COM_Comissao` |
| p00318.apx | `Total Peças` | `Total_Pecas` |
| p00318.apx | `Total SEM Comissão` | `Total_SEM_Comissao` |
| p00319.apx | `Data da Correção` | `Data_da_Correcao` |
| p00326.apx | `Data Movimento` | `Data_Movimento` |
| p00394.apx | `CPF. Vend.` | `CPF_Vend` |
| p00394.apx | `Cidade. Vend.` | `Cidade_Vend` |
| p00394.apx | `Enviado para Cobrança` | `Enviado_para_Cobranca` |
| p00394.apx | `Qtd Notas` | `Qtd_Notas` |
| p00394.apx | `Região de Venda` | `Regiao_de_Venda` |
| p00394.apx | `Repres. Atende` | `Repres_Atende` |
| p00394.apx | `Semana Cobrança` | `Semana_Cobranca` |
| p00394.apx | `Semana Distribuição` | `Semana_Distribuicao` |
| p00394.apx | `Situação Vendedora` | `Situacao_Vendedora` |
| p00402.apx | `Data Movimento` | `Data_Movimento` |
| p00459.apx | `Data Movimento` | `Data_Movimento` |
| p00491.apx | `Débitos Novos` | `Debitos_Novos` |
| p00491.apx | `Débitos Recebidos` | `Debitos_Recebidos` |
| p00491.apx | `Total Resgate` | `Total_Resgate` |
| p00491.apx | `Vlr Comissão` | `Vlr_Comissao` |
| p00491.apx | `Débitos Novos` | `Debitos_Novos` |
| p00491.apx | `Débitos Recebidos` | `Debitos_Recebidos` |
| p00491.apx | `Perc Venda` | `Perc_Venda` |
| p00491.apx | `Referente a` | `Referente_a` |
| p00491.apx | `Total Resgate` | `Total_Resgate` |
| p00491.apx | `Vlr Comissão` | `Vlr_Comissao` |
| p00491.apx | `Débitos Novos` | `Debitos_Novos` |
| p00491.apx | `Débitos Recebidos` | `Debitos_Recebidos` |
| p00491.apx | `Perc Venda` | `Perc_Venda` |
| p00491.apx | `Referente a` | `Referente_a` |
| p00491.apx | `Total Resgate` | `Total_Resgate` |
| p00491.apx | `Vlr Comissão` | `Vlr_Comissao` |
| p00560.apx | `ED TOTAL` | `ED_TOTAL` |
| p00576.apx | `Quitado/Pepino` | `QuitadoPepino` |
| p00576.apx | `Região Venda` | `Regiao_Venda` |
| p00576.apx | `Semana Cobrança` | `Semana_Cobranca` |
| p00576.apx | `Semana Distribuição` | `Semana_Distribuicao` |

</details>
