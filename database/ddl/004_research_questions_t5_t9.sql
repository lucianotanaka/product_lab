-- Questions T5-T9: JTBD, Stakeholder, Post-Impl, Benefits, Meeting Stakeholder

-- ── T5: JTBD Interview ────────────────────────────────────────────────────
INSERT INTO public.research_template_questions (id, template_id, section, question, hint, is_research_question, question_type, is_required, sort_order) VALUES
('rtq-jb-b1','rt-interview-jtbd','before','Qual Job hipotetico queremos investigar?',NULL,true,'open_text',true,10),
('rtq-jb-b2','rt-interview-jtbd','before','Qual e o contexto de uso provavel?',NULL,true,'open_text',false,20),
('rtq-jb-d01','rt-interview-jtbd','during','Conte-me sobre a ultima vez em que voce precisou realizar essa tarefa.','Nao mencione solucoes; foco no evento real',false,'open_text',true,10),
('rtq-jb-d02','rt-interview-jtbd','during','O que fez voce perceber que precisava fazer isso naquele momento?','Contexto de disparo do Job',false,'open_text',true,20),
('rtq-jb-d03','rt-interview-jtbd','during','Qual era o resultado que voce precisava alcancar?','Job funcional: resultado pratico',false,'open_text',true,30),
('rtq-jb-d04','rt-interview-jtbd','during','Como voce se sentia enquanto realizava essa tarefa?','Job emocional: estado interno desejado',false,'open_text',false,40),
('rtq-jb-d05','rt-interview-jtbd','during','O que as pessoas ao seu redor pensariam se voce fizesse isso bem?','Job social: percepcao externa',false,'open_text',false,50),
('rtq-jb-d06','rt-interview-jtbd','during','O que voce usou para realizar essa tarefa? Por que escolheu isso?','Produto ou solucao contratada',false,'open_text',true,60),
('rtq-jb-d07','rt-interview-jtbd','during','O que faria voce abandonar essa solucao e buscar outra?','Criterio de demissao da solucao atual',false,'open_text',false,70),
('rtq-jb-d08','rt-interview-jtbd','during','O que tornaria essa tarefa perfeita para voce?','Resultado ideal - desired outcome',false,'open_text',true,80),
('rtq-jb-d09','rt-interview-jtbd','during','Quais sao as 3 coisas mais importantes para voce ao realizar essa tarefa?',NULL,false,'open_text',false,90),
('rtq-jb-d10','rt-interview-jtbd','during','Onde voce sente mais dificuldade ou incerteza?',NULL,false,'open_text',false,100),
('rtq-jb-d11','rt-interview-jtbd','during','Existe alguma situacao em que voce nao consegue realizar esse Job?',NULL,false,'open_text',false,110),
('rtq-jb-a1','rt-interview-jtbd','after','Qual e o Job Statement principal identificado?','Formato: Verbo + Objeto + Contexto',true,'open_text',true,10),
('rtq-jb-a2','rt-interview-jtbd','after','Quais Desired Outcomes foram identificados?',NULL,true,'open_text',false,20),
('rtq-jb-a3','rt-interview-jtbd','after','Quais criterios de contratacao e demissao da solucao atual foram identificados?',NULL,true,'open_text',false,30),
('rtq-jb-a4','rt-interview-jtbd','after','Quais Insights emergiram?',NULL,false,'open_text',false,40)
ON CONFLICT (id) DO NOTHING;

