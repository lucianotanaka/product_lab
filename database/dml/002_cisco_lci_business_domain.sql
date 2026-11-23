-- ============================================================
-- 002_cisco_lci_business_domain.sql
-- Business Domain: CISCO-LCI
-- Regras de negócio extraídas dos importadores:
--   pxp_import_task_6702.py  (tasks)
--   pxp_import_activity_5890.py  (activities)
-- Produto alvo: NTT 360 (product_id = 1)
-- ============================================================

BEGIN;

-- ── 1. Business Domain ──────────────────────────────────────────────────────
INSERT INTO business_domains (domain_code, domain_name, description, owner, is_active, display_order, created_at, updated_at)
VALUES (
    'CISCO-LCI',
    'Cisco Lifecycle Incentive',
    'Dominio de negocio do programa Cisco Lifecycle Incentive (LCI). Cobre o ciclo de vida completo de tasks e activities, elegibilidade, opt-in/opt-out e importacao de dados via portal Cisco PXP. Qualquer feature do NTT 360 que processe dados LCI deve respeitar estas regras.',
    'Alliance Manager - Cisco Partnership',
    TRUE, 1, NOW(), NOW()
)
ON CONFLICT (domain_code) DO NOTHING;

-- ── 2. Subdomains ────────────────────────────────────────────────────────────
INSERT INTO business_subdomains (domain_id, subdomain_code, subdomain_name, description, display_order, is_active, created_at, updated_at)
SELECT d.id, 'CISCO-LCI-TASK', 'Task Management Rules',
    'Ciclo de vida das tasks LCI: criacao, atualizacao, cancelamento, opt-in/opt-out, elegibilidade, reabertura.',
    1, TRUE, NOW(), NOW()
FROM business_domains d WHERE d.domain_code = 'CISCO-LCI'
ON CONFLICT (domain_id, subdomain_code) DO NOTHING;

INSERT INTO business_subdomains (domain_id, subdomain_code, subdomain_name, description, display_order, is_active, created_at, updated_at)
SELECT d.id, 'CISCO-LCI-ACT', 'Activity Management Rules',
    'Ciclo de vida das activities LCI: status, Claim Approval Date, deduplicacao, sincronizacao com task pai.',
    2, TRUE, NOW(), NOW()
FROM business_domains d WHERE d.domain_code = 'CISCO-LCI'
ON CONFLICT (domain_id, subdomain_code) DO NOTHING;

INSERT INTO business_subdomains (domain_id, subdomain_code, subdomain_name, description, display_order, is_active, created_at, updated_at)
SELECT d.id, 'CISCO-LCI-IMPORT', 'Import Processing Rules',
    'Regras operacionais dos importadores PXP: formato de arquivo, processamento por chunks, cutoff de FY, confirmacao pos-criacao, arquivo de falhas.',
    3, TRUE, NOW(), NOW()
FROM business_domains d WHERE d.domain_code = 'CISCO-LCI'
ON CONFLICT (domain_id, subdomain_code) DO NOTHING;

-- ── 3. Requirements (Business Rules) ─────────────────────────────────────────

-- Helper: insert only if code not yet registered for this product
-- BR-001
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
SELECT 1, 'BR-001', 'WS obrigatorio com formato WS-<numero>',
'Coluna ''Deal Id'' do relatorio PXP deve seguir o padrao WS-<numero> (ex: WS-123456). Linha sem WS valido vai ao arquivo de falhas _failed_rows.xlsx. Nenhuma task e criada ou atualizada sem WS valido.',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_task_6702', 'CRITICAL', 'VALIDATED', 'MET',
'Linha com Deal Id vazio ou sem prefixo WS- deve ir ao arquivo de falhas. Nenhuma task criada sem WS valido.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE
WHERE NOT EXISTS (SELECT 1 FROM requirements WHERE product_id=1 AND requirement_code='BR-001');

