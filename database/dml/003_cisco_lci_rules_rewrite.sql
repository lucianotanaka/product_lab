-- 003_cisco_lci_rules_rewrite.sql
-- Reescreve BR-001 a BR-028 da perspectiva do programa de negocio Cisco LCI.
BEGIN;

-- Subdomains
UPDATE business_subdomains SET subdomain_name='LCI Deal Rules',description='Regras do programa Cisco LCI sobre o ciclo de vida de deals: elegibilidade, opt-in/out, status e encerramento.' WHERE subdomain_code='CISCO-LCI-TASK';
UPDATE business_subdomains SET subdomain_name='LCI Activity (Stage) Rules',description='Regras sobre as atividades (estagios) de um deal LCI: progressao, aprovacao de claim, deduplicacao e vinculo com o deal pai.' WHERE subdomain_code='CISCO-LCI-ACT';
UPDATE business_subdomains SET subdomain_name='LCI Data Quality Rules',description='Regras de integridade e rastreabilidade dos dados do programa LCI recebidos do portal Cisco PXP.' WHERE subdomain_code='CISCO-LCI-IMPORT';

-- BR-001
UPDATE requirements SET
  requirement_title=$t$Todo deal LCI e identificado pelo Workstream (WS) no formato WS-numero$t$,
  requirement_description=$t$O Workstream (WS) e o identificador unico de um deal no programa Cisco LCI, atribuido pela Cisco no portal PXP. Formato obrigatorio: WS-numero (ex: WS-123456). E o WS que vincula o deal ao programa Cisco e garante rastreabilidade entre todos os sistemas que processam dados LCI.$t$,
  acceptance_definition=$t$Deal LCI sem WS valido nao pode ser registrado ou atualizado em nenhum sistema.$t$
WHERE product_id=1 AND requirement_code='BR-001';

-- BR-002
UPDATE requirements SET
  requirement_title=$t$O programa Cisco LCI opera em duas versoes: LCI 1.0 (legado) e LCI 2.0 (atual)$t$,
  requirement_description=$t$A Cisco substituiu o modelo LCI 1.0 pelo LCI 2.0 a partir de 2025. Novos deals sao criados exclusivamente no LCI 2.0. O LCI 1.0 existe apenas para historico. Qualquer sistema que processe dados LCI deve reconhecer as duas versoes e priorizar o LCI 2.0 quando ambos existirem para o mesmo deal.$t$,
  acceptance_definition=$t$Novos deals LCI devem ser do modelo 2.0. Quando existirem registros de ambos os modelos para o mesmo deal, o LCI 2.0 prevalece.$t$
WHERE product_id=1 AND requirement_code='BR-002';

-- BR-003
UPDATE requirements SET
  requirement_title=$t$O Opt-Out do cliente tem precedencia absoluta sobre o status de elegibilidade do deal$t$,
  requirement_description=$t$Um cliente que realiza Opt-Out em um deal LCI declara formalmente que nao deseja participar do programa naquele deal, independentemente da elegibilidade tecnica determinada pela Cisco. O Opt-Out e uma decisao do cliente e prevalece sobre qualquer status de elegibilidade (Eligible, Not Eligible, Expired).$t$,
  acceptance_definition=$t$Deal com Opt-Out registrado deve ser tratado como nao participante do programa, mesmo que a Cisco o classifique como Eligible.$t$
WHERE product_id=1 AND requirement_code='BR-003';

-- BR-004
UPDATE requirements SET
  requirement_title=$t$Um deal LCI com Opt-Out deve ser registrado como Cancelado mesmo que ainda nao exista no sistema$t$,
  requirement_description=$t$Quando um cliente realiza Opt-Out em um deal que ainda nao foi cadastrado, o deal deve ser criado no status Cancelado para garantir rastreabilidade do Opt-Out. A existencia do registro e necessaria para evidenciar historicamente a decisao do cliente.$t$,
  acceptance_definition=$t$Deal inexistente com Opt-Out deve ser criado como Cancelado. Nao deve existir Opt-Out sem registro correspondente.$t$
WHERE product_id=1 AND requirement_code='BR-004';

