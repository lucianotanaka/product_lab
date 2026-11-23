-- ═══════════════════════════════════════════════════════════════════════════
-- DISCOVERY RESEARCH — TEMPLATES & STRUCTURED ANSWERS
-- Product Lab — Migration v3.0 + v3.1
-- 18 templates iniciais
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. NOVAS TABELAS
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.research_templates (
    id               varchar(36)  PRIMARY KEY,
    research_type    public."research_type" NOT NULL,
    name             varchar(200) NOT NULL,
    description      text,
    objective        text,
    when_to_use      text,
    expected_outputs text,
    opening_script   text,
    reference        varchar(300),
    version          varchar(10)  NOT NULL DEFAULT '1.0',
    is_active        boolean      NOT NULL DEFAULT true,
    sort_order       int          NOT NULL DEFAULT 0,
    created_at       timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_research_templates_type ON public.research_templates USING btree (research_type);

CREATE TABLE IF NOT EXISTS public.research_template_questions (
    id                   varchar(36)  PRIMARY KEY,
    template_id          varchar(36)  NOT NULL REFERENCES public.research_templates(id) ON DELETE CASCADE,
    section              varchar(20)  NOT NULL DEFAULT 'during',
    question             text         NOT NULL,
    hint                 text,
    is_research_question boolean      NOT NULL DEFAULT false,
    question_type        varchar(30)  NOT NULL DEFAULT 'open_text',
    is_required          boolean      NOT NULL DEFAULT false,
    sort_order           int          NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rtq_template ON public.research_template_questions USING btree (template_id);

CREATE TABLE IF NOT EXISTS public.research_answers (
    id              varchar(36)  PRIMARY KEY,
    research_id     varchar(36)  NOT NULL REFERENCES public.discovery_research(id) ON DELETE CASCADE,
    question_id     varchar(36)  REFERENCES public.research_template_questions(id) ON DELETE SET NULL,
    custom_question text,
    answer          text,
    status          varchar(20)  NOT NULL DEFAULT 'pending',
    created_at      timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_research_answers_research ON public.research_answers USING btree (research_id);
CREATE INDEX IF NOT EXISTS idx_research_answers_question ON public.research_answers USING btree (question_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. ALTER discovery_research
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.discovery_research
    ADD COLUMN IF NOT EXISTS template_id        varchar(36) REFERENCES public.research_templates(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS objective          text,
    ADD COLUMN IF NOT EXISTS research_questions text,
    ADD COLUMN IF NOT EXISTS consent_obtained   boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS duration_minutes   int,
    ADD COLUMN IF NOT EXISTS context            text,
    ADD COLUMN IF NOT EXISTS summary            text;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. SEED — research_templates (18 templates)
-- ─────────────────────────────────────────────────────────────────────────

INSERT INTO public.research_templates (id, research_type, name, description, objective, when_to_use, expected_outputs, reference, sort_order) VALUES
('rt-interview-discovery',          'interview',    'Discovery Interview',                 'Entrevista para descoberta de contexto, Jobs, processo atual, problemas, impacto e necessidades.', 'Descobrir quem sao os usuarios, o que tentam fazer, como fazem hoje, problemas e necessidades.', 'Inicio do Discovery, antes de formular hipoteses.', 'Jobs, Pains, Gains, Findings, Insights, Research Questions.', 'GOV.UK Service Manual - Using in-depth interviews', 10),
('rt-interview-process',            'interview',    'Process Discovery Interview',          'Entrevista para reconstrucao do processo AS-IS.', 'Mapear o processo atual em detalhes: etapas, sistemas, decisoes, handoffs, excecoes e pontos de dor.', 'Quando o objetivo e gerar um Process Mapping AS-IS.', 'Process Mapping AS-IS, Bottlenecks, Pains, Opportunities.', 'GOV.UK Service Manual - Contextual research and observation', 20),
('rt-interview-problem-validation',  'interview',   'Problem Validation Interview',         'Entrevista para verificar se uma dor presumida realmente existe.', 'Confirmar ou descartar uma hipotese de problema com evidencias do usuario.', 'Quando ja temos uma hipotese de problema e precisamos valida-la antes de avancar.', 'Findings, Evidence, Assumptions validated/invalidated.', 'GOV.UK Service Manual - User research in discovery', 30),
('rt-interview-solution-validation', 'interview',   'Solution Validation Interview',        'Entrevista para testar uma solucao ou conceito.', 'Coletar reacoes a uma solucao apos o problema ja possuir evidencias.', 'Depois de validar o problema, antes de construir.', 'Findings, Insights, Assumptions, Requirements.', 'GOV.UK Service Manual - Using in-depth interviews', 40),
('rt-interview-jtbd',               'interview',    'JTBD Interview',                       'Entrevista focada na teoria Jobs-to-be-Done para identificar Jobs funcionais, emocionais e sociais.', 'Identificar o Job principal que o usuario esta tentando realizar e os criterios de sucesso sob sua perspectiva.', 'Quando queremos aprofundar o entendimento do contexto de contratacao de uma solucao pelo usuario.', 'Jobs, Desired Outcomes, Hiring/Firing Criteria, Insights.', 'Ulwick - Jobs-to-be-Done Theory / GOV.UK Service Manual', 45),
('rt-interview-stakeholder',        'interview',    'Stakeholder Interview',                'Entrevista com lider ou patrocinador para captura de visao estrategica, restricoes e criterios de sucesso do negocio.', 'Entender expectativas, restricoes politicas, prioridades estrategicas e definicao de sucesso do ponto de vista do stakeholder.', 'Inicio do Discovery, paralelamente as entrevistas com usuarios operacionais.', 'Research Questions, Assumptions, Constraints, Success Criteria, Scope.', 'GOV.UK Service Manual - Plan user research for your service', 50),
('rt-interview-post-impl',          'interview',    'Post-Implementation Interview',        'Entrevista apos entrega de solucao para verificar se o problema foi resolvido.', 'Verificar adocao, medir impacto real, identificar efeitos colaterais e alimentar o proximo ciclo de Discovery.', 'Apos go-live de uma solucao, para fechar o ciclo de aprendizado.', 'Findings, Validated Metrics, New Opportunities, Lessons Learned.', 'GOV.UK Service Manual', 55),
('rt-interview-benefits',           'interview',    'Benefits Realization Interview',       'Entrevista para mensurar se os beneficios prometidos foram alcancados.', 'Conectar as Success Metrics do Discovery com os resultados reais apos a entrega.', 'Alguns meses apos go-live, quando os beneficios ja deveriam ter se materializado.', 'Value Realization Report, Validated/Invalidated Success Metrics.', 'GOV.UK Service Manual', 60),
('rt-meeting-stakeholder',          'meeting',      'Discovery Stakeholder Meeting',        'Reuniao para entendimento do contexto de negocio e geracao de Research Questions.', 'Alinhar motivacoes, hipoteses, evidencias disponiveis e lacunas de conhecimento.', 'Inicio do Discovery, com patrocinadores e areas de negocio.', 'Research Questions, Assumptions, Scope, Findings.', 'GOV.UK Service Manual - Plan user research for your service', 10),
('rt-meeting-requirements',         'meeting',      'Requirements Workshop',                'Reuniao estruturada para elicitacao de requisitos.', 'Levantar regras de negocio, entradas, saidas, excecoes e criterios de sucesso.', 'Apos Discovery, na fase de Definition.', 'Requirements, Business Rules, Features.', 'GOV.UK Service Manual', 20),
('rt-observation-contextual',       'observation',  'Contextual Observation',               'Observacao do trabalho no ambiente real do usuario.', 'Registrar como o processo realmente acontece, comparando com o que e relatado em entrevistas.', 'Quando ha divergencia entre relato e pratica, ou quando o processo e complexo.', 'Process Mapping AS-IS, Findings, Evidence, Pains.', 'GOV.UK Service Manual - Contextual research and observation', 10),
('rt-observation-usability',        'observation',  'Usability Test',                       'Teste de usabilidade com usuario executando tarefas reais em interface ou prototipo.', 'Identificar onde o usuario trava, confunde ou abandona a interface.', 'Antes do go-live, com prototipo navegavel ou sistema em staging.', 'Usability Findings, Pains, Requirements adjustments.', 'GOV.UK Service Manual - Usability testing', 20),
('rt-survey-problem-process',       'survey',       'Problem & Process Survey',             'Pesquisa quantitativa para medir frequencia e distribuicao de problemas ja identificados qualitativamente.', 'Validar e quantificar achados qualitativos em uma amostra maior.', 'Apos pesquisa qualitativa, para medir escala.', 'Quantitative Findings, Validated Assumptions, Priorities.', 'GOV.UK Service Manual - Plan user research for your service', 10),
('rt-survey-satisfaction',          'survey',       'Satisfaction Survey',                  'Survey padronizado para medir satisfacao com processos ou produtos existentes.', 'Estabelecer baseline de satisfacao e identificar areas prioritarias de melhoria.', 'Para medir baseline antes do Discovery ou impacto apos entrega.', 'NPS, CES, Satisfaction Score, Improvement Priorities.', 'GOV.UK Service Manual', 20),
('rt-quant-evidence',               'quantitative', 'Quantitative Evidence Analysis',       'Roteiro analitico para analise de dados existentes.', 'Responder Research Questions com dados operacionais, metricas e relatorios existentes.', 'Quando ha dados disponiveis que podem evidenciar o problema antes de ir a campo.', 'Findings, Evidence, Validated/Invalidated Assumptions.', 'GOV.UK Service Manual', 10),
('rt-feedback-structured',          'feedback',     'Structured Product Feedback',          'Roteiro para captura e classificacao de feedback nao solicitado.', 'Transformar feedback em Finding classificado, evitando que vire requisito automatico.', 'Sempre que feedback chegar via suporte, reuniao ou qualquer canal.', 'Findings classified: Problem, Need, Suggestion, Bug, Opportunity.', 'GOV.UK Service Manual', 10),
('rt-document-review',              'document',     'Document Review',                      'Roteiro para extracao de conhecimento de documentacao existente.', 'Descobrir regras, processos, evidencias e hipoteses a partir de documentos.', 'Antes de entrevistas, para nao duplicar o que ja esta documentado.', 'Findings, Business Rules, Requirements, Evidence, Research Questions.', 'GOV.UK Service Manual - User research in discovery', 10),
('rt-evidence-record',              'evidence',     'Evidence Record',                      'Registro estruturado de evidencia coletada.', 'Documentar uma evidencia que suporta ou contradiz hipoteses do Discovery.', 'Sempre que uma evidencia relevante for identificada.', 'Evidence linked to Finding, Assumption or Requirement.', 'GOV.UK Service Manual', 10)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. SEED — research_template_questions
-- ─────────────────────────────────────────────────────────────────────────

-- ── T1: Discovery Interview ───────────────────────────────────────────────
INSERT INTO public.research_template_questions (id, template_id, section, question, hint, is_research_question, question_type, is_required, sort_order) VALUES
('rtq-di-b1','rt-interview-discovery','before','Qual e o objetivo desta entrevista?',NULL,true,'open_text',true,10),
('rtq-di-b2','rt-interview-discovery','before','Quais Research Questions queremos responder?',NULL,true,'open_text',true,20),
('rtq-di-b3','rt-interview-discovery','before','Quem e o participante e qual seu contexto?',NULL,false,'open_text',true,30),
('rtq-di-b4','rt-interview-discovery','before','Quais hipoteses queremos confirmar ou descartar?',NULL,true,'open_text',false,40),
('rtq-di-d01','rt-interview-discovery','during','Qual e sua funcao e quais sao suas principais responsabilidades?','Entender papel e escopo',false,'open_text',true,10),
('rtq-di-d02','rt-interview-discovery','during','Que atividades ocupam a maior parte do seu tempo?',NULL,false,'open_text',false,20),
('rtq-di-d03','rt-interview-discovery','during','Quem depende do resultado do seu trabalho?','Mapear consumidores do output',false,'open_text',false,30),
('rtq-di-d04','rt-interview-discovery','during','De quais pessoas ou areas voce depende?','Mapear fornecedores do input',false,'open_text',false,40),
('rtq-di-d05','rt-interview-discovery','during','Conte-me sobre a ultima vez em que precisou realizar a atividade relacionada a esta oportunidade.','Use o contexto da oportunidade',false,'open_text',true,50),
('rtq-di-d06','rt-interview-discovery','during','O que desencadeou essa necessidade?',NULL,false,'open_text',false,60),
('rtq-di-d07','rt-interview-discovery','during','Qual resultado voce precisava alcancar?',NULL,false,'open_text',false,70),
('rtq-di-d08','rt-interview-discovery','during','Como voce sabia que o trabalho estava concluido corretamente?',NULL,false,'open_text',false,80),
('rtq-di-d09','rt-interview-discovery','during','Como voce realizou essa atividade? Qual foi o primeiro passo?','Peca que descreva passo a passo',false,'open_text',true,90),
('rtq-di-d10','rt-interview-discovery','during','Quais sistemas, planilhas, documentos ou pessoas utilizou?',NULL,false,'open_text',false,100),
('rtq-di-d11','rt-interview-discovery','during','Houve alguma etapa manual? Precisou copiar ou reconciliar informacoes?',NULL,false,'open_text',false,110),
('rtq-di-d12','rt-interview-discovery','during','Qual foi a parte mais dificil? Onde voce perdeu mais tempo?',NULL,false,'open_text',true,120),
('rtq-di-d13','rt-interview-discovery','during','O que costuma dar errado? Que informacao costuma faltar?',NULL,false,'open_text',false,130),
('rtq-di-d14','rt-interview-discovery','during','O que acontece quando o problema ocorre?',NULL,false,'open_text',false,140),
('rtq-di-d15','rt-interview-discovery','during','Quanto tempo isso normalmente consome? Com que frequencia acontece?',NULL,false,'open_text',false,150),
('rtq-di-d16','rt-interview-discovery','during','Existe impacto financeiro, operacional, de prazo ou risco?',NULL,false,'open_text',false,160),
('rtq-di-d17','rt-interview-discovery','during','O que caracterizaria um resultado muito melhor?',NULL,false,'open_text',false,170),
('rtq-di-d18','rt-interview-discovery','during','O que deveria ficar mais rapido? Mais confiavel?',NULL,false,'open_text',false,180),
('rtq-di-d19','rt-interview-discovery','during','Existe algo importante que eu nao perguntei?',NULL,false,'open_text',false,190),
('rtq-di-d20','rt-interview-discovery','during','Quem mais voce recomenda que eu entreviste?',NULL,false,'open_text',false,200),
('rtq-di-a1','rt-interview-discovery','after','Quais sao os principais Findings desta entrevista?',NULL,false,'open_text',true,10),
('rtq-di-a2','rt-interview-discovery','after','Quais Insights emergiram?',NULL,false,'open_text',false,20),
('rtq-di-a3','rt-interview-discovery','after','Quais hipoteses foram confirmadas, descartadas ou criadas?',NULL,true,'open_text',false,30),
('rtq-di-a4','rt-interview-discovery','after','Que Research Questions adicionais surgiram?',NULL,true,'open_text',false,40),
('rtq-di-a5','rt-interview-discovery','after','Existe alguma evidencia que deve ser registrada?',NULL,false,'open_text',false,50),
('rtq-di-a6','rt-interview-discovery','after','Ha necessidade de pesquisa adicional?',NULL,false,'open_text',false,60)
ON CONFLICT (id) DO NOTHING;

-- ── T2: Process Discovery Interview ──────────────────────────────────────
INSERT INTO public.research_template_questions (id, template_id, section, question, hint, is_research_question, question_type, is_required, sort_order) VALUES
('rtq-pi-b1','rt-interview-process','before','Qual processo queremos mapear?',NULL,true,'open_text',true,10),
('rtq-pi-b2','rt-interview-process','before','Qual e o inicio e o fim do escopo a ser mapeado?',NULL,true,'open_text',true,20),
('rtq-pi-b3','rt-interview-process','before','Quem e o participante e qual seu papel no processo?',NULL,false,'open_text',true,30),
('rtq-pi-d01','rt-interview-process','during','O que inicia o processo? Qual evento ou necessidade dispara?',NULL,false,'open_text',true,10),
('rtq-pi-d02','rt-interview-process','during','Quem inicia o processo?',NULL,false,'open_text',true,20),
('rtq-pi-d03','rt-interview-process','during','Qual informacao e necessaria para comecar?',NULL,false,'open_text',false,30),
('rtq-pi-d04','rt-interview-process','during','Qual e a primeira atividade? E depois?','Peca que descreva passo a passo',false,'open_text',true,40),
('rtq-pi-d05','rt-interview-process','during','Quem executa cada etapa?',NULL,false,'open_text',false,50),
('rtq-pi-d06','rt-interview-process','during','Quais sistemas sao utilizados em cada etapa?',NULL,false,'open_text',false,60),
('rtq-pi-d07','rt-interview-process','during','Existem aprovacoes? Quem aprova e em que condicoes?',NULL,false,'open_text',false,70),
('rtq-pi-d08','rt-interview-process','during','Existem decisoes? O que determina cada caminho?',NULL,false,'open_text',false,80),
('rtq-pi-d09','rt-interview-process','during','Onde existem esperas? Quanto tempo?',NULL,false,'open_text',false,90),
('rtq-pi-d10','rt-interview-process','during','Onde existem handoffs entre pessoas ou areas?',NULL,false,'open_text',false,100),
('rtq-pi-d11','rt-interview-process','during','Quais etapas sao completamente manuais?',NULL,false,'open_text',false,110),
('rtq-pi-d12','rt-interview-process','during','Onde existem excecoes? Como sao tratadas?',NULL,false,'open_text',false,120),
('rtq-pi-d13','rt-interview-process','during','O que acontece quando algo da errado?',NULL,false,'open_text',false,130),
('rtq-pi-d14','rt-interview-process','during','Onde ocorre retrabalho?',NULL,false,'open_text',false,140),
('rtq-pi-d15','rt-interview-process','during','Quanto tempo leva cada etapa principal?',NULL,false,'open_text',false,150),
('rtq-pi-d16','rt-interview-process','during','Qual e o resultado final do processo?',NULL,false,'open_text',true,160),
('rtq-pi-d17','rt-interview-process','during','Quem consome esse resultado?',NULL,false,'open_text',false,170),
('rtq-pi-d18','rt-interview-process','during','O que voce mudaria primeiro neste processo?',NULL,false,'open_text',false,180),
('rtq-pi-a1','rt-interview-process','after','Desenho do processo AS-IS esta correto?','Validar com o participante antes de fechar',false,'open_text',true,10),
('rtq-pi-a2','rt-interview-process','after','Quais sao os principais gargalos identificados?',NULL,false,'open_text',true,20),
('rtq-pi-a3','rt-interview-process','after','Quais oportunidades de melhoria foram identificadas?',NULL,false,'open_text',false,30),
('rtq-pi-a4','rt-interview-process','after','Quais Pains foram confirmadas?',NULL,false,'open_text',false,40)
ON CONFLICT (id) DO NOTHING;

-- ── T3: Problem Validation Interview ─────────────────────────────────────
INSERT INTO public.research_template_questions (id, template_id, section, question, hint, is_research_question, question_type, is_required, sort_order) VALUES
('rtq-pv-b1','rt-interview-problem-validation','before','Qual hipotese de problema queremos validar?',NULL,true,'open_text',true,10),
('rtq-pv-b2','rt-interview-problem-validation','before','Que evidencias ja temos sobre este problema?',NULL,true,'open_text',false,20),
('rtq-pv-d01','rt-interview-problem-validation','during','Conte-me sobre a ultima vez em que esse problema ocorreu.','Nao mencione a hipotese; deixe o participante falar',false,'open_text',true,10),
('rtq-pv-d02','rt-interview-problem-validation','during','Com que frequencia isso acontece?',NULL,false,'open_text',true,20),
('rtq-pv-d03','rt-interview-problem-validation','during','Em quais situacoes especificas isso ocorre?',NULL,false,'open_text',false,30),
('rtq-pv-d04','rt-interview-problem-validation','during','Quem mais e afetado?',NULL,false,'open_text',false,40),
('rtq-pv-d05','rt-interview-problem-validation','during','Como voce resolve atualmente? Existe workaround?',NULL,false,'open_text',true,50),
('rtq-pv-d06','rt-interview-problem-validation','during','Quanto esforco esse workaround exige?',NULL,false,'open_text',false,60),
('rtq-pv-d07','rt-interview-problem-validation','during','Qual e a consequencia quando o problema ocorre?',NULL,false,'open_text',true,70),
('rtq-pv-d08','rt-interview-problem-validation','during','Existe impacto financeiro, operacional ou de risco?',NULL,false,'open_text',false,80),
('rtq-pv-d09','rt-interview-problem-validation','during','O que acontece se nada for feito?',NULL,false,'open_text',false,90),
('rtq-pv-d10','rt-interview-problem-validation','during','Comparado a outros problemas, qual a prioridade deste?',NULL,false,'scale_1_5',false,100),
('rtq-pv-d11','rt-interview-problem-validation','during','Existe alguma evidencia que possamos analisar?','Relatorios, logs, emails, screenshots',false,'open_text',false,110),
('rtq-pv-a1','rt-interview-problem-validation','after','A hipotese foi confirmada, parcialmente confirmada ou descartada?',NULL,true,'open_text',true,10),
('rtq-pv-a2','rt-interview-problem-validation','after','Quais evidencias surgiram?',NULL,false,'open_text',false,20),
('rtq-pv-a3','rt-interview-problem-validation','after','O problema e diferente do que imaginamos? Como?',NULL,true,'open_text',false,30)
ON CONFLICT (id) DO NOTHING;

-- ── T4: Solution Validation Interview ────────────────────────────────────
INSERT INTO public.research_template_questions (id, template_id, section, question, hint, is_research_question, question_type, is_required, sort_order) VALUES
('rtq-sv-b1','rt-interview-solution-validation','before','Qual solucao ou conceito sera apresentado?',NULL,false,'open_text',true,10),
('rtq-sv-b2','rt-interview-solution-validation','before','O que precisamos aprender com esta sessao?',NULL,true,'open_text',true,20),
('rtq-sv-d01','rt-interview-solution-validation','during','O que voce entende que esta solucao permite fazer?','Nao explique; observe a interpretacao',false,'open_text',true,10),
('rtq-sv-d02','rt-interview-solution-validation','during','Em que situacao voce a utilizaria?',NULL,false,'open_text',true,20),
('rtq-sv-d03','rt-interview-solution-validation','during','O que parece mais util?',NULL,false,'open_text',false,30),
('rtq-sv-d04','rt-interview-solution-validation','during','O que parece desnecessario?',NULL,false,'open_text',false,40),
('rtq-sv-d05','rt-interview-solution-validation','during','O que esta faltando?',NULL,false,'open_text',false,50),
('rtq-sv-d06','rt-interview-solution-validation','during','O que nao ficou claro?',NULL,false,'open_text',false,60),
('rtq-sv-d07','rt-interview-solution-validation','during','Como isso se encaixaria no seu processo atual?',NULL,false,'open_text',false,70),
('rtq-sv-d08','rt-interview-solution-validation','during','Que decisao isso ajudaria voce a tomar?',NULL,false,'open_text',false,80),
('rtq-sv-d09','rt-interview-solution-validation','during','O que precisaria acontecer para voce confiar nessa solucao?',NULL,false,'open_text',false,90),
('rtq-sv-d10','rt-interview-solution-validation','during','Que risco ou preocupacao voce percebe?',NULL,false,'open_text',false,100),
('rtq-sv-a1','rt-interview-solution-validation','after','A solucao resolve o problema identificado?',NULL,true,'open_text',true,10),
('rtq-sv-a2','rt-interview-solution-validation','after','Quais ajustes sao necessarios?',NULL,false,'open_text',false,20),
('rtq-sv-a3','rt-interview-solution-validation','after','Quais hipoteses foram confirmadas ou descartadas?',NULL,true,'open_text',false,30)
ON CONFLICT (id) DO NOTHING;

-- Questions T5-T18 estao nos arquivos 004, 005, 006
-- Execute-os em sequencia apos este arquivo
