# Correções do `apex validate` — App 2000 (LOG_ERROS_1.txt)

**Data:** 06/11/2026
**Origem:** `LOG_ERROS_1.txt`, com 61 erros de compilação APEXLANG
**Resultado:** `npm run validate -- 2000` → **0 erros** ("Validação bem-sucedida")
**Banco:** nada foi importado. Só os arquivos `.apx` foram alterados.

---

## Resumo

| # | Tipo de erro | Páginas | Correção | Muda comportamento? |
|---|---|---|---|---|
| 1 | `PLUGIN_NOT_FOUND` `plugin/select` (+ `INVALID_PROPERTY` em cascata) | 515, 517 | Colunas de IG trocadas para `selectList` | Sim: perdem a busca do Select2 |
| 2 | `INVALID_PROPERTY htmlDomId` | 175, 244, 245 | 12 IDs sanitizados | Não |
| 3 | `REFERENCE_NOT_FOUND` page group | 453, 455 | Referência removida | Não |
| 4 | `REFERENCE_NOT_FOUND` authorization scheme | 248 | Referência removida | Não (página já é pública) |
| 5 | `REFERENCE_NOT_FOUND` botão de DA | 594, 598, 415 | DAs removidas | Não (nunca disparavam) |
| 6 | `REFERENCE_NOT_FOUND` botão de DA | 439 | DA religada ao botão `@create` | **Sim** |
| 7 | `MISSING_REQUIRED_PROPERTY affectedElements` | 74 | DA removida | Não (ações sem alvo) |
| 8 | `MISSING_REQUIRED_PROPERTY affectedElements` | 418, 626 | Ações religadas ao botão `@inserir` | **Sim** |
| 9 | `MISSING_REQUIRED_PROPERTY lov` | 227 | Nova LOV SQL em `SITUACOESPAGAMENTOSPED` | **Sim** (antes a LOV não existia) |

---

## Detalhamento

### 1. Coluna de IG com plugin `select` (p515, p517)

- **Erro:** `Plugin not found for column component: plugin/select`, seguido de `Invalid property: type / sqlQuery / displayExtraValues / displayNullValue / valueRequired / databaseColumn / dataType` (efeito cascata do tipo desconhecido).
- **Causa:** o plugin `Select2` (`shared-components/plugins/item/select`, staticId `BE.CTB.SELECT2`) declara `supports: pageItems`. Ele **não suporta coluna de Interactive Grid**, então o compilador não reconhece o tipo na coluna.
- **Correção:** `type: plugin/select` → `type: selectList` nas colunas abaixo. A LOV, `validation` e `source` foram mantidas sem alteração:
  - p515: `IDPRODUTO`
  - p517: `IDEMPRESAVIRTUALAGE`, `IDFILIALROMANCE`, `IDPOSTOAVANCADO`
- **Impacto:** na grade, essas colunas viram lista de seleção simples, sem a busca do Select2.
- **Não alterado:** os **itens de página** da p515 que usam `plugin/select` (linhas 444 e 475) são válidos e continuam com Select2.

### 2. `htmlDomId` inválido (p175, p244, p245)

- **Erro:** `Value can not contain whitespace, comma, single quote, double quote or characters :, /, +, ?, ^`
- **Correção:** `npm run fix-htmldomid -- 2000`. O script tira acentos, troca espaço por `_` e remove os caracteres proibidos:

| Página | Antes | Depois |
|---|---|---|
| 175 | `Data Fim` | `Data_Fim` |
| 175 | `Data Inicio` | `Data_Inicio` |
| 175 | `Dt Ini Filtro` | `Dt_Ini_Filtro` |
| 175 | `Observação Histórico` | `Observacao_Historico` |
| 175 | `Observação Tarefa` | `Observacao_Tarefa` |
| 175 | `Situação Histórico` | `Situacao_Historico` |
| 175 | `Situação Tarefa` | `Situacao_Tarefa` |
| 175 | `Tipo Tarefa` | `Tipo_Tarefa` |
| 175 | `Tipo Tarefa Hist.` | `Tipo_Tarefa_Hist` |
| 244 | `Descrição da Origem` | `Descricao_da_Origem` |
| 244 | `Tipo Entrada` | `Tipo_Entrada` |
| 245 | `Descrição de Origem` | `Descricao_de_Origem` |

