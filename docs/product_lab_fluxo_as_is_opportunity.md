# Product Lab — Fluxo AS-IS de como uma Opportunity nasce hoje e até onde consegue chegar

## Resumo executivo

No estado atual do Product Lab, uma `Opportunity` nasce no módulo de `Discovery` como um registro em `discovery_opportunities` e pode evoluir por um conjunto de artefatos auxiliares, mas **sem workflow transacional forte** entre as etapas.

O sistema já oferece um caminho conceitual que vai de:

`Opportunity -> Discovery artifacts -> Business Case -> Project Charter -> Roadmap/Initiative -> Backlog/Prioritization`

Mas esse caminho é hoje:

- **parcialmente implementado**
- **muito manual**
- **com pouca rastreabilidade formal entre etapas**
- **sem gates obrigatórios**

---

## 1. Nascimento da Opportunity

A Opportunity nasce via endpoint:

- `POST /discovery/opportunities`

Entidade criada:

- `DiscoveryOpportunity`
- tabela `discovery_opportunities`

Campos principais no nascimento:

- `product_id`
- `title`
- `description`
- `origin`
- `impacted_area_id`
- `responsible_stakeholder_id`
- `identified_at`
- `status`
- `priority`

### Status inicial
Por padrão, a Opportunity nasce como:

- `identified`

### Observação importante
A criação da Opportunity **não exige** nenhum outro artefato. Não é necessário preencher:

- problema
- JTBD
- pesquisa
- business case
- RACI
- VPC

Ou seja, o nascimento é leve e desacoplado.

---

## 2. Primeira qualificação dentro do Discovery

Depois de criada, a Opportunity pode ser trabalhada no `DiscoveryPage`, que organiza a evolução em abas.

As abas relevantes hoje são:

1. Overview
2. Problem
3. JTBD
4. Research
5. Insights
6. Assumptions
7. VPC
8. Solutions
9. Experiments
10. Metrics
11. Business Case
12. RACI

### Como isso funciona na prática
Cada aba grava em uma ou mais tabelas ligadas à Opportunity por `opportunity_id`.

### Ponto-chave
As abas funcionam como **componentes independentes**. O sistema não obriga ordem formal entre elas.

---

## 3. Estruturação do problema

A primeira formalização de discovery tende a acontecer em `Problem Statement`.

Entidades:

- `DiscoveryProblemStatement`
- `DiscoveryProblemAffectedArea`

Endpoints relevantes:

- `GET /discovery/opportunities/{opp_id}/problem-statement`
- `PUT /discovery/opportunities/{opp_id}/problem-statement`
- `POST /discovery/opportunities/{opp_id}/problem-statement/affected-areas`

O problema pode registrar:

- problema observado
- quem é afetado
- impacto atual
- evidências disponíveis
- consequência da inação
- áreas afetadas estruturadas

### Observação
Há um relacionamento lógico 1:1 entre Opportunity e Problem Statement, mas sem gate obrigatório.

---

## 4. Enriquecimento de Discovery

A Opportunity pode ser enriquecida com vários artefatos complementares.

### 4.1 JTBD
Entidade:

- `DiscoveryJTBD`

Uso:
- registrar jobs to be done relacionados à oportunidade

### 4.2 Research
Entidades:

- `DiscoveryResearch`
- `ResearchAnswer`
- `ResearchTemplate`
- `ResearchTemplateQuestion`

Uso:
- planejar e conduzir pesquisas
- registrar achados, evidências e respostas estruturadas

### 4.3 Insights
Entidade:

- `DiscoveryInsight`

Uso:
- consolidar conclusões derivadas da pesquisa

### 4.4 Assumptions
Entidade:

- `DiscoveryAssumption`

Uso:
- registrar hipóteses e incertezas

### 4.5 Solutions
Entidade:

- `DiscoverySolutionIdea`

Uso:
- registrar ideias de solução ainda não formalizadas como decisão final

### 4.6 Experiments
Entidade:

- `DiscoveryExperiment`

Uso:
- testar hipóteses e soluções

### 4.7 Metrics
Entidade:

- `DiscoverySuccessMetric`

Uso:
- definir como sucesso será medido

---

## 5. Geração de Value Proposition Canvas

A Opportunity pode gerar um VPC a partir do Discovery.

Endpoint:

- `POST /discovery/opportunities/{opp_id}/generate-vpc`

Esse endpoint cria:

- um `VPCCanvas`
- itens derivados de:
  - JTBD -> `job`
  - Problem Statement -> `pain`
  - Solution Ideas -> `product`

### Importante
Isso não significa que o VPC seja a própria fonte de verdade do Discovery. O que existe hoje é um **snapshot gerado a partir do Discovery**.

Fluxo real:

`Opportunity -> Discovery artifacts -> Generate VPC -> VPC module`

---

## 6. Business Case

A Opportunity pode ganhar um `Business Case`.

Entidade:

- `DiscoveryBusinessCase`

Endpoint:

- `PUT /discovery/opportunities/{opp_id}/business-case`

Características:

- 1 Business Case por Opportunity
- ownership explícito pela Opportunity
- status próprio:
  - `draft`
  - `in_review`
  - `approved`
  - `rejected`

### Papel no fluxo
Hoje o Business Case é a melhor aproximação de “consolidação executiva” da descoberta.

### Limitação
Mesmo com Business Case aprovado, o sistema **não cria automaticamente** nenhum objeto seguinte.

---

## 7. Status da Opportunity durante o fluxo

A Opportunity pode mudar seu status a qualquer momento via `PATCH /discovery/opportunities/{id}`.

Status disponíveis:

- `identified`
- `under_investigation`
- `validated`
- `paused`
- `discarded`
- `forwarded_to_roadmap`

### O que muda de fato
Hoje, mudar o status altera apenas o campo `status`.

Não há automação do tipo:

- se validada -> criar initiative
- se descartada -> congelar edição
- se forwarded_to_roadmap -> criar roadmap item
- se paused -> abrir pendência

Portanto, o lifecycle hoje é **marcador semânticamente útil, mas fraco operacionalmente**.

---

## 8. RACI dentro da Opportunity

Na aba de Discovery, a UI expõe `RaciPanel`.

Conceito pretendido:

- associar responsáveis, aprovadores, consultados e informados à Opportunity/Discovery

Backend utilizado:

- `raci_assignments`

### Ponto de atenção
O modelo RACI é genérico e aceita `object_type = DISCOVERY`, mas há um indício de inconsistência entre:

- `selectedOpp.id` como UUID string
- `RaciAssignment.object_id` como inteiro

Ou seja, a intenção de fluxo existe, mas a implementação precisa de validação adicional.

---

## 9. Ponte para Define: Project Charter

A Opportunity pode ganhar um `ProjectCharter`.

Entidade:

- `ProjectCharter`

Endpoints:

- `GET /discovery/opportunities/{opp_id}/project-charter`
- `PUT /discovery/opportunities/{opp_id}/project-charter`

Esse charter pode carregar:

- `business_case_id`
- `opportunity_id`
- opcionalmente `roadmap_item_id`

### Papel no fluxo
O `ProjectCharter` é hoje a principal entidade-pivô entre:

- Discovery
- Business Case
- Roadmap

### Cadeia mais completa hoje
`Opportunity -> Business Case -> Project Charter -> RoadmapItem`

### Limitação
Essa ponte depende de ação manual. Não existe passo automático nem obrigatório.

---

## 10. Chegada ao Roadmap / Initiative

A Opportunity **não chega automaticamente** ao Roadmap.

Para existir uma Initiative no estado atual, alguém precisa criar manualmente um `RoadmapItem`.

Entidade:

- `RoadmapItem`

Endpoint:

- `POST /roadmap`

### O que o RoadmapItem representa
Na prática, ele funciona como a entidade de Initiative.

### Como pode se conectar à Opportunity
Hoje, somente de forma indireta:

- por `ProjectCharter.roadmap_item_id`
- por alinhamento manual de negócio
- por status `forwarded_to_roadmap` na Opportunity

### O que não existe hoje
Não existe:

- `opportunity_id` em `roadmap_items`
- tabela de relacionamento Opportunity ↔ Initiative
- herança automática de dados do Discovery

---

## 11. Descida para backlog / delivery

Depois que existe um `RoadmapItem`, ele pode se conectar a backlog por:

- `RoadmapBacklogLink`

Isso permite compor a initiative com itens executáveis.

Fluxo aproximado:

`RoadmapItem -> RoadmapBacklogLink -> BacklogItem`

Esse já é um fluxo melhor suportado no produto do que a passagem Discovery -> Roadmap.

---

## 12. Priorização

O módulo `Prioritization` entra hoje mais forte em backlog e roadmap do que em discovery.

Ele cria/usa `PrioritizationItem` para:

- backlog items
- roadmap items
- itens manuais

### O que isso significa no fluxo
Hoje o Product Lab está mais maduro para:

- priorizar delivery e iniciativa
do que para:
- qualificar oportunidade

---

## 13. Onde a Opportunity consegue chegar hoje, de fato?

### Caminho mínimo
`Opportunity`

### Caminho típico de discovery
`Opportunity -> Problem/JTBD/Research/Insights/Assumptions/Solutions/Experiments/Metrics`

### Caminho executivo
`Opportunity -> Business Case`

### Caminho de transição mais completo disponível
`Opportunity -> Business Case -> Project Charter -> RoadmapItem`

### Caminho até entrega
`Opportunity -> Business Case -> Project Charter -> RoadmapItem -> BacklogItem`

### Observação crítica
Esse último caminho existe **conceitualmente e tecnicamente em partes**, mas não como uma esteira integrada ponta a ponta.

---

## 14. O que bloqueia o fluxo ponta a ponta hoje

Os principais bloqueios do AS-IS são:

1. **Não existe entidade Discovery separada da Opportunity**
   - tudo gira em torno da Opportunity

2. **Não existe relacionamento formal Opportunity ↔ RoadmapItem**
   - o status `forwarded_to_roadmap` não materializa vínculo

3. **Project Charter não está integrado ao fluxo principal da UI de Discovery**
   - existe no backend, mas não conduz a jornada do usuário

4. **Não existe gate de passagem Discover -> Define**
   - tudo depende de operação manual

5. **Não existe engine de qualificação da Opportunity**
   - status é manual
   - progress é apenas visual

6. **Rastreabilidade é parcial**
   - boa em artefatos internos do Discovery
   - fraca na transição para initiative

---

## 15. Fluxo AS-IS resumido em diagrama textual

```text
[Criação]
Opportunity
  |
  +--> Problem Statement
  +--> JTBD
  +--> Research
  +--> Insights
  +--> Assumptions
  +--> Solution Ideas
  +--> Experiments
  +--> Success Metrics
  +--> RACI
  +--> Generate VPC --> VPCCanvas
  |
  +--> Business Case
          |
          +--> Project Charter
                  |
                  +--> Roadmap Item (Initiative, manual/indireto)
                          |
                          +--> RoadmapBacklogLink
                                  |
                                  +--> Backlog Item
```

---

## 16. Conclusão

Hoje a Opportunity nasce de forma simples, evolui muito bem dentro do módulo Discovery como repositório de artefatos, consegue chegar a Business Case e tem uma ponte potencial para Project Charter e Roadmap. Porém, a passagem entre esses estágios ainda não é um fluxo de domínio orquestrado.

### Em termos práticos:
- **nascer**: bem suportado
- **descobrir/investigar**: bem suportado
- **consolidar em business case**: suportado
- **transformar em initiative**: suportado apenas indiretamente
- **descer para delivery**: suportado a partir do Roadmap/Backlog
- **rastrear ponta a ponta**: incompleto no modelo atual
