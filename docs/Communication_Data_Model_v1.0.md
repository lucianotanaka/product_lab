# Product Lab - Communication Data Model
Versão: 1.0

Autor: Luciano Tanaka

Produto: Product Lab

---

# 1. Objetivo

Este documento descreve o Modelo Lógico de Dados do Domínio de Comunicação.

Seu objetivo é transformar o Modelo Conceitual em entidades persistentes que posteriormente serão implementadas no PostgreSQL.

Este documento não contém scripts SQL.

Seu propósito é documentar:

- tabelas;
- responsabilidades;
- relacionamentos;
- regras de integridade;
- dependências.

---

# 2. Convenções

Todas as tabelas do Domínio de Comunicação seguem as seguintes convenções.

## Chaves Primárias

Toda tabela possuirá uma chave primária do tipo inteiro.

Exemplo.

communication_id

publication_id

section_id

---

## Auditoria

Todas as tabelas deverão possuir, quando aplicável:

created_at

updated_at

created_by

updated_by

---

## Status

Sempre que necessário serão utilizados Status ao invés de exclusão física.

---

## Integridade

Sempre que possível deverão ser utilizadas chaves estrangeiras.

Nenhuma informação deverá ser duplicada entre domínios.

---

## Responsabilidade

Cada tabela possui uma única responsabilidade.

Caso uma tabela passe a possuir múltiplas responsabilidades, sua modelagem deverá ser revista.

---

# 3. Classificação das Tabelas

As tabelas do Domínio de Comunicação estão organizadas em quatro grupos.

## Configuração

Representam configurações permanentes do sistema.

- communication_types
- communication_schedules
- communication_templates
- template_sections
- delivery_channels

---

## Operação

Representam informações geradas durante a utilização do sistema.

- communications
- publications
- sections
- publication_audiences
- publication_deliveries

---

## Inteligência Artificial

Representam todas as execuções realizadas pelos LLMs/Agents.

- agent_executions
- execution_evidences

---

## Governança

Representam histórico e rastreabilidade.

- publication_reviews
- publication_versions
- delivery_recipients

---

# 4. Dependências

O Domínio de Comunicação depende dos seguintes módulos do Product Lab.

- Products
- Users
- Backlog
- Product Features
- Product Impacts
- Decision Journal
- Knowledge Base
- Stakeholders
- Roadmap

Esses módulos não dependem do Domínio de Comunicação.

A dependência ocorre em apenas um sentido.

---

# 5. Modelo das Tabelas

## communication_types

### Objetivo

Representar os tipos de comunicação suportados pelo Product Lab.

### Exemplos

Product Magazine

Executive Status Report

Sprint Summary

Meeting Minutes

Release Notes

---

### Responsabilidades

- identificar o tipo de comunicação;
- descrever sua finalidade;
- permitir reutilização por diversas comunicações.

---

### Relacionamentos

1:N

communications

---

### Observações

Tabela de domínio.

Pouca alteração ao longo do tempo.

---

## communications

### Objetivo

Representar uma estratégia permanente de comunicação.

### Exemplos

BA Magazine

Executive Status Report

Sprint Summary

Meeting Minutes

---

### Responsabilidades

- identificar a comunicação;
- definir seu objetivo;
- associá-la a um produto;
- associá-la a um tipo;
- associá-la a um template;
- definir seu comportamento geral.

---

### Relacionamentos

N:1

communication_types

N:1

products

N:1

communication_templates

1:0..1

communication_schedules

1:N

publications

---

### Observações

Não armazena conteúdo.

Não armazena destinatários.

Não armazena publicações.

Representa apenas a definição permanente da comunicação.

---

## communication_schedules

### Objetivo

Representar regras de recorrência das comunicações programadas.

---

### Exemplos

Toda Sprint

Mensal

Semanal

Trimestral

---

### Responsabilidades

Definir quando uma comunicação deverá gerar novas publicações.

---

### Relacionamentos

1:1

communications

---

### Observações

Comunicações sob demanda não utilizam esta tabela.

---

## communication_templates

### Objetivo

Representar modelos reutilizáveis de comunicação.

