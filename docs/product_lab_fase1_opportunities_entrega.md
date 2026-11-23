# Product Lab — FASE 1 Opportunities

## Resumo da fase

A FASE 1 foi implementada como evolução do domínio de Opportunities dentro do macrogrupo `DISCOVER`, preservando o princípio de produto genérico e reaproveitando o modelo existente baseado em `DiscoveryOpportunity`.

O foco desta fase foi:

- consolidar `Opportunity` como núcleo da jornada;
- introduzir `journey_stage`;
- introduzir `lifecycle_status`;
- formalizar `Opportunity Assessment`;
- formalizar `Opportunity Source`;
- reorganizar a experiência do frontend para a jornada:
  - `CAPTURE -> ASSESS -> DISCOVER -> EVALUATE -> DECIDE`;
- separar maturidade de preenchimento de artefatos.

---

## Alterações realizadas

## 1. Domínio e banco

### `discovery_opportunities`
Foram garantidos/normalizados os campos:

- `journey_stage`
- `lifecycle_status`

### Backfill de compatibilidade
Foi aplicado backfill a partir do campo legado `status`:

- `identified -> capture`
- `under_investigation -> discover`
- `validated -> decide`
- `paused -> assess`
- `discarded -> decide`
- `forwarded_to_roadmap -> decide`

E para lifecycle:

- `paused -> on_hold`
- `discarded -> closed`
- `forwarded_to_roadmap -> closed`
- demais -> `active`

### `opportunity_sources`
Foi garantida a existência da tabela para múltiplas origens por Opportunity, com suporte a:

- `source_type`
- `source_system`
- `external_reference`
- `external_url`
- `requester_name`
- `sponsor_name`
- `received_at`
- `original_context`
- `is_primary`

### `opportunity_assessments`
Foi garantida a existência da tabela para múltiplos assessments por Opportunity, com histórico, incluindo:

- `assessment_type`
- dimensões de avaliação
- `recommendation`
- `rationale`
- `assessed_by`
- `assessed_at`

### Backfill de origin legado
Quando a opportunity possuía `origin` legado e não possuía `source` primária, foi criado registro derivado em `opportunity_sources`.

---

## 2. Backend / API

## API canônica de Opportunities
A API canônica da fase ficou em:

- `backend/app/api/v1/endpoints/opportunities.py`

### Endpoints principais
- `GET /opportunities/opportunities`
- `POST /opportunities/opportunities`
- `GET /opportunities/opportunities/{id}`
- `PATCH /opportunities/opportunities/{id}`

### Sources
- `GET /opportunities/opportunities/{opp_id}/sources`
- `POST /opportunities/opportunities/{opp_id}/sources`
- `PATCH /opportunities/opportunity-sources/{source_id}`
- `DELETE /opportunities/opportunity-sources/{source_id}`

### Assessments
- `GET /opportunities/opportunities/{opp_id}/assessments`
- `POST /opportunities/opportunities/{opp_id}/assessments`
- `PATCH /opportunities/opportunity-assessments/{assessment_id}`
- `DELETE /opportunities/opportunity-assessments/{assessment_id}`

## Redução de duplicidade
Foi removido de `backend/app/api/v1/endpoints/discovery.py` o bloco legado de CRUD principal de Opportunities, reduzindo a sobreposição entre:

- `/discovery/opportunities/...`
- `/opportunities/opportunities/...`

Os endpoints de artefatos de discovery permaneceram em `discovery.py`.

---

## 3. Frontend

## Módulo Opportunities
A experiência visual foi reorganizada em:

- `DISCOVER`
  - `Opportunities`

### Lista de Opportunities
A lista passou a destacar:

- Title
- Source principal
- Journey Stage
- Lifecycle Status
- Priority
- Readiness
- Updated context via seleção

### Opportunity Journey
Ao selecionar uma oportunidade, a interface exibe:

- `CAPTURE`
- `ASSESS`
- `DISCOVER`
- `EVALUATE`
- `DECIDE`

com indicação visual de:
- etapa atual;
- etapas concluídas;
- próximas etapas.

## Reorganização do estágio DISCOVER
A UX do estágio Discover foi agrupada em:

### UNDERSTAND
- Problem
- JTBD

### LEARN
- Research
- Insights
- Assumptions

