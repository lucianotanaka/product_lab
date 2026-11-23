-- Questions T10-T14: Requirements Workshop, Contextual Obs, Usability, Survey x2, Quant

-- ── T10: Requirements Workshop ───────────────────────────────────────────
INSERT INTO public.research_template_questions (id, template_id, section, question, hint, is_research_question, question_type, is_required, sort_order) VALUES
('rtq-rw-b1','rt-meeting-requirements','before','Qual problema ou oportunidade originou este workshop?',NULL,false,'open_text',true,10),
('rtq-rw-b2','rt-meeting-requirements','before','Quais participantes devem estar presentes?',NULL,false,'open_text',true,20),
('rtq-rw-d01','rt-meeting-requirements','during','Qual e o processo ou funcionalidade em escopo?',NULL,false,'open_text',true,10),
('rtq-rw-d02','rt-meeting-requirements','during','Quais sao as entradas necessarias?',NULL,false,'open_text',false,20),
('rtq-rw-d03','rt-meeting-requirements','during','Quais sao as saidas esperadas?',NULL,false,'open_text',false,30),
('rtq-rw-d04','rt-meeting-requirements','during','Quais sao as regras de negocio?',NULL,false,'open_text',false,40),
('rtq-rw-d05','rt-meeting-requirements','during','Quais excecoes existem?',NULL,false,'open_text',false,50),
('rtq-rw-d06','rt-meeting-requirements','during','Quais requisitos funcionais foram identificados?',NULL,false,'open_text',true,60),
('rtq-rw-d07','rt-meeting-requirements','during','Quais requisitos nao funcionais foram identificados?','Performance, seguranca, disponibilidade',false,'open_text',false,70),
('rtq-rw-d08','rt-meeting-requirements','during','Quais integracoes sao necessarias?',NULL,false,'open_text',false,80),
('rtq-rw-d09','rt-meeting-requirements','during','Quais dados precisam ser persistidos?',NULL,false,'open_text',false,90),
('rtq-rw-d10','rt-meeting-requirements','during','Existem restricoes de seguranca ou compliance?',NULL,false,'open_text',false,100),
('rtq-rw-d11','rt-meeting-requirements','during','Quais sao os criterios de sucesso e aceite?',NULL,false,'open_text',true,110),
('rtq-rw-a1','rt-meeting-requirements','after','Lista de requisitos funcionais aprovados',NULL,false,'open_text',true,10),
('rtq-rw-a2','rt-meeting-requirements','after','Lista de regras de negocio aprovadas',NULL,false,'open_text',false,20),
('rtq-rw-a3','rt-meeting-requirements','after','Pendencias e proximos passos',NULL,false,'open_text',false,30)
ON CONFLICT (id) DO NOTHING;

-- ── T11: Contextual Observation ───────────────────────────────────────────
INSERT INTO public.research_template_questions (id, template_id, section, question, hint, is_research_question, question_type, is_required, sort_order) VALUES
('rtq-co-b1','rt-observation-contextual','before','Qual atividade sera observada?',NULL,true,'open_text',true,10),
('rtq-co-b2','rt-observation-contextual','before','Qual e o objetivo esperado da sessao de observacao?',NULL,true,'open_text',true,20),
('rtq-co-b3','rt-observation-contextual','before','Qual e o participante e seu contexto?',NULL,false,'open_text',true,30),
('rtq-co-d01','rt-observation-contextual','during','Quais etapas foram executadas e em que sequencia?','Registrar passo a passo observado',false,'observation',true,10),
('rtq-co-d02','rt-observation-contextual','during','Quais ferramentas, sistemas e documentos foram utilizados?',NULL,false,'observation',false,20),
('rtq-co-d03','rt-observation-contextual','during','Houve copiar/colar ou reconciliacao manual de dados?',NULL,false,'observation',false,30),
('rtq-co-d04','rt-observation-contextual','during','Onde ocorreram esperas, interrupcoes ou handoffs?',NULL,false,'observation',false,40),
('rtq-co-d05','rt-observation-contextual','during','Onde ocorreram erros, retrabalho ou workarounds?',NULL,false,'observation',false,50),
('rtq-co-d06','rt-observation-contextual','during','Quais decisoes foram tomadas e com base em que?',NULL,false,'observation',false,60),
('rtq-co-d07','rt-observation-contextual','during','O que voce esta fazendo agora?','Pergunta de aprofundamento contextual',false,'open_text',false,70),
('rtq-co-d08','rt-observation-contextual','during','Por que fez dessa maneira?',NULL,false,'open_text',false,80),
('rtq-co-d09','rt-observation-contextual','during','Isso acontece normalmente ou e uma excecao?',NULL,false,'open_text',false,90),
('rtq-co-d10','rt-observation-contextual','during','O que voce esperava que acontecesse?',NULL,false,'open_text',false,100),
('rtq-co-d11','rt-observation-contextual','during','Quanto tempo levou cada etapa principal?',NULL,false,'observation',false,110),
('rtq-co-a1','rt-observation-contextual','after','O processo observado difere do relatado em entrevistas? Como?',NULL,false,'open_text',true,10),
('rtq-co-a2','rt-observation-contextual','after','Quais Pains foram confirmadas ou descobertas?',NULL,false,'open_text',true,20),
('rtq-co-a3','rt-observation-contextual','after','Insumos para o Process Mapping AS-IS',NULL,false,'open_text',false,30)
ON CONFLICT (id) DO NOTHING;

