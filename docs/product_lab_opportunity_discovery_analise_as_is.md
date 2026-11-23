# Product Lab — Análise AS-IS de Opportunity, Discovery, Initiative e artefatos relacionados

## Objetivo

Este documento responde, com base no código atual do Product Lab, como o domínio está modelado hoje para `Opportunity`, `Discovery`, `Business Case`, `Decision`, `Initiative/Roadmap`, `Requirement`, `RACI`, `Value Canvas` e `Process Mapping`.

> Fonte principal: modelos SQLAlchemy, endpoints FastAPI e páginas React atualmente implementadas.
>
> Observação importante: a resposta abaixo descreve o **estado atual implementado**, não o estado ideal de produto/processo.

---

## 1. Opportunity e Discovery

### O que exatamente representa uma `Opportunity` hoje no modelo de dados?

Hoje `Opportunity` é a entidade `DiscoveryOpportunity`, persistida na tabela `discovery_opportunities`.

Ela representa o **objeto central do módulo Discovery**: uma oportunidade identificada para um produto. Os campos principais são:

- `id` (UUID string)
- `product_id`
- `title`
- `description`
- `origin`
- `impacted_area_id` (legado, FK lógica para área)
- `responsible_stakeholder_id`
- `identified_at`
- `status`
- `priority`
- `created_at`
- `updated_at`

Na prática, a Opportunity funciona como o **container raiz** de quase todos os artefatos de discovery.

---

### Opportunity e Discovery são entidades diferentes ou Discovery é apenas a interface utilizada para trabalhar uma Opportunity?

No estado atual, **não existe uma entidade separada chamada `Discovery`**.

O que existe é:

- uma entidade raiz chamada `DiscoveryOpportunity`
- vários artefatos filhos ligados a ela por `opportunity_id`
- uma interface React chamada `DiscoveryPage` que organiza esses artefatos em abas

Portanto, hoje **Discovery é mais um módulo/processo de trabalho sobre a Opportunity do que uma entidade de domínio independente**.

---

### Uma Opportunity pode existir atualmente sem passar pelo fluxo completo de Discovery?

Sim.

Nada no modelo obriga o preenchimento completo das abas/artefatos. Basta criar um registro em `discovery_opportunities` e a Opportunity já existe.

O restante é opcional e incremental:

- problem statement
- JTBD
- research
- insights
- assumptions
- VPC
- solution ideas
- experiments
- success metrics
- business case
- RACI

O frontend inclusive calcula o “progress” apenas por presença de conteúdo, não por gates obrigatórios.

---

### Quais status/lifecycle existem para Opportunity e o que cada um significa?

O enum `OpportunityStatus` define:

- `identified`
- `under_investigation`
- `validated`
- `paused`
- `discarded`
- `forwarded_to_roadmap`

Significado observado no sistema:

- **identified**: oportunidade criada/registrada
- **under_investigation**: oportunidade em discovery/investigação
- **validated**: oportunidade considerada validada
- **paused**: oportunidade pausada
- **discarded**: oportunidade descartada
- **forwarded_to_roadmap**: oportunidade marcada como encaminhada ao roadmap

Importante: esses significados são **semânticos**, mas o sistema atual não implementa automações fortes entre eles.

---

### O que acontece atualmente quando uma Opportunity é considerada válida, descartada, pausada ou encaminhada para Roadmap?

Hoje, na prática, **quase nada automático acontece** além da atualização do campo `status`.

Não há, no endpoint de Opportunity:

- criação automática de roadmap item
- criação automática de requirement
- criação automática de decision
- bloqueios de edição
- trilha de auditoria específica de mudança de status

Então:

- **validated**: apenas muda o status
- **discarded**: apenas muda o status
- **paused**: apenas muda o status
- **forwarded_to_roadmap**: apenas muda o status

A transição para Roadmap existe hoje mais como **marcação manual** do que como fluxo orquestrado.

---

### Existe relacionamento entre Opportunity e Initiative? Se sim, como funciona e qual é a cardinalidade?

