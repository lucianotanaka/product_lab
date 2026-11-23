# Product Lab — Regras de Sync ADO no Integration Hub

## Objetivo

Este documento descreve as regras de importação de itens de backlog do **Azure DevOps (ADO)** quando o usuário clica no botão **SYNC** em uma connection do tipo **provider = Azure DevOps** no módulo **Integration Hub** do Product Lab.

Base técnica analisada:
- `backend/app/api/v1/endpoints/integrations.py`

---

## 1. Visão geral do fluxo

Ao clicar em **SYNC** em uma connection ADO, o Product Lab executa o endpoint:

- `POST /integrations/connections/{id}/sync`

Esse fluxo é o **legacy full-sync**, executado em background.

### Regras principais
- o sync só é permitido para connections com provider `azure_devops`
- é criado um registro em `integration_sync_logs`
- o processamento roda em background pela função `_background_sync(...)`
- a lógica principal de importação é executada por `_run_ado_sync(...)`

---

## 2. Registro de log da execução

Quando o sync é iniciado, o sistema cria um log com:

- `operation_type = "full_sync"`
- `status = "running"`
- `started_at = datetime.utcnow()`
- `triggered_by = usuário autenticado`

Ao concluir com sucesso:
- `status = "completed"`
- `finished_at` é preenchido
- `items_created`, `items_updated` e `items_skipped` são atualizados
- `details` recebe metadados da sincronização
- `connection.last_sync_at` é atualizado
- `connection.last_error` é limpo

Ao falhar:
- `status = "failed"`
- `finished_at` é preenchido
- `error_message` recebe a exceção
- `connection.last_error` é atualizado

---

## 3. Parâmetros da connection usados no sync

O escopo do que será importado depende principalmente dos parâmetros da connection:

- `org_url`
- `project`
- `area_path`
- `sync_types`
- `sync_all_types`

Esses parâmetros são usados para montar a consulta WIQL e para buscar os detalhes dos work items no ADO.

---

## 4. Regra de montagem da WIQL

A consulta WIQL é construída por `_build_ado_wiql(...)`.

### Regras
- sempre filtra por:
  - `System.TeamProject = project`
- se `area_path` estiver preenchido:
  - adiciona `AND [System.AreaPath] UNDER '{area_path}'`
- se `sync_all_types = false`:
  - adiciona filtro por tipo de work item
- ordena por:
  - `[System.ChangedDate] DESC`

### Estrutura geral
```sql
SELECT [System.Id]
FROM WorkItems
WHERE [System.TeamProject] = '{project}'
  [filtros de tipo]
  [filtro de area_path]
ORDER BY [System.ChangedDate] DESC
```

---

## 5. Regras de filtro por tipo de work item

O parâmetro `sync_types` define quais tipos entram no sync.

### Comportamento padrão
Se `sync_types` não estiver informado, o default é:

- `User Story`

### Normalizações aceitas
O sistema normaliza aliases de tipo, por exemplo:

- `story` → `User Story`
- `userstory` → `User Story`
- `pbi` → `Product Backlog Item`
- `epic` → `Epic`
- `feature` → `Feature`
- `bug` → `Bug`
- `task` → `Task`

### Regras adicionais
Se o usuário incluir:
- `Epic`, o sistema também inclui `Feature`
- `Feature`, o sistema também inclui `Epic`

Isso acontece na função `_merge_sync_type_aliases(...)`.

### Regra especial para Enabler
O tipo `Enabler` não é buscado diretamente no WIQL como `System.WorkItemType = 'Enabler'`.

Quando `Enabler` está no escopo:
- o WIQL inclui `Feature`
- depois o sistema resolve se o item é de fato Enabler com base em campos específicos do ADO

Campos candidatos para identificar Enabler:
- `Custom.EnablerType`
- `Microsoft.VSTS.Common.ValueArea`
- `Custom.ValueArea`

### sync_all_types
Se `sync_all_types = true`:
- o filtro por tipo é desativado
- todos os work items retornados pela WIQL podem entrar no processamento

---

## 6. Busca de work items no ADO

A leitura dos itens é feita por `_fetch_ado_work_items(...)`.

### Regras de busca
1. primeiro o sistema executa a WIQL para obter os IDs
2. depois busca o detalhe dos itens em lotes de até **200 work items**
3. a WIQL usa `$top=500`

### Campos-base buscados
- `System.Id`
- `System.Title`
- `System.WorkItemType`
- `System.State`
- `System.Description`
- `System.IterationPath`
- `Microsoft.VSTS.Scheduling.StoryPoints`
- `Microsoft.VSTS.Common.AcceptanceCriteria`
- `Microsoft.VSTS.Common.BusinessValue`
- `System.AssignedTo`

### Campos opcionais buscados
Além dos campos-base, o sistema tenta buscar:
- campos candidatos de WSJF
- campos candidatos de Enabler