-- ── T12: Usability Test ────────────────────────────────────────────────────
INSERT INTO public.research_template_questions (id, template_id, section, question, hint, is_research_question, question_type, is_required, sort_order) VALUES
('rtq-ut-b1','rt-observation-usability','before','Quais tarefas o participante devera executar?',NULL,false,'open_text',true,10),
('rtq-ut-b2','rt-observation-usability','before','Quais hipoteses de usabilidade queremos testar?',NULL,true,'open_text',true,20),
('rtq-ut-b3','rt-observation-usability','before','Qual e o criterio de sucesso para cada tarefa?',NULL,false,'open_text',true,30),
('rtq-ut-d01','rt-observation-usability','during','Tarefa 1: o participante conseguiu completar? Quanto tempo levou?',NULL,false,'observation',true,10),
('rtq-ut-d02','rt-observation-usability','during','Onde o participante travou, ficou confuso ou cometeu erros?',NULL,false,'observation',true,20),
('rtq-ut-d03','rt-observation-usability','during','O participante verbalizou pensamentos ou frustracoes?','Pecar o participante para pensar em voz alta',false,'observation',false,30),
('rtq-ut-d04','rt-observation-usability','during','O que o participante esperava que acontecesse?',NULL,false,'open_text',false,40),
('rtq-ut-d05','rt-observation-usability','during','Existiu algum elemento da interface que confundiu?',NULL,false,'observation',false,50),
('rtq-ut-d06','rt-observation-usability','during','O participante abandonou ou pulou alguma etapa? Por que?',NULL,false,'observation',false,60),
('rtq-ut-d07','rt-observation-usability','during','Qual foi a satisfacao do participante ao finalizar a tarefa? (1-5)',NULL,false,'scale_1_5',false,70),
('rtq-ut-a1','rt-observation-usability','after','Quais tarefas foram completadas com sucesso?',NULL,false,'open_text',true,10),
('rtq-ut-a2','rt-observation-usability','after','Quais pontos de friccao criticos foram identificados?',NULL,false,'open_text',true,20),
('rtq-ut-a3','rt-observation-usability','after','Quais ajustes de interface ou fluxo sao necessarios?',NULL,false,'open_text',false,30),
('rtq-ut-a4','rt-observation-usability','after','Quais hipoteses de usabilidade foram confirmadas ou descartadas?',NULL,true,'open_text',false,40)
ON CONFLICT (id) DO NOTHING;