**Não existe relacionamento formal direto** entre `DiscoveryOpportunity` e `RoadmapItem`.

Não há FK nem tabela associativa do tipo:

- `opportunity_id` em `roadmap_items`
- `roadmap_item_id` em `discovery_opportunities`
- tabela `opportunity_roadmap_links`

As aproximações atuais são indiretas:

1. `ProjectCharter` pode referenciar:
   - `opportunity_id`
   - `roadmap_item_id`
   - `business_case_id`

2. o status da Opportunity pode ser `forwarded_to_roadmap`

3. o Business Case nasce da Opportunity e o Project Charter pode depois apontar para um item de roadmap

Portanto, a cardinalidade **não está formalmente implementada** entre Opportunity e Initiative. Conceitualmente parece ser desejado um vínculo, mas hoje ele é apenas indireto e opcional via `ProjectCharter`.

---

## 2. Business Case e Decision

### Como `Business Case` está modelado hoje? É entidade própria, artefato do Discovery ou conjunto de campos?

`Business Case` está modelado como **entidade própria**: `DiscoveryBusinessCase`, tabela `discovery_business_cases`.

Ao mesmo tempo, funcionalmente ele é um **artefato do fluxo de Discovery**, porque:

- é acessado no contexto `/opportunities/{opp_id}/business-case`
- possui `opportunity_id` obrigatório e único
- aparece como aba do módulo Discovery no frontend

Então a melhor descrição é:

- **entidade própria**
- **subordinada ao contexto de Discovery/Opportunity**

---

### Qual entidade é proprietária do Business Case?

A entidade proprietária é, na prática, a **Opportunity**.

Evidências:

- `DiscoveryBusinessCase.opportunity_id` é obrigatório
- existe `unique=True` nesse campo
- os endpoints são orientados por oportunidade

Logo, hoje o ownership é **1:1 com Opportunity**.

---

### Business Case pode existir sem Discovery?

Não no modelo atual.

Como não existe entidade separada `Discovery`, a pergunta prática é se ele pode existir sem `Opportunity`. A resposta é **não**:

- `opportunity_id` é obrigatório
- o endpoint de criação depende de uma Opportunity existente

---

### Como `Decision` está relacionada a Opportunity, Discovery e Initiative?

Hoje `Decision` **não possui relacionamento explícito** com Opportunity, Discovery ou Initiative.

A entidade `Decision` contém:

- `id`
- `product_id`
- `title`
- `context`
- `decision`
- `consequences`
- `status`
- `tags`

Ou seja, é um registro de decisões no nível do produto.

Relações indiretas possíveis:

- `RaciAssignment` aceita `object_type = DECISION`
- `RequirementRelation.entity_type` aceita `DECISION`

Mas não há FK ou vínculo nativo entre Decision e:

- Opportunity
- Business Case
- RoadmapItem
- ProjectCharter

---

### Quais tipos de decisão existem hoje?

Não existe enum de “tipo de decisão”.

O que existe é enum de **status de decisão**:

- `proposed`
- `accepted`
- `deprecated`
- `superseded`

Se o time quiser classificar decisões por tipo, hoje isso só pode ser aproximado via `tags`.

---

### Existe histórico/versionamento das decisões e respectivos rationales?

Não.

A modelagem atual de `Decision` não traz:

- tabela de histórico
- versionamento
- rationales estruturados por versão
- trilha de mudanças

O racional fica, no máximo, embutido textualmente em:

- `context`
- `decision`
- `consequences`

---

## 3. Roadmap / Initiative

### O que representa uma `Initiative` no modelo atual?

Hoje não existe uma entidade chamada `Initiative`.

Na prática, o papel de initiative é cumprido por `RoadmapItem`, especialmente quando:

- `source_type = roadmap` em priorização
- `item_type = initiative` no módulo de priorização
- o endpoint de roadmap trata o item como unidade principal de planejamento

Então, no AS-IS, **Initiative é um conceito representado implicitamente por um `RoadmapItem`**.

---

### Como uma Initiative é criada hoje?

Ela é criada como um `RoadmapItem` via endpoint `/roadmap`.