---

### Responsabilidades

Definir estrutura padrão.

Definir Prompt Geral.

Definir comportamento editorial.

---

### Relacionamentos

1:N

template_sections

1:N

communications

---

### Observações

Não armazena conteúdo gerado.

Representa apenas a estrutura.

---

## template_sections

### Objetivo

Representar seções previstas em um Template.

---

### Exemplos

Editorial

Highlights

Value Delivered

Timeline

Before × After

---

### Responsabilidades

Definir:

- ordem;
- obrigatoriedade;
- Prompt da Seção;
- comportamento esperado.

---

### Relacionamentos

N:1

communication_templates

---

### Observações

As alterações em um Template não modificam Publicações já existentes.

---

## audiences

### Objetivo

Representar um público lógico para o qual uma publicação poderá ser direcionada.

Uma audiência não representa necessariamente uma pessoa.

Ela representa um grupo de interesse.

---

### Exemplos

Executive Leadership

RSA Team

Bridge Access Users

Product Owners

Steering Committee

Customers

Partners

---

### Responsabilidades

- identificar o público;
- definir características da audiência;
- permitir reutilização em diversas publicações.

---

### Relacionamentos

N:N

publications

(através da tabela publication_audiences)

---

### Observações

A audiência pertence à Publicação.

Uma mesma Communication poderá gerar publicações para diferentes audiências.

---

## publication_audiences

### Objetivo

Relacionar publicações aos respectivos públicos destinatários.

---

### Responsabilidades

- indicar quais audiências receberão determinada publicação;
- permitir múltiplas audiências para uma mesma publicação.

---

### Relacionamentos

N:1

publications

N:1

audiences

---

### Observações

Esta tabela não representa pessoas.

Representa apenas o relacionamento entre uma publicação e seus públicos.

---

## publications

### Objetivo

Representar uma ocorrência específica de uma Communication.

Uma Publication corresponde a uma edição, relatório ou documento efetivamente produzido.

---

### Exemplos

BA Magazine — Issue 004

Executive Status Report — July 2026

Meeting Minutes — Sprint Review 2026-07-19

Release Notes — Version 5.2

---

### Responsabilidades

- representar uma edição específica;
- armazenar período de referência;
- controlar status;
- controlar ciclo de revisão;
- controlar ciclo de publicação.

---

### Relacionamentos

N:1

communications

1:N

sections

1:N

publication_reviews

1:N

publication_versions

1:N

publication_deliveries

N:N

audiences

---

### Observações

Publication não representa um arquivo.

Publication representa uma comunicação produzida.

Arquivos PDF, PowerPoint, HTML e outros pertencem ao processo de entrega.

---

## sections

### Objetivo

Representar os blocos de conteúdo pertencentes a uma publicação.

---

### Exemplos

Editorial

Highlights

Before × After

Value Delivered

Timeline

Coming Next

Risks

Actions

Decisions

---

### Responsabilidades

- armazenar o conteúdo atual da seção;
- manter sua posição dentro da publicação;
- identificar sua finalidade editorial;
- servir como ponto de partida para gerações realizadas por LLMs/Agents.

---

### Relacionamentos

N:1

publications

N:1

template_sections

1:N

agent_executions

---

### Observações

O conteúdo da seção representa sempre a versão corrente.

O histórico completo das gerações permanece armazenado em agent_executions.

A alteração de uma seção não modifica o Template original.

---

## agent_executions

### Objetivo

Representar cada execução realizada por um LLM ou Agent para geração de conteúdo.

Cada execução deverá preservar integralmente o contexto utilizado durante a geração.

O objetivo desta entidade é permitir rastreabilidade, auditoria e reprodutibilidade das respostas produzidas.

---

### Responsabilidades

- registrar qual modelo foi utilizado;
- registrar qual Agent executou a solicitação;
- armazenar o Prompt Geral;
- armazenar o Prompt da Seção;
- armazenar o contexto enviado;
- registrar parâmetros da execução;
- armazenar a resposta gerada;
- registrar métricas de consumo;
- registrar tempo de processamento;
- registrar custo estimado.

---

### Relacionamentos

