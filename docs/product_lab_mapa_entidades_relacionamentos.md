# Product Lab — Mapa de entidades e relacionamentos

## Objetivo

Este documento sintetiza o mapa AS-IS das principais entidades pedidas, com foco em:

- `Opportunity`
- `Discovery`
- `Business Case`
- `Decision`
- `Initiative`
- `Roadmap`
- `Requirement`
- `RACI`
- `Value Canvas`
- `Process Mapping`

> Observação: no modelo atual, alguns conceitos existem como entidades explícitas e outros existem apenas como interpretação funcional de entidades já existentes.

---

## 1. Visão geral do mapa conceitual

```text
DiscoveryOpportunity
  ├── DiscoveryOpportunityArea (N)
  ├── DiscoveryProblemStatement (0..1)
  │     └── DiscoveryProblemAffectedArea (N)
  ├── DiscoveryJTBD (N)
  ├── DiscoveryResearch (N)
  │     └── ResearchAnswer (N)
  ├── DiscoveryInsight (N)
  ├── DiscoveryAssumption (N)
  ├── DiscoverySolutionIdea (N)
  ├── DiscoveryExperiment (N)
  ├── DiscoverySuccessMetric (N)
  ├── DiscoveryBusinessCase (0..1)
  │     └── ProjectCharter (0..1 lógico por oportunidade)
  │            └── RoadmapItem (0..1 indireto por charter)
  └── VPCCanvas (0..N lógico, mas sem N:M formal)

RoadmapItem
  └── RoadmapBacklogLink (N)
        └── BacklogItem

Requirement
  ├── RequirementFeature (N)
  ├── RequirementUserStory (N)
  ├── RequirementRelation (N)
  ├── RequirementVerification (N)
  ├── RequirementHistory (N)
  └── RequirementChangeRequest (N)

RaciAssignment
  └── associa stakeholders a vários object_types

Decision
  └── entidade autônoma de produto, sem vínculo formal com Opportunity/Roadmap

Process
  ├── ProcessGroup (N)
  ├── ProcessNode (N)
  ├── ProcessEdge (N)
  ├── ProcessNodeRelation (N)
  └── ProcessTool (N)

VPCCanvas
  ├── VPCItem (N)
  └── VPCItemLink (N)
```

---

## 2. Opportunity

## Entidade principal

- **Classe**: `DiscoveryOpportunity`
- **Tabela**: `discovery_opportunities`

## Campos principais

- `id` (UUID string)
- `product_id`
- `title`
- `description`
- `origin`
- `impacted_area_id`
- `responsible_stakeholder_id`
- `identified_at`
- `status`
- `priority`

## Papel no domínio

É a **entidade raiz do módulo Discovery**. Hoje o termo “Opportunity” é o principal agregador de todo o trabalho de descoberta.

## Relacionamentos

### 1:N com `DiscoveryOpportunityArea`
- tabela: `discovery_opportunity_areas`
- função: relacionar Opportunity com múltiplas áreas impactadas
- inclui:
  - `impact_type`
  - `is_primary`
  - `notes`

### 1:0..1 lógico com `DiscoveryProblemStatement`
- tabela: `discovery_problem_statements`
- endpoint faz `upsert` por Opportunity
- modelo não declara FK explícita, mas o vínculo é funcional por `opportunity_id`

### 1:N com `DiscoveryJTBD`
- tabela: `discovery_jtbd`

### 1:N com `DiscoveryResearch`
- tabela: `discovery_research`

### 1:N com `DiscoveryInsight`
- tabela: `discovery_insights`

### 1:N com `DiscoveryAssumption`
- tabela: `discovery_assumptions`

### 1:N com `DiscoverySolutionIdea`
- tabela: `discovery_solution_ideas`

### 1:N com `DiscoveryExperiment`
- tabela: `discovery_experiments`

### 1:N com `DiscoverySuccessMetric`
- tabela: `discovery_success_metrics`

### 1:1 com `DiscoveryBusinessCase`
- tabela: `discovery_business_cases`
- enforced por:
  - `opportunity_id`
  - `unique=True`

### 0..1:N indireto com `VPCCanvas`
- via `VPCCanvas.discovery_opportunity_id`
- não há tabela de associação formal

### 0..1 lógico com `ProjectCharter`
- por `ProjectCharter.opportunity_id`
- no endpoint o comportamento é de um único charter por opportunity

### Sem vínculo formal com `RoadmapItem`
- não existe FK direta nem tabela N:M

---