Campos relevantes:

- `product_id`
- `title`
- `description`
- `type` (`epic`, `feature`, `milestone`)
- `status`
- datas
- quarter
- campos executivos
- backlog vinculável por `RoadmapBacklogLink`

---

### Ela pode ser criada diretamente ou obrigatoriamente deveria nascer de uma Opportunity?

Hoje ela pode ser criada **diretamente**.

Não existe obrigatoriedade de origem em Opportunity.

O endpoint de criação de roadmap não exige:

- `opportunity_id`
- `business_case_id`
- `project_charter_id`

---

### Existe atualmente rastreabilidade `Opportunity → Initiative`?

Existe apenas **rastreabilidade indireta e parcial**.

A cadeia mais próxima é:

`Opportunity -> Business Case -> Project Charter -> RoadmapItem`

Mas:

- Business Case é opcional
- Project Charter é opcional
- o RoadmapItem não aponta de volta para a Opportunity
- não existe tabela de link explícita

Então a rastreabilidade existe só quando o time usa conscientemente o `ProjectCharter`.

---

### Uma Opportunity pode gerar mais de uma Initiative?

No modelo formal direto, isso **não está implementado**.

Como não existe associação explícita Opportunity ↔ RoadmapItem, o sistema não controla cardinalidade.

Via `ProjectCharter`, a situação é até restritiva:

- `ProjectCharter` por oportunidade é tratado como único no endpoint
- `ProjectCharter.roadmap_item_id` é único por charter

Logo, hoje não há desenho robusto para “uma oportunidade gera várias initiatives”.

---

### Uma Initiative pode consolidar mais de uma Opportunity?

Também não há suporte formal.

Sem uma tabela associativa Opportunity ↔ RoadmapItem, a consolidação de múltiplas opportunities numa única initiative não fica modelada.

Pode ser narrada em texto livre, mas não estruturada.

---

### Quais status/lifecycle existem para Initiative?

Como initiative é na prática um `RoadmapItem`, o lifecycle existente é o de `RoadmapItemStatus`:

- `planned`
- `in_progress`
- `done`
- `cancelled`

Além disso, existe `executive_status` separado:

- `not_started`
- `on_track`
- `attention`
- `blocked`
- `waiting_owner`
- `completed`

Ou seja, há dois eixos:

1. **status operacional**
2. **status executivo**

---

## 4. Discovery

### Quais entidades/artefatos pertencem formalmente ao Discovery hoje?

Formalmente, pertencem ao conjunto Discovery:

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
- `ProjectCharter` (embora já faça ponte com roadmap)
- `RACI` no frontend da Discovery via `RaciPanel objectType="DISCOVERY"`

---

### Como estão relacionados `Problem`, `JTBD`, `Research`, `Insights`, `Assumptions`, `VPC`, `Solutions`, `Experiments`, `Metrics`, `Business Case` e `RACI`?

Relação principal hoje:

- quase tudo depende de `opportunity_id`

Estrutura resumida:

- **Problem Statement**: 1:1 lógico com Opportunity
- **JTBD**: 1:N com Opportunity
- **Research**: 1:N com Opportunity
- **Insights**: 1:N com Opportunity; opcionalmente ligados a `research_id`
- **Assumptions**: 1:N com Opportunity
- **Solutions**: 1:N com Opportunity
- **Experiments**: 1:N com Opportunity; opcionalmente ligados a `assumption_id`
- **Success Metrics**: 1:N com Opportunity
- **Business Case**: 1:1 com Opportunity
- **RACI**: genérico por `object_type/object_id`; na tela Discovery tenta associar ao objeto DISCOVERY
- **VPC**: módulo independente, mas `VPCCanvas.discovery_opportunity_id` permite associação opcional com Opportunity

---

### Quais desses artefatos são obrigatórios e quais são opcionais?

Obrigatório para existir no Discovery hoje:

- apenas a `Opportunity`

Todos os demais artefatos são opcionais.

Mesmo `Problem Statement` e `Business Case` não são exigidos para criação nem para mudança de status.