N:1

sections

1:N

execution_evidences

---

### Informações registradas

Cada execução deverá permitir identificar:

- modelo utilizado;
- versão do modelo;
- provider;
- Prompt Geral;
- Prompt da Seção;
- contexto enviado;
- parâmetros utilizados;
- resposta produzida;
- usuário solicitante;
- data da execução;
- duração;
- quantidade de tokens;
- custo estimado;
- status da execução.

---

### Observações

Uma mesma seção poderá possuir inúmeras execuções.

Apenas uma delas será considerada a origem do conteúdo atualmente aprovado.

As demais permanecem armazenadas para fins de auditoria.

---

## execution_evidences

### Objetivo

Representar todas as evidências utilizadas durante uma execução de LLM/Agent.

Esta entidade garante rastreabilidade completa entre o conhecimento utilizado e o conteúdo produzido.

---

### Responsabilidades

- relacionar evidências utilizadas;
- permitir reprodução da execução;
- permitir auditoria do contexto.

---

### Relacionamentos

N:1

agent_executions

---

### Origens possíveis

Uma evidência poderá referenciar qualquer módulo do Product Lab.

Exemplos.

- Product Impact
- Product Feature
- Backlog Item
- Sprint
- Decision Journal
- Knowledge Article
- Stakeholder Interaction
- Metric
- Risk
- Roadmap
- Meeting
- VPC

---

### Observações

A entidade não armazena o conteúdo da evidência.

Ela apenas referencia sua origem.

---

## publication_reviews

### Objetivo

Registrar todas as ações de revisão realizadas sobre uma publicação.

---

### Responsabilidades

- registrar revisões;
- registrar aprovações;
- registrar rejeições;
- registrar comentários.

---

### Relacionamentos

N:1

publications

---

### Exemplos

Review Requested

Reviewed

Approved

Rejected

Published

Republished

---

### Observações

Uma publicação poderá passar por inúmeras revisões.

Nenhuma informação deverá ser perdida.

---

## publication_versions

### Objetivo

Manter histórico completo das versões publicadas.

---

### Responsabilidades

- preservar snapshots oficiais;
- permitir comparação entre versões;
- permitir restauração.

---

### Relacionamentos

N:1

publications

---

### Observações

Uma versão representa um estado oficial da publicação.

Não representa uma geração realizada pelo Agent.

Uma nova versão normalmente será criada após aprovação.

---

## Regras Gerais

Uma publicação poderá possuir inúmeras versões.

Uma versão poderá conter inúmeras seções.

Cada seção poderá possuir inúmeras execuções realizadas por LLMs/Agents.

Cada execução poderá utilizar inúmeras evidências.

Dessa forma, torna-se possível reconstruir completamente qualquer publicação produzida pelo Product Lab.

---

## delivery_channels

### Objetivo

Representar os canais suportados pelo Product Lab para distribuição das publicações.

Os canais representam apenas os meios de entrega.

Não representam uma entrega realizada.

---

### Exemplos

PDF

HTML

Microsoft Teams

Email

PowerPoint

Dashboard

SharePoint

Wiki

---

### Responsabilidades

- identificar os canais suportados;
- permitir reutilização por diferentes publicações;
- permitir expansão para novos canais.

---

### Relacionamentos

1:N

publication_deliveries

---

### Observações

Tabela de domínio.

Sua manutenção deverá ocorrer apenas quando novos canais forem suportados.

---

## publication_deliveries

### Objetivo

Representar cada entrega realizada para uma publicação.

Uma mesma publicação poderá ser entregue por diversos canais.

---

### Exemplos

BA Magazine

↓

PDF

↓

Email

↓

Teams

↓

SharePoint

---

### Responsabilidades

- registrar a entrega;
- registrar data e horário;
- registrar status;
- registrar o canal utilizado;
- registrar destino da publicação.

---

### Relacionamentos

N:1

publications

N:1

delivery_channels

1:N

delivery_recipients

---

### Observações

A publicação continua existindo independentemente das entregas realizadas.

Uma publicação poderá ser entregue diversas vezes.

---

## delivery_recipients