-- BR-002: tasktype_id=22
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-002', 'Novas tasks LCI criadas com task_tasktype_id=22',
'Novas tasks Cisco LCI devem ser criadas com task_tasktype_id=22 (LCI 2.0). Tipo 21 (LCI 1.0) e legado. Na busca de task existente, tipos 21 e 22 sao considerados, com prioridade para 22.',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_task_6702', 'CRITICAL', 'VALIDATED', 'MET',
'Task criada pelo importador deve ter task_tasktype_id=22. Se existirem tipos 21 e 22 no mesmo deal, usar tipo 22.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-003: Opted Out prioridade maxima
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-003', 'Opted Out tem prioridade maxima sobre Incentive Eligibility Status',
'O valor Opted Out em Lifecycle Opt-In Status tem prioridade absoluta sobre Incentive Eligibility Status. Processado antes de todas as outras regras. Gera opt_in_flag=-1 internamente.',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_task_6702', 'CRITICAL', 'VALIDATED', 'MET',
'Opted Out + Eligible => tratar como Opted Out. Opted Out + Not Eligible => tratar como Opted Out.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-004: Opted Out sem task => Cancelled
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-004', 'Opted Out sem task existente: criar task como Cancelled (4)',
'Se Opted Out e task NAO existe: criar com task_status=4 (CANCELLED), task_eligible=N, task_status_justification=AN OPT-OUT WAS PERFORMED FOR THE TASK. Deal ID obrigatorio. Confirmar persistencia via _confirm_created_task().',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_task_6702', 'CRITICAL', 'VALIDATED', 'MET',
'Task criada por Opted Out deve ter status 4 (CANCELLED) e task_eligible=N.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-005: Opted Out task status 4 ou 5 => ignorar
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-005', 'Opted Out + task status 4 ou 5: ignorar silenciosamente',
'Se Opted Out e task existe com status 4 (Cancelled) ou 5 (Declined): ignorar silenciosamente. Sem alteracao, sem historico, sem erro.',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_task_6702', 'HIGH', 'VALIDATED', 'MET',
'Task status 4 ou 5 + Opted Out => linha ignorada sem erro.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-006: Opted Out cancela inclusive Expired e Completed
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-006', 'Opted Out cancela tasks em qualquer status incluindo Expired (6) e Completed (10)',
'Se Opted Out e task existe com status diferente de 4 e 5 (incluindo 6=Expired e 10=Completed): cancelar com task_status=4, task_forecast=0, task_eligible=N. Fechar activities abertas com activity_status=4. Registrar historico na task e por activity.',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_task_6702', 'CRITICAL', 'VALIDATED', 'MET',
'Task Expired (6) + Opted Out => cancelada (4). Task Completed (10) + Opted Out => cancelada (4). Activities abertas fechadas.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-007: Opted Out => task_eligible=N
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-007', 'Opted Out sempre grava task_eligible=N',
'Toda operacao de Opted Out (criacao ou update) deve gravar task_eligible=N explicitamente, independente do valor anterior.',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_task_6702', 'HIGH', 'VALIDATED', 'MET',
'Apos Opted Out: task_eligible=N sem excecao.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-008: Not Eligible sempre cria como Declined
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-008', 'Not Eligible sempre cria task como Declined (5), nunca ignora a linha',
'Quando Not Eligible e task nao existe: criar com task_status=5 (DECLINED), task_eligible=N, justificativa=TASK NOT ELIGIBLE BY VENDOR. A linha NUNCA e ignorada.',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_task_6702', 'HIGH', 'VALIDATED', 'MET',
'Linha Not Eligible para deal inexistente => task criada com status 5. Nao deve haver linhas Not Eligible sem task gerada.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-009: Task fechada nunca alterada por regras normais
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-009', 'Task fechada (status 4,5,6,10) nunca alterada por regras normais',
'Task com status IN (4,5,6,10) e considerada fechada. Eligible, Not Eligible, Expired nao alteram task fechada. Excecao: Opted Out pode agir sobre status 6 e 10 (mas nao sobre 4 e 5).',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_task_6702', 'CRITICAL', 'VALIDATED', 'MET',
'Eligible sobre task fechada => ignorado. Opted Out sobre task 4 ou 5 => ignorado. Opted Out sobre task 6 ou 10 => cancelar.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-010: Opted In + Cancelled + Eligible => reabrir
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-010', 'Opted In + task Cancelled (4) + Eligible: reabrir como In Progress (2)',
'Se Opted In + task status 4 (Cancelled) + Eligible: reabrir com task_status=2 (In Progress), task_opt_in_flag=1. Historico: Task reopened as In Progress because Opted In was performed. Unico cenario em que task fechada pode ser reaberta.',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_task_6702', 'HIGH', 'VALIDATED', 'MET',
'Task status 4 + Opted In + Eligible => status 2 (In Progress).',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-011: Eligible + Opted In => In Progress ao criar
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-011', 'Eligible + Opted In cria task como In Progress (2) em vez de Open (1)',
'Quando Eligible + Opted In: task criada com task_status=2 (In Progress). Sem Opted In: task_status=1 (Open). task_opt_in_flag=1 e task_start_performed gravados.',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_task_6702', 'HIGH', 'VALIDATED', 'MET',
'Task criada com Opted In ativo => status 2. Task criada sem Opted In => status 1.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-012: Update so com diferenca real
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-012', 'Atualizacao de task so executada se houver diferenca real de valor',
'_update_existing_task() compara campo a campo. Executa UPDATE e grava historico apenas se houver ao menos uma mudanca real. Updates redundantes nao geram historico.',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_task_6702', 'MEDIUM', 'VALIDATED', 'MET',
'Importacao de linha identica a task existente nao deve gerar UPDATE nem historico.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-013: Valores monetarios invalidos => NULL
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-013', 'Valores monetarios invalidos gravados como NULL sem falhar a linha',
'task_value e task_booking_amount sao validados contra DECIMAL(30,6). Se invalidos: gravar NULL, registrar em tbImportLog. A linha NAO falha por valor monetario invalido.',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_task_6702', 'MEDIUM', 'VALIDATED', 'MET',
'Valor invalido em task_value => gravar NULL + log funcional. Linha continua processada.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-014: Expired fecha task e activities
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-014', 'Expired fecha task aberta com status 6 e activities com status 6',
'Quando Expired e task existe aberta: task_status=6 (EXPIRED), task_forecast=0. Activities abertas fechadas com activity_status=6. Task inexistente com Expired: criar com task_status=6.',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_task_6702', 'HIGH', 'VALIDATED', 'MET',
'Task aberta + Expired => status 6. Activities abertas => activity_status=6.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-015: Dependencia 5890 -> 6702
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-015', 'Activities importadas APOS tasks pai (5890 depende do 6702)',
'O importador 5890 (activities) depende das tasks pai ja existirem no banco. Tasks devem ser importadas pelo 6702 antes. Activities sem task pai vao ao arquivo de falhas com erro No TASK ID.',
'INTEGRATION', 'DOCUMENT|bridge-adoption|pxp_import_activity_5890', 'CRITICAL', 'VALIDATED', 'MET',
'Activity sem task pai no banco => arquivo de falhas (No TASK ID). Sequencia: 6702 primeiro, 5890 depois.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-016: Cutoff FY
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-016', 'Cutoff FY: activities com expiracao <= FY_atual-2 descartadas silenciosamente',
'Activities com Activity Expiration Date em FY <= FY_atual-2 sao descartadas silenciosamente. FY Cisco inicia em agosto (Ago/2026=FY2027). Activities de FY_atual-1 geram erro no arquivo de falhas.',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_activity_5890', 'HIGH', 'VALIDATED', 'MET',
'Activity em FY2025 com FY atual=FY2027 => descartada silenciosamente. Activity em FY2026 => erro no arquivo de falhas.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-017: Activity nao retrocede status
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-017', 'Activity nao retrocede status',
'O status de uma activity so avanca, nunca retrocede. Se status atual > status do Stage importado: manter status atual. Status: 1=Open, 2=In Progress, 4=Cancelled, 5=Declined, 6=Expired, 7=Submitted, 8=Resubmitted, 10=Closed.',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_activity_5890', 'CRITICAL', 'VALIDATED', 'MET',
'Activity status 7 (Submitted) + Stage Activity - Approved (status 2) => manter status 7.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-018: Activity fechada nao alterada pelo Stage
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-018', 'Activity fechada (4,5,6,10) nao alterada pelo Stage, exceto Claim Approval Date',
'Activity com status IN (4,5,6,10) nao e alterada pelos mapeamentos de Stage. Excecao: Claim Approval Date atualiza datas de aprovacao mesmo em status 10 (Closed).',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_activity_5890', 'HIGH', 'VALIDATED', 'MET',
'Activity Closed (10) + Stage Activity - Approved => manter status 10. Activity Closed + Claim Approval Date => atualizar datas.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-019: Claim Approval Date atualiza independente do status
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-019', 'Claim Approval Date atualiza campos de aprovacao independente do status atual',
'Quando Claim Approval Date esta preenchida: atualizar activity_end_performed, activity_end_fy, activity_approval_fy, activity_approval_date, activity_approved=1, activity_completed=1. Aplicado mesmo com status 10 (Closed).',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_activity_5890', 'HIGH', 'VALIDATED', 'MET',
'Activity Closed (10) + Claim Approval Date preenchida => atualizar datas, activity_approved=1.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-020: Chave primaria logica activity = WS
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-020', 'Chave primaria logica da activity e o WS (Activity Id)',
'Busca de activity existente usa primariamente activity_ws (coluna Activity Id). Fallback: activity_track+sub_track+deal_id+name+task_id. Fallback que encontrar candidato com activity_ws igual ao task_ws da task pai: rejeitar (registro invalido).',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_activity_5890', 'HIGH', 'VALIDATED', 'MET',
'Busca por WS e primaria. Fallback apenas quando WS nao encontra resultado.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-021: Datas task pai sincronizadas
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-021', 'Datas da task pai sincronizadas com o intervalo mais amplo das activities',
'Apos processar cada activity: se activity_start_performed < task_start_performed => atualizar task_start_performed. Se activity_end_performed > task_end_performed => atualizar task_end_performed. Task deve sempre refletir o intervalo mais amplo.',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_activity_5890', 'HIGH', 'VALIDATED', 'MET',
'Task com activities Jan-Jun e Jul-Dec => task deve ter start=Jan e end=Dec.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-022: Prioridade LCI 1.0 vs 2.0
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-022', 'Prioridade de busca task pai: LCI 1.0 vs 2.0 por Track e Activity Group',
'Track Use Incentive ou Adopt Incentive => busca por tipo [21,22] (LCI 1.0 primeiro). Activity Group=LCI2.0 => busca por tipo [22] apenas. Demais casos => busca por tipo [22,21] (LCI 2.0 primeiro).',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_activity_5890', 'MEDIUM', 'VALIDATED', 'MET',
'Track Use Incentive => priorizar tipo 21. Activity Group LCI2.0 => somente tipo 22.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-023: Deduplicacao na mesma execucao
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-023', 'Deduplicacao na mesma execucao: mesma combinacao processada apenas uma vez',
'Quando a mesma combinacao (Activity Id+Track+Sub-Track+Deal ID+Activity Type) aparece mais de uma vez no mesmo Excel: processar apenas a primeira ocorrencia. Duplicatas sao contadas como ignored.',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_activity_5890', 'MEDIUM', 'VALIDATED', 'MET',
'Dois registros identicos no mesmo Excel => processar o primeiro, ignorar o segundo.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-024: Activity - Approved so evolui de 1 para 2
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-024', 'Activity - Approved so evolui status de 1 para 2, nao altera se status ja > 1',
'Stage Activity - Approved mapeia para activity_status=2 (In Progress). Se activity ja tem status > 1: manter status atual. Apenas transicao 1 (Open) => 2 (In Progress) e permitida por este Stage.',
'BUSINESS', 'DOCUMENT|bridge-adoption|pxp_import_activity_5890', 'MEDIUM', 'VALIDATED', 'MET',
'Activity status 3 + Stage Activity - Approved => manter status 3.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-025: Confirmacao pos-criacao obrigatoria
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-025', 'Confirmacao pos-criacao obrigatoria para toda task criada',
'Apos _create_task_from_payload(), executar _confirm_created_task(): buscar task pelo task_id retornado, confirmar que existe no banco e task_ws corresponde ao WS esperado. Falha => linha tratada como erro, registrar em tbImportLog.',
'INTEGRATION', 'DOCUMENT|bridge-adoption|pxp_import_task_6702', 'HIGH', 'VALIDATED', 'MET',
'Task criada mas nao consultavel no banco => linha tratada como erro.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-026: Arquivo de entrada modificado durante importacao
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-026', 'Arquivo de entrada modificado durante importacao: guardar copia antes',
'O importador remove do arquivo XLSX cada linha processada (ws.delete_rows()). Arquivo salvo apos cada chunk. Em caso de interrupcao o arquivo original ja foi modificado. Sempre guardar copia antes de executar.',
'INTEGRATION', 'DOCUMENT|bridge-adoption|pxp_import_task_6702', 'MEDIUM', 'VALIDATED', 'MET',
'Executar importador sem copia do original => risco de perda de dados em caso de erro.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-027: Arquivo de falhas criado apenas se houver erro
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-027', 'Arquivo de falhas criado apenas se houver ao menos uma linha com erro',
'O arquivo _failed_rows.xlsx so e gerado se houver ao menos uma linha que nao pudo ser processada. Nao criar arquivo vazio.',
'INTEGRATION', 'DOCUMENT|bridge-adoption|pxp_import_task_6702', 'MEDIUM', 'VALIDATED', 'MET',
'Importacao 100% bem-sucedida => nenhum arquivo de falhas criado.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- BR-028: Processamento por chunks
INSERT INTO requirements (product_id, requirement_code, requirement_title, requirement_description, requirement_type, requirement_source, priority, lifecycle_status, fulfillment_status, acceptance_definition, requirement_owner, created_at, updated_at, is_deleted)
VALUES (1, 'BR-028', 'Processamento por chunks de 1000 linhas com remocao incremental',
'Importadores processam o arquivo em chunks de 1000 linhas. Cada linha e removida do arquivo original apos processamento. Permite retomada parcial em caso de interrupcao.',
'INTEGRATION', 'DOCUMENT|bridge-adoption|pxp_import_task_6702', 'LOW', 'VALIDATED', 'MET',
'Interrupcao no meio do processamento => apenas as linhas restantes no arquivo precisam ser reprocessadas.',
'Bridge Adoption / NTT 360 Team', NOW(), NOW(), FALSE)
ON CONFLICT (product_id, requirement_code) DO NOTHING;