-- ── T13: Problem & Process Survey ────────────────────────────────────────
INSERT INTO public.research_template_questions (id, template_id, section, question, hint, is_research_question, question_type, is_required, sort_order) VALUES
('rtq-su-b1','rt-survey-problem-process','before','Qual hipotese qualitativa queremos quantificar?',NULL,true,'open_text',true,10),
('rtq-su-b2','rt-survey-problem-process','before','Qual e o publico-alvo da pesquisa?',NULL,false,'open_text',true,20),
('rtq-su-d01','rt-survey-problem-process','during','Qual sua area?',NULL,false,'open_text',true,10),
('rtq-su-d02','rt-survey-problem-process','during','Qual sua funcao?',NULL,false,'open_text',true,20),
('rtq-su-d03','rt-survey-problem-process','during','Com que frequencia realiza a atividade em questao?','Nunca / Raramente / As vezes / Frequentemente / Sempre',false,'open_text',true,30),
('rtq-su-d04','rt-survey-problem-process','during','Quais ferramentas ou sistemas utiliza?',NULL,false,'open_text',false,40),
('rtq-su-d05','rt-survey-problem-process','during','Quanto tempo normalmente leva?',NULL,false,'open_text',false,50),
('rtq-su-d06','rt-survey-problem-process','during','Com que frequencia ocorre retrabalho?','Nunca / Raramente / As vezes / Frequentemente / Sempre',false,'open_text',false,60),
('rtq-su-d07','rt-survey-problem-process','during','Qual etapa apresenta maior dificuldade?',NULL,false,'open_text',false,70),
('rtq-su-d08','rt-survey-problem-process','during','Qual impacto mais frequente quando o problema ocorre?','Nenhum / Baixo / Medio / Alto / Critico',false,'scale_1_5',false,80),
('rtq-su-d09','rt-survey-problem-process','during','Qual sua satisfacao com o processo atual? (1=muito insatisfeito, 5=muito satisfeito)',NULL,false,'scale_1_5',false,90),
('rtq-su-d10','rt-survey-problem-process','during','Deseja participar de uma entrevista aprofundada?',NULL,false,'open_text',false,100),
('rtq-su-a1','rt-survey-problem-process','after','Quais Findings quantitativos foram confirmados?',NULL,true,'open_text',true,10),
('rtq-su-a2','rt-survey-problem-process','after','Quais hipoteses foram validadas ou descartadas?',NULL,true,'open_text',false,20)
ON CONFLICT (id) DO NOTHING;

-- ── T14: Satisfaction Survey ──────────────────────────────────────────────
INSERT INTO public.research_template_questions (id, template_id, section, question, hint, is_research_question, question_type, is_required, sort_order) VALUES
('rtq-ss-b1','rt-survey-satisfaction','before','O que estamos medindo? Processo, produto ou servico?',NULL,false,'open_text',true,10),
('rtq-ss-b2','rt-survey-satisfaction','before','Qual e o baseline de satisfacao esperado?',NULL,true,'open_text',false,20),
('rtq-ss-d01','rt-survey-satisfaction','during','Qual sua funcao?',NULL,false,'open_text',true,10),
('rtq-ss-d02','rt-survey-satisfaction','during','Com que frequencia utiliza o processo ou produto avaliado?','Nunca / Raramente / As vezes / Frequentemente / Sempre',false,'open_text',true,20),
('rtq-ss-d03','rt-survey-satisfaction','during','NPS: Em uma escala de 0 a 10, o quanto voce recomendaria este processo ou produto?',NULL,false,'scale_1_5',true,30),
('rtq-ss-d04','rt-survey-satisfaction','during','CES: O quanto foi facil realizar o que voce precisava? (1=muito dificil, 5=muito facil)',NULL,false,'scale_1_5',false,40),
('rtq-ss-d05','rt-survey-satisfaction','during','Satisfacao geral: Como voce avalia o processo ou produto? (1=muito ruim, 5=excelente)',NULL,false,'scale_1_5',true,50),
('rtq-ss-d06','rt-survey-satisfaction','during','O que voce mais valoriza no processo ou produto atual?',NULL,false,'open_text',false,60),
('rtq-ss-d07','rt-survey-satisfaction','during','O que mais incomoda ou dificulta no processo ou produto atual?',NULL,false,'open_text',false,70),
('rtq-ss-d08','rt-survey-satisfaction','during','Qual melhoria voce considera mais prioritaria?',NULL,false,'open_text',false,80),
('rtq-ss-d09','rt-survey-satisfaction','during','Ha algum comentario adicional?',NULL,false,'open_text',false,90),
('rtq-ss-a1','rt-survey-satisfaction','after','Qual foi o NPS calculado?',NULL,true,'open_text',true,10),
('rtq-ss-a2','rt-survey-satisfaction','after','Qual foi o CES medio?',NULL,false,'open_text',false,20),
('rtq-ss-a3','rt-survey-satisfaction','after','Quais sao os principais temas de insatisfacao?',NULL,false,'open_text',true,30),
('rtq-ss-a4','rt-survey-satisfaction','after','Quais melhorias foram priorizadas pelos respondentes?',NULL,false,'open_text',false,40)
ON CONFLICT (id) DO NOTHING;
