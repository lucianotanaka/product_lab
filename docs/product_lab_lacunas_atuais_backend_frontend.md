# Product Lab — Lacunas atuais entre banco/backend, interface e domínio

## Objetivo

Este documento lista as principais lacunas observadas no estado atual do Product Lab, com foco em:

1. o que já existe no banco/backend mas não está claramente exposto na interface
2. o que existe na interface mas ainda não tem sustentação consistente no domínio
3. o que precisaria ser criado para fechar o fluxo `Discover -> Define -> Deliver`

---

## 1. Resumo executivo

O Product Lab já possui uma base técnica considerável para Discovery, Roadmap, Requirements, Prioritization, VPC e Process Mapping. O principal problema não é ausência total de modelagem, mas sim **descontinuidade entre módulos**.

As lacunas mais relevantes hoje são:

- ausência de vínculo formal entre `Opportunity` e `Initiative`
- ausência de uma etapa formal de `qualification/assessment`
- ausência de intake estruturado
- ausência de gate de transição `Discover -> Define`
- ausência de exposição consistente de `Project Charter`
- ausência de rastreabilidade ponta a ponta
- inconsistências entre alguns componentes da UI e o modelo persistido

---

## 2. O que já existe no banco/backend mas não está claramente exposto na interface

## 2.1 Project Charter já existe no backend, mas não está integrado ao fluxo principal da UI

### O que existe
Entidade e endpoints prontos para:

- `ProjectCharter`
- leitura/escrita por Opportunity
- leitura/escrita por Roadmap

### O que falta na interface
No `DiscoveryPage`, não há uma aba explícita de `Project Charter` conduzindo a passagem para `Define`.

### Impacto
O backend já oferece a principal entidade de ponte entre:

- Opportunity
- Business Case
- Roadmap

Mas o usuário não percorre esse passo de forma natural no fluxo principal.

### O que precisaria ser criado
- aba/tela de `Project Charter` no Discovery
- CTA explícita do tipo “promover para Define”
- ligação visual com RoadmapItem

---

## 2.2 Business Case tem modelagem madura, mas ainda não dispara próximas etapas

### O que existe
`DiscoveryBusinessCase` já suporta:

- status
- recomendação go/no-go
- alinhamento estratégico
- impacto financeiro
- custos/esforço
- aprovações

### O que falta
Mesmo com `status = approved`, não há:
- criação automática de charter
- criação automática de initiative
- mudança de estado orquestrada da Opportunity

### O que precisaria ser criado
- regras de transição baseadas em status do Business Case
- ações de “aprovar e criar charter”
- ou “aprovar e encaminhar para roadmap”

---

## 2.3 Research backend é mais sofisticado que a visão macro do domínio

### O que existe
O backend de research tem:
- templates
- perguntas estruturadas
- respostas por sessão
- perguntas ad hoc
- persistência detalhada
- seções before/during/after

### O que falta
Apesar da riqueza operacional, isso ainda não se converte em:
- critérios formais de decisão da Opportunity
- score de evidência
- gates de maturidade do Discovery

### O que precisaria ser criado
- agregadores de evidência
- indicadores de qualidade de discovery
- uso de research na qualificação formal da Opportunity

---

## 2.4 Requirement possui estrutura de governança mais rica do que a integração atual sugere

### O que existe
`Requirement` já possui:
- lifecycle_status
- fulfillment_status
- verification
- history
- change requests
- relações com outras entidades

### O que falta
No fluxo Opportunity/Discovery atual não existe uma ponte explícita para:
- transformar outputs de discovery em requirements
- rastrear quais discoveries originaram quais requirements

### O que precisaria ser criado
- vínculo formal `Opportunity -> Requirement`
- ou vínculo formal `ProjectCharter/RoadmapItem -> Requirement`
- assistente de geração de requirements a partir de discovery aprovado

---

## 2.5 Decision existe como entidade, mas isolada do fluxo principal

### O que existe
- entidade `Decision`
- status de decisão
- RACI possível
- possibilidade indireta de relação via `RequirementRelation`

### O que falta
Não existe costura com:
- Opportunity
- Business Case
- Initiative
- Roadmap

### O que precisaria ser criado
- relacionamento explícito de Decision com Opportunity e/ou Roadmap
- uso de decisão como gate de aprovação/rejeição

---

## 2.6 Process Mapping e VPC já são módulos independentes, mas faltam relações mais explícitas

### O que existe
- VPC com referência opcional à Opportunity
- Process Mapping com relações a insights, research, VPC pain/gain, requirements etc.

### O que falta
- associação formal de Process Mapping com Opportunity
- política clara de reutilização de VPC entre opportunities/initiatives
- convenção única para “fonte da verdade” entre Discovery e VPC

