# Product Lab — Data API para aXet Flows

## Objetivo

Esta documentação registra as APIs criadas no backend do Product Lab para consumo pelo aXet Flows.

A ideia é permitir que o Flow:
1. receba uma pergunta em linguagem natural
2. use o node LLM para interpretar a intenção
3. consulte endpoints controlados do Product Lab
4. receba JSON estruturado
5. gere a resposta final ao usuário

Essas APIs foram criadas para suportar esse padrão com segurança e previsibilidade, sem expor acesso direto ao banco de dados para o LLM.

---

## Localização no código

Arquivo principal dos endpoints:

- `backend/app/api/v1/endpoints/flows_data.py`

Registro do router:

- `backend/app/api/v1/router.py`

---

## URLs úteis

## Autenticação

Todos os endpoints em `/api/v1/flows` agora exigem a mesma autenticação já utilizada no Product Lab.

A proteção reutiliza o mesmo mecanismo do backend principal:
- cookie HTTP-only `pl_token`
- JWT validado pelo backend
- mesmo usuário/senha do login normal do Product Lab

Na prática:
- o usuário precisa estar autenticado no Product Lab
- as chamadas para a Data API devem enviar o cookie de sessão autenticada
- se não houver autenticação válida, a API retorna `401 Unauthorized`

Isso remove a exposição pública anterior dos endpoints do aXet Flows.

## URLs úteis

### Swagger UI
- `/api/docs`

### OpenAPI JSON
- `/api/openapi.json`

### Prefixo base dos endpoints do aXet Flows
- `/api/v1/flows`

Exemplo:
- `/api/v1/flows/health`

---

## Endpoints criados

## 1. Health check

### GET `/api/v1/flows/health`

Valida se a Data API destinada ao aXet Flows está operacional.

### Resposta exemplo
```json
{
  "status": "ok",
  "api": "flows-data"
}
```

---

## 2. Resumo consolidado do produto

### GET `/api/v1/flows/products/{product_id}/summary`

Retorna métricas gerais do produto.

### Campos retornados
- `product_id`
- `product_name`
- `total_requirements`
- `total_open_risks`
- `total_backlog_items`
- `total_roadmap_items`

---

## 3. Lista de requisitos

### GET `/api/v1/flows/products/{product_id}/requirements?limit=50`

Retorna requisitos estruturados do produto.

### Campos principais
- `id`
- `code`
- `title`
- `type`
- `priority`
- `lifecycle_status`
- `fulfillment_status`
- `owner`

---

## 4. Lista de riscos

### GET `/api/v1/flows/products/{product_id}/risks?limit=50`

Retorna riscos estruturados do produto.

### Campos principais
- `id`
- `title`
- `category`
- `probability`
- `impact`
- `status`
- `owner`
- `mitigation_plan`

---

## 5. Resumo de riscos

### GET `/api/v1/flows/products/{product_id}/risks-summary`

Retorna indicadores agregados de riscos.

### Campos retornados
- `total_risks`
- `high_impact`
- `medium_impact`
- `low_impact`
- `open_risks`

---

## 6. Itens prioritários do backlog

### GET `/api/v1/flows/products/{product_id}/backlog/top-priority?limit=10`

Retorna os itens mais prioritários do backlog.

### Campos principais
- `item_id`
- `title`
- `item_type`
- `current_status`
- `priority`
- `story_points`
- `wsjf_score`

---

## 7. Resumo do roadmap

### GET `/api/v1/flows/products/{product_id}/roadmap-summary`

Retorna métricas consolidadas do roadmap.

### Métricas
- `total_items`
- `planned_items`
- `in_progress_items`
- `completed_items`

---

## 8. Resumo de decisões

### GET `/api/v1/flows/products/{product_id}/decisions-summary`

Retorna métricas do módulo de decisões.

### Métricas
- `total_decisions`
- `approved`
- `pending`
- `rejected`

---

## 9. Resumo de follow-ups

### GET `/api/v1/flows/products/{product_id}/followups-summary`

Retorna métricas de follow-ups vinculados ao produto.

### Métricas
- `total_followups`
- `pending`
- `completed`
- `overdue`