> **Ajuste no script:** a regra de "ID válido" do `apex-fix-htmldomid.mjs` foi alinhada à do compilador. Hífen e acento são **válidos** e não são mais tocados. Antes, o script também alterava IDs como `acoes-702` e `bonus-adimplencia-menu`, que podem estar referenciados em CSS/JS.

### 3. Page group inexistente (p453, p455)

- **Erro:** `Value not found: 71124022821844069`
- **Causa:** o app não tem `page-groups.apx`. O grupo foi apagado no Builder.
- **Correção:** removida a linha `pageGroup: 71124022821844069`.

### 4. Authorization scheme inexistente (p248)

- **Erro:** `Value not found: 773202041416886674`
- **Causa:** o app só tem os schemes `atendimento` e `valida-acesso-a-página`. O referenciado foi apagado.
- **Correção:** removida a linha `authorizationScheme: 773202041416886674`. A página já é `authentication: public`.

### 5. Dynamic Actions ligadas a botões inexistentes — removidas (p594, p598, p415)

Essas DAs dependem de um botão que não existe mais na página, então **nunca disparavam**. Remover não muda o comportamento.

| Página | DA | Botão referenciado |
|---|---|---|
| 594 | `chamaSR` | `@/incluirsr` |
| 594 | `New_1` | `@/fechar` |
| 598 | `chamaSR` | `4079400616848204558` |
| 598 | `New_1` | `4079400503642204557` |
| 415 | `DESATIVADO Incluir nova cobrança frete e novo endereço` (já tinha `serverSideCondition: never`) | `3164133679486470582` |

### 6. DA religada ao botão `@create` (p439)

- **Erro:** `Value not found: 1449289741170264746`
- **Correção:** a DA `Create Button - Dialog Closed` (evento `apexafterclosedialog`) agora usa `button: @create`, botão que existe na página. O nome da DA indica que essa era a intenção.
- **Impacto:** a DA **passa a disparar** quando o diálogo aberto pelo botão Create é fechado. Antes isso não acontecia.

### 7. DA `Tipo Processo` sem alvo — removida (p74)

- **Erro:** `Missing required parameter (85): affectedElements - selectionType` (4×)
- **Causa:** as 4 ações (`hide` / `show`) não tinham elemento afetado, porque o alvo original foi apagado. Elas não faziam nada.
- **Correção:** removida a DA `Tipo Processo` inteira. Ela só continha essas 4 ações.

### 8. Ações religadas ao botão `@inserir` (p418, p626)

- **Erro:** `Missing required parameter (85): affectedElements - selectionType`
- **Correção:** adicionado `affectedElements { selectionType: button, button: @inserir }`, no mesmo padrão da p77:
  - DA `ESCONDE O BOTÃO` → ação `disable`
  - DA `libera botão de inserir` → ação `enable`
- **Impacto:** o botão Inserir **passa a ser desabilitado** ao ser clicado (evita duplo envio) e é reabilitado quando os campos do formulário mudam.

### 9. LOV de `P227_IDSITUACAO` (p227)

- **Erro:** `Missing required parameter (114): lov`
- **Causa:** o item usava uma LOV compartilhada que foi apagada.
- **Correção:** LOV passou a ser SQL, conforme definido pelo time:

```sql
select s.descricao d
     , s.idsituacaopagamentoped r
from situacoespagamentosped s
order by 1
```

---

## Testar antes do import

- [ ] **p515 / p517:** edição na grade das colunas que viraram `selectList`.
- [ ] **p439:** comportamento ao fechar o diálogo do botão Create.
- [ ] **p418 / p626:** botão Inserir desabilita ao clicar e reabilita ao alterar os campos.
- [ ] **p227:** lista de Situação exibe e grava os valores corretos.

## Advertências restantes (não bloqueiam)

O validate ainda mostra 125 advertências:

- 97 `PROPERTY_DEPRECATED`
- 13 `INVALID_LOV`: slots de layout inválidos, como `CLOSE` e `CHANGE` na p145
- 14 `FILE_IGNORED`
- 1 `FILENAME_MISMATCH`

## Backups

- `2000/backup/fix-validate-20261106/`: itens 3 a 9 (11 páginas)
- `2000/backup/htmldomid-fix-20261106/`: item 2

O item 1 (troca de `plugin/select`) não tem backup próprio. Para reverter, basta voltar `type: selectList` para `type: plugin/select` nas colunas listadas.