### Objetivo

Registrar os destinatários efetivos de uma entrega.

Essa entidade representa quem realmente recebeu determinada publicação.

---

### Exemplos

Sediney

Danilo

Flávio

RSA Team

Executive Leadership

---

### Responsabilidades

- registrar destinatários;
- registrar data da entrega;
- registrar status da entrega;
- permitir auditoria.

---

### Relacionamentos

N:1

publication_deliveries

---

### Observações

A audiência representa o público-alvo.

O destinatário representa quem efetivamente recebeu a publicação.

Esses conceitos possuem responsabilidades diferentes.

---

# 6. Índices Recomendados

Para garantir desempenho adequado, recomenda-se a criação de índices nos seguintes atributos.

---

## communication_types

UNIQUE(name)

---

## communications

INDEX(product_id)

INDEX(communication_type_id)

INDEX(status)

---

## communication_templates

INDEX(communication_type_id)

INDEX(is_active)

---

## publications

INDEX(communication_id)

INDEX(status)

INDEX(reference_start_date)

INDEX(reference_end_date)

INDEX(published_at)

---

## sections

INDEX(publication_id)

INDEX(display_order)

INDEX(section_type)

---

## agent_executions

INDEX(section_id)

INDEX(status)

INDEX(model_name)

INDEX(created_at)

---

## execution_evidences

INDEX(agent_execution_id)

INDEX(source_type)

INDEX(source_id)

---

## publication_reviews

INDEX(publication_id)

INDEX(created_at)

---

## publication_versions

INDEX(publication_id)

INDEX(version_number)

---

## publication_deliveries

INDEX(publication_id)

INDEX(delivery_channel_id)

INDEX(status)

---

## delivery_recipients

INDEX(publication_delivery_id)

INDEX(recipient)

---

# 7. Regras de Integridade

O Modelo de Dados deverá respeitar as seguintes regras.

---

RI-001

Toda Communication deverá possuir exatamente um Communication Type.

---

RI-002

Toda Publication deverá pertencer a exatamente uma Communication.

---

RI-003

Toda Section deverá pertencer a exatamente uma Publication.

---

RI-004

Toda Agent Execution deverá pertencer a exatamente uma Section.

---

RI-005

Toda Execution Evidence deverá pertencer a exatamente uma Agent Execution.

---

RI-006

Toda Publication Review deverá pertencer a exatamente uma Publication.

---

RI-007

Toda Publication Version deverá pertencer a exatamente uma Publication.

---

RI-008

Toda Publication Delivery deverá pertencer a exatamente uma Publication.

---

RI-009

Todo Delivery Recipient deverá pertencer a exatamente uma Publication Delivery.

---

RI-010

Nenhuma entidade do Domínio de Comunicação deverá duplicar informações pertencentes a outros domínios do Product Lab.

O Domínio de Comunicação referencia informações.

Ele não é proprietário delas.

---

RI-011

Todas as entidades deverão possuir auditoria.

Sempre que aplicável deverão existir:

- created_at
- updated_at
- created_by
- updated_by

---

RI-012

Nenhuma exclusão física deverá ocorrer para entidades operacionais.

A remoção lógica deverá ser priorizada sempre que possível.

---

# 8. Estratégia de Versionamento

O Domínio de Comunicação deverá preservar o histórico completo das comunicações produzidas.

O objetivo do versionamento é permitir:

- auditoria;
- rastreabilidade;
- comparação entre versões;
- recuperação de versões anteriores;
- evolução contínua das comunicações.

Uma nova versão deverá ser criada sempre que uma publicação oficial sofrer alterações após sua aprovação.

As versões representam estados oficiais da publicação.

As execuções realizadas pelos LLMs/Agents representam tentativas de geração.

Esses conceitos possuem responsabilidades diferentes.

---

# 9. Estratégia de Auditoria

Todo o Domínio de Comunicação deverá ser auditável.

O sistema deverá ser capaz de responder perguntas como:

- Quem solicitou determinada comunicação?

- Quem aprovou?

- Qual Prompt foi utilizado?

- Qual modelo foi utilizado?