-- ── T6: Stakeholder Interview ─────────────────────────────────────────────
INSERT INTO public.research_template_questions (id, template_id, section, question, hint, is_research_question, question_type, is_required, sort_order) VALUES
('rtq-st-b1','rt-interview-stakeholder','before','Qual e o papel deste stakeholder na iniciativa?',NULL,false,'open_text',true,10),
('rtq-st-b2','rt-interview-stakeholder','before','Quais hipoteses ou suposicoes queremos validar com este stakeholder?',NULL,true,'open_text',false,20),
('rtq-st-d01','rt-interview-stakeholder','during','Qual e sua expectativa de resultado ao final desta iniciativa?',NULL,false,'open_text',true,10),
('rtq-st-d02','rt-interview-stakeholder','during','Como voce sabera que a iniciativa foi bem-sucedida?','Criterios de sucesso do negocio',false,'open_text',true,20),
('rtq-st-d03','rt-interview-stakeholder','during','Qual e a urgencia? Existe um prazo ou evento critico?',NULL,false,'open_text',false,30),
('rtq-st-d04','rt-interview-stakeholder','during','Quais restricoes ou limitacoes precisam ser respeitadas?','Orcamento, tecnologia, politica, compliance',false,'open_text',false,40),
('rtq-st-d05','rt-interview-stakeholder','during','Quais riscos voce percebe?',NULL,false,'open_text',false,50),
('rtq-st-d06','rt-interview-stakeholder','during','Que iniciativas similares ja foram tentadas? O que aconteceu?',NULL,false,'open_text',false,60),
('rtq-st-d07','rt-interview-stakeholder','during','Quais areas ou pessoas podem resistir a esta iniciativa? Por que?',NULL,false,'open_text',false,70),
('rtq-st-d08','rt-interview-stakeholder','during','Quais areas precisam estar envolvidas para o sucesso?',NULL,false,'open_text',false,80),
('rtq-st-d09','rt-interview-stakeholder','during','Existe alguma decisao ja tomada que impacta o escopo?',NULL,false,'open_text',false,90),
('rtq-st-d10','rt-interview-stakeholder','during','O que voce espera do processo de Discovery?',NULL,false,'open_text',false,100),
('rtq-st-d11','rt-interview-stakeholder','during','Que pergunta voce acha que ainda nao foi feita e deveria ser?',NULL,true,'open_text',false,110),
('rtq-st-a1','rt-interview-stakeholder','after','Quais criterios de sucesso foram identificados?',NULL,true,'open_text',true,10),
('rtq-st-a2','rt-interview-stakeholder','after','Quais restricoes e constraints foram mapeadas?',NULL,false,'open_text',true,20),
('rtq-st-a3','rt-interview-stakeholder','after','Quais suposicoes do stakeholder devem virar Research Questions?',NULL,true,'open_text',false,30),
('rtq-st-a4','rt-interview-stakeholder','after','Existe alinhamento entre a visao do stakeholder e os usuarios operacionais?',NULL,true,'open_text',false,40)
ON CONFLICT (id) DO NOTHING;

-- ── T7: Post-Implementation Interview ────────────────────────────────────
INSERT INTO public.research_template_questions (id, template_id, section, question, hint, is_research_question, question_type, is_required, sort_order) VALUES
('rtq-po-b1','rt-interview-post-impl','before','Qual solucao foi entregue e qual problema ela visava resolver?',NULL,true,'open_text',true,10),
('rtq-po-b2','rt-interview-post-impl','before','Quais Success Metrics foram definidas no Discovery?',NULL,true,'open_text',true,20),
('rtq-po-d01','rt-interview-post-impl','during','Voce esta usando a solucao? Com que frequencia?',NULL,false,'open_text',true,10),
('rtq-po-d02','rt-interview-post-impl','during','O problema que motivou a solucao foi resolvido?',NULL,true,'open_text',true,20),
('rtq-po-d03','rt-interview-post-impl','during','O que mudou no seu dia a dia desde a implementacao?',NULL,false,'open_text',true,30),
('rtq-po-d04','rt-interview-post-impl','during','O que nao mudou e deveria ter mudado?',NULL,true,'open_text',false,40),
('rtq-po-d05','rt-interview-post-impl','during','Existem efeitos colaterais nao previstos?',NULL,true,'open_text',false,50),
('rtq-po-d06','rt-interview-post-impl','during','Qual parte da solucao voce usa menos? Por que?',NULL,false,'open_text',false,60),
('rtq-po-d07','rt-interview-post-impl','during','O que voce mudaria na solucao agora que a usa no dia a dia?',NULL,false,'open_text',false,70),
('rtq-po-d08','rt-interview-post-impl','during','Novos problemas surgiram apos a implementacao?',NULL,true,'open_text',false,80),
('rtq-po-d09','rt-interview-post-impl','during','Qual e sua satisfacao geral com a solucao? (1-5)',NULL,false,'scale_1_5',false,90),
('rtq-po-a1','rt-interview-post-impl','after','O problema original foi resolvido? Parcialmente? Nao foi?',NULL,true,'open_text',true,10),
('rtq-po-a2','rt-interview-post-impl','after','Quais novas oportunidades foram identificadas?',NULL,true,'open_text',false,20),
('rtq-po-a3','rt-interview-post-impl','after','Quais licoes aprendidas devem alimentar o proximo ciclo?',NULL,false,'open_text',false,30)
ON CONFLICT (id) DO NOTHING;