---

## 10. Resumo de stakeholders

### GET `/api/v1/flows/products/{product_id}/stakeholders-summary`

Retorna métricas consolidadas de stakeholders.

### Métricas
- `total_stakeholders`
- `high_influence`
- `high_interest`

---

## 11. Oportunidades de discovery

### GET `/api/v1/flows/products/{product_id}/discovery/opportunities`

Retorna todas as oportunidades de discovery do produto.

---

## 12. Detalhe da oportunidade de discovery

### GET `/api/v1/flows/discovery/opportunities/{opportunity_id}`

Retorna os dados principais de uma oportunidade específica.

---

## 13. Problem statement da oportunidade

### GET `/api/v1/flows/discovery/opportunities/{opportunity_id}/problem-statement`

Retorna o problem statement e as áreas afetadas.

---

## 14. JTBD da oportunidade

### GET `/api/v1/flows/discovery/opportunities/{opportunity_id}/jtbd`

Retorna os jobs-to-be-done da oportunidade.

---

## 15. Research da oportunidade

### GET `/api/v1/flows/discovery/opportunities/{opportunity_id}/research`

Retorna os registros de research vinculados à oportunidade.

---

## 16. Detalhe do research

### GET `/api/v1/flows/discovery/research/{research_id}`

Retorna o detalhe de um research específico.

---

## 17. Answers do research

### GET `/api/v1/flows/discovery/research/{research_id}/answers`

Retorna perguntas e respostas do research, incluindo dados de template quando existirem.

---

## 18. Insights da oportunidade

### GET `/api/v1/flows/discovery/opportunities/{opportunity_id}/insights`

Retorna os insights vinculados à oportunidade.

---

## 19. Assumptions da oportunidade

### GET `/api/v1/flows/discovery/opportunities/{opportunity_id}/assumptions`

Retorna as assumptions vinculadas à oportunidade.

---

## 20. Solution ideas da oportunidade

### GET `/api/v1/flows/discovery/opportunities/{opportunity_id}/solution-ideas`

Retorna as solution ideas vinculadas à oportunidade.

---

## 21. Experiments da oportunidade

### GET `/api/v1/flows/discovery/opportunities/{opportunity_id}/experiments`

Retorna os experiments vinculados à oportunidade.

---

## 22. Success metrics da oportunidade

### GET `/api/v1/flows/discovery/opportunities/{opportunity_id}/success-metrics`

Retorna as success metrics vinculadas à oportunidade.

---

## 23. Catálogo consolidado da oportunidade de discovery

### GET `/api/v1/flows/discovery/opportunities/{opportunity_id}/catalog`

Retorna um snapshot consolidado da oportunidade:
- opportunity
- problem statement
- contagem de JTBD
- contagem de research
- contagem de insights
- contagem de assumptions
- contagem de solution ideas
- contagem de experiments
- contagem de success metrics

---

## 24. Resumo de discovery

### GET `/api/v1/flows/products/{product_id}/discovery-summary`

Retorna métricas do módulo de discovery.

### Métricas
- `opportunities`
- `research_items`
- `business_cases`

---

## 25. Value Canvas — lista de canvases

### GET `/api/v1/flows/products/{product_id}/value-canvas/canvases`

Retorna os canvases VPC do produto.

---

## 26. Value Canvas — detalhe do canvas

### GET `/api/v1/flows/value-canvas/canvases/{canvas_id}`

Retorna:
- canvas
- items
- links

---

## 27. Value Canvas — itens do canvas

### GET `/api/v1/flows/value-canvas/canvases/{canvas_id}/items`

Retorna os itens de um canvas VPC.

---

## 28. Value Canvas — links do canvas

### GET `/api/v1/flows/value-canvas/canvases/{canvas_id}/links`

Retorna os links entre itens do canvas.

---

## 29. Resumo do Value Canvas

### GET `/api/v1/flows/products/{product_id}/value-canvas-summary`

Retorna métricas consolidadas:
- `canvases`
- `items`
- `jobs`
- `pains`
- `gains`

---

## 30. Process Mapping — lista de processos

### GET `/api/v1/flows/products/{product_id}/process-mapping/processes`