---

### Existe alguma lógica de progressão/gates entre eles ou as abas são independentes?

As abas são **majoritariamente independentes**.

Não há gate formal do tipo:

- só abrir Insights se houver Research
- só criar Business Case se houver Problem + Metrics
- só avançar status se checklist estiver completo

Há apenas algumas dependências locais:

- `Experiment` pode apontar para `assumption_id`
- `Insight` pode apontar para `research_id`
- gerar VPC usa snapshot de JTBD + Problem + Solutions

Mas não existe motor de workflow entre as abas.

---

### Como o sistema determina o `Progress` mostrado na lista de Opportunities?

O “progress” exibido no frontend **não é um campo persistido**.

Ele é calculado pela página `DiscoveryPage` com base na presença de conteúdo por aba:

- overview = completo
- problem = `empty`, `partial` ou `complete` conforme preenchimento de 5 campos textuais
- jtbd/research/insights/assumptions/solutions/experiments/metrics/vpc = `complete` se houver ao menos 1 item
- business case = `complete` se existir registro

Ou seja, é um **indicador visual de completude de abas**, não um lifecycle formal.

---

### O Discovery possui lifecycle próprio ou utiliza o status da Opportunity?

Não existe lifecycle próprio de Discovery.

Quem cumpre esse papel é o `status` da Opportunity.

Além disso, alguns artefatos internos têm status próprios, mas são locais:

- Research: `planned`, `in_progress`, `completed`, `cancelled`
- Assumption: `unvalidated`, `in_progress`, `validated`, `invalidated`
- Solution: `idea`, `under_evaluation`, `selected`, `discarded`
- Experiment: `planned`, `in_progress`, `completed`, `cancelled`
- Business Case: `draft`, `in_review`, `approved`, `rejected`

Mesmo assim, não existe um lifecycle agregador de Discovery como todo.

---

## 5. Assessment / Qualification

### Já existe alguma entidade, tabela, campo ou regra que represente assessment, qualification, scoring, feasibility ou opportunity evaluation?

Não há uma entidade específica de assessment/qualification de Opportunity.

Existem apenas peças parciais reutilizáveis:

- `Opportunity.priority`
- `DiscoveryAssumption.impact`
- `DiscoveryAssumption.uncertainty_level`
- `DiscoveryInsight.impact`
- `DiscoveryInsight.confidence`
- `DiscoveryResearch.reliability`
- campos textuais de Business Case
- módulo de `PrioritizationItem`

Mas nenhum deles modela formalmente um “opportunity assessment”.

---

### Existe algum mecanismo atual que determine se uma Opportunity deve avançar, ser investigada, pausada ou encerrada?

Não de forma automatizada.

O avanço é hoje manual pela troca do campo `Opportunity.status`.

Não há regra computada nem score de elegibilidade.

---

### Já existem campos equivalentes a problem clarity, evidence, impact, expected outcome, uncertainty, strategic alignment, value, urgency ou viability?

Parcialmente, sim, mas espalhados:

- **problem clarity**: indireto via `DiscoveryProblemStatement`
- **evidence**: `available_evidence`, `DiscoveryResearch.evidence`, `DiscoveryAssumption.existing_evidence`
- **impact**: `DiscoveryInsight.impact`, `DiscoveryAssumption.impact`
- **expected outcome**: `DiscoveryJTBD.expected_result`, success metrics targets
- **uncertainty**: `DiscoveryAssumption.uncertainty_level`
- **strategic alignment**: `DiscoveryBusinessCase.strategic_alignment`
- **value**: parcialmente em business case e priorização
- **urgency**: não há campo claro em Opportunity
- **viability**: parcialmente via `AssumptionType.viability` e business case

Portanto, existem equivalentes fragmentados, mas não um framework consolidado de qualificação.

---

### Existe algum score de oportunidade/priorização que possamos reutilizar em vez de criar outro?

Existe o módulo `Prioritization`, mas ele **não é específico de Opportunity**.

O modelo `PrioritizationItem` suporta métodos:

- `RICE`
- `ICE`
- `MOSCOW`
- `EISENHOWER`
- `WSJF`

Ele hoje prioriza principalmente:

- itens de backlog
- itens de roadmap
- itens manuais

Não há sincronização nativa com `DiscoveryOpportunity`.

Logo, pode ser reutilizado conceitualmente, mas exigiria integração/modelagem adicional.

---

## 6. Intake / Origem

### Como `Opportunity Origin` funciona atualmente?

`origin` é apenas um campo string em `DiscoveryOpportunity`.

No backend existe uma lista de opções `ORIGIN_OPTIONS`, usada no endpoint/frontend.

---

### Quais valores são permitidos?

Os valores previstos hoje são:

- `customer_feedback`
- `internal_analysis`
- `market_research`
- `stakeholder_request`
- `support_tickets`
- `competitive_analysis`
- `data_analysis`
- `team_suggestion`
- `regulatory_compliance`
- `user_interview`
- `nps_survey`
- `other`

Observação: o endpoint não faz validação por enum no modelo SQL, então isso é mais convenção de API/UI do que restrição forte de banco.

---

### Existe estrutura para armazenar referência a uma solicitação externa, como `Intake ID`, source system, requester, sponsor e data de recebimento?

Não de forma estruturada.

Hoje existe apenas:

- `origin`
- `responsible_stakeholder_id`
- `identified_at`

Não há campos próprios para:

- intake id
- sistema de origem
- requester externo
- sponsor
- received_at

Essas informações só caberiam hoje em `description` ou outro campo textual livre.

---

### Uma entrada externa poderia criar uma Opportunity sem duplicarmos os dados do sistema de origem?

Não de forma completa.

Seria possível criar a Opportunity com um payload mínimo e referenciar algo externamente em texto livre, mas **não existe estrutura nativa de integração de intake** com chave de referência externa.

---

## 7. Value Canvas e Process Mapping

### Por que `Value Canvas` e `Process Mapping` são módulos independentes de Discovery?

Porque foram modelados como domínios próprios, com tabelas próprias e páginas próprias:

- VPC: `vpc_canvas`, `vpc_items`, `vpc_item_links`
- Process Mapping: `processes`, `process_groups`, `process_nodes`, `process_edges`, etc.

Discovery apenas consome ou referencia parcialmente esses módulos.

---

### Eles podem ser associados a uma Opportunity?

- **Value Canvas**: sim, via `VPCCanvas.discovery_opportunity_id`
- **Process Mapping**: não encontrei vínculo direto com Opportunity

---

### Podem ser reutilizados por mais de uma Opportunity/Initiative?

- **VPC**: tecnicamente sim como módulo independente, mas o vínculo `discovery_opportunity_id` é singular por canvas; não há tabela N:M Opportunity ↔ VPC
- **Process Mapping**: sim, por ser orientado a produto/processo e não a uma única opportunity

---

### Discovery referencia esses artefatos ou mantém dados próprios semelhantes?

Sim, especialmente no caso de VPC.

Exemplos:

- Discovery tem `JTBD`
- VPC também trabalha com `job`
- Discovery tem Problem Statement
- VPC pode receber `pain`
- Discovery tem Solution Ideas
- VPC pode receber `product`

O endpoint `generate-vpc` cria um snapshot do Discovery dentro do módulo VPC.

---

### Existe hoje alguma duplicidade conceitual entre esses módulos e os artefatos internos do Discovery?

Sim.

Principalmente:

- **JTBD** no Discovery vs `job` no VPC
- **Problem** no Discovery vs `pain` no VPC
- **Solution ideas** no Discovery vs `product` no VPC
- relações de contexto/impacto no Process Mapping vs artefatos de Discovery/Requirements

O próprio `generate-vpc` confirma essa duplicidade ao transformar dados de Discovery em VPC.

---

## 8. RACI, Requirements e Define

### Por que RACI existe dentro do Discovery e também dentro da Initiative/Roadmap?

Porque `RaciAssignment` é um artefato genérico, não específico de um módulo.

Ele usa:

- `object_type`
- `object_id`

E permite aplicar RACI a vários tipos de objeto:

- `REQUIREMENT`
- `BACKLOG`
- `DECISION`
- `RISK`
- `ROADMAP`
- `PROCESS`
- `DISCOVERY`
- `MEETING`

Então não são dois RACIs diferentes no backend; é o **mesmo mecanismo genérico** usado em vários contextos.

---

### São o mesmo artefato ou conceitos diferentes?

São o mesmo artefato técnico (`raci_assignments`), aplicado a contextos diferentes.

---

### Requirements pode ser relacionado diretamente a Opportunity, Discovery ou apenas Initiative/Product?

Diretamente a Opportunity/Discovery, **não**.

`Requirement` possui:

- `product_id`
- `business_area_id`

Não há `opportunity_id` nem `roadmap_item_id`.

Há relação indireta/flexível por `RequirementRelation`, cujo `entity_type` pode ser:

- `RESEARCH`
- `INSIGHT`
- `PROCESS_NODE`
- `VPC_PAIN`
- `RISK`
- `DECISION`
- `RELEASE`
- `METRIC`

Mas não há tipo explícito `OPPORTUNITY` nem `DISCOVERY_OPPORTUNITY`.

Então hoje Requirement está muito mais próximo de `Product / Business Area / Feature / User Story`.

---

### Em que momento do lifecycle atual uma necessidade passa de `Discover` para `Define`?

Não existe uma regra formal implementada.

Conceitualmente isso talvez ocorra quando:

- a oportunidade foi validada
- existe business case
- surge charter/roadmap/requirement

Mas o sistema atual não codifica essa transição.

---

### Existe alguma regra/gate formal para essa transição?

Não.

---

## 9. Prioritization

### O módulo `Prioritization` prioriza Opportunities, Initiatives ou itens de Backlog?

Hoje ele prioriza principalmente:

- **itens de backlog**
- **itens de roadmap/initiative**
- **itens manuais**

No backend, `_ensure_backlog_prioritization_items` cria itens automaticamente a partir de:

- `BacklogItem`
- `RoadmapItem`

Não há ingestão automática de `DiscoveryOpportunity`.

---

### Quais métodos estão implementados (RICE, ICE, MoSCoW etc.) e quais entidades eles avaliam?

Métodos implementados:

- `RICE`
- `ICE`
- `MOSCOW`
- `EISENHOWER`
- `WSJF`

Entidades avaliadas hoje:

- backlog items elegíveis
- roadmap items
- itens manuais cadastrados em `PrioritizationItem`

---

### Existe diferença entre **qualificar uma oportunidade** e **priorizar uma iniciativa aprovada** no modelo atual?

Sim, e essa diferença hoje está mais conceitual do que explicitamente modelada.

- **Qualificar oportunidade**: hoje acontece de forma manual/distribuída no Discovery, sem score consolidado
- **Priorizar iniciativa aprovada**: já tem um módulo próprio de priorização e ligação com roadmap/backlog

Ou seja:
- priorização está mais madura para `Define/Delivery`
- qualificação de oportunidade ainda não está formalizada

---

## 10. Arquitetura geral

### Qual é hoje o fluxo conceitual esperado entre `DISCOVER → DEFINE → DELIVER → OPERATE`?

Pelo domínio implementado, o fluxo conceitual parece ser:

1. **DISCOVER**
   - Opportunity
   - Problem Statement
   - JTBD
   - Research
   - Insights
   - Assumptions
   - Solutions
   - Experiments
   - Metrics
   - Business Case
   - VPC

2. **DEFINE**
   - Project Charter
   - Roadmap Item / Initiative
   - Requirements
   - RACI
   - Prioritization

3. **DELIVER**
   - Backlog
   - Sprint planning
   - links roadmap ↔ backlog
   - riscos, decisões, follow-ups

4. **OPERATE**
   - métricas, knowledge, communication, integrations, acompanhamento executivo

Mas esse fluxo é mais inferido da arquitetura dos módulos do que explicitamente orquestrado no domínio.