## 3. Discovery

## Existe entidade `Discovery`?

Não.

No AS-IS, “Discovery” é um **contexto funcional** composto por:

- Opportunity
- seus artefatos filhos
- a tela `DiscoveryPage`
- alguns módulos auxiliares conectados

## Componentes formais do contexto Discovery

- `DiscoveryOpportunity`
- `DiscoveryOpportunityArea`
- `DiscoveryProblemStatement`
- `DiscoveryProblemAffectedArea`
- `DiscoveryJTBD`
- `DiscoveryResearch`
- `ResearchTemplate`
- `ResearchTemplateQuestion`
- `ResearchAnswer`
- `DiscoveryInsight`
- `DiscoveryAssumption`
- `DiscoverySolutionIdea`
- `DiscoveryExperiment`
- `DiscoverySuccessMetric`
- `DiscoveryBusinessCase`
- `ProjectCharter`

---

## 4. Business Case

## Entidade principal

- **Classe**: `DiscoveryBusinessCase`
- **Tabela**: `discovery_business_cases`

## Ownership

É owned por `DiscoveryOpportunity`.

## Cardinalidade

- **Opportunity 1:1 BusinessCase**

## Campos relevantes

- `opportunity_id` (obrigatório, único)
- `product_id`
- `title`
- `executive_summary`
- `problem_statement`
- `current_scenario`
- `proposed_solution`
- `expected_benefits`
- `strategic_alignment`
- `financial_impact`
- `estimated_cost`
- `estimated_effort`
- `risks_summary`
- `dependencies_summary`
- `assumptions`
- `constraints`
- `go_no_go_recommendation`
- `status`

## Status

- `draft`
- `in_review`
- `approved`
- `rejected`

## Relacionamentos

### 1:1 com Opportunity
- explícito por `opportunity_id`

### 1:0..1 com ProjectCharter
- `ProjectCharter.business_case_id`
- no modelo há `unique=True`

## Observação importante
Business Case é uma entidade própria, mas claramente subordinada ao fluxo Discovery.

---

## 5. Decision

## Entidade principal

- **Classe**: `Decision`
- **Tabela**: `decisions`

## Campos principais

- `id`
- `product_id`
- `title`
- `context`
- `decision`
- `consequences`
- `status`
- `tags`

## Status

- `proposed`
- `accepted`
- `deprecated`
- `superseded`

## Papel no domínio

Registro genérico de decisões de produto.

## Relacionamentos formais

Não há vínculos explícitos com:

- Opportunity
- Business Case
- Project Charter
- RoadmapItem
- Requirement

## Relacionamentos indiretos

### Com RACI
- `RaciAssignment.object_type` aceita `DECISION`

### Com Requirement
- `RequirementRelation.entity_type` aceita `DECISION`

## Conclusão
Decision hoje é **entidade autônoma**, não uma peça integrada ao fluxo Opportunity → Initiative.

---

## 6. Initiative / Roadmap

## Existe entidade Initiative?

Não nominalmente.

No modelo atual, `Initiative` é melhor interpretada como um uso de:

- **`RoadmapItem`**

## Entidade principal do Roadmap

- **Classe**: `RoadmapItem`
- **Tabela**: `roadmap_items`

## Campos principais

- `id`
- `product_id`
- `title`
- `description`
- `type`
- `item_type_id`
- `status`
- `start_date`
- `end_date`
- `quarter`
- `executive_status`
- campos executivos adicionais

## Status operacionais

- `planned`
- `in_progress`
- `done`
- `cancelled`

## Status executivos

- `not_started`
- `on_track`
- `attention`
- `blocked`
- `waiting_owner`
- `completed`

## Relacionamentos

### 1:N com `RoadmapBacklogLink`
- tabela: `roadmap_backlog_links`

### N:1 implícito com `BacklogItem`
- por `roadmap_backlog_links.backlog_item_id`

### 0..1 com `ProjectCharter`
- `ProjectCharter.roadmap_item_id`

## Relação com Opportunity

Não há relação formal direta.

Só existe relação indireta via:

- `ProjectCharter`
- semântica de status `forwarded_to_roadmap`

---

## 7. Requirement

## Entidade principal

- **Classe**: `Requirement`
- **Tabela**: `requirements`

## Campos principais

- `id`
- `product_id`
- `business_area_id`
- `requirement_code`
- `requirement_title`
- `requirement_description`
- `requirement_type`
- `requirement_classification`
- `requirement_source`
- `priority`
- `lifecycle_status`
- `fulfillment_status`
- `acceptance_definition`
- `requirement_owner`