Retorna os processos do produto.

---

## 31. Process Mapping — detalhe completo do processo

### GET `/api/v1/flows/process-mapping/processes/{process_id}`

Retorna:
- process
- groups
- nodes
- edges
- tools
- relations

---

## 32. Process Mapping — nós do processo

### GET `/api/v1/flows/process-mapping/processes/{process_id}/nodes`

Retorna os nodes de um processo.

---

## 33. Process Mapping — edges do processo

### GET `/api/v1/flows/process-mapping/processes/{process_id}/edges`

Retorna as conexões do processo.

---

## 34. Resumo do Process Mapping

### GET `/api/v1/flows/products/{product_id}/process-mapping-summary`

Retorna métricas consolidadas:
- `processes`
- `nodes`
- `edges`
- `tools`

---

## 35. Business Domains — lista

### GET `/api/v1/flows/products/{product_id}/business-domains`

Retorna os business domains relevantes para o produto.

---

## 36. Business Domains — detalhe

### GET `/api/v1/flows/business-domains/{domain_id}`

Retorna:
- domain
- subdomains
- requirement_links

---

## 37. Resumo de Business Domains

### GET `/api/v1/flows/products/{product_id}/business-domains-summary`

Retorna métricas:
- `domains`
- `subdomains`
- `requirement_links`

---

## 38. Prioritization — lista de itens

### GET `/api/v1/flows/products/{product_id}/prioritization/items`

Retorna os itens priorizados do produto.

---

## 39. Resumo de Prioritization

### GET `/api/v1/flows/products/{product_id}/prioritization-summary`

Retorna métricas:
- `items`
- `rice_items`
- `ice_items`
- `moscow_items`

---

## 40. Sprint — lista de sprints

### GET `/api/v1/flows/products/{product_id}/sprints`

Retorna os sprints do produto.

---

## 41. Sprint — detalhe do sprint

### GET `/api/v1/flows/sprints/{sprint_id}`

Retorna:
- sprint
- backlog_items associados

---

## 42. Resumo de Sprint

### GET `/api/v1/flows/products/{product_id}/sprints-summary`

Retorna métricas:
- `sprints`
- `planned`
- `active`
- `completed`

---

## 43. Companies — lista

### GET `/api/v1/flows/companies`

Retorna empresas/clientes cadastrados.

---

## 44. Companies — detalhe

### GET `/api/v1/flows/companies/{company_id}`

Retorna:
- company
- business_areas
- products

---

## 45. Resumo de Companies

### GET `/api/v1/flows/products/{product_id}/companies-summary`

Retorna métricas:
- `companies`
- `products`

---

## 46. Business Areas — lista do produto

### GET `/api/v1/flows/products/{product_id}/business-areas`

Retorna as business areas do produto.

---

## 47. Business Areas — detalhe

### GET `/api/v1/flows/business-areas/{area_id}`

Retorna:
- business_area
- companies
- members

---

## 48. Resumo de Business Areas

### GET `/api/v1/flows/products/{product_id}/business-areas-summary`

Retorna métricas:
- `areas`
- `active_areas`

---

## 49. Products — lista

### GET `/api/v1/flows/products`

Retorna a lista de produtos.
Também aceita filtro opcional:
- `?company_id={id}`

---

## 50. Product — detalhe

### GET `/api/v1/flows/products/{product_id}/detail`

Retorna os dados do produto com a company associada.

---

## 51. Stakeholders — lista do produto

### GET `/api/v1/flows/products/{product_id}/stakeholders`

Retorna stakeholders vinculados ao produto.

---

## 52. Stakeholder — detalhe

### GET `/api/v1/flows/stakeholders/{stakeholder_id}`

Retorna:
- stakeholder
- products
- memberships

---

## 53. Resumo de communication

### GET `/api/v1/flows/products/{product_id}/communication-summary`

Retorna métricas do módulo de communication.

### Métricas
- `communications`
- `published`

---

## 54. Lista completa de meetings

### GET `/api/v1/flows/products/{product_id}/meetings`

Retorna as meetings do produto com metadados principais.