---

### Quais entidades fazem a transição entre cada estágio?

As pontes atuais mais relevantes são:

- **Opportunity**: entrada do Discover
- **Business Case**: consolidação de Discover
- **Project Charter**: ponte entre Discover e Define
- **RoadmapItem**: materialização de initiative/define
- **Requirement**: detalhamento de define
- **BacklogItem**: ponte Define → Deliver
- **PrioritizationItem**: camada transversal de decisão de prioridade

---

### Existe documentação/diagrama do domínio atual?

Existem evidências de documentação parcial no repositório, mas não um único documento canônico completo do domínio atual.

Exemplos no repo:

- DDLs em `database/ddl/`
- documentos antigos em `docs/old/`
- knowledge graph disponível
- documentação funcional dispersa

---

### Quais tabelas e relacionamentos implementam esse fluxo?

Principais tabelas:

**Discover**
- `discovery_opportunities`
- `discovery_opportunity_areas`
- `discovery_problem_statements`
- `discovery_problem_affected_areas`
- `discovery_jtbd`
- `discovery_research`
- `research_templates`
- `research_template_questions`
- `research_answers`
- `discovery_insights`
- `discovery_assumptions`
- `discovery_solution_ideas`
- `discovery_experiments`
- `discovery_success_metrics`
- `discovery_business_cases`

**Transição / Define**
- `project_charters`
- `roadmap_items`
- `roadmap_backlog_links`
- `requirements`
- `requirement_relations`
- `raci_assignments`

**Artefatos paralelos**
- `vpc_canvas`
- `vpc_items`
- `vpc_item_links`
- `processes`
- `process_nodes`
- `process_edges`
- `prioritization_items`

---

### Existem conceitos planejados no banco que ainda não possuem interface?

Sim, alguns indícios importantes:

- `ProjectCharter` existe no backend, mas não aparece como aba dedicada no fluxo Discovery principal
- várias relações avançadas de `Requirement` existem no banco, mas não parecem integradas a Opportunity/Discovery na UI
- `Decision` e `RequirementRelation` têm potencial de rastreabilidade maior do que a interface mostra
- `ResearchTemplate`/`ResearchAnswer` são mais sofisticados no backend do que o fluxo geral sugere

---

### Existem telas/conceitos implementados na interface que ainda não possuem lifecycle consistente no domínio?

Sim.

Exemplos:

1. **Progress da Opportunity**
   - existe na UI
   - não existe como conceito persistido nem lifecycle formal no domínio

2. **Abas do Discovery**
   - passam sensação de fluxo
   - mas o backend não impõe gates nem dependências reais

3. **Encaminhamento para Roadmap**
   - aparece semanticamente no status da Opportunity
   - mas não cria vínculo formal com roadmap

4. **RACI no Discovery**
   - a UI usa `objectType="DISCOVERY"` com `objectId={Number(selectedOpp.id)}`
   - porém `selectedOpp.id` é UUID string, e `RaciAssignment.object_id` é inteiro
   - isso sugere inconsistência técnica relevante entre UI e modelo

---

## Conclusão executiva

O Product Lab já possui uma base relativamente rica para o estágio de `Discover`, mas hoje o modelo ainda é mais um **conjunto de módulos conectados frouxamente** do que um lifecycle de produto completamente orquestrado.

### O que já está bem representado
- Opportunity como núcleo do Discovery
- artefatos de descoberta detalhados
- Business Case como entidade própria
- ponte potencial por Project Charter
- Roadmap e Prioritization já funcionando como domínios próprios
- VPC e Process Mapping como módulos independentes reutilizáveis

### Principais limitações atuais
- não existe entidade `Discovery` separada da Opportunity
- não existe ligação formal Opportunity ↔ Initiative
- “forwarded_to_roadmap” não cria transição real
- qualification/assessment de Opportunity não está modelado
- intake externo não tem estrutura própria
- Define não possui gate formal saindo de Discover
- progress do Discovery é apenas visual
- algumas ligações UI ↔ domínio ainda estão incompletas ou inconsistentes

---
