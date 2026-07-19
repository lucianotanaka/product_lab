# Product Lab - Communication ER Model
Versão: 1.0

Autor: Luciano Tanaka

Produto: Product Lab

---

# 1. Objetivo

Este documento descreve o Modelo Entidade-Relacionamento (ER) do Domínio de Comunicação do Product Lab.

Seu objetivo é definir as entidades conceituais, seus relacionamentos e respectivas cardinalidades antes da modelagem lógica do banco de dados.

Este documento não descreve tabelas PostgreSQL.

Ele descreve o domínio de negócio.

---

# 2. Visão Geral

O Domínio de Comunicação é responsável por transformar conhecimento produzido pelos diversos módulos do Product Lab em comunicações estruturadas para diferentes públicos.

Toda comunicação nasce a partir de evidências registradas no Product Lab e poderá ser publicada em diferentes formatos e canais.

O modelo foi concebido para suportar tanto comunicações recorrentes quanto comunicações sob demanda.

---

# 3. Entidades do Domínio

O Domínio de Comunicação é composto pelas seguintes entidades.

- Communication Type
- Communication
- Communication Schedule
- Communication Template
- Template Section
- Audience
- Publication
- Publication Audience
- Section
- Generation
- Generation Evidence
- Publication Review
- Publication Version
- Delivery Channel
- Publication Delivery
- Delivery Recipient

---

# 4. Descrição das Entidades

## Product

Representa o produto proprietário da comunicação.

Exemplos.

- Bridge Access
- Product Lab

---

## Communication Type

Define a natureza da comunicação.

Exemplos.

- Product Magazine
- Executive Status Report
- Sprint Summary
- Meeting Minutes
- Release Notes

---

## Communication

Representa uma estratégia permanente de comunicação.

Exemplos.

- BA Magazine
- Executive Status
- Sprint Review Summary

Uma Communication pode gerar inúmeras publicações ao longo do tempo.

---

## Communication Schedule

Define regras de recorrência para comunicações programadas.

Comunicações sob demanda não utilizam esta entidade.

---

## Communication Template

Define a estrutura padrão de uma comunicação.

Um mesmo template poderá ser utilizado por diversas comunicações.

---

## Template Section

Representa uma seção prevista em um Template.

Exemplos.

- Editorial
- Value Delivered
- Timeline
- Risks

---

## Audience

Representa um público lógico.

Exemplos.

- Executive Leadership
- RSA Team
- Product Team

---

## Publication

Representa uma ocorrência concreta de uma Communication.

Exemplos.

- BA Magazine — Issue 004
- Executive Report — July 2026
- Meeting Minutes — 2026-07-19

---

## Publication Audience

Relaciona uma publicação aos públicos que deverão recebê-la.

---

## Section

Representa uma seção pertencente a uma publicação.

Exemplos.

- Editorial
- Highlights
- Before × After
- Risks

---

## Generation

Representa uma geração realizada por um LLM/Agent.

Cada geração produz um candidato ao conteúdo de uma seção.

Uma mesma seção poderá possuir inúmeras gerações.

---

## Generation Evidence

Representa as evidências utilizadas durante uma geração.

Esta entidade permite total rastreabilidade entre:

- contexto enviado;
- evidências utilizadas;
- texto produzido.

---

## Publication Review

Registra todas as ações humanas realizadas sobre uma publicação.

Exemplos.

- Review Requested
- Approved
- Rejected

---

## Publication Version

Mantém histórico das versões publicadas.

---

## Delivery Channel

Representa um canal de publicação.

Exemplos.

- PDF
- HTML
- Teams
- Email
- PowerPoint

---

## Publication Delivery

Representa uma entrega efetivamente realizada.

---

## Delivery Recipient

Representa os destinatários efetivos de uma entrega.

---

# 5. Relacionamentos

Product

1:N

Communication

---

Communication Type

1:N

Communication

---

Communication

1:0..1

Communication Schedule

---

Communication

N:1

Communication Template

---

Communication Template

1:N

Template Section

---

Communication

1:N

Publication

---

Publication

N:N

Audience

(através de Publication Audience)

---

Publication

1:N

Section

---

Section

1:N

Generation

---

Generation

1:N

Generation Evidence

---

Publication

1:N

Publication Review

---

Publication

1:N

Publication Version

---

Publication

1:N

Publication Delivery

---

Publication Delivery

N:1

Delivery Channel

---

Publication Delivery

1:N

Delivery Recipient

---

# 6. Diagrama Conceitual

Product

│

├───────────────┐

│               │

▼               ▼

Communication Type      Communication Template

│               │

│               └──────────────┐

│                              ▼

│                      Template Section

│

▼

Communication

│

├──────────────► Communication Schedule

│

├──────────────► Publication

│                     │

│                     ├────────► Publication Audience

│                     │

│                     ├────────► Section

│                     │               │

│                     │               ▼

│                     │         Generation

│                     │               │

│                     │               ▼

│                     │      Generation Evidence

│                     │

│                     ├────────► Publication Review

│                     │

│                     ├────────► Publication Version

│                     │

│                     └────────► Publication Delivery

│                                      │

│                                      ▼

│                              Delivery Channel

│

└────────────────────────────────────────────────

Audience

---

# 7. Decisões Arquiteturais

DER-001

A audiência pertence à Publicação.

---

DER-002

Publication representa uma ocorrência concreta da Communication.

---

DER-003

Publication utiliza Reference Label em vez de numeração obrigatória.

---

DER-004

As evidências pertencem à entidade Generation e não diretamente à Section.

---

DER-005

O conteúdo produzido por LLM/Agent é sempre resultado de uma Generation.

---

DER-006

Uma publicação pode possuir múltiplas versões.

---

DER-007

Uma publicação pode ser entregue por múltiplos canais.

---

DER-008

Comunicações podem ser programadas ou sob demanda.

---

# 8. Evoluções Futuras

O modelo foi concebido para suportar futuras evoluções, como:

- múltiplos provedores de LLM;
- múltiplos idiomas;
- geração multimodal;
- publicação automática;
- integração com Microsoft Teams;
- integração com SharePoint;
- geração de PowerPoint;
- geração de Newsletter;
- geração automática de Atas de Reunião.

---

# 9. Considerações Finais

O Modelo Entidade-Relacionamento do Domínio de Comunicação estabelece a base conceitual para a futura modelagem lógica do banco de dados.

Nenhuma decisão de implementação deverá contrariar as relações e responsabilidades definidas neste documento.

O próximo documento da arquitetura será:

Product_Lab_Communication_Data_Model_v1.0.md

onde cada entidade será convertida em tabelas, atributos, chaves, restrições e relacionamentos físicos do PostgreSQL.

