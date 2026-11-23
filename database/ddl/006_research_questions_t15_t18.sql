-- Questions T15-T18: Quantitative Evidence, Feedback, Document Review, Evidence Record

-- ── T15: Quantitative Evidence Analysis ──────────────────────────────────
INSERT INTO public.research_template_questions (id, template_id, section, question, hint, is_research_question, question_type, is_required, sort_order) VALUES
('rtq-qa-b1','rt-quant-evidence','before','Qual Research Question queremos responder com estes dados?',NULL,true,'open_text',true,10),
('rtq-qa-b2','rt-quant-evidence','before','Qual e a fonte de dados?',NULL,false,'open_text',true,20),
('rtq-qa-b3','rt-quant-evidence','before','Qual periodo sera analisado?',NULL,false,'open_text',true,30),
('rtq-qa-d01','rt-quant-evidence','during','Qual populacao ou amostra representa os dados?',NULL,false,'open_text',false,10),
('rtq-qa-d02','rt-quant-evidence','during','Qual indicador ou metrica esta sendo analisada?',NULL,false,'open_text',true,20),
('rtq-qa-d03','rt-quant-evidence','during','Qual e o baseline e o valor atual?',NULL,false,'open_text',false,30),
('rtq-qa-d04','rt-quant-evidence','during','Qual e a tendencia (crescimento, queda, estavel)?',NULL,false,'open_text',false,40),
('rtq-qa-d05','rt-quant-evidence','during','Existem segmentos com comportamentos diferentes?',NULL,false,'open_text',false,50),
('rtq-qa-d06','rt-quant-evidence','during','Existem outliers? Como foram tratados?',NULL,false,'open_text',false,60),
('rtq-qa-d07','rt-quant-evidence','during','Existem dados ausentes? Qual impacto na analise?',NULL,false,'open_text',false,70),
('rtq-qa-d08','rt-quant-evidence','during','Qual a qualidade e confiabilidade da fonte?','Alta / Media / Baixa + justificativa',false,'open_text',false,80),
('rtq-qa-d09','rt-quant-evidence','during','O dado confirma alguma hipotese? Qual?',NULL,true,'open_text',false,90),
('rtq-qa-d10','rt-quant-evidence','during','O dado contradiz alguma hipotese? Qual?',NULL,true,'open_text',false,100),
('rtq-qa-d11','rt-quant-evidence','during','Que nova pergunta de pesquisa surgiu?',NULL,true,'open_text',false,110),
('rtq-qa-a1','rt-quant-evidence','after','Que decisao pode ser apoiada por estes dados?',NULL,false,'open_text',true,10),
('rtq-qa-a2','rt-quant-evidence','after','Quais hipoteses foram confirmadas ou descartadas?',NULL,true,'open_text',false,20)
ON CONFLICT (id) DO NOTHING;

-- ── T16: Structured Product Feedback ─────────────────────────────────────
INSERT INTO public.research_template_questions (id, template_id, section, question, hint, is_research_question, question_type, is_required, sort_order) VALUES
('rtq-fb-b1','rt-feedback-structured','before','Qual e a origem deste feedback?','Canal: suporte, reuniao, email, entrevista',false,'open_text',true,10),
('rtq-fb-d01','rt-feedback-structured','during','O que voce estava tentando fazer?',NULL,false,'open_text',true,10),
('rtq-fb-d02','rt-feedback-structured','during','Onde exatamente isso aconteceu?','Sistema, tela, processo',false,'open_text',false,20),
('rtq-fb-d03','rt-feedback-structured','during','O que aconteceu?',NULL,false,'open_text',true,30),
('rtq-fb-d04','rt-feedback-structured','during','O que voce esperava que acontecesse?',NULL,false,'open_text',false,40),
('rtq-fb-d05','rt-feedback-structured','during','Quando ocorreu? Com que frequencia?',NULL,false,'open_text',false,50),
('rtq-fb-d06','rt-feedback-structured','during','Quem mais e afetado?',NULL,false,'open_text',false,60),
('rtq-fb-d07','rt-feedback-structured','during','Existe workaround? Quanto esforco exige?',NULL,false,'open_text',false,70),
('rtq-fb-d08','rt-feedback-structured','during','Qual e o impacto? (1=nenhum, 5=critico)',NULL,false,'scale_1_5',false,80),
('rtq-fb-d09','rt-feedback-structured','during','Existe evidencia? (print, log, relatorio)',NULL,false,'open_text',false,90),
('rtq-fb-d10','rt-feedback-structured','during','Qual seria um resultado satisfatorio?',NULL,false,'open_text',false,100),
('rtq-fb-a1','rt-feedback-structured','after','Classificacao: Problem / Need / Suggestion / Bug / Opportunity / Question','Nao transformar Suggestion diretamente em requisito',false,'open_text',true,10),
('rtq-fb-a2','rt-feedback-structured','after','Este feedback vira Finding, Assumption ou Research Question?',NULL,true,'open_text',false,20)
ON CONFLICT (id) DO NOTHING;