-- BR-005
UPDATE requirements SET
  requirement_title=$t$Um deal ja Cancelado ou Declinado nao e afetado por um Opt-Out subsequente$t$,
  requirement_description=$t$Quando um deal LCI ja se encontra nos status Cancelado ou Declinado, um Opt-Out registrado posteriormente e redundante e nao altera o estado do deal. O deal ja esta encerrado por razoes proprias; o Opt-Out nao acrescenta informacao relevante.$t$,
  acceptance_definition=$t$Deal no status Cancelado ou Declinado com Opt-Out => sem alteracao de estado.$t$
WHERE product_id=1 AND requirement_code='BR-005';

-- BR-006
UPDATE requirements SET
  requirement_title=$t$O Opt-Out encerra um deal LCI independentemente do estagio atual, incluindo Expirado e Concluido$t$,
  requirement_description=$t$A declaracao de Opt-Out de um cliente tem efeito sobre o deal independentemente do status em que se encontra, inclusive sobre deals Expirados ou Concluidos. O Opt-Out representa uma declaracao formal de nao participacao que se sobrepoe ao ciclo de vida normal do deal. O encerramento do deal por Opt-Out tambem cancela todas as atividades ainda abertas.$t$,
  acceptance_definition=$t$Deal Expirado com Opt-Out => deve ser cancelado. Deal Concluido com Opt-Out => deve ser cancelado. Atividades abertas devem ser encerradas.$t$
WHERE product_id=1 AND requirement_code='BR-006';

-- BR-007
UPDATE requirements SET
  requirement_title=$t$Um deal LCI com Opt-Out registrado e marcado como nao elegivel$t$,
  requirement_description=$t$A declaracao de Opt-Out invalida a elegibilidade do deal no programa LCI. Independentemente do que a Cisco informa sobre elegibilidade, um deal com Opt-Out deve ser marcado como nao elegivel, pois o cliente abdicou da participacao.$t$,
  acceptance_definition=$t$Todo deal com Opt-Out deve ter elegibilidade marcada como N (nao elegivel).$t$
WHERE product_id=1 AND requirement_code='BR-007';

-- BR-008
UPDATE requirements SET
  requirement_title=$t$Todo deal classificado pela Cisco como Not Eligible deve ser registrado, ainda que como Declinado$t$,
  requirement_description=$t$A inelegibilidade e uma classificacao formal da Cisco para o deal no programa LCI. Deals Not Eligible devem ser registrados no status Declinado para garantir rastreabilidade. A ausencia de registro impediria auditorias e acompanhamento historico do programa.$t$,
  acceptance_definition=$t$Deal classificado como Not Eligible pela Cisco deve gerar um registro no status Declinado. Nao deve existir deal Not Eligible sem registro correspondente.$t$
WHERE product_id=1 AND requirement_code='BR-008';

-- BR-009
UPDATE requirements SET
  requirement_title=$t$Um deal LCI encerrado nao pode ter seu status alterado por mudancas de elegibilidade$t$,
  requirement_description=$t$Deals LCI nos status finais (Cancelado, Declinado, Expirado, Concluido) representam estados definitivos do ciclo de vida. Novas informacoes de elegibilidade da Cisco nao revertem esses estados. A unica excecao e o Opt-Out do cliente, que prevalece sobre Expirado e Concluido por representar uma declaracao formal posterior.$t$,
  acceptance_definition=$t$Status Eligible sobre deal encerrado nao reabre o deal. Opt-Out sobre deal Cancelado ou Declinado nao tem efeito. Opt-Out sobre deal Expirado ou Concluido encerra o deal como Cancelado.$t$
WHERE product_id=1 AND requirement_code='BR-009';

-- BR-010
UPDATE requirements SET
  requirement_title=$t$Um deal LCI Cancelado pode ser reativado quando o cliente realiza Opt-In e o deal e elegivel$t$,
  requirement_description=$t$O Opt-In de um cliente em um deal anteriormente Cancelado, combinado com a elegibilidade do deal confirmada pela Cisco, permite a reativacao do deal. Esta e a unica situacao em que um deal encerrado pode retornar ao ciclo ativo. A reativacao coloca o deal diretamente no status Em Andamento, registrando o inicio da participacao.$t$,
  acceptance_definition=$t$Deal Cancelado + Opt-In + Eligible => reativar como Em Andamento. Este e o unico cenario de reabertura de deal encerrado.$t$
WHERE product_id=1 AND requirement_code='BR-010';