### Regra de tolerância a campos inexistentes
Se o ADO retornar erro porque algum campo opcional não existe:
- o sistema remove esse campo da consulta
- continua o processamento
- registra o campo ausente em `missing_optional_fields`

Isso evita quebra do sync por customizações diferentes entre instâncias do ADO.

---

## 7. Regras de importação de sprints

O sync também busca iterations do ADO por `_fetch_ado_iterations(...)`.

Endpoint usado:
- `/_apis/work/teamsettings/iterations?api-version=6.0`

### Dados importados do sprint
- `name`
- `path`
- `attributes.startDate`
- `attributes.finishDate`
- `attributes.timeFrame`

### Mapeamento de status da iteration
- `inProgress` → `active`
- `notStarted` → `planned`
- `finished` → `completed`

### Regra de matching de sprint
O Product Lab compara os sprints por:
- `name.strip().lower()`

### Regra de persistência
Se o sprint já existir no produto:
- atualiza `start_date`
- atualiza `end_date`
- atualiza `status`

Se o sprint não existir:
- cria um novo sprint

---

## 8. Regra de correspondência entre item ADO e item do Product Lab

A identificação do item existente é feita por:

- `ado_id`
- `product_id`

Consulta usada:
- busca em `backlog_items` onde:
  - `BacklogItem.ado_id == ado_id`
  - `BacklogItem.product_id == product_id`

### Regra principal
- se já existir item com mesmo `ado_id` no produto: **update**
- se não existir: **create**

Essa é a principal regra de negócio do sync.

---

## 9. Campos importados para backlog item

No full sync, o sistema cria ou atualiza os seguintes campos do backlog item:

- `product_id`
- `ado_id`
- `title`
- `description`
- `current_status`
- `sprint_id`
- `start_sprint_id`
- `end_sprint_id`
- `assigned_to_member_id`
- `story_points`
- `acceptance_criteria`
- `business_value`
- `item_type_id`
- `ado_work_item_type`
- `enabler_type`
- `wsjf_business_value`
- `wsjf_time_criticality`
- `wsjf_risk_reduction`
- `wsjf_job_size`
- `wsjf_score`

Na criação também define:
- `priority = 3`

---

## 10. Regra de limpeza de HTML

Os campos textuais vindos do ADO são higienizados por `_strip_html(...)`.

### Campos afetados
- `System.Description`
- `Microsoft.VSTS.Common.AcceptanceCriteria`

### Regras aplicadas
- converte `<br>` em quebra de linha
- converte fechamentos de `<p>` e `<div>` em quebra de linha
- remove tags HTML
- aplica `unescape` de entidades HTML
- normaliza quebras de linha

Resultado:
- o texto é salvo no Product Lab como texto limpo

---

## 11. Regra de mapeamento de status ADO → Product Lab

O estado do work item no ADO é convertido para o status interno do Product Lab.

### Mapeamento
- `New` → `open`
- `To Do` → `open`
- `Approved` → `open`
- `Committed` → `open`
- `Active` → `in_progress`
- `In Progress` → `in_progress`
- `Resolved` → `done`
- `Closed` → `done`
- `Done` → `done`
- `Removed` → `cancelled`
- `Cancelled` → `cancelled`
- `Blocked` → `blocked`

### Fallback
No full sync, se o estado não estiver mapeado:
- o fallback é `open`

---

## 12. Regra de associação do item ao sprint

O sprint do backlog item é inferido a partir de:

- `System.IterationPath`

### Lógica
- pega o último segmento do `IterationPath`
- usa esse valor como `sprint_name`
- procura sprint no Product Lab pelo nome, em lowercase/trim

### Persistência
Se encontrar o sprint:
- grava `sprint_id`
- grava `start_sprint_id`
- grava `end_sprint_id`

Se não encontrar:
- esses campos ficam `None`

### Observação
Como o sync de sprints roda antes do sync de itens, em geral o sprint já existe quando o item é processado.

---

## 13. Regra de Assigned To

O responsável do item no ADO vem de:

- `System.AssignedTo`

O processamento é feito por `_resolve_assigned_member_id(...)`.

### Lógica
1. extrai `display_name` e `email`
2. procura `TeamMember` por:
   - email
   - ou nome exato
3. se não encontrar:
   - cria um novo `TeamMember`
4. se houver `product_id`:
   - garante vínculo em `team_member_products`

### Resultado
O sync pode criar automaticamente membros de time no Product Lab com base no ADO.

---

## 14. Regra de tipo do backlog item

O tipo interno do backlog é resolvido por `_resolve_backlog_item_type_name(...)`.

### Ordem de decisão
1. se `enabler_type` resolvido for `"Enabler"`:
   - tipo final = `Enabler`
