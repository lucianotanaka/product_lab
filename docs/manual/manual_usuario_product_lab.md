# Manual do Usuário — Product Lab

> **Versão:** 2.x · **Idioma:** Português (Brasil)  
> **Público:** Product Managers, Designers, Engenheiros, Stakeholders, Administradores

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Primeiros Passos](#2-primeiros-passos)
3. [Navegação e Interface](#3-navegação-e-interface)
4. [Cockpit — Painel Executivo](#4-cockpit--painel-executivo)
5. [Módulo: SETUP — Configuração da Base](#5-módulo-setup--configuração-da-base)
   - 5.1 [Empresas](#51-empresas)
   - 5.2 [Áreas de Negócio](#52-áreas-de-negócio)
   - 5.3 [Stakeholders](#53-stakeholders)
   - 5.4 [Produtos](#54-produtos)
   - 5.5 [Gestão de Usuários (Admin)](#55-gestão-de-usuários-admin)
6. [Módulo: OPPORTUNITIES — Captura e Descoberta](#6-módulo-opportunities--captura-e-descoberta)
   - 6.1 [Opportunities](#61-opportunities)
   - 6.2 [Value Proposition Canvas (VPC)](#62-value-proposition-canvas-vpc)
   - 6.3 [Process Mapping — Mapeamento de Processos](#63-process-mapping--mapeamento-de-processos)
7. [Módulo: DEFINE — Definição e Conhecimento](#7-módulo-define--definição-e-conhecimento)
   - 7.1 [Requirements — Gestão de Requisitos](#71-requirements--gestão-de-requisitos)
   - 7.2 [Decisions — Registro de Decisões](#72-decisions--registro-de-decisões)
   - 7.3 [Knowledge Base](#73-knowledge-base)
   - 7.4 [Business Domains — Domínios de Negócio](#74-business-domains--domínios-de-negócio)
8. [Módulo: DELIVER — Planejamento e Entrega](#8-módulo-deliver--planejamento-e-entrega)
   - 8.1 [Roadmap](#81-roadmap)
   - 8.2 [Backlog](#82-backlog)
   - 8.3 [Prioritization — Priorização](#83-prioritization--priorização)
9. [Módulo: OPERATE — Operação e Comunicação](#9-módulo-operate--operação-e-comunicação)
   - 9.1 [Risk Matrix — Matriz de Riscos](#91-risk-matrix--matriz-de-riscos)
   - 9.2 [Meetings — Reuniões](#92-meetings--reuniões)
   - 9.3 [Communication — Comunicação](#93-communication--comunicação)
   - 9.4 [Matriz RACI](#94-matriz-raci)
   - 9.5 [Follow-Ups](#95-follow-ups)
   - 9.6 [Integrations — Integrações](#96-integrations--integrações)
10. [Recursos Transversais](#10-recursos-transversais)
    - 10.1 [Anexos (Attachments)](#101-anexos-attachments)
    - 10.2 [Follow-Ups Universais](#102-follow-ups-universais)
    - 10.3 [RACI Panel (embutido)](#103-raci-panel-embutido)
11. [Fluxos de Trabalho Recomendados](#11-fluxos-de-trabalho-recomendados)
12. [Referência Rápida de Campos](#12-referência-rápida-de-campos)
13. [Perguntas Frequentes (FAQ)](#13-perguntas-frequentes-faq)

---

## 1. Visão Geral

O **Product Lab** é o centro de operações estratégicas para equipes de produto que buscam excelência. Combina metodologias ágeis, análise de dados e frameworks de decisão para transformar visões em produtos que geram impacto real.

A ferramenta cobre todo o ciclo de vida de um produto digital:

```
OPPORTUNITIES → DEFINE → DELIVER → OPERATE
```

| Fase | Objetivo | Módulos Principais |
|------|----------|--------------------|
| **OPPORTUNITIES** | Capturar, investigar, avaliar e validar oportunidades | Opportunities, VPC, Process Mapping |
| **DEFINE** | Formalizar requisitos, decisões e conhecimento | Requirements, Decisions, Knowledge, Business Domains |
| **DELIVER** | Planejar e entregar iterativamente | Roadmap, Backlog, Prioritization |
| **OPERATE** | Operar, comunicar, monitorar riscos | Risk Matrix, Meetings, Communication, AI Agent, RACI, Follow-Ups |

### Pilares do Sistema

- **Knowledge** — Frameworks e metodologias validadas centralizadas
- **Decisions** — Estrutura para decisões de alto impacto com rastreabilidade
- **Impact** — Métricas claras de resultado e valor

---

## 2. Primeiros Passos

### Pré-requisitos para uso

Antes de utilizar qualquer módulo de produto, configure a base na seguinte **ordem obrigatória**:

```
1. Empresas  →  2. Áreas de Negócio  →  3. Stakeholders  →  4. Produtos
```

> ⚠️ **Atenção:** Stakeholders são pré-requisito para configurar líderes de áreas. Produtos dependem de Empresas. Respeite a ordem.

### Acesso ao Sistema

1. Acesse a URL da aplicação
2. Faça login com seu e-mail e senha
3. Caso esqueça a senha, use "Esqueci minha senha" — um token temporário será gerado pelo administrador
4. Após o login, você verá a **Home Page** com o resumo do sistema e seus módulos

### Seleção de Produto

Praticamente todos os módulos operam no contexto de **um produto selecionado**. Para selecionar:

- Na barra de navegação superior, clique em **"PRODUTO:"** e escolha o produto desejado
- A seleção do produto persiste durante a sessão
- Escolha **"— TODOS —"** para visualizações globais quando disponível

---

## 3. Navegação e Interface

### Barra de Navegação

| Elemento | Descrição |
|----------|-----------|
| **INÍCIO** | Retorna à Home Page com visão geral |
| **COCKPIT** | Painel executivo do produto selecionado |
| **MÓDULOS** | Acesso a todos os módulos de trabalho |
| **DADOS** | Telemetria e métricas em tempo real |
| **PRODUTO:** | Seletor de produto ativo |
| **ADMIN** | Visível apenas para administradores |
| **⏻ SAIR** | Logout do sistema |

### Categorias de Módulos

A Home Page organiza os módulos em categorias:

- **OPPORTUNITIES** — Captura, Discovery, Process Mapping (Capture · Assess · Discover · Evaluate · Decide)
- **DEFINE** — Requisitos, Decisões, Conhecimento (Charter · Requirements · Structuring)
- **DELIVER** — Roadmap, Backlog, Sprint (Roadmap · Backlog · Sprint)
- **OPERATE** — Comunicação, Stakeholders, Risco (Communication · Stakeholders · Risk)
- **SETUP** — Empresas, Áreas, Produtos, Integrações (Companies · Areas · Products)

### Convenções Visuais

- **+ NOVO / + NOVO ITEM** — botão de criação de registros
- **EDITAR / ✎** — editar registro existente
- **DEL / ✕** — excluir registro (sempre pede confirmação)
- **⟩** — avançar / salvar
- **⟨** — voltar
- **ANTERIOR / PRÓXIMO** — paginação de listas
- **Abas (tabs)** — quando um módulo tem múltiplas seções (ex: INFO, AGENDA, ATA, AÇÕES)

### Temas e Idiomas

- Alterne entre **Dark Mode** e **Light Mode** pelo ícone na barra
- O sistema suporta **Português (PT)**, **Inglês (EN)** e **Espanhol (ES)**
- A seleção de idioma é salva individualmente por usuário

---

## 4. Cockpit — Painel Executivo

**Objetivo:** Visão consolidada e em tempo real do produto selecionado, com foco em itens que precisam de atenção.

### Métricas Exibidas

| Métrica | O que indica |
|---------|-------------|
| **Riscos Abertos** | Quantidade total de riscos com status em aberto |
| **Riscos Alto** | Riscos classificados com severidade Alta ou Crítica |
| **Backlog Aberto** | Itens de backlog sem sprint ou em status aberto |
| **Decisões (30d)** | Decisões registradas nos últimos 30 dias |
| **Roadmap Próximos** | Iniciativas/marcos com data futura próxima |
| **Pub. p/ Aprovar** | Publicações de comunicação aguardando aprovação |
| **Stakeholders** | Total de stakeholders vinculados ao produto |
| **Follow-Ups** | Follow-ups pendentes vinculados ao produto |

### Seção de Follow-Ups

Exibe os follow-ups pendentes categorizados por urgência:
- **ATRASADO(S)** — vencidos
- **HOJE** — com prazo no dia atual
- **ESTA SEMANA** — vencem nos próximos 7 dias
- **PENDENTES SEM PRAZO** — sem data definida

Clique em **✓ FEITO** diretamente no Cockpit para marcar um follow-up como concluído sem precisar acessar o módulo.

---

## 5. Módulo: SETUP — Configuração da Base

Os módulos de Setup constroem a estrutura organizacional que sustenta todos os demais módulos.

---

### 5.1 Empresas

**Objetivo:** Cadastrar as empresas clientes ou internas, vincular PMs e gerenciar o portfólio multi-cliente.

#### Campos Principais

| Campo | Descrição | Obrigatório |
|-------|-----------|-------------|
| **Nome** | Nome da empresa ou cliente | Sim |
| **Tipo** | Classificação da empresa (cliente, parceiro, interna...) | Não |
| **CNPJ** | CNPJ da empresa | Não |
| **Website** | URL do site | Não |
| **País** | País sede | Não |
| **Notas** | Observações livres | Não |
| **Ativa** | Se a empresa está ativa no sistema | Sim |

#### Abas da Empresa (painel lateral)

- **USUÁRIOS** — vincula usuários do sistema (PMs) à empresa pelo ID
- **ÁREAS** — associa áreas de negócio do catálogo global à empresa e define o gestor de cada área
- **LÍDERES** — define líderes para cada área dentro da empresa com datas de início/fim de mandato
- **ORG** — exibe o organograma visual de áreas e líderes atuais

#### Fluxo de Uso

1. Cadastre a empresa
2. Acesse o painel **◈ ÁREAS** → Associe as áreas relevantes
3. Acesse **LÍDERES** → Defina quem lidera cada área (requer stakeholders cadastrados)
4. Acesse **ORG** para validar a estrutura hierárquica

---

### 5.2 Áreas de Negócio

**Objetivo:** Catálogo global de áreas organizacionais. Defina uma vez, reutilize em múltiplas empresas e produtos.

#### Campos Principais

| Campo | Descrição | Obrigatório |
|-------|-----------|-------------|
| **Nome** | Nome da área (ex: Financeiro, TI, Comercial) | Sim |
| **Descrição** | Descrição da responsabilidade da área | Não |
| **Cor** | Identificação visual por cor | Não |
| **Tipo** | Estratégico / Operacional / Suporte / Tecnologia / Comercial | Não |
| **Área Pai** | Para criar hierarquia de subáreas | Não |
| **Nível** | Posição hierárquica na árvore | Automático |
| **Ordem** | Ordem de exibição | Não |
| **Status** | Ativo / Inativo | Sim |

#### Visualizações

- **🌳 ÁRVORE** — exibe hierarquia de áreas com relações pai/filho expansíveis
- **☰ LISTA** — listagem tabular com filtros por tipo e status

#### Dica Avançada

Use **◆ LÍDERES** em cada área para ver e gerenciar historicamente quem liderou aquela área em diferentes empresas, com início e fim de mandato.

---

### 5.3 Stakeholders

**Objetivo:** Mapeamento de todas as partes interessadas — clientes, usuários, decisores, influenciadores — com seus vínculos a empresas, áreas e produtos.

#### Campos Principais

| Campo | Descrição | Obrigatório |
|-------|-----------|-------------|
| **Nome Completo** | Nome do stakeholder | Sim |
| **Cargo/Título** | Posição na organização (CEO, PM, Usuário...) | Não |
| **Empresa** | Empresa à qual pertence | Sim |
| **E-mail** | Contato principal | Não |
| **Notas** | Observações sobre este stakeholder | Não |

#### Abas do Stakeholder

- **◎ DADOS** — informações básicas
- **◈ ÁREAS** — mapeamento do stakeholder nas áreas de negócio, com papel, hierarquia (reporta para) e período
- **◆ PRODUTOS** — vincula o stakeholder a produtos com seu papel específico (ex: Product Owner, Sponsor)

#### Fluxo de Uso

1. Cadastre o stakeholder com nome e empresa
2. Salve → navegue para aba **◈ ÁREAS** para mapear sua participação nas áreas
3. Navegue para **◆ PRODUTOS** para definir o papel no produto
4. Stakeholders cadastrados ficam disponíveis em todo o sistema (RACI, Research, Meetings, Backlog, etc.)

> 💡 **Quadrante de Influência:** O sistema organiza automaticamente os stakeholders por quadrante (Alto Poder/Alto Interesse, etc.) com base nos dados de mapeamento.

---

### 5.4 Produtos

**Objetivo:** Cadastrar e gerenciar os produtos do portfólio, associando-os a empresas e responsáveis.

#### Campos Principais

| Campo | Descrição | Obrigatório |
|-------|-----------|-------------|
| **Nome** | Nome do produto | Sim |
| **Descrição** | Descrição do produto e seu propósito | Não |
| **Status** | ATIVO / RASCUNHO / ARQUIVADO | Sim |
| **Owner** | Stakeholder responsável pelo produto | Não |
| **Empresa** | Empresa à qual o produto pertence | Não |
| **Tags** | Tags para categorização (separadas por vírgula) | Não |

#### Após Criar o Produto

- Selecione o produto no seletor da barra de navegação
- Acesse o **Backlog** → aba **EQUIPE** para vincular membros da equipe com seus papéis
- Acesse o **Backlog** → aba **SPRINTS** para criar as sprints do produto

---

### 5.5 Gestão de Usuários (Admin)

**Objetivo:** Criar, editar, ativar/desativar usuários e gerar tokens de reset de senha. **Exclusivo para administradores.**

#### Campos Principais

| Campo | Descrição |
|-------|-----------|
| **Nome Completo** | Nome do usuário no sistema |
| **E-mail** | Login do usuário |
| **Senha** | Senha inicial (mínimo 8 caracteres) |
| **Perfil** | USER (acesso padrão) ou ADMIN (acesso total) |
| **Status** | ATIVO / INATIVO |

#### Tokens de Reset

- Gere um token temporário clicando em **⟳ GERAR TOKEN**
- Entregue o token ao usuário por canal seguro (WhatsApp, e-mail)
- O token tem validade limitada — exibe a data de expiração
- Tokens expirados são marcados com ⚠ e podem ser revogados

---

## 6. Módulo: OPPORTUNITIES — Captura e Descoberta

---

### 6.1 Opportunities

**Objetivo:** Onde oportunidades nascem, são capturadas, investigadas, avaliadas e validadas antes de entrar no Roadmap. É o módulo central do processo de descoberta de produto, cobrindo as fases Capture → Assess → Discover → Evaluate → Decide.

#### Estrutura do módulo Opportunities

Cada **Oportunidade** é o objeto central. Dentro de cada oportunidade há 11 abas estruturadas que guiam o processo completo de discovery:

| Aba | Propósito | Quando usar |
|-----|-----------|-------------|
| **VISÃO GERAL** | Registro inicial da oportunidade | Ao identificar qualquer sinal de oportunidade |
| **PROBLEMA** | Problem Statement formal | Antes de buscar soluções |
| **PERSONAS** | Perfis dos usuários afetados | Após identificar quem é impactado |
| **JTBD** | Jobs To Be Done | Para entender o que o usuário quer realizar |
| **PESQUISA** | Registro de pesquisas realizadas | Durante entrevistas, surveys, análises |
| **INSIGHTS** | Padrões não-óbvios identificados | Após processar as pesquisas |
| **HIPÓTESES** | Premissas a validar | Antes de construir qualquer solução |
| **VPC** | Value Proposition Canvas vinculado | Para validar o fit solução × cliente |
| **SOLUÇÕES** | Ideias de solução | Fase de ideação (divirja antes de convergir) |
| **EXPERIMENTOS** | Testes das hipóteses de maior risco | Para validar antes de construir |
| **MÉTRICAS** | Como medir o sucesso | Defina baseline e meta antes de construir |

#### Campos da Oportunidade (Visão Geral)

| Campo | Descrição | Obrigatório |
|-------|-----------|-------------|
| **Título** | Nome curto da oportunidade | Sim |
| **Descrição** | O que motiva esta investigação | Não |
| **Origem** | De onde veio esta oportunidade | Não |
| **Área/Público Impactado** | Quem é afetado | Não |
| **Responsável** | Quem conduz o discovery | Não |
| **Data de Identificação** | Quando foi identificada | Não |
| **Status** | IDENTIFICADA / EM INVESTIGAÇÃO / VALIDADA / PAUSADA / DESCARTADA / NO ROADMAP | Sim |
| **Prioridade** | Nível de prioridade | Não |

#### Origens de Oportunidade (exemplos)

- Feedback de Cliente, Análise Interna, Pesquisa de Mercado
- Solicitação de Stakeholder, Chamados de Suporte
- Análise Competitiva, Análise de Dados, Sugestão da Equipe
- Conformidade Regulatória, Entrevista com Usuário, NPS/Pesquisa

#### Aba: PROBLEMA

Preencha antes de buscar qualquer solução:

| Campo | Pergunta a responder |
|-------|---------------------|
| **Problema Observado** | O que está acontecendo de errado? |
| **Quem é Afetado** | Qual persona / área sofre com isso? |
| **Impacto Atual** | Qual o custo/consequência atual? |
| **Evidências Disponíveis** | Que dados ou relatos confirmam o problema? |
| **Consequência de Não Agir** | O que acontece se ignorarmos? |

#### Aba: PESQUISA

Tipos de pesquisa suportados com templates estruturados:

| Tipo | Template Disponível |
|------|---------------------|
| Entrevista | Discovery, Processo, Validação de Problema, Validação de Solução, JTBD, Stakeholder, Pós-Implementação, Benefícios |
| Reunião | Discovery com Stakeholder, Workshop de Requisitos |
| Observação | Contextual, Teste de Usabilidade |
| Survey | Problema/Processo, Satisfação |
| Dados Quantitativos | Análise de Evidência |
| Feedback | Feedback Estruturado |
| Documento / Evidência | Revisão de Documento, Registro de Evidência |

> 💡 Selecione um **template** ao criar uma pesquisa para ter um roteiro de perguntas pronto. As respostas são salvas automaticamente na sessão de pesquisa.

#### Aba: HIPÓTESES

Priorize hipóteses pelo quadrante **Impacto × Incerteza**:
- **Alto Impacto + Alta Incerteza** → Valide primeiro (maior risco)
- **Alto Impacto + Baixa Incerteza** → Prossiga com confiança
- **Baixo Impacto** → Valide por último ou descarte

Status possíveis: NÃO VALIDADA → EM PROGRESSO → VALIDADA / INVALIDADA

#### Business Case

Cada oportunidade pode ter um **Business Case** formalizado com:
- Resumo Executivo, Problema, Cenário Atual, Solução Proposta
- Benefícios Esperados, Alinhamento Estratégico
- Impacto Financeiro, Custo Estimado, Esforço Estimado
- Riscos, Dependências, Premissas, Restrições
- Recomendação Go / No-Go

Status: RASCUNHO → EM REVISÃO → APROVADO / REJEITADO

---

### 6.2 Value Proposition Canvas (VPC)

**Objetivo:** Validar o fit entre a proposta de valor do produto e o perfil do cliente. Responde: "Nossa solução alivia as dores certas e cria os ganhos desejados?"

#### Estrutura do Canvas

O VPC tem dois painéis:

**◯ CUSTOMER PROFILE (Perfil do Cliente)**
- **Customer Jobs** — Trabalhos que o cliente tenta realizar (funcionais, sociais, emocionais)
- **Pains** — Dores, frustrações e obstáculos ao realizar os jobs
- **Gains** — Resultados e benefícios que o cliente espera

**▣ VALUE PROPOSITION (Proposta de Valor)**
- **Products & Services** — O que você oferece
- **Pain Relievers** — Como seus produtos aliviam as dores
- **Gain Creators** — Como seus produtos criam os ganhos desejados

#### Campos de Cada Item

| Campo | Descrição |
|-------|-----------|
| **Tipo** | Categoria do item (Job, Pain, Gain, etc.) |
| **Nome** | Referência curta para identificação |
| **Conteúdo** | Descrição completa | 
| **Prioridade** | Nível de importância |
| **Relacionado a** | Vínculo com Job (para Pains/Gains) ou Pain/Gain (para Relievers/Creators) |

#### Visualizações

- **CANVAS** — visão estruturada nos dois painéis lado a lado
- **DIAGRAMA** — visão esquemática dos componentes
- **REDE** — grafo visual mostrando as conexões entre itens (produto → reliever → pain, etc.)

> 💡 Um produto pode ter **múltiplos canvas** para segmentos de clientes distintos. Selecione o canvas ativo no seletor no topo do módulo.

---

### 6.3 Process Mapping — Mapeamento de Processos

**Objetivo:** Documentar e visualizar processos de negócio (AS-IS e TO-BE) com atores, etapas, sistemas e pontos de decisão. Integrado ao grupo OPPORTUNITIES por apoiar diretamente o entendimento do contexto e fluxo que a oportunidade busca melhorar.

#### Campos do Processo

| Campo | Descrição | Obrigatório |
|-------|-----------|-------------|
| **Nome** | Nome do processo | Sim |
| **Descrição** | Propósito e escopo do processo | Não |
| **Área Responsável** | Área dona do processo | Não |
| **Status** | ATIVO / INATIVO / EM REVISÃO | Sim |
| **Tipo** | AS-IS (atual) / TO-BE (futuro) | Não |

#### Visualização

- **☰ DETALHES** — formulário com todas as etapas em forma de lista
- **⬡ FLUXO** — representação visual BPMN simplificada do processo

---

## 7. Módulo: DEFINE — Definição e Conhecimento

---

### 7.1 Requirements — Gestão de Requisitos

**Objetivo:** Gestão completa de requisitos de negócio, funcionais e não-funcionais com rastreabilidade, histórico de mudanças, aprovações e verificações.

#### Tipos de Requisito

| Código | Tipo | Descrição |
|--------|------|-----------|
| **BR** | Business Rule | Regra de negócio imposta pelo negócio, independente de tecnologia. Ex: fórmula de cálculo, critério de elegibilidade |
| **FR** | Functional | O que o sistema deve fazer. Ex: o usuário pode filtrar por intervalo de datas |
| **NFR** | Non-Functional | Como o sistema deve se comportar. Ex: tempo de resposta < 2s, disponibilidade 99,9% |
| **DR** | Data | Estrutura, formato, retenção ou qualidade dos dados. Ex: data deve ser ISO 8601 |
| **IR** | Integration | Como o sistema se conecta a APIs ou serviços externos. Ex: sync com Azure DevOps |
| **SR** | Security | Autenticação, autorização, criptografia, auditoria. Ex: dados em repouso AES-256 |
| **CR** | Compliance | Obrigação legal, regulatória ou contratual. Ex: LGPD, SOX |
| **UXR** | UX/Usability | Requisitos de interface e experiência. Ex: acessível por teclado, WCAG AA |

#### Campos Principais

| Campo | Descrição | Obrigatório |
|-------|-----------|-------------|
| **Código** | Identificador único (ex: REQ-001). Gerado automaticamente, editável | Sim |
| **Título** | Título descritivo do requisito | Sim |
| **Descrição** | Detalhamento completo do requisito | Sim |
| **Critério de Aceite** | Definição de pronto / DoD | Não |
| **Tipo** | BR / FR / NFR / DR / IR / SR / CR / UXR | Sim |
| **Prioridade** | Nível de prioridade | Sim |
| **Lifecycle Status** | Estado no ciclo de vida | Sim |
| **Atendimento** | Status de implementação | Sim |
| **Responsável** | PM ou lead responsável | Não |
| **Origem** | Discovery / Reunião / Stakeholder / Pesquisa / Documento / Manual | Não |

#### Abas do Requisito

- **INFO** — dados principais e tipo de origem
- **VERIFICAÇÕES** — evidências de que o requisito foi atendido
- **EVIDÊNCIA** — upload de documento de aprovação formal
- **HISTÓRICO** — trilha de auditoria completa de todas as mudanças
- **SOLICITAÇÕES DE MUDANÇA** — change requests formais

#### Controle de Mudanças

Para requisitos **APROVADOS**, qualquer edição exige uma **justificativa obrigatória** que é registrada no histórico. Isso garante trilha de auditoria completa.

Para solicitar mudança formal:
1. Acesse a aba **SOLICITAÇÕES DE MUDANÇA** no requisito
2. Clique em **+ NOVA SOLICITAÇÃO**
3. Preencha: Título, Descrição da mudança, Justificativa, Impacto estimado
4. Status da solicitação: PENDENTE → APROVADA / REJEITADA / CANCELADA

#### Lifecycle Status (Ciclo de Vida)

`RASCUNHO` → `EM REVISÃO` → `APROVADO` → `IMPLEMENTADO` → `VERIFICADO` → `OBSOLETO` / `REJEITADO`

---

### 7.2 Decisions — Registro de Decisões

**Objetivo:** Documentar decisões de produto de alto impacto com contexto, alternativas avaliadas, responsáveis e resultado, garantindo que o raciocínio de cada decisão seja preservado.

#### Campos Principais

| Campo | Descrição | Obrigatório |
|-------|-----------|-------------|
| **Título** | Nome da decisão | Sim |
| **Contexto** | Por que precisamos decidir isso? Qual o cenário? | Sim |
| **Alternativas** | Opções consideradas | Não |
| **Decisão Tomada** | O que foi decidido e por quê | Sim |
| **Consequências** | Impactos esperados (positivos e negativos) | Não |
| **Status** | PENDENTE / DECIDIDO / REVISANDO / OBSOLETO | Sim |
| **Data** | Data da decisão | Sim |
| **Responsável** | Quem tomou ou aprovou a decisão | Não |
| **Categoria** | Arquitetura / Produto / Processo / Negócio / Tecnologia | Não |
| **Impacto** | ALTO / MÉDIO / BAIXO | Não |
| **Tags** | Para facilitar busca | Não |

> 💡 **Boa Prática:** Registre decisões mesmo quando parecem óbvias. O contexto capturado hoje evitará que futuras equipes repitam discussões ou revertam decisões sem entender os trade-offs.

---

### 7.3 Knowledge Base

**Objetivo:** Repositório central de frameworks, metodologias e artefatos de referência utilizados pela equipe de produto.

#### Estrutura

- **Artigos/Documentos** — textos estruturados com título, conteúdo e categoria
- **Frameworks** — metodologias aplicadas (ex: Jobs To Be Done, OKR, Double Diamond)
- **Templates** — modelos reutilizáveis para processos recorrentes
- **Referências** — links externos e materiais curados

#### Campos Principais

| Campo | Descrição |
|-------|-----------|
| **Título** | Nome do item de conhecimento |
| **Conteúdo** | Corpo do artigo / framework |
| **Categoria** | Classificação temática |
| **Tags** | Para busca e filtragem |
| **Status** | ATIVO / ARQUIVADO |

---

### 7.4 Business Domains — Domínios de Negócio

**Objetivo:** Modelagem do domínio de negócio com entidades, regras e relacionamentos. Funciona como um glossário estruturado e modelo conceitual do negócio.

#### Abas do Módulo

- **OVERVIEW** — visão geral do domínio com descrição e escopo
- **ENTIDADES** — objetos de negócio (ex: Pedido, Cliente, Produto)
- **REGRAS** — regras de negócio do domínio organizadas por categoria
- **GLOSSÁRIO** — definição de termos do domínio
- **DEPENDÊNCIAS** — outros domínios com os quais este interage
- **DIAGRAMAS** — representação visual do domínio

#### Campos de Regra de Negócio

| Campo | Descrição |
|-------|-----------|
| **Código** | Identificador único (ex: LCI-001) |
| **Título** | Nome da regra |
| **Descrição** | Enunciado completo da regra |
| **Categoria** | Validação / Cálculo / Eligibility / Processo / Compliance |
| **Prioridade** | CRÍTICA / ALTA / MÉDIA / BAIXA |
| **Status** | ATIVA / INATIVA / DEPRECIADA |
| **Fonte/Referência** | Documento ou normativa de origem |

---

## 8. Módulo: DELIVER — Planejamento e Entrega

---

### 8.1 Roadmap

**Objetivo:** Planejamento estratégico e visual das iniciativas do produto organizadas por horizonte temporal.

#### Estrutura

O Roadmap é organizado em **Iniciativas** (projetos maiores) que contêm **Marcos** (milestones) e são vinculadas a **Epics** do Backlog.

#### Campos da Iniciativa

| Campo | Descrição | Obrigatório |
|-------|-----------|-------------|
| **Nome** | Título da iniciativa | Sim |
| **Descrição** | Objetivo e escopo da iniciativa | Não |
| **Status** | PLANEJADO / EM ANDAMENTO / CONCLUÍDO / CANCELADO / EM ESPERA | Sim |
| **Prioridade** | Nível de prioridade estratégica | Não |
| **Data de Início** | Previsão de início | Não |
| **Data de Fim** | Previsão de conclusão | Não |
| **OKR / Meta** | Objetivos estratégicos que esta iniciativa suporta | Não |
| **Time/Squad** | Equipe responsável | Não |

#### Visualizações

- **LISTA** — tabela de iniciativas com filtros por status e período
- **TIMELINE** — visão Gantt com iniciativas e marcos ordenados temporalmente

---

### 8.2 Backlog

**Objetivo:** Gestão do backlog do produto com Epics, User Stories, Tasks e Bugs; organização por sprints e controle de status.

#### Hierarquia de Itens

```
Epic → User Story → Task / Sub-task
                 → Bug
```

#### Campos Principais (User Story)

| Campo | Descrição | Obrigatório |
|-------|-----------|-------------|
| **Título** | Título do item | Sim |
| **Tipo** | EPIC / USER_STORY / TASK / BUG / SUB_TASK | Sim |
| **Descrição** | Detalhamento (formato "Como [persona], quero [ação], para [benefício]") | Não |
| **Critério de Aceite** | Condições para aceitar como pronto | Não |
| **Status** | BACKLOG / TODO / IN_PROGRESS / IN_REVIEW / DONE / CANCELLED | Sim |
| **Prioridade** | CRÍTICA / ALTA / MÉDIA / BAIXA | Não |
| **Story Points** | Estimativa de esforço | Não |
| **Sprint** | Sprint a que pertence | Não |
| **Assignee** | Membro da equipe responsável | Não |
| **Epic** | Epic pai (para Stories e Tasks) | Não |
| **Tags/Labels** | Categorização livre | Não |
| **Stakeholder Solicitante** | Origem da demanda | Não |

#### Abas do Backlog

- **☰ ITEMS** — lista geral de todos os itens com filtros avançados
- **◎ BOARD** — quadro Kanban com colunas por status
- **◈ SPRINTS** — gestão de sprints (criar, editar, fechar)
- **◆ EQUIPE** — membros do time vinculados ao produto com seus papéis

#### Gestão de Sprints

1. Acesse aba **SPRINTS** → **+ NOVA SPRINT**
2. Defina: Nome, Data de Início, Data de Fim, Goal da Sprint
3. Arraste itens do backlog para a sprint ou defina a sprint no campo do item
4. Ao finalizar: altere o status da sprint para **CONCLUÍDA** e registre a velocidade

---

### 8.3 Prioritization — Priorização

**Objetivo:** Aplicar frameworks de priorização estruturados para ordenar o backlog e justificar decisões de sequenciamento.

#### Frameworks Suportados

| Framework | Como funciona |
|-----------|--------------|
| **RICE** | Score = (Reach × Impact × Confidence) / Effort |
| **ICE** | Score = Impact × Confidence × Ease |
| **MoSCoW** | Classificação Must/Should/Could/Won't |
| **Value vs Effort** | Quadrante 2×2 de valor versus esforço |
| **KANO** | Classificação por tipo de satisfação do cliente |

#### Fluxo de Uso

1. Acesse o módulo de Priorização com um produto selecionado
2. Selecione o framework desejado
3. Avalie cada item do backlog preenchendo os critérios do framework
4. O sistema calcula automaticamente o score e ordena os itens
5. Exporte ou utilize a lista priorizada para planejar a próxima sprint

---

## 9. Módulo: OPERATE — Operação e Comunicação

---

### 9.1 Risk Matrix — Matriz de Riscos

**Objetivo:** Identificar, avaliar e mitigar riscos do produto com mapeamento visual por severidade × probabilidade.

#### Campos Principais

| Campo | Descrição | Obrigatório |
|-------|-----------|-------------|
| **Título** | Nome do risco | Sim |
| **Descrição** | O que pode acontecer e como | Sim |
| **Categoria** | Técnico / Negócio / Operacional / Financeiro / Regulatório / Segurança / Pessoas | Não |
| **Probabilidade** | MUITO BAIXA (1) a MUITO ALTA (5) | Sim |
| **Impacto** | MUITO BAIXO (1) a MUITO ALTO (5) | Sim |
| **Score** | Calculado: Probabilidade × Impacto (1–25) | Automático |
| **Nível** | BAIXO / MÉDIO / ALTO / CRÍTICO (calculado pelo score) | Automático |
| **Status** | IDENTIFICADO / EM MONITORAMENTO / MITIGADO / ACEITO / OCORREU / FECHADO | Sim |
| **Plano de Mitigação** | Ações para reduzir probabilidade ou impacto | Não |
| **Plano de Contingência** | O que fazer se o risco ocorrer | Não |
| **Responsável** | Quem monitora este risco | Não |
| **Data de Revisão** | Próxima data de reavaliação | Não |

#### Visualização

- **☰ LISTA** — tabela com filtros por nível, categoria e status
- **⬡ MATRIZ** — visão heatmap 5×5 (Probabilidade × Impacto) com posicionamento visual dos riscos

---

### 9.2 Meetings — Reuniões

**Objetivo:** Gerenciar o ciclo completo de reuniões: pauta, condução, ata e ações de acompanhamento.

#### Campos da Reunião

| Campo | Descrição | Obrigatório |
|-------|-----------|-------------|
| **Título** | Nome/objetivo da reunião | Sim |
| **Tipo** | DAILY / PLANNING / REVIEW / RETROSPECTIVE / DISCOVERY / STAKEHOLDER / OUTRO | Sim |
| **Status** | AGENDADA / EM ANDAMENTO / CONCLUÍDA / CANCELADA / ADIADA | Sim |
| **Data e Hora** | Data/hora de início e fim | Sim |
| **Plataforma** | TEAMS / ZOOM / MEET / PRESENCIAL / OUTRO | Não |
| **Link da Reunião** | URL de acesso | Não |
| **Facilitador** | Quem conduz | Não |
| **Participantes** | Stakeholders convidados | Não |

#### Abas da Reunião

- **INFO** — dados gerais da reunião
- **AGENDA** — pauta com itens ordenados (título, descrição, duração, responsável)
- **ATA** — registro da ata com marcação de presença e notas por item da pauta
- **AÇÕES** — follow-ups gerados pela reunião
- **ANEXOS** — arquivos vinculados

#### Fluxo Recomendado

1. **Antes:** Crie a reunião → adicione itens na aba **AGENDA** → convide participantes
2. **Durante:** Preencha a **ATA** → marque presença → registre conclusões por item
3. **Após:** Crie **AÇÕES** com responsável e prazo → sistema gera follow-ups automaticamente

---

### 9.3 Communication — Comunicação

**Objetivo:** Planejar, produzir e distribuir comunicações para stakeholders organizadas em planos e publicações com fluxo de aprovação.

#### Estrutura

**Plano de Comunicação** → contém **Publicações** (cada publicação é uma comunicação específica)

#### Campos do Plano

| Campo | Descrição |
|-------|-----------|
| **Nome** | Nome do plano de comunicação |
| **Objetivo** | O que se quer alcançar com este plano |
| **Audiências** | Grupos de stakeholders destinatários |
| **Período** | Data início e fim de vigência |
| **Status** | RASCUNHO / ATIVO / CONCLUÍDO / ARQUIVADO |

#### Campos da Publicação

| Campo | Descrição |
|-------|-----------|
| **Título** | Título da comunicação |
| **Tipo** | E-mail / Apresentação / Newsletter / Relatório / Reunião / Outro |
| **Canal** | Canal de distribuição (E-mail, Slack, Teams, Jira, Portal) |
| **Frequência** | Única / Recorrente |
| **Data Prevista** | Data de publicação planejada |
| **Status** | RASCUNHO → REVISÃO → APROVADO → PUBLICADO / CANCELADO |
| **Conteúdo** | Corpo da comunicação |
| **Audiência** | Quem receberá esta publicação |

#### Fluxo de Aprovação

`RASCUNHO` → `EM REVISÃO` → `APROVADO` → `PUBLICADO`

Ao atingir status APROVADO, a publicação aparece no **Cockpit** como item para aprovar.

---

### 9.4 Matriz RACI

**Objetivo:** Definir claramente as responsabilidades de stakeholders em atividades, decisões e entregas do produto.

**RACI** = **R**esponsável · **A**provador · **C**onsultado · **I**nformado

#### Campos da Atividade RACI

| Campo | Descrição | Obrigatório |
|-------|-----------|-------------|
| **Atividade** | Nome da atividade ou entrega | Sim |
| **Descrição** | Detalhamento da atividade | Não |
| **Categoria** | Agrupamento de atividades (ex: Planejamento, Entrega, Aprovação) | Não |
| **Fase** | Em qual fase do projeto ocorre | Não |

#### Atribuições

Para cada atividade, atribua stakeholders com um dos papéis:
- **R — Responsável:** Quem executa a tarefa (pode haver mais de um)
- **A — Aprovador:** Quem tem autoridade final de aprovação (apenas um por atividade)
- **C — Consultado:** Quem deve ser consultado antes/durante (bidirecional)
- **I — Informado:** Quem deve ser informado sobre o resultado (unidirecional)

#### Visualizações

- **☰ LISTA** — todas as atividades em forma tabular com papéis por linha
- **⬡ MATRIZ** — visão cruzada Atividades × Stakeholders

#### Aprovação da Matriz

A matriz RACI possui fluxo de aprovação integrado:
`RASCUNHO` → `ENVIADA PARA APROVAÇÃO` → `APROVADA` / `REPROVADA`

O histórico de versões e aprovações é mantido automaticamente.

> ⚠️ **Regra:** Toda atividade deve ter **exatamente um Aprovador**. Múltiplos Responsáveis são permitidos.

---

### 9.5 Follow-Ups

**Objetivo:** Central de acompanhamento de todas as ações e pendências geradas em qualquer módulo do sistema.

#### Campos Principais

| Campo | Descrição | Obrigatório |
|-------|-----------|-------------|
| **Título** | Descrição curta da ação | Sim |
| **Descrição** | Detalhamento do que deve ser feito | Não |
| **Responsável** | Quem deve executar | Não |
| **Prazo** | Data limite para conclusão | Não |
| **Prioridade** | ALTA / MÉDIA / BAIXA | Não |
| **Status** | PENDENTE / EM ANDAMENTO / CONCLUÍDO / CANCELADO | Sim |
| **Origem** | Módulo e registro que gerou este follow-up | Automático |

#### Origem dos Follow-Ups

Follow-ups podem ser criados em qualquer módulo:
- Reuniões (aba AÇÕES)
- Discovery (aba EXPERIMENTOS)
- Riscos (plano de mitigação)
- Qualquer módulo (ícone de Follow-Up no painel lateral)
- Manualmente no módulo de Follow-Ups

#### Filtros Disponíveis

- Por produto, responsável, prazo, prioridade e status
- Visualização **por vencimento** no Cockpit (Atrasados, Hoje, Semana)

---

### 9.6 Integrations — Integrações

**Objetivo:** Conectar o Product Lab a ferramentas externas para sincronização de dados (Jira, Azure DevOps, GitHub, Webhooks, etc.).

#### Tipos de Integração Suportados

| Tipo | Descrição |
|------|-----------|
| **Jira** | Sincronização de issues/stories com o Backlog |
| **Azure DevOps** | Sincronização de Work Items |
| **GitHub** | Vinculação de PRs e Issues com itens do Backlog |
| **Slack** | Notificações de Follow-Ups e publicações |
| **Teams** | Notificações e atualizações de status |
| **Webhook** | Integração genérica via HTTP POST |
| **API REST** | Integração direta via API do Product Lab |

#### Campos da Conexão

| Campo | Descrição |
|-------|-----------|
| **Nome** | Identificador da conexão |
| **Tipo** | Plataforma de destino |
| **URL / Endpoint** | URL da API ou webhook destino |
| **Autenticação** | Token / API Key / OAuth |
| **Status** | ATIVA / INATIVA / ERRO |
| **Último Sync** | Timestamp da última sincronização |
| **Direção** | Entrada / Saída / Bidirecional |

#### Fluxo de Configuração

1. Acesse **INTEGRAÇÕES** → **+ NOVA CONEXÃO**
2. Selecione o tipo de integração
3. Insira as credenciais (tokens ficam criptografados)
4. Teste a conexão com **◎ TESTAR**
5. Configure as regras de mapeamento de campos
6. Ative a sincronização

---

## 10. Recursos Transversais

Estes recursos estão disponíveis **dentro de múltiplos módulos** como painéis laterais ou abas.

---

### 10.1 Anexos (Attachments)

**Disponível em:** Reuniões, Requisitos, Discovery, Riscos, Backlog e outros.

- Faça upload de qualquer tipo de arquivo (PDF, DOCX, imagem, planilha)
- Cada anexo exibe: nome, tipo, tamanho, data de upload e quem fez o upload
- Clique no nome para **download** ou visualização direta (para imagens e PDFs)
- Para remover: clique no ícone de exclusão (requer confirmação)

---

### 10.2 Follow-Ups Universais

O painel de Follow-Ups aparece como aba ou botão de acesso rápido em qualquer módulo. Permite:
- Ver todos os follow-ups vinculados àquele registro específico
- Criar novos follow-ups com contexto automático de origem
- Marcar como concluído sem sair do módulo atual

---

### 10.3 RACI Panel (embutido)

Em módulos como Requisitos e Discovery, um painel RACI pode ser ativado para definir responsabilidades direto no contexto do item, sem navegar até o módulo RACI dedicado.

---

## 11. Fluxos de Trabalho Recomendados

### Fluxo 1: Novo Produto (setup completo)

```
1. Cadastrar Empresa
2. Cadastrar Áreas de Negócio
3. Cadastrar Stakeholders (ao menos o Product Owner e patrocinadores)
4. Criar o Produto → vincular à Empresa
5. Vincular Stakeholders ao Produto (aba PRODUTOS no cadastro do stakeholder)
6. Criar Equipe no Backlog → aba EQUIPE
7. Criar primeira Sprint → aba SPRINTS
8. Criar Roadmap com Iniciativas de alto nível
9. Configurar Matriz RACI inicial para papéis do produto
```

### Fluxo 2: Processo de Discovery (via módulo Opportunities)

```
1. Opportunities → + Nova Oportunidade (status: IDENTIFICADA)
2. Preencher aba PROBLEMA → formalize o Problem Statement
3. Criar sessões de PESQUISA → use templates de entrevista
4. Registrar INSIGHTS extraídos das pesquisas
5. Criar PERSONAS que representam os usuários afetados
6. Levantar JTBD para cada persona
7. Formular HIPÓTESES → priorizadas por Impacto × Incerteza
8. Criar EXPERIMENTOS para validar hipóteses de alto risco
9. Atualizar status → VALIDADA
10. Preencher Business Case → solicitar aprovação
11. Criar Iniciativa no Roadmap vinculada à oportunidade
12. Criar Epics no Backlog oriundos das soluções descobertas
```

### Fluxo 3: Gestão de Requisito

```
1. Requirements → + Novo Requisito
2. Selecionar Tipo correto (BR/FR/NFR/DR...)
3. Status inicial: RASCUNHO
4. Enviar para REVISÃO → compartilhar com stakeholders
5. Aprovar → status: APROVADO (a partir daqui, mudanças exigem justificativa)
6. Durante o desenvolvimento: vincular verificações de aceite
7. Após homologação: IMPLEMENTADO → VERIFICADO
```

### Fluxo 4: Ciclo de Reunião

```
1. Meetings → + Nova Reunião → preencher INFO
2. Aba AGENDA → adicionar itens da pauta antes da reunião
3. Durante: aba ATA → marcar presença → registrar conclusões
4. Aba AÇÕES → criar follow-ups para cada ação decidida
5. Status da reunião → CONCLUÍDA
6. Os follow-ups aparecem automaticamente no Cockpit e módulo de Follow-Ups
```

### Fluxo 5: Análise de Transcrição / Feedback (com agente IA)

```
1. Envie a transcrição ou feedback para o agente IA do Product Lab
2. O agente identifica: Oportunidades, Problemas, Requisitos, Riscos, Decisões, Follow-Ups
3. Para cada item identificado, o agente retorna os campos exatos a preencher no sistema
4. Acesse o módulo correspondente → crie o registro com os dados sugeridos
5. Ajuste e valide conforme contexto do produto
```

---

## 12. Referência Rápida de Campos

### Status por Módulo

| Módulo | Status Possíveis |
|--------|-----------------|
| **Opportunities** | IDENTIFICADA · EM INVESTIGAÇÃO · VALIDADA · PAUSADA · DESCARTADA · NO ROADMAP |
| **Backlog** | BACKLOG · TODO · IN_PROGRESS · IN_REVIEW · DONE · CANCELLED |
| **Requisitos** | RASCUNHO · EM REVISÃO · APROVADO · IMPLEMENTADO · VERIFICADO · OBSOLETO · REJEITADO |
| **Decisões** | PENDENTE · DECIDIDO · REVISANDO · OBSOLETO |
| **Riscos** | IDENTIFICADO · EM MONITORAMENTO · MITIGADO · ACEITO · OCORREU · FECHADO |
| **Meetings** | AGENDADA · EM ANDAMENTO · CONCLUÍDA · CANCELADA · ADIADA |
| **Follow-Ups** | PENDENTE · EM ANDAMENTO · CONCLUÍDO · CANCELADO |
| **Roadmap** | PLANEJADO · EM ANDAMENTO · CONCLUÍDO · CANCELADO · EM ESPERA |
| **Comunicação** | RASCUNHO · EM REVISÃO · APROVADO · PUBLICADO · CANCELADO |
| **RACI** | RASCUNHO · ENVIADA · APROVADA · REPROVADA |

### Prioridades (padrão em todos os módulos)

| Valor | Uso |
|-------|-----|
| **CRÍTICA** | Bloqueante — impede entrega ou causa impacto severo |
| **ALTA** | Importante — deve ser resolvido na sprint atual |
| **MÉDIA** | Normal — próximo ciclo de planejamento |
| **BAIXA** | Desejável — quando houver capacidade disponível |

### Tipos de Backlog

| Tipo | Descrição |
|------|-----------|
| **EPIC** | Conjunto grande de funcionalidades relacionadas |
| **USER_STORY** | Funcionalidade do ponto de vista do usuário |
| **TASK** | Tarefa técnica ou de processo |
| **BUG** | Defeito a corrigir |
| **SUB_TASK** | Sub-atividade de uma Story ou Task |

---

## 13. Perguntas Frequentes (FAQ)

**P: Posso usar o sistema sem selecionar um produto?**
R: Alguns módulos de Setup (Empresas, Áreas, Stakeholders) funcionam sem produto selecionado. A maioria dos módulos operacionais exige seleção de produto.

**P: Como vincular um requisito a uma User Story do Backlog?**
R: No módulo de Requisitos, edite o requisito e use o campo **"Backlog Item"** para vinculá-lo. Alternativamente, no item do Backlog use o campo **"Requisito de Origem"**.

**P: Um follow-up criado em uma reunião aparece no módulo de Follow-Ups global?**
R: Sim. Todos os follow-ups, independentemente do módulo de origem, aparecem no módulo **FOLLOW-UPS** e no **Cockpit**. A origem (ex: Reunião / Ata de Kick-off) é registrada automaticamente.

**P: Posso ter mais de um VPC por produto?**
R: Sim. Cada produto pode ter múltiplos Canvas para diferentes segmentos ou personas. Use o seletor no topo do módulo VPC para alternar entre eles.

**P: O que acontece ao fechar uma sprint sem mover os itens não concluídos?**
R: Os itens ficam vinculados à sprint fechada. É recomendável reabrir ou mover os itens para outra sprint antes de fechar. O sistema não move automaticamente.

**P: Como recuperar um registro excluído?**
R: Alguns módulos (RACI) implementam soft delete com histórico. Para outros módulos, exclusões são permanentes — confirme sempre antes de excluir.

**P: Quem pode criar usuários no sistema?**
R: Apenas usuários com perfil **ADMIN**. Acesse **ADMIN → USUÁRIOS** no menu principal.

**P: Como exportar dados do Product Lab?**
R: Módulos como Requisitos e Backlog oferecem botão de exportação CSV/Excel no topo da lista. Para exportações completas, utilize a API REST ou a funcionalidade de Integrações.

**P: O sistema suporta múltiplos produtos simultâneos?**
R: Sim. O portfólio multi-produto é suportado nativamente. Use o seletor de produto na barra superior para alternar entre produtos. O Cockpit exibe métricas do produto selecionado.

---

> 📌 **Dúvidas não respondidas aqui?** Consulte o time de produto ou acesse a documentação técnica em `/docs/`.

---

*Manual gerado em: Outubro 2026 — Product Lab v2.x*