### Campos principais
- `id`
- `title`
- `meeting_type`
- `meeting_date`
- `start_time`
- `duration_minutes`
- `location`
- `status`
- `objective`
- `primary_entity_type`
- `primary_entity_id`

---

## 14. Detalhe completo de uma meeting

### GET `/api/v1/flows/meetings/{meeting_id}`

Retorna a estrutura completa da reunião:
- dados da meeting
- sessões
- transcrições
- summaries

---

## 15. Sessões de uma meeting

### GET `/api/v1/flows/meetings/{meeting_id}/sessions`

Retorna as sessões registradas da reunião.

---

## 16. Transcrições de uma meeting

### GET `/api/v1/flows/meetings/{meeting_id}/transcripts`

Retorna as transcrições vinculadas à reunião.

---

## 17. Detalhe de uma transcrição

### GET `/api/v1/flows/transcripts/{transcript_id}`

Retorna o conteúdo completo de uma transcrição.

### Campos principais
- `id`
- `meeting_id`
- `session_id`
- `title`
- `content_text`
- `language`
- `source_type`
- `created_by`

---

## 18. Summaries de uma meeting

### GET `/api/v1/flows/meetings/{meeting_id}/summaries`

Retorna os summaries/minutes vinculados à reunião.

---

## 19. Resumo de meetings

### GET `/api/v1/flows/products/{product_id}/meetings-summary`

Retorna métricas do módulo de reuniões.

### Métricas
- `meetings`
- `scheduled`
- `completed`

---

## 61. Resumo de knowledge

### GET `/api/v1/flows/products/{product_id}/knowledge-summary`

Retorna métricas da base de conhecimento.

### Métricas
- `articles`

---

## 62. Resumo de RACI

### GET `/api/v1/flows/products/{product_id}/raci-summary`

Retorna métricas das atribuições RACI.

### Métricas
- `assignments`
- `responsible`
- `accountable`
- `consulted`
- `informed`

---

## 63. Catálogo consolidado de módulos

### GET `/api/v1/flows/products/{product_id}/modules-catalog`

Retorna um snapshot resumido de vários módulos do Product Lab.

### Uso esperado
Esse endpoint é útil para o primeiro passo do planner no aXet Flows, permitindo:
- descobrir quais módulos têm dados relevantes
- escolher quais endpoints detalhados consultar
- montar respostas analíticas com mais contexto

### Módulos presentes no catálogo
- `product`
- `requirements`
- `risks`
- `backlog`
- `roadmap`
- `decisions`
- `followups`
- `stakeholders`
- `discovery`
- `communication`
- `meetings`
- `knowledge`
- `raci`

---

## Exemplo de uso no aXet Flows

### Pergunta do usuário
- "Quais módulos do produto 1 mostram mais pendências?"

### Passos sugeridos no Flow
1. chamar `GET /api/v1/flows/products/1/modules-catalog`
2. analisar o resumo retornado
3. decidir quais endpoints detalhados consultar, por exemplo:
   - `/risks-summary`
   - `/followups-summary`
   - `/backlog/top-priority`
4. entregar os dados ao segundo LLM para gerar a resposta final

---

## Observações de segurança

Na implementação atual, os endpoints foram registrados como públicos para facilitar o laboratório e a integração inicial com o aXet Flows.

Para QA/produção, recomenda-se adicionar:
- autenticação máquina-a-máquina
- API key ou token dedicado
- controle por ambiente
- logs de acesso
- limitação de escopo por produto/empresa

---

## Próximas evoluções recomendadas

Para suportar melhor insights avançados, tendências e predições, recomenda-se criar no futuro:

- endpoints com séries históricas
- endpoints por período
- endpoints de evolução temporal
- endpoints analíticos específicos para forecast

Exemplos:
- `/products/{id}/risk-evolution`
- `/products/{id}/backlog-aging`
- `/products/{id}/delivery-forecast`
- `/products/{id}/followups-overdue-trend`

---

## Resumo final

A Data API criada fornece uma camada controlada para o aXet Flows consultar informações do Product Lab com Swagger/OpenAPI automático, permitindo evolução segura do uso de LLM sobre dados estruturados.