### O que precisaria ser criado
- regras e modelo de associação
- N:M se o reuso for desejado
- diretriz clara de ownership conceitual

---

## 3. O que existe na interface mas ainda não possui lifecycle consistente no domínio

## 3.1 Progress da Opportunity é apenas visual

### O que existe na UI
A tela de Discovery mostra “progress” por Opportunity.

### O que existe no backend
Não existe campo persistido nem engine de progressão.

### Problema
O usuário pode interpretar esse progress como maturidade formal, mas na prática ele é só:
- contagem de abas com conteúdo

### O que precisaria ser criado
- modelo de completion/maturity
- critérios configuráveis de etapa
- persistência de score ou estágio

---

## 3.2 As abas do Discovery parecem workflow, mas não são workflow

### O que existe na UI
A navegação em abas passa sensação de pipeline:
- problem
- jtbd
- research
- insights
- assumptions
- etc.

### O que existe no backend
As abas são independentes; não há gates reais.

### Problema
Há uma expectativa de processo que o domínio ainda não sustenta.

### O que precisaria ser criado
- regras explícitas de progressão
- pré-condições opcionais ou obrigatórias
- estado de etapa no Discovery

---

## 3.3 Encaminhamento para Roadmap existe como status, não como transição real

### O que existe na UI/backend
Opportunity pode receber status:
- `forwarded_to_roadmap`

### O que não existe
- criação de `RoadmapItem`
- link Opportunity ↔ RoadmapItem
- confirmação transacional da passagem

### Problema
A nomenclatura sugere uma ação concluída, mas o domínio só registra uma intenção/status.

### O que precisaria ser criado
- comando explícito “enviar para roadmap”
- criação de roadmap item ou proposal
- tabela de relacionamento

---

## 3.4 RACI em Discovery tem indício de inconsistência técnica

### O que existe na UI
`RaciPanel objectType="DISCOVERY" objectId={Number(selectedOpp.id)}`

### O que existe no backend
`RaciAssignment.object_id` é inteiro, mas:
- `DiscoveryOpportunity.id` é UUID string

### Problema
Isso indica alta chance de incompatibilidade ou comportamento incorreto.

### O que precisaria ser criado/ajustado
Uma das duas abordagens:
1. mudar `object_id` para string/UUID-friendly no modelo genérico
2. introduzir ids inteiros compatíveis
3. criar uma camada de mapeamento estável por objeto

---

## 3.5 Discovery sugere ownership de RACI, mas o artefato é genérico

### O que existe
A UI transmite a impressão de “RACI do Discovery”.

### O que existe no domínio
RACI é um artefato genérico para vários objetos.

### Problema
Sem uma estratégia consistente de identidade do objeto, a governança associada à Opportunity fica frágil.

### O que precisaria ser criado
- padrão robusto de identificadores por object_type
- validações cruzadas no backend

---

## 4. O que está ausente no banco/backend e precisaria efetivamente ser criado

## 4.1 Entidade ou estrutura formal de Assessment / Qualification de Opportunity

### Lacuna
Hoje não existe entidade dedicada para qualificar oportunidade.

### Por que faz falta
As perguntas pedidas apontam para dimensões como:
- clarity
- evidence
- impact
- uncertainty
- strategic alignment
- value
- urgency
- viability

Essas dimensões hoje estão espalhadas, mas não consolidadas.

### O que precisaria ser criado
Uma nova entidade, por exemplo:
- `opportunity_assessments`
ou equivalente

Campos possíveis:
- `opportunity_id`
- `problem_clarity`
- `evidence_strength`
- `expected_impact`
- `expected_outcome`
- `uncertainty_level`
- `strategic_alignment`
- `urgency`
- `viability`
- `recommendation`
- `assessment_score`
- `assessed_by`
- `assessed_at`

---

## 4.2 Vínculo formal entre Opportunity e Initiative

### Lacuna
Hoje não existe relação direta entre:
- `DiscoveryOpportunity`
- `RoadmapItem`

### Por que faz falta
Impossibilita responder de forma estruturada:
- uma opportunity gerou qual initiative?
- uma initiative consolidou quais opportunities?
- qual a cardinalidade entre elas?

### O que precisaria ser criado
Opção A:
- `roadmap_items.opportunity_id`

Opção B, mais flexível:
- tabela associativa `opportunity_roadmap_links`

Campos possíveis:
- `id`
- `opportunity_id`
- `roadmap_item_id`
- `link_type`
- `is_primary`
- `created_at`

A opção B é melhor se for importante suportar:
- 1 opportunity -> N initiatives
- N opportunities -> 1 initiative

---

## 4.3 Intake estruturado / origem externa

### Lacuna
`origin` hoje é insuficiente para intake real.

