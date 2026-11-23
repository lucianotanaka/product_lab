# Product Lab — FASE 3 Define / Roadmap

## Resumo da fase

A FASE 3 foi concluída tomando como base o que já estava parcialmente implementado no código.

Em vez de introduzir uma nova tabela N:M agora, a implementação seguiu a estratégia mais aderente ao estado atual do sistema:

- `Project Charter` como ponte principal entre Discovery e Roadmap
- `Business Case` como pré-requisito de avaliação
- `forward-to-roadmap` como gate operacional de transição
- rastreabilidade principal `Opportunity -> Project Charter -> Roadmap Item`

Essa escolha foi baseada na estrutura já existente no backend e nas telas já disponíveis no frontend.

---

## Diagnóstico realizado antes da implementação

A revisão do código mostrou que a solução parcialmente pronta já era:

### Backend já existente
Arquivo:
- `backend/app/api/v1/endpoints/discovery_business.py`

Já havia:
- `GET/PUT /discovery/opportunities/{opp_id}/project-charter`
- `GET/PUT /discovery/roadmap/{roadmap_item_id}/project-charter`
- `POST /discovery/opportunities/{opp_id}/forward-to-roadmap`

Também já existia validação exigindo:
- `Business Case`
- `Project Charter`

antes do encaminhamento para Roadmap.

### Modelo já existente
Arquivo:
- `backend/app/models/discovery.py`

`ProjectCharter` já possuía:
- `opportunity_id`
- `roadmap_item_id`
- `business_case_id`

Ou seja, o sistema já tinha uma ponte implícita pronta entre:
- Opportunity
- Business Case
- Project Charter
- Roadmap Item

---

## Decisão arquitetural adotada

A FASE 3 foi finalizada seguindo a implementação já aderente ao produto atual:

## Estratégia escolhida
**Project Charter como ponte principal nesta fase, sem criar tabela N:M nova agora.**

### Justificativa
- já existia no domínio
- já existia no backend
- já existia no fluxo de `forward-to-roadmap`
- reduz retrabalho
- evita criar uma rastreabilidade paralela concorrente neste momento

---

## Alterações realizadas

## 1. Novo estágio explícito de DEFINE no frontend Discovery
Arquivo:
- `frontend/src/modules/discovery/pages/DiscoveryPage.tsx`

Foi criado o estágio:

- `tab_define`

Atualização da sequência:
- Overview
- Assess
- Discover
- Evaluate
- **Define**
- Decide
- RACI

### Objetivo
Representar explicitamente o gate entre:
- discovery/evaluation
- encaminhamento para roadmap / define

---

## 2. Nova aba `TabDefine`
Arquivo:
- `frontend/src/modules/discovery/pages/DiscoveryPage.tsx`

Foi criado um novo componente:

- `TabDefine`

### Funções entregues
- carregar `Project Charter` da Opportunity
- mostrar status do `Business Case`
- mostrar status do `Project Charter`
- mostrar se já existe `roadmap_item_id`
- criar um **starter charter** automaticamente a partir do `Business Case`
- executar `forward-to-roadmap`
- atualizar o estado visual da Opportunity após encaminhamento

---

## 3. Gate explícito Discover -> Define
A tela agora expõe o gate operacional atual do sistema:

### Condições para avançar
- Business Case presente
- Project Charter presente

### Resultado do gate
Ao executar `forward-to-roadmap`:
- a Opportunity é encaminhada
- o `Project Charter` recebe `roadmap_item_id`
- o vínculo principal com Roadmap fica rastreável

---

## 4. Rastreabilidade adotada na FASE 3

A rastreabilidade implementada e assumida como oficial nesta fase é:

`Opportunity -> Project Charter -> Roadmap Item`

Com apoio de:
- `Business Case`
- `Decision` quando necessário no estágio de decisão

### O que isso significa
Nesta fase, a rastreabilidade principal não é uma tabela explícita N:M, mas sim o uso coordenado de:

- `ProjectCharter.opportunity_id`
- `ProjectCharter.roadmap_item_id`
- `ProjectCharter.business_case_id`

---

## 5. Enriquecimento de Evaluate
Arquivo:
- `frontend/src/modules/discovery/pages/DiscoveryPage.tsx`

A aba `EVALUATE` passou a mostrar contexto adicional:
- status do Business Case
- quantidade de decisões registradas
- card-resumo para leitura cruzada do fluxo

---

## 6. Integração com transição para Roadmap
A fase aproveitou a lógica já existente de:
- `forward-to-roadmap`

e a conectou melhor à experiência de Discovery.

### Resultado
Agora a tela Discovery deixa explícito:
- quando existe Business Case
- quando existe Charter
- quando já existe vínculo com Roadmap
- quando a Opportunity já foi encaminhada

---

## O que foi implementado no frontend

Arquivo principal:
- `frontend/src/modules/discovery/pages/DiscoveryPage.tsx`

### Inclusões principais
- `ProjectCharter` interface
- `ForwardToRoadmapResult` interface
- `TabDefine`
- novo tab `tab_define`
- ajuste do stepper visual
- contagem de decisões para apoiar Evaluate
- integração do `forward-to-roadmap` no fluxo Define

---

## Estratégia confirmada pelo código existente

A revisão mostrou que a alternativa mais aderente era:

### Sim
- usar `Project Charter` como ponte principal nesta fase

### Não, por enquanto
- criar agora tabela explícita N:M Opportunity ↔ Roadmap
- introduzir novo conceito concorrente de Initiative sem consolidar o atual

---

## Arquivos alterados

### Frontend
- `frontend/src/modules/discovery/pages/DiscoveryPage.tsx`

### Documentação
- `docs/product_lab_fase3_define_roadmap_entrega.md`

---

## Testes executados

## Frontend build
Comando executado:

`npm --prefix frontend run build`

### Resultado
- `tsc -b` OK
- `vite build` OK

### Observação
Permanece apenas warning não bloqueante do Vite sobre chunk size.

---

## O que a FASE 3 fecha

### Entregue
- estágio `DEFINE` explicitado na UI
- gate operacional Discovery -> Roadmap visível
- uso do `Project Charter` como artefato formal de transição
- rastreabilidade principal Opportunity -> Project Charter -> Roadmap
- encaminhamento para Roadmap alinhado ao que já existia no backend
- escolha arquitetural aderente ao estado real do código

---

## Limites atuais da solução

A FASE 3 foi concluída com base no desenho existente, mas há limitações estruturais já conhecidas.

### Limitações
1. a rastreabilidade principal ainda não é N:M explícita
2. `Initiative` continua representada, na prática, por `Roadmap Item`
3. ainda não existe modelo formal para:
   - uma Opportunity gerar várias Initiatives
   - uma Initiative consolidar várias Opportunities
4. isso pode virar uma FASE futura de consolidação de domínio

---

## Próximos passos recomendados

### Se houver FASE 4
Os próximos alvos naturais seriam:

1. formalizar `Initiative` no domínio, se necessário
2. decidir se Roadmap Item continuará sendo a representação suficiente
3. criar rastreabilidade N:M explícita apenas quando a necessidade real estiver clara
4. alinhar melhor `Define -> Requirements -> Backlog`

---

## Conclusão

A FASE 3 foi finalizada seguindo a alternativa mais aderente ao código já existente.

### Estado final
- `Project Charter` foi assumido como ponte oficial de transição nesta fase
- o gate `Discover / Evaluate -> Define / Roadmap` ficou explícito
- a UI passou a refletir o fluxo já implementado no backend
- a rastreabilidade atual ficou coerente e operacional sem criar uma estrutura paralela prematura

A FASE 3 pode ser considerada concluída no escopo implementado.