### EXPLORE
- Value Canvas relacionado
- Solutions

### VALIDATE
- Experiments
- Metrics

Sem criação de novas entidades de domínio para esses grupos.

## Assessment e Source
Foi adicionada experiência visual para:

### Assessments
- listagem
- criação
- edição
- exclusão

### Sources
- listagem
- criação
- edição
- exclusão
- definição de source primária

---

## 4. Traduções atualizadas

Arquivos ajustados:

- `frontend/src/locales/pt.json`
- `frontend/src/locales/en.json`
- `frontend/src/locales/es.json`

Incluindo chaves para:

- Opportunities / Journey
- Journey stages
- Lifecycle
- Assessments
- Recommendations
- Sources
- Discover groups
- Artifact Coverage / Readiness

---

## Migrations executadas

As alterações foram implementadas dentro da estratégia incremental já adotada pelo projeto em:

- `backend/app/main.py`

### Itens aplicados
- `ALTER TABLE discovery_opportunities ADD COLUMN IF NOT EXISTS journey_stage`
- `ALTER TABLE discovery_opportunities ADD COLUMN IF NOT EXISTS lifecycle_status`
- backfill de `status -> journey_stage`
- backfill de `status -> lifecycle_status`
- `CREATE TABLE IF NOT EXISTS opportunity_sources`
- `CREATE TABLE IF NOT EXISTS opportunity_assessments`
- índices auxiliares
- backfill de `origin -> opportunity_sources`

---

## Entidades/relacionamentos criados ou alterados

## Alterados
- `discovery_opportunities`

## Garantidos/criados
- `opportunity_sources`
- `opportunity_assessments`

## Preservados
- `discovery_business_cases`
- `project_charters`
- artefatos existentes de discovery
- `discovery_opportunities` como raiz
- `origin` legado
- `status` legado

---

## Arquivos alterados

### Backend
- `backend/app/main.py`
- `backend/app/api/v1/endpoints/discovery.py`
- `backend/app/api/v1/endpoints/opportunities.py`

### Frontend
- `frontend/src/modules/discovery/pages/DiscoveryPage.tsx`
- `frontend/src/locales/pt.json`
- `frontend/src/locales/en.json`
- `frontend/src/locales/es.json`

---

## Testes executados

## Frontend build
Comando executado:

`npm --prefix frontend run build`

### Resultado
- `tsc -b` OK
- `vite build` OK

### Evidência
Build concluído com sucesso.

Observação:
- permaneceu apenas warning de bundle size do Vite;
- não bloqueia a compilação.

---

## Pendências remanescentes da FASE 1

Embora a fase esteja funcionalmente avançada, permanecem pontos menores e/ou de fechamento técnico:

1. revisar se o endpoint `forward-to-roadmap` deve continuar em `discovery.py` ou migrar futuramente para fluxo mais explícito;
2. revisar refinamentos visuais da UX de assessment/source;
3. eventual melhoria de rotulagem e internacionalização adicional;
4. revisão futura de uso do campo legado `status` após estabilização.

---

## Riscos

1. coexistência de `status` legado com `journey_stage` e `lifecycle_status` ainda exige disciplina de compatibilidade;
2. `forward-to-roadmap` permanece fora da reorganização mais profunda das próximas fases;
3. RACI continua pendente de revisão estrutural por conta do conflito entre UUID e identidade polimórfica inteira;
4. warnings de bundle grande permanecem como tema de otimização, não de correção funcional.

---

## Recomendações para a próxima fase

## Próxima fase sugerida: FASE 2 — Evaluation & Decision

Prioridades recomendadas:

1. integrar `Decision` explicitamente à Opportunity;
2. consolidar `Business Case` como peça central de `EVALUATE`;
3. separar recommendation de decision formal;
4. introduzir histórico/versionamento de decisões quando necessário;
5. preparar a transição estruturada para promoção posterior Discover -> Define.

---

## Conclusão

A FASE 1 entregou a base do novo domínio de Opportunities no Product Lab, com:

- Opportunity Journey explícita;
- Assessment formal;
- Sources formais;
- UX reorganizada por jornada;
- compatibilidade com dados existentes;
- sem criar entidade `Discovery` desnecessária;
- mantendo o produto agnóstico a cliente e ferramenta específica.
