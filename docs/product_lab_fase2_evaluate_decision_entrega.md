# Product Lab — FASE 2 Evaluate & Decision

## Resumo da fase

A FASE 2 foi evoluída para estruturar a camada de **Decision** ligada à Opportunity sem transformar `Decision` em uma entidade exclusiva desse domínio.

O foco desta fase foi:

- manter `Decision` transversal;
- criar vínculo explícito com `Opportunity`;
- permitir vínculo opcional com `Business Case`;
- iniciar fluxo recommendation -> decision;
- integrar decisões no estágio `DECIDE`;
- enriquecer a experiência de avaliação e decisão;
- manter a transição de jornada manual nesta fase.

Importante:
- **não foi implementada transição automática de `journey_stage` ou `lifecycle_status` ao salvar decisão**;
- a decisão é registrada, mas não altera automaticamente o estado da Opportunity.

---

## Alterações realizadas

## 1. Domínio de Decision

### Modelo
Arquivo:
- `backend/app/models/decision.py`

Campos adicionados:
- `discovery_opportunity_id`
- `business_case_id`
- `decided_by`
- `decision_date`

### Transversalidade preservada
A entidade `Decision` continua transversal porque:
- não depende obrigatoriamente de Opportunity;
- não depende obrigatoriamente de Business Case;
- continua sendo reutilizável por outros domínios.

---

## 2. Schemas
Arquivo:
- `backend/app/schemas/decision.py`

Atualizados:
- `DecisionCreate`
- `DecisionUpdate`
- `DecisionOut`

Suporte incluído para:
- vínculo com Opportunity
- vínculo com Business Case
- `decided_by`
- `decision_date`

---

## 3. Migração incremental
Arquivo:
- `backend/app/main.py`

Garantias adicionadas em `decisions`:
- `discovery_opportunity_id`
- `business_case_id`
- `decided_by`
- `decision_date`

Índices adicionados:
- `idx_decisions_opportunity`
- `idx_decisions_business_case`

Compatibilidade preservada:
- sem remoção de dados antigos
- sem breaking change para decisões pré-existentes

---

## 4. API de Opportunity para decisões
Arquivo:
- `backend/app/api/v1/endpoints/opportunities.py`

Foram adicionados:

### Schemas específicos
- `OpportunityDecisionCreate`
- `OpportunityDecisionUpdate`
- `OpportunityDecisionOut`

### Endpoints
- `GET /opportunities/opportunities/{opp_id}/decisions`
- `POST /opportunities/opportunities/{opp_id}/decisions`
- `PATCH /opportunities/opportunity-decisions/{decision_id}`
- `DELETE /opportunities/opportunity-decisions/{decision_id}`

### Regras implementadas
Quando `business_case_id` é informado:
- o Business Case precisa existir;
- o Business Case precisa pertencer à mesma Opportunity.

---

## 5. Frontend — estágio DECIDE
Arquivo:
- `frontend/src/modules/discovery/pages/DiscoveryPage.tsx`

### Componente adicionado
- `TabDecide`

### Funcionalidades entregues
- listar decisões ligadas à Opportunity
- criar decisão
- editar decisão
- excluir decisão
- vincular opcionalmente ao Business Case
- informar:
  - `title`
  - `context`
  - `decision`
  - `consequences`
  - `status`
  - `business_case_id`
  - `decided_by`
  - `decision_date`

### Mensagem funcional
A UI deixa explícito que:
- Assessment recomenda
- Decision registra o resultado formal
- não existe transição automática de jornada nesta fase

---

## 6. Enriquecimento do fluxo Evaluate -> Decide

### Evaluate
A fase manteve o `Business Case` como artefato central de `EVALUATE`.

### Decide
A decisão agora pode ser:
- criada diretamente da Opportunity
- vinculada opcionalmente ao Business Case da mesma Opportunity

Isso introduz formalmente a separação entre:
- recommendation
- decision

---

## 7. Módulo global Decisions
Arquivo:
- `frontend/src/modules/decisions/pages/DecisionsPage.tsx`

### Melhorias entregues
- filtro por Opportunity
- associação da decisão a Opportunity na criação/edição
- exibição da Opportunity relacionada na listagem
- suporte visual para:
  - `decided_by`
  - `decision_date`

### Resultado
O módulo transversal `Decisions` passa a enxergar melhor o uso do domínio Opportunity sem deixar de ser transversal.

---

## Arquivos alterados

### Backend
- `backend/app/models/decision.py`
- `backend/app/schemas/decision.py`
- `backend/app/main.py`
- `backend/app/api/v1/endpoints/opportunities.py`

### Frontend
- `frontend/src/modules/discovery/pages/DiscoveryPage.tsx`
- `frontend/src/modules/decisions/pages/DecisionsPage.tsx`

---

## Entidades/relacionamentos criados ou alterados

### Alterada
- `decisions`

### Novos vínculos opcionais
- `Decision -> DiscoveryOpportunity`
- `Decision -> DiscoveryBusinessCase`

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
- permaneceu apenas warning de chunk size do Vite
- não bloqueia compilação

---

## O que foi atendido da FASE 2

### Entregue
- `Decision` relacionada explicitamente a Opportunity
- relação opcional com Business Case
- recommendation != decision preservado
- fluxo recommendation -> decision iniciado
- frontend integrado no estágio `DECIDE`
- módulo global `Decisions` revisado parcialmente para Opportunity

---

## Pendências remanescentes da FASE 2

Apesar da evolução importante, a FASE 2 ainda não está 100% encerrada em escopo ampliado.

### Pendências
1. enriquecer ainda mais `EVALUATE` com leitura cruzada:
   - latest assessment
   - business case
   - decisões registradas
2. revisar se haverá histórico/versionamento explícito além do registro atual por linhas
3. padronizar melhor semânticas futuras para tipos de decisão
4. eventualmente adicionar filtros/visões adicionais no backend do módulo global `Decisions`

---

## Riscos

1. ainda não existe automação ou regra de consistência entre recommendation e decisão;
2. como não há transição automática, depende do operador manter coerência do fluxo;
3. `DecisionStatus` atual ainda é genérico e pode exigir semântica mais explícita em fases posteriores;
4. o módulo global `Decisions` foi melhorado, mas ainda pode evoluir para navegação mais profunda.

---

## Recomendações para a continuidade

### Se continuar a FASE 2
Próximos passos sugeridos:
1. mostrar decisões também como resumo em `EVALUATE`;
2. enriquecer contexto do Business Case ao tomar decisão;
3. definir se haverá trilha de supersession/versionamento formal.

### Se avançar para a FASE 3
Próximo foco natural:
- gate Discover -> Define
- papel formal do Project Charter
- rastreabilidade Opportunity <-> Initiative / Roadmap

---

## Conclusão

A FASE 2 avançou de forma consistente com o objetivo original:

- `Decision` continua transversal;
- `Opportunity` ganhou vínculo explícito com `Decision`;
- `Business Case` pode participar da decisão;
- recommendation e decision foram mantidos como conceitos distintos;
- frontend e backend já suportam o registro formal de decisões no estágio `DECIDE`.

Esta entrega cobre a base estrutural e operacional da FASE 2, com espaço para refinamentos adicionais nas próximas iterações.