## Papel no domínio

Representa a camada de definição formal de requisitos.

## Relacionamentos

### 1:N com `RequirementFeature`
- tabela: `requirement_features`

### 1:N com `RequirementUserStory`
- tabela: `requirement_user_stories`

### 1:N com `RequirementRelation`
- tabela: `requirement_relations`

### 1:N com `RequirementVerification`
- tabela: `requirement_verifications`

### 1:N com `RequirementHistory`
- tabela: `requirement_history`

### 1:N com `RequirementChangeRequest`
- tabela: `requirement_change_requests`

## Relação com Opportunity / Discovery

Não existe FK direta para Opportunity.

Também não existe tipo explícito `OPPORTUNITY` em `RequirementRelation`.

Os `entity_type` aceitos são:

- `RESEARCH`
- `INSIGHT`
- `PROCESS_NODE`
- `VPC_PAIN`
- `RISK`
- `DECISION`
- `RELEASE`
- `METRIC`

## Conclusão
Requirement está mais próximo de:

- produto
- business area
- feature
- user story
- delivery governance

do que de Discovery/Opportunity diretamente.

---

## 8. RACI

## Entidade principal

- **Classe**: `RaciAssignment`
- **Tabela**: `raci_assignments`

## Entidade de histórico

- **Classe**: `RaciAssignmentHistory`
- **Tabela**: `raci_assignment_history`

## Modelo de associação

RACI é genérico e usa:

- `object_type`
- `object_id`
- `stakeholder_id`
- `role`

## Object types suportados

- `REQUIREMENT`
- `BACKLOG`
- `DECISION`
- `RISK`
- `ROADMAP`
- `PROCESS`
- `DISCOVERY`
- `MEETING`

## Cardinalidade

- um objeto pode ter vários assignments
- um stakeholder pode participar de vários objetos
- um mesmo stakeholder pode ocupar mais de um papel conforme as regras de unicidade

## Particularidades

- soft delete
- evidências de aprovação
- histórico imutável por ação

## Relação com Opportunity/Discovery

Conceitualmente suportada por `object_type = DISCOVERY`, mas a implementação atual da UI sugere possível incompatibilidade de tipo entre:
- `object_id` inteiro
- `Opportunity.id` UUID string

---

## 9. Value Canvas

## Entidade principal

- **Classe**: `VPCCanvas`
- **Tabela**: `vpc_canvas`

## Entidades auxiliares

- `VPCItem`
- `VPCItemLink`

## Campos relevantes de `VPCCanvas`

- `id`
- `product_id`
- `name`
- `description`
- `discovery_opportunity_id`

## Relação com Opportunity

### 0..N lógico a partir de Opportunity
- por `discovery_opportunity_id`
- sem tabela associativa formal

## Estrutura interna

### `VPCItem`
Tipos:
- `job`
- `pain`
- `gain`
- `product`
- `pain_reliever`
- `gain_creator`

### `VPCItemLink`
Liga itens em relações N:M

## Relação com Discovery

Há duas formas de conexão:

1. **referência direta**
   - `VPCCanvas.discovery_opportunity_id`

2. **geração automática**
   - endpoint `generate-vpc` cria um canvas com snapshot da Opportunity

## Conclusão
VPC é um módulo independente, mas com integração explícita ao Discovery.

---

## 10. Process Mapping

## Entidade principal do processo

- **Classe**: `Process`
- **Tabela**: `processes`

## Entidades relacionadas

- `BusinessArea`
- `ProcessGroup`
- `ProcessNode`
- `ProcessEdge`
- `ProcessNodeRelation`
- `ProcessTool`

## Estrutura

### `BusinessArea`
Catálogo organizacional de áreas de negócio

### `Process`
Representa um processo mapeado

### `ProcessGroup`
Agrupamentos internos do processo

### `ProcessNode`
Nós/etapas do fluxo

### `ProcessEdge`
Conexões entre nós

### `ProcessNodeRelation`
Relações entre nós do processo e outras entidades

### `ProcessTool`
Ferramentas envolvidas no processo

## Relação com Opportunity

Não há vínculo direto com Opportunity.

## Relações com outros domínios

`ProcessNodeRelation.entity_type` aceita, entre outros:

- `REQUIREMENT`
- `FEATURE`
- `USER_STORY`
- `RISK`
- `INSIGHT`
- `VPC_PAIN`
- `VPC_GAIN`
- `RESEARCH`