-- BR-011
UPDATE requirements SET
  requirement_title=$t$Um deal LCI elegivel com Opt-In ativo inicia diretamente no status Em Andamento$t$,
  requirement_description=$t$Quando um deal elegivel possui Opt-In ativo do cliente, o deal e considerado iniciado. O Opt-In indica o compromisso formal do cliente com o programa LCI naquele deal, justificando o status Em Andamento em vez de apenas Aberto.$t$,
  acceptance_definition=$t$Deal elegivel com Opt-In => status Em Andamento. Deal elegivel sem Opt-In => status Aberto.$t$
WHERE product_id=1 AND requirement_code='BR-011';

-- BR-012
UPDATE requirements SET
  requirement_title=$t$Dados de um deal LCI so devem ser atualizados quando houver mudanca real de informacao$t$,
  requirement_description=$t$Atualizacoes em um deal LCI devem ser aplicadas apenas quando os novos dados diferem dos dados existentes. Sobreescrever dados identicos gera historico desnecessario e pode mascarar o momento real das mudancas. A rastreabilidade do historico do deal depende de que cada entrada no historico represente uma mudanca genuina.$t$,
  acceptance_definition=$t$Dados identicos aos existentes nao devem gerar atualizacao nem historico no deal.$t$
WHERE product_id=1 AND requirement_code='BR-012';

-- BR-013
UPDATE requirements SET
  requirement_title=$t$O valor financeiro de um deal LCI pode ser nulo quando nao disponivel ou invalido$t$,
  requirement_description=$t$O valor do incentivo e o valor de booking de um deal LCI sao informacoes financeiras fornecidas pela Cisco. Quando esses valores nao estao disponiveis, sao invalidos ou excedem os limites do programa, devem ser tratados como nulos. A ausencia de valor financeiro nao invalida o deal nem impede seu acompanhamento.$t$,
  acceptance_definition=$t$Deal LCI com valor financeiro invalido ou ausente deve ser aceito com valor nulo. O deal segue seu ciclo normalmente.$t$
WHERE product_id=1 AND requirement_code='BR-013';

-- BR-014
UPDATE requirements SET
  requirement_title=$t$Um deal LCI Expirado encerra automaticamente todas as suas atividades em andamento$t$,
  requirement_description=$t$A expiracao de um deal LCI representa o fim do prazo do programa para aquele deal. Quando um deal expira, todas as atividades (estagios) ainda em andamento sao automaticamente encerradas como expiradas. Nao e possivel ter atividades ativas em um deal expirado.$t$,
  acceptance_definition=$t$Deal que expira => todas as atividades abertas devem ser encerradas como Expiradas.$t$
WHERE product_id=1 AND requirement_code='BR-014';

-- BR-015
UPDATE requirements SET
  requirement_title=$t$Uma atividade LCI so pode existir vinculada a um deal LCI pai do mesmo cliente e deal$t$,
  requirement_description=$t$No programa Cisco LCI, as atividades (estagios como Onboard, Use, Engage, Adopt) sao componentes de um deal. Nao existe atividade LCI sem deal correspondente. O deal deve estar registrado antes que qualquer atividade sua possa ser criada ou atualizada.$t$,
  acceptance_definition=$t$Atividade LCI sem deal pai correspondente nao pode ser registrada.$t$
WHERE product_id=1 AND requirement_code='BR-015';

-- BR-016
UPDATE requirements SET
  requirement_title=$t$Atividades LCI com data de expiracao anterior a 2 anos do FY vigente sao historicamente encerradas$t$,
  requirement_description=$t$O programa Cisco LCI opera por Fiscal Year (FY). O FY Cisco inicia em agosto (ex: Agosto/2026 = FY2027). Atividades com data de expiracao em FY igual ou anterior a FY_vigente - 2 anos sao consideradas historicamente encerradas e nao participam do ciclo de incentivo atual. Atividades do FY anterior (FY_vigente - 1) ainda estao em periodo de ajuste e devem ser registradas com erro para revisao.$t$,
  acceptance_definition=$t$Atividade expirada em FY <= FY_vigente-2 => encerrada sem pendencias. Atividade expirada em FY_vigente-1 => requer revisao.$t$
WHERE product_id=1 AND requirement_code='BR-016';

-- BR-017
UPDATE requirements SET
  requirement_title=$t$O ciclo de vida de uma atividade LCI e progressivo: o status nao pode regredir$t$,
  requirement_description=$t$As atividades LCI progridem por estagios: Aberta > Em Andamento > Submetida / Resubmetida > Aprovada > Concluida. Uma vez que uma atividade avanca para um estagio, ela nao pode retornar a um estagio anterior. Novos dados da Cisco que indicariam regressao de status devem ser ignorados.$t$,
  acceptance_definition=$t$Atividade em status avancado nao deve ter status reduzido por novas informacoes. O ciclo e sempre progressivo.$t$