### O que faz falta
Campos como:
- intake_id
- source_system
- source_url
- requester_name
- requester_id
- sponsor_name
- received_at
- raw_payload_ref

### O que precisaria ser criado
Uma estrutura do tipo:
- `opportunity_intakes`
ou
- campos adicionais em `discovery_opportunities`

### Recomendação
Criar entidade separada é melhor, pois evita acoplamento de Opportunity com vários tipos de origem externa.

---

## 4.4 Gate formal de transição `Discover -> Define`

### Lacuna
Hoje não existe regra objetiva para passagem.

### O que precisaria ser criado
Um mecanismo de promotion, por exemplo:
- `promote_opportunity_to_define`
- com pré-condições verificáveis

Possíveis critérios:
- problem statement completo
- evidência mínima
- assessment aprovado
- business case aprovado
- responsible definido
- RACI mínimo

### Resultado esperado
A promoção deveria criar ou vincular:
- `ProjectCharter`
- `RoadmapItem`
- possivelmente `Requirement seeds`

---

## 4.5 Histórico de decisão mais robusto

### Lacuna
Decision não tem versionamento.

### O que precisaria ser criado
- `decision_history`
- ou `decision_versions`

Com:
- rationale
- autor
- timestamp
- tipo de mudança
- status anterior/novo

---

## 4.6 Ligação formal de Requirement com Discovery / Opportunity

### Lacuna
Outputs de discovery não têm caminho formal até requirement.

### O que precisaria ser criado
Alternativas:
- `requirements.opportunity_id`
- `requirement_relations` aceitar `OPPORTUNITY`
- `requirement_relations` aceitar `DISCOVERY_OPPORTUNITY`

### Melhor abordagem
Manter `Requirement` desacoplado e usar relações explícitas, se houver intenção de preservar flexibilidade.

---

## 4.7 Lifecycle próprio de Discovery

### Lacuna
Hoje o lifecycle agregado é o da Opportunity.

### O que precisaria ser criado
Se o produto quiser separar Opportunity de Discovery, precisaria de:
- nova entidade `Discovery`
ou
- campo/estado formal de etapa discovery

Exemplos:
- `not_started`
- `framing`
- `researching`
- `synthesizing`
- `business_case`
- `ready_for_define`
- `closed`

---

## 5. O que parece precisar mais de integração do que de criação do zero

Algumas necessidades não pedem modelagem completamente nova, e sim integração melhor do que já existe.

## 5.1 Business Case
Já existe bastante estrutura; o que falta é:
- acionar próximas etapas
- aparecer melhor na jornada

## 5.2 Project Charter
Já existe backend; falta:
- UX
- visibilidade
- conexão com roadmap

## 5.3 Prioritization
Já existe motor e métodos; falta:
- integração com Opportunity
- diferenciação explícita entre “qualificação” e “priorização de delivery”

## 5.4 VPC
Já existe vínculo básico; falta:
- clarificar ownership
- definir reuso
- formalizar relação com discovery

## 5.5 Requirement relations
Já existe infraestrutura; falta:
- incluir Opportunity/Discovery nos tipos relevantes, se isso fizer parte do desenho futuro

---

## 6. Proposta de classificação das lacunas por prioridade

## Alta prioridade
1. vínculo formal Opportunity ↔ Initiative
2. intake estruturado
3. assessment/qualification de Opportunity
4. gate formal Discover -> Define
5. correção/validação da inconsistência RACI x UUID

## Média prioridade
6. expor Project Charter na UI principal
7. ligar Business Case a transições reais
8. ligar Requirement ao output de Discovery
9. melhorar integração de Decision ao fluxo

## Baixa/média prioridade
10. formalizar lifecycle próprio de Discovery
11. clarificar política de VPC reutilizável
12. associar Process Mapping a Opportunity quando necessário

---

## 7. Conclusão

O Product Lab não está “vazio” nessas áreas; pelo contrário, já possui vários blocos importantes implementados. A principal lacuna é a **orquestração entre os blocos**.

### Em resumo:

#### Já existe e pode ser reaproveitado
- Opportunity como núcleo
- artefatos de discovery
- Business Case
- Project Charter
- RoadmapItem
- Prioritization
- Requirements
- VPC
- Process Mapping
- RACI genérico

#### Ainda precisa ser criado ou formalizado
- assessment estruturado
- intake estruturado
- vínculo Opportunity ↔ Initiative
- gate Discover -> Define
- rastreabilidade ponta a ponta
- alinhamento consistente entre UI e domínio em alguns pontos críticos

O próximo passo natural de evolução do produto não parece ser criar módulos totalmente novos, mas sim **costurar corretamente os módulos existentes com transições, cardinalidades e ownership explícitos**.