## Conclusão
Process Mapping hoje é um módulo transversal e reutilizável, mais ligado ao entendimento de operação/processo do produto do que a uma Opportunity específica.

---

## 11. Project Charter como ponte crítica

Embora não estivesse na lista principal do pedido B.2, ele é indispensável para entender o mapa.

## Entidade

- **Classe**: `ProjectCharter`
- **Tabela**: `project_charters`

## Campos-chave de relacionamento

- `business_case_id`
- `opportunity_id`
- `roadmap_item_id`
- `product_id`

## Papel

É a principal **entidade de ponte** entre:

- Discovery / Opportunity
- Business Case
- Roadmap / Initiative

## Leitura arquitetural
Se existe alguma tentativa de costurar `Discover -> Define`, ela hoje está mais evidente em `ProjectCharter`.

---

## 12. Mapa resumido por cardinalidade

## Opportunity-centric

- `DiscoveryOpportunity 1:N DiscoveryOpportunityArea`
- `DiscoveryOpportunity 1:0..1 DiscoveryProblemStatement`
- `DiscoveryProblemStatement 1:N DiscoveryProblemAffectedArea`
- `DiscoveryOpportunity 1:N DiscoveryJTBD`
- `DiscoveryOpportunity 1:N DiscoveryResearch`
- `DiscoveryResearch 1:N ResearchAnswer`
- `DiscoveryOpportunity 1:N DiscoveryInsight`
- `DiscoveryOpportunity 1:N DiscoveryAssumption`
- `DiscoveryOpportunity 1:N DiscoverySolutionIdea`
- `DiscoveryOpportunity 1:N DiscoveryExperiment`
- `DiscoveryOpportunity 1:N DiscoverySuccessMetric`
- `DiscoveryOpportunity 1:1 DiscoveryBusinessCase`
- `DiscoveryOpportunity 1:0..1 ProjectCharter` (comportamento lógico do endpoint)
- `DiscoveryOpportunity 1:0..N VPCCanvas` (sem N:M formal)

## Business / transition

- `DiscoveryBusinessCase 1:0..1 ProjectCharter`
- `ProjectCharter 0..1:1 RoadmapItem`

## Roadmap / delivery

- `RoadmapItem 1:N RoadmapBacklogLink`
- `RoadmapBacklogLink N:1 BacklogItem`

## Requirements

- `Requirement 1:N RequirementFeature`
- `Requirement 1:N RequirementUserStory`
- `Requirement 1:N RequirementRelation`
- `Requirement 1:N RequirementVerification`
- `Requirement 1:N RequirementHistory`
- `Requirement 1:N RequirementChangeRequest`

## VPC

- `VPCCanvas 1:N VPCItem`
- `VPCCanvas 1:N VPCItemLink`

## Process Mapping

- `Process 1:N ProcessGroup`
- `Process 1:N ProcessNode`
- `Process 1:N ProcessEdge`
- `Process 1:N ProcessTool`
- `ProcessNode 1:N ProcessNodeRelation`

---

## 13. Mapa de lacunas estruturais mais importantes

Do ponto de vista de relacionamento, as lacunas mais relevantes são:

1. ausência de entidade `Discovery` distinta de Opportunity
2. ausência de vínculo formal `Opportunity <-> RoadmapItem`
3. ausência de vínculo formal `Decision <-> Opportunity/Roadmap`
4. ausência de vínculo formal `Requirement <-> Opportunity`
5. ausência de tabela de intake/origem externa
6. ausência de N:M formal entre Opportunity e VPC reutilizável
7. ausência de associação explícita entre múltiplas Opportunities e uma mesma Initiative

---

## 14. Conclusão

O mapa atual mostra um domínio com um núcleo forte em `DiscoveryOpportunity`, um conjunto rico de artefatos de descoberta e bons módulos satélite (`VPC`, `Process Mapping`, `Roadmap`, `Requirements`, `Prioritization`), mas com pontes ainda frágeis entre descoberta, definição e planejamento.

### O que está mais claro no modelo
- Opportunity como centro do Discovery
- Business Case como consolidação 1:1
- Project Charter como ponte
- RoadmapItem como proxy de Initiative
- RACI como mecanismo transversal
- VPC e Process Mapping como módulos independentes

### O que ainda falta para um mapa mais coeso
- ligações diretas entre estágios
- cardinalidades formais entre Opportunity e Initiative
- relações explícitas para decisão, requirement e intake
- clareza de ownership entre Discover e Define