-- ── 4. Link requirements to CISCO-LCI domain with subdomains ─────────────────

-- Tasks subdomain (BR-001 to BR-014)
INSERT INTO requirement_domain_links (requirement_id, domain_id, subdomain_id, created_at)
SELECT r.id, d.id, s.id, NOW()
FROM requirements r
CROSS JOIN business_domains d
JOIN business_subdomains s ON s.domain_id = d.id AND s.subdomain_code = 'CISCO-LCI-TASK'
WHERE d.domain_code = 'CISCO-LCI'
  AND r.requirement_code IN ('BR-001','BR-002','BR-003','BR-004','BR-005','BR-006','BR-007',
                              'BR-008','BR-009','BR-010','BR-011','BR-012','BR-013','BR-014')
  AND r.product_id = 1
ON CONFLICT (requirement_id, domain_id) DO NOTHING;

-- Activities subdomain (BR-015 to BR-024)
INSERT INTO requirement_domain_links (requirement_id, domain_id, subdomain_id, created_at)
SELECT r.id, d.id, s.id, NOW()
FROM requirements r
CROSS JOIN business_domains d
JOIN business_subdomains s ON s.domain_id = d.id AND s.subdomain_code = 'CISCO-LCI-ACT'
WHERE d.domain_code = 'CISCO-LCI'
  AND r.requirement_code IN ('BR-015','BR-016','BR-017','BR-018','BR-019','BR-020',
                              'BR-021','BR-022','BR-023','BR-024')
  AND r.product_id = 1
ON CONFLICT (requirement_id, domain_id) DO NOTHING;

-- Import subdomain (BR-025 to BR-028)
INSERT INTO requirement_domain_links (requirement_id, domain_id, subdomain_id, created_at)
SELECT r.id, d.id, s.id, NOW()
FROM requirements r
CROSS JOIN business_domains d
JOIN business_subdomains s ON s.domain_id = d.id AND s.subdomain_code = 'CISCO-LCI-IMPORT'
WHERE d.domain_code = 'CISCO-LCI'
  AND r.requirement_code IN ('BR-025','BR-026','BR-027','BR-028')
  AND r.product_id = 1
ON CONFLICT (requirement_id, domain_id) DO NOTHING;

COMMIT;

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT 'Domain:' AS type, domain_code AS code, domain_name AS name FROM business_domains WHERE domain_code='CISCO-LCI'
UNION ALL
SELECT 'Subdomain:', subdomain_code, subdomain_name FROM business_subdomains WHERE subdomain_code LIKE 'CISCO-LCI-%'
UNION ALL
SELECT 'Req: ' || r.requirement_code, r.requirement_code, r.requirement_title
FROM requirements r
WHERE r.product_id = 1 AND r.requirement_code LIKE 'BR-%'
ORDER BY 1;