- Quais evidências sustentaram determinada afirmação?

- Qual versão foi publicada?

- Quem recebeu determinada publicação?

- Quanto custou gerar determinado conteúdo?

- Quanto tempo levou determinada geração?

Toda alteração relevante deverá permanecer registrada.

---

# 10. Estratégia para LLMs e Agents

O Domínio de Comunicação foi projetado para ser independente de qualquer fornecedor específico de Inteligência Artificial.

O Product Lab poderá utilizar:

- OpenAI
- Anthropic
- Google
- Modelos locais
- Outros provedores

sem necessidade de alteração da arquitetura do domínio.

Cada execução deverá registrar, quando disponível:

- provedor;
- modelo;
- versão do modelo;
- parâmetros utilizados;
- quantidade de tokens;
- tempo de execução;
- custo estimado;
- contexto enviado;
- conteúdo produzido.

Essa estratégia permitirá futura comparação entre diferentes modelos de IA.

---

# 11. Dependências entre Domínios

O Domínio de Comunicação depende de diversos módulos do Product Lab.

Entretanto, esses módulos não dependem do Domínio de Comunicação.

Essa arquitetura reduz acoplamento e facilita evolução independente dos domínios.

Os principais domínios utilizados como fonte de evidências são:

- Products
- Product Features
- Backlog
- Product Impacts
- Decision Journal
- Knowledge Base
- Stakeholders
- Roadmap
- Risks
- Metrics
- Value Proposition Canvas
- Meetings

O Domínio de Comunicação apenas referencia essas informações.

Nunca deverá tornar-se proprietário desses dados.

---

# 12. Evoluções Futuras

O modelo foi concebido para suportar futuras evoluções sem necessidade de alterações estruturais significativas.

Entre as principais evoluções previstas destacam-se:

- múltiplos Agents colaborativos;
- geração multimodal;
- geração de apresentações PowerPoint;
- geração automática de documentos Word;
- geração de páginas HTML;
- integração com Microsoft Teams;
- integração com SharePoint;
- integração com Email;
- tradução automática;
- personalização por audiência;
- comunicação multilíngue;
- agendamento automático;
- publicação automática;
- analytics de comunicação;
- medição de leitura;
- recomendações automáticas de comunicação.

---

# 13. Princípios do Modelo de Dados

O Modelo de Dados do Domínio de Comunicação foi desenvolvido seguindo os seguintes princípios.

## Separação de responsabilidades

Cada entidade possui uma única responsabilidade.

Nenhuma tabela deverá assumir responsabilidades pertencentes a outro domínio.

---

## Não duplicação de informações

Sempre que possível o Domínio de Comunicação deverá referenciar informações existentes.

Nunca duplicá-las.

---

## Rastreabilidade completa

Toda informação produzida deverá possuir origem identificável.

---

## Independência tecnológica

O modelo não depende:

- de PostgreSQL;
- de OpenAI;
- de Azure DevOps;
- de Microsoft Teams.

Essas tecnologias representam apenas implementações possíveis.

---

## Evolução contínua

O modelo foi concebido para permitir crescimento sem necessidade de grandes refatorações.

Novos tipos de comunicação,

novos canais,

novos modelos de IA

e novos formatos de publicação poderão ser adicionados preservando a arquitetura existente.

---

# 14. Considerações Finais

O Modelo de Dados do Domínio de Comunicação representa a tradução lógica do Modelo Conceitual previamente definido.

Todas as entidades descritas neste documento possuem responsabilidades claramente definidas e deverão servir como base para a implementação física do banco de dados.

O objetivo deste modelo não é apenas armazenar documentos.

Seu propósito é permitir que o Product Lab transforme conhecimento estruturado em comunicação baseada em evidências, utilizando LLMs e Agents de forma rastreável, auditável e independente da tecnologia empregada.

Este documento deverá servir como referência para:

- modelagem física do PostgreSQL;
- implementação das APIs;
- desenvolvimento da interface do usuário;
- implementação dos Agents;
- evolução futura do Domínio de Comunicação.

A implementação física deverá preservar integralmente os conceitos e relacionamentos definidos neste documento.