2. senão usa o `System.WorkItemType` normalizado
3. se nada for resolvido:
   - fallback = `User Story`

### Tipos suportados explicitamente
- `Epic`
- `Feature`
- `User Story`
- `Product Backlog Item`
- `Enabler`
- `Bug`
- `Task`
- `Issue`
- `Impediment`
- `Test Case`
- `Test Suite`

### Regra de cadastro do tipo
Se o tipo ainda não existir em `backlog_item_types`:
- ele é criado automaticamente

---

## 15. Regras de WSJF

O sync tenta extrair WSJF a partir de vários campos candidatos do ADO.

### Dimensões tratadas
- Business Value
- Time Criticality
- Risk Reduction / Opportunity Enablement
- Job Size
- Score explícito

### Regras
- se `job_size` vier vazio e houver `story_points`, usa `story_points` como fallback
- se existir score explícito, usa esse score
- se não existir score explícito, mas todas as dimensões estiverem presentes, calcula:
  - `(BV + TC + RR) / JS`
- o cálculo é arredondado para 1 casa decimal

### Persistência
Se algum campo WSJF não existir:
- no apply/full sync os campos numéricos são gravados como `0`
- `wsjf_score` é gravado como `0.0`

---

## 16. Regras de relacionamentos entre itens

O sync também sincroniza links entre backlog items via `_sync_ado_relations(...)`.

### Tipos de link mapeados
- `System.LinkTypes.Hierarchy-Forward` → `parent_of`
- `System.LinkTypes.Hierarchy-Reverse` → `child_of`
- `System.LinkTypes.Dependency-Forward` → `predecessor_of`
- `System.LinkTypes.Dependency-Reverse` → `successor_of`
- `System.LinkTypes.Related` → `relates_to`

### Regras de criação
Uma relação só é criada se:
- o item de origem existir no Product Lab
- o item de destino existir no Product Lab
- não for auto-relacionamento
- não for duplicada

### Regra de sincronização
O mecanismo compara:
- relações desejadas segundo o ADO
- relações já existentes no Product Lab

Depois:
- cria as relações faltantes
- remove relações que existem no Product Lab mas não existem mais no ADO

### Implicação
A sincronização de links é um espelhamento do estado do ADO, não apenas um append.

---

## 17. Itens órfãos

Durante o preview, o sistema identifica itens órfãos:
- itens do Product Lab com `ado_id`
- que não aparecem mais no conjunto retornado do ADO

### Importante
No **SYNC legado**:
- os itens órfãos **não são removidos automaticamente**
- o `ado_id` também **não é limpo automaticamente**

Ou seja:
- o full sync cria e atualiza itens
- sincroniza relações
- mas não exclui automaticamente backlog items que deixaram de aparecer no ADO

---

## 18. Contadores e detalhes salvos no log

Ao final do sync, `details` do log pode conter:

- `total_in_ado`
- `sprints_created`
- `sprints_updated`
- `links_created`
- `links_deleted`
- `links_total`
- `missing_optional_fields`
- `fetch_diagnostics`

Além disso:
- `items_created` conta backlog items novos
- `items_updated` soma:
  - backlog items atualizados
  - sprints atualizados
- `items_skipped` atualmente permanece `0`

---

## 19. Resumo executivo das regras

Quando o usuário clica em **SYNC** numa connection ADO, o Product Lab:

1. valida que a conexão é do tipo `azure_devops`
2. cria um log de execução
3. monta uma WIQL a partir de `project`, `area_path`, `sync_types` e `sync_all_types`
4. busca os work items no ADO
5. busca as iterations/sprints no ADO
6. cria ou atualiza sprints do produto
7. cria ou atualiza backlog items usando a chave `(product_id, ado_id)`
8. mapeia status, tipo, sprint, assigned to, descrição, critérios, story points, business value e WSJF
9. sincroniza relacionamentos entre itens
10. grava o resultado no log

---

## 20. Regra mais importante de negócio

A principal regra funcional do sync é:

> o Product Lab faz **upsert** dos backlog items com base em `ado_id` dentro do `product_id` da connection.

Na prática:
- se já existe item com aquele `ado_id` no produto, ele é **atualizado**
- se não existe, ele é **criado**

O escopo do que entra no sync depende principalmente de:
- `project`
- `area_path`
- `sync_types`
- `sync_all_types`

---

## 21. Arquivos de referência

Arquivo principal analisado:
- `backend/app/api/v1/endpoints/integrations.py`

Funções relevantes:
- `_build_ado_wiql(...)`
- `_fetch_ado_work_items(...)`
- `_fetch_ado_iterations(...)`
- `_resolve_backlog_item_type_name(...)`
- `_resolve_assigned_member_id(...)`
- `_extract_wsjf_fields(...)`
- `_sync_ado_relations(...)`
- `_run_ado_sync(...)`
- `_background_sync(...)`
