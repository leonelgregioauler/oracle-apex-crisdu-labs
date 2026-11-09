# Correções dos erros do `apex validate`: app 20010

**Data:** 06/11/2026
**Origem dos erros:** `LOG_ERROS_2.txt`
**Resultado:** `node scripts/apex-validate.mjs 20010` passa sem erros (exit 0). Restam só advertências.

## Resumo

O `validate` encontrou 5 erros em 3 páginas. Nos três casos, uma ação dinâmica (DA) apontava para um elemento que não existe mais ou não tinha nenhum elemento afetado. Ou seja, essas DAs **nunca faziam nada em tempo de execução**.

A correção foi **remover essas DAs órfãs**, sem mudar o comportamento atual do app.

| Página | Erro | Causa | Correção |
|---|---|---|---|
| 51 (`p00051.apx`) | `REFERENCE_NOT_FOUND: Value not found: 4601937599936614264` | A DA `filtrar-2` (evento `click`) referenciava, pelo ID numérico, um botão que não existe mais na página. | DA `filtrar-2` removida. |
| 18 (`p00018.apx`), linhas 1270 e 1278 | `MISSING_REQUIRED_PROPERTY: affectedElements - selectionType` | As ações `hide`/`show` da DA `filtra-referencias` não tinham elementos afetados definidos. | DA `filtra-referencias` removida. |
| 66 (`p00066.apx`), linhas 1072 e 1080 | `MISSING_REQUIRED_PROPERTY: affectedElements - selectionType` | Mesmo problema da página 18. Além disso, o item `P66_REFERENCIA` usado no gatilho da DA não existe na página. | DA `filtra-referencias` removida. |

## Detalhes

### Página 51: DA `filtrar-2`

- A DA disparava no clique do botão `4601937599936614264`. Esse botão foi excluído da página, mas a DA continuou lá.
- Ela era uma **duplicata** da DA `filtrar`, que continua na página: mesma ação (`submitPage` com request `FILTRAR`), disparada pelo botão `@filtrar`.
- Removê-la não muda nada: o botão Filtrar segue funcionando pela DA `filtrar`.

### Página 18: DA `filtra-referencias`

- Gatilho: mudança do item `P18_REFERENCIA`, com condição client-side `P18_REFERENCIA = 'S'`.
- Ações: `hide` (quando a condição é falsa) e `show` (quando é verdadeira), **ambas sem elementos afetados**. Na prática, não escondiam nem mostravam nada.
- **Pendente para decisão:** pelo nome, a intenção provável era mostrar ou esconder o botão `FILTRAR_REFERENCIAS` conforme o valor de `P18_REFERENCIA`. Se for o caso, a DA pode ser recriada com os elementos afetados apontando para esse botão. Atenção: isso **muda o comportamento visível**, porque o botão passaria a ficar oculto quando o valor for `N`.

### Página 66: DA `filtra-referencias`

- Mesma estrutura da página 18, mas o item `P66_REFERENCIA` **não existe** na página, e também não há botão de filtrar referências.
- A DA era resíduo de uma cópia da página 18 e não tinha como disparar.

## Erro no import: `ORA-40441: erro de sintaxe JSON` (página 14)

**Erro:** `pages/p00014.apx`, linha 153, tipo `PLSQL_ERROR`: `ORA-40441: erro de sintaxe JSON`. Aparece só no `apex import`; o `validate` não acusa.

**Causa:** a região `situações-de-pedidos-hoje` usa o plugin `slideTooltip` (Slide Tooltip) e não informa o atributo `linkTarget` (attribute_05). No plugin, esse atributo era `required` e tinha como default `#&ENAME.`. No import, o compilador aplica o default. Atributos do tipo `linkToTargetPageUrl` são gravados como JSON, e `#&ENAME.` não é um JSON válido, por isso o erro. A página 15 tem a mesma região e cairia no mesmo erro.

**Correção:** em `shared-components/plugins/region/slideTooltip/custom-attributes.apx`, removi o `default` (`#&ENAME.`) e o `validation { required: true }` do `linkTarget`. Agora ele fica igual ao `linkTarget` dos outros plugins de região do app (badgeList, d3*, flotPieChart), que não são obrigatórios e não têm default. As regiões continuam sem link, como estavam no app original.

## Advertências restantes (não bloqueiam o import)

- `PROPERTY_DEPRECATED`: `acceptPre202UrlChecksums` (application.apx), `saveStateBeforeBranching` (p11, p12) e `postCalculationComputation` (p39).
- `PROPERTY_DEPRECATED`: slot `body-3` (p11, p12) e slot `regionBody` (p88, p89).
- `FILENAME_MISMATCH`: o alias da página em `p00101-login-desktop.apx` não bate com o nome do arquivo.

## Próximos passos

1. Decidir se a DA da página 18 deve ser recriada apontando para o botão `FILTRAR_REFERENCIAS` (ver acima).
2. Importar o app inteiro, porque a correção do plugin é um componente compartilhado: `node scripts/apex-import.mjs 20010 -alias <AMBIENTE>`. Se o plugin já estiver correto no destino, dá para importar só as páginas alteradas (18, 51 e 66):
   ```sh
   node scripts/apex-import-page.mjs 20010 18 -alias <AMBIENTE>
   node scripts/apex-import-page.mjs 20010 51 -alias <AMBIENTE>
   node scripts/apex-import-page.mjs 20010 66 -alias <AMBIENTE>
   ```
   Até agora **nada foi importado** no banco.