WHERE product_id=1 AND requirement_code='BR-017';

-- BR-018
UPDATE requirements SET
  requirement_title=$t$Uma atividade LCI encerrada nao tem seu status alterado, exceto pela data de aprovacao do claim$t$,
  requirement_description=$t$Atividades LCI nos status finais (Cancelada, Declinada, Expirada, Concluida) nao devem ter seu status alterado por novas informacoes da Cisco. A excecao e a data de aprovacao do claim (Claim Approval Date), que registra o momento real do pagamento do incentivo pela Cisco e pode ser atualizada mesmo em atividades ja concluidas.$t$,
  acceptance_definition=$t$Atividade encerrada nao muda de status. Atividade encerrada com Claim Approval Date => atualizar apenas os campos de data de aprovacao.$t$
WHERE product_id=1 AND requirement_code='BR-018';

-- BR-019
UPDATE requirements SET
  requirement_title=$t$A data de aprovacao do claim (Claim Approval Date) define o momento oficial do pagamento do incentivo$t$,
  requirement_description=$t$A Claim Approval Date e a data em que a Cisco aprovou formalmente o pagamento do incentivo LCI para uma atividade. Quando disponivel, esta data deve ser registrada como a data de conclusao oficial da atividade, independentemente do status atual. Representa a evidencia do cumprimento dos requisitos do programa.$t$,
  acceptance_definition=$t$Atividade com Claim Approval Date preenchida => registrar como conclusao oficial da atividade, mesmo que ja esteja encerrada.$t$
WHERE product_id=1 AND requirement_code='BR-019';

-- BR-020
UPDATE requirements SET
  requirement_title=$t$Cada atividade LCI e identificada unicamente pelo seu Activity Id (WS) fornecido pela Cisco$t$,
  requirement_description=$t$O Activity Id e o identificador unico de uma atividade LCI no portal Cisco PXP, no formato WS-numero. Este identificador e a chave primaria para localizar, atualizar e deduplicar registros de atividades. Na ausencia do Activity Id, a atividade pode ser identificada pela combinacao de Track, Sub-Track, Deal ID, tipo de atividade e deal pai.$t$,
  acceptance_definition=$t$Atividade com Activity Id deve ser localizada primariamente por ele. Busca alternativa permitida apenas quando o Activity Id nao esta disponivel.$t$
WHERE product_id=1 AND requirement_code='BR-020';

-- BR-021
UPDATE requirements SET
  requirement_title=$t$O periodo de execucao de um deal LCI abrange o intervalo consolidado de todas as suas atividades$t$,
  requirement_description=$t$Um deal LCI possui multiplas atividades (estagios) que podem se sobrepor temporalmente. O periodo de execucao do deal deve sempre refletir: inicio = data de inicio da atividade mais antiga; fim = data de conclusao da atividade mais recente. Isso garante que o deal reflita corretamente o ciclo completo do programa para aquele cliente.$t$,
  acceptance_definition=$t$Data de inicio do deal deve ser igual ao inicio da atividade mais antiga. Data de fim deve ser igual ao encerramento da atividade mais recente.$t$
WHERE product_id=1 AND requirement_code='BR-021';

-- BR-022
UPDATE requirements SET
  requirement_title=$t$As tracks Use Incentive e Adopt Incentive identificam atividades do programa LCI 1.0 (legado)$t$,
  requirement_description=$t$O programa Cisco LCI evoluiu do modelo 1.0 para o 2.0. As tracks Use Incentive e Adopt Incentive sao caracteristicas do modelo legado LCI 1.0. Atividades identificadas com Activity Group LCI2.0 pertencem ao modelo atual. Sistemas que processam dados LCI devem reconhecer esta distincao para vincular corretamente as atividades aos seus deals pai.$t$,
  acceptance_definition=$t$Track Use Incentive ou Adopt Incentive => atividade do LCI 1.0. Activity Group LCI2.0 => atividade do LCI 2.0.$t$
WHERE product_id=1 AND requirement_code='BR-022';