-- ── T17: Document Review ──────────────────────────────────────────────────
INSERT INTO public.research_template_questions (id, template_id, section, question, hint, is_research_question, question_type, is_required, sort_order) VALUES
('rtq-dr-b1','rt-document-review','before','Qual e o documento a ser revisado?',NULL,false,'open_text',true,10),
('rtq-dr-b2','rt-document-review','before','Por que este documento e relevante para o Discovery?',NULL,true,'open_text',true,20),
('rtq-dr-d01','rt-document-review','during','Quem produziu o documento e quando?',NULL,false,'open_text',false,10),
('rtq-dr-d02','rt-document-review','during','Para qual finalidade foi criado?',NULL,false,'open_text',false,20),
('rtq-dr-d03','rt-document-review','during','Continua vigente? Foi revisado recentemente?',NULL,false,'open_text',false,30),
('rtq-dr-d04','rt-document-review','during','Qual processo ou area descreve?',NULL,false,'open_text',false,40),
('rtq-dr-d05','rt-document-review','during','Que regras de negocio aparecem?',NULL,false,'open_text',false,50),
('rtq-dr-d06','rt-document-review','during','Que problemas ou limitacoes aparecem?',NULL,false,'open_text',false,60),
('rtq-dr-d07','rt-document-review','during','Que dados ou evidencias contem?',NULL,false,'open_text',false,70),
('rtq-dr-d08','rt-document-review','during','Existem contradicoes com outras fontes?',NULL,false,'open_text',false,80),
('rtq-dr-d09','rt-document-review','during','Qual a confiabilidade deste documento?','Alta / Media / Baixa',false,'open_text',false,90),
('rtq-dr-a1','rt-document-review','after','Quais Findings foram extraidos?',NULL,false,'open_text',true,10),
('rtq-dr-a2','rt-document-review','after','Quais hipoteses o documento apoia ou enfraquece?',NULL,true,'open_text',false,20),
('rtq-dr-a3','rt-document-review','after','Que perguntas de pesquisa permanecem abertas?',NULL,true,'open_text',false,30),
('rtq-dr-a4','rt-document-review','after','Quais Business Rules ou Requirements foram identificados?',NULL,false,'open_text',false,40)
ON CONFLICT (id) DO NOTHING;

-- ── T18: Evidence Record ──────────────────────────────────────────────────
INSERT INTO public.research_template_questions (id, template_id, section, question, hint, is_research_question, question_type, is_required, sort_order) VALUES
('rtq-ev-d01','rt-evidence-record','during','Titulo da evidencia',NULL,false,'open_text',true,10),
('rtq-ev-d02','rt-evidence-record','during','Tipo de evidencia','screenshot / email / log / relatorio / dashboard / planilha / gravacao / ticket / dado operacional / outro',false,'open_text',true,20),
('rtq-ev-d03','rt-evidence-record','during','Fonte (sistema, pessoa, area)',NULL,false,'open_text',true,30),
('rtq-ev-d04','rt-evidence-record','during','Data ou periodo da evidencia',NULL,false,'open_text',false,40),
('rtq-ev-d05','rt-evidence-record','during','Esta evidencia esta relacionada a qual pesquisa ou finding?',NULL,false,'open_text',false,50),
('rtq-ev-d06','rt-evidence-record','during','Descricao da evidencia: o que ela mostra ou demonstra?',NULL,false,'open_text',true,60),
('rtq-ev-d07','rt-evidence-record','during','O que esta evidencia suporta?','Hipotese, Finding, Assumption ou Requirement',false,'open_text',false,70),
('rtq-ev-d08','rt-evidence-record','during','O que esta evidencia contradiz?',NULL,true,'open_text',false,80),
('rtq-ev-d09','rt-evidence-record','during','Qual a confiabilidade desta evidencia?','Alta / Media / Baixa + justificativa',false,'open_text',true,90),
('rtq-ev-d10','rt-evidence-record','during','Existe restricao de confidencialidade?',NULL,false,'open_text',false,100),
('rtq-ev-d11','rt-evidence-record','during','URL ou caminho do arquivo (se aplicavel)',NULL,false,'open_text',false,110),
('rtq-ev-a1','rt-evidence-record','after','Esta evidencia muda alguma hipotese ou prioridade?',NULL,true,'open_text',false,10),
('rtq-ev-a2','rt-evidence-record','after','Alguma acao ou pesquisa adicional e necessaria?',NULL,false,'open_text',false,20)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- FIM DA MIGRACAO
-- 18 templates | ~230 perguntas | 3 novas tabelas | 1 ALTER
-- Ordem de execucao: 003 → 004 → 005 → 006
-- ═══════════════════════════════════════════════════════════════════════════