-- ── T8: Benefits Realization Interview ───────────────────────────────────
INSERT INTO public.research_template_questions (id, template_id, section, question, hint, is_research_question, question_type, is_required, sort_order) VALUES
('rtq-br-b1','rt-interview-benefits','before','Quais beneficios foram prometidos no Discovery?',NULL,true,'open_text',true,10),
('rtq-br-b2','rt-interview-benefits','before','Quais Success Metrics foram definidas?',NULL,true,'open_text',true,20),
('rtq-br-b3','rt-interview-benefits','before','Qual foi o baseline antes da implementacao?',NULL,false,'open_text',true,30),
('rtq-br-d01','rt-interview-benefits','during','Qual era o problema que a solucao deveria resolver?',NULL,true,'open_text',true,10),
('rtq-br-d02','rt-interview-benefits','during','O beneficio esperado se materializou? Em que medida?',NULL,true,'open_text',true,20),
('rtq-br-d03','rt-interview-benefits','during','Voce tem dados ou evidencias que comprovam o beneficio?',NULL,false,'open_text',false,30),
('rtq-br-d04','rt-interview-benefits','during','Qual e o valor estimado gerado? (tempo, custo, qualidade, risco)',NULL,false,'open_text',false,40),
('rtq-br-d05','rt-interview-benefits','during','Existem beneficios nao previstos que surgiram?',NULL,true,'open_text',false,50),
('rtq-br-d06','rt-interview-benefits','during','Existem beneficios esperados que nao se materializaram? Por que?',NULL,true,'open_text',false,60),
('rtq-br-d07','rt-interview-benefits','during','O que impediu a realizacao plena dos beneficios?',NULL,true,'open_text',false,70),
('rtq-br-d08','rt-interview-benefits','during','Qual seria o proximo passo para ampliar os beneficios?',NULL,false,'open_text',false,80),
('rtq-br-a1','rt-interview-benefits','after','Os beneficios prometidos foram alcancados? Evidencias?',NULL,true,'open_text',true,10),
('rtq-br-a2','rt-interview-benefits','after','Quais metricas foram validadas ou invalidadas?',NULL,true,'open_text',true,20),
('rtq-br-a3','rt-interview-benefits','after','Ha oportunidades de ampliar o valor gerado?',NULL,false,'open_text',false,30)
ON CONFLICT (id) DO NOTHING;

-- ── T9: Discovery Stakeholder Meeting ────────────────────────────────────
INSERT INTO public.research_template_questions (id, template_id, section, question, hint, is_research_question, question_type, is_required, sort_order) VALUES
('rtq-sm-b1','rt-meeting-stakeholder','before','Qual e o objetivo desta reuniao?',NULL,false,'open_text',true,10),
('rtq-sm-b2','rt-meeting-stakeholder','before','Quem participara e qual e o papel de cada um?',NULL,false,'open_text',true,20),
('rtq-sm-d01','rt-meeting-stakeholder','during','O que motivou esta iniciativa?',NULL,false,'open_text',true,10),
('rtq-sm-d02','rt-meeting-stakeholder','during','Qual problema acreditamos existir?',NULL,false,'open_text',true,20),
('rtq-sm-d03','rt-meeting-stakeholder','during','Quem e afetado?',NULL,false,'open_text',false,30),
('rtq-sm-d04','rt-meeting-stakeholder','during','Que resultado esperamos ao final do Discovery?',NULL,false,'open_text',false,40),
('rtq-sm-d05','rt-meeting-stakeholder','during','Que evidencias ja temos?',NULL,false,'open_text',false,50),
('rtq-sm-d06','rt-meeting-stakeholder','during','Quais hipoteses estamos assumindo?','Transformar cada suposicao nao comprovada em Research Question',true,'open_text',false,60),
('rtq-sm-d07','rt-meeting-stakeholder','during','O que ainda nao sabemos e precisamos descobrir?',NULL,true,'open_text',true,70),
('rtq-sm-d08','rt-meeting-stakeholder','during','Que solucoes ja foram tentadas? Por que nao funcionaram?',NULL,false,'open_text',false,80),
('rtq-sm-d09','rt-meeting-stakeholder','during','Quais restricoes existem?',NULL,false,'open_text',false,90),
('rtq-sm-d10','rt-meeting-stakeholder','during','Quais riscos sao conhecidos?',NULL,false,'open_text',false,100),
('rtq-sm-d11','rt-meeting-stakeholder','during','Que decisao precisamos conseguir tomar ao final do Discovery?',NULL,true,'open_text',true,110),
('rtq-sm-a1','rt-meeting-stakeholder','after','Quais Research Questions foram definidas?',NULL,true,'open_text',true,10),
('rtq-sm-a2','rt-meeting-stakeholder','after','Quais Assumptions foram listadas?',NULL,true,'open_text',false,20),
('rtq-sm-a3','rt-meeting-stakeholder','after','Qual e o escopo acordado do Discovery?',NULL,false,'open_text',true,30)
ON CONFLICT (id) DO NOTHING;