-- BR-023
UPDATE requirements SET
  requirement_title=$t$Cada combinacao de atividade LCI por deal, track, tipo e cliente deve ser unica$t$,
  requirement_description=$t$No programa Cisco LCI, uma atividade e unicamente definida pela combinacao de: Activity Id + Track + Sub-Track + Deal ID + Tipo de atividade. Registros duplicados para a mesma atividade representam inconsistencia de dados. Em caso de duplicidade, o primeiro registro prevalece.$t$,
  acceptance_definition=$t$Combinacao duplicada de (Activity Id + Track + Sub-Track + Deal ID + Tipo) => apenas o primeiro registro deve ser processado.$t$
WHERE product_id=1 AND requirement_code='BR-023';

-- BR-024
UPDATE requirements SET
  requirement_title=$t$A aprovacao de uma atividade pela Cisco inicia seu progresso; nao retroage status ja avancados$t$,
  requirement_description=$t$Quando a Cisco aprova uma atividade LCI (Stage Activity - Approved), isso indica que a atividade foi aceita para progressao. Se a atividade ainda nao foi iniciada (status Aberto), ela avanca para Em Andamento. Se a atividade ja se encontra em um estagio mais avancado, a aprovacao nao altera o status, pois o ciclo e progressivo.$t$,
  acceptance_definition=$t$Aprovacao da Cisco sobre atividade Aberta => atividade passa para Em Andamento. Aprovacao sobre atividade ja Em Andamento ou mais avancada => sem alteracao.$t$
WHERE product_id=1 AND requirement_code='BR-024';

-- BR-025
UPDATE requirements SET
  requirement_title=$t$Todo deal LCI registrado deve ter sua integridade verificada imediatamente apos o cadastro$t$,
  requirement_description=$t$Um deal LCI cadastrado deve ser verificavel imediatamente apos o registro. Um deal que nao pode ser consultado logo apos ser criado indica problema de integridade de dados e nao deve ser considerado valido. A verificacao inclui confirmar que o identificador retornado corresponde ao deal realmente persistido.$t$,
  acceptance_definition=$t$Deal cadastrado mas nao consultavel no banco de dados nao deve ser considerado valido.$t$
WHERE product_id=1 AND requirement_code='BR-025';

-- BR-026
UPDATE requirements SET
  requirement_title=$t$Os relatorios do portal Cisco PXP sao a fonte primaria dos dados LCI e devem ser preservados$t$,
  requirement_description=$t$Os dados do programa Cisco LCI chegam ao NTT 360 por meio de relatorios gerados no portal Cisco PXP. Estes relatorios sao a fonte oficial dos dados e devem ter copia preservada antes de qualquer processamento, garantindo rastreabilidade, auditoria e possibilidade de reprocessamento em caso de falha.$t$,
  acceptance_definition=$t$Relatorio PXP deve ter copia original preservada antes de qualquer operacao de carga de dados.$t$
WHERE product_id=1 AND requirement_code='BR-026';

-- BR-027
UPDATE requirements SET
  requirement_title=$t$Registros de dados LCI que nao puderam ser processados devem ser documentados com o motivo$t$,
  requirement_description=$t$Quando um registro de dados LCI nao pode ser processado (deal ou atividade invalido, dado ausente, inconsistencia), o motivo da falha deve ser registrado estruturadamente para posterior revisao. Registros sem falha nao geram log de erro. A documentacao de falhas e essencial para auditoria e correcao dos dados do programa.$t$,
  acceptance_definition=$t$Registro LCI com erro de processamento deve gerar log com motivo. Processamento sem erro nao gera log de falha.$t$
WHERE product_id=1 AND requirement_code='BR-027';

-- BR-028
UPDATE requirements SET
  requirement_title=$t$O processamento de dados LCI deve ser incremental e tolerante a interrupcoes$t$,
  requirement_description=$t$O volume de dados do programa Cisco LCI pode ser extenso (centenas ou milhares de deals e atividades). O processamento deve ser realizado de forma incremental, garantindo que uma interrupcao nao comprometa os dados ja processados e que o processo possa ser retomado do ponto de parada sem necessidade de reprocessar tudo.$t$,
  acceptance_definition=$t$Interrupcao durante o processamento LCI nao deve comprometer dados ja processados. Reprocessamento deve continuar de onde parou.$t$
WHERE product_id=1 AND requirement_code='BR-028';

COMMIT;

SELECT requirement_code, requirement_title FROM requirements WHERE product_id=1 AND requirement_code LIKE 'BR-%' ORDER BY requirement_code;
