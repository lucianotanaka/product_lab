-- DROP SCHEMA public;

CREATE SCHEMA public AUTHORIZATION pg_database_owner;

COMMENT ON SCHEMA public IS 'standard public schema';

-- DROP TYPE public.actionitemstatus;

CREATE TYPE public.actionitemstatus AS ENUM (
	'pending',
	'in_progress',
	'done',
	'cancelled');

-- DROP TYPE public.assessmentlevel;

CREATE TYPE public.assessmentlevel AS ENUM (
	'low',
	'medium',
	'high',
	'unknown');

-- DROP TYPE public.assumption_status;

CREATE TYPE public.assumption_status AS ENUM (
	'unvalidated',
	'in_progress',
	'validated',
	'invalidated');

-- DROP TYPE public.assumption_type;

CREATE TYPE public.assumption_type AS ENUM (
	'desirability',
	'viability',
	'usability',
	'value',
	'data',
	'technology',
	'process');

-- DROP TYPE public.assumptionstatus;

CREATE TYPE public.assumptionstatus AS ENUM (
	'unvalidated',
	'in_progress',
	'validated',
	'invalidated');

-- DROP TYPE public.assumptiontype;

CREATE TYPE public.assumptiontype AS ENUM (
	'desirability',
	'viability',
	'usability',
	'value',
	'data',
	'technology',
	'process');

-- DROP TYPE public.businesscasestatus;

CREATE TYPE public.businesscasestatus AS ENUM (
	'draft',
	'in_review',
	'approved',
	'rejected');

-- DROP TYPE public.charterstatus;

CREATE TYPE public.charterstatus AS ENUM (
	'draft',
	'approved',
	'in_execution',
	'on_hold',
	'closed');

-- DROP TYPE public.confidence_level;

CREATE TYPE public.confidence_level AS ENUM (
	'high',
	'medium',
	'low');

-- DROP TYPE public.confidencelevel;

CREATE TYPE public.confidencelevel AS ENUM (
	'high',
	'medium',
	'low');

-- DROP TYPE public.decisionstatus;

CREATE TYPE public.decisionstatus AS ENUM (
	'proposed',
	'accepted',
	'deprecated',
	'superseded');

-- DROP TYPE public.experiment_method;

CREATE TYPE public.experiment_method AS ENUM (
	'prototype',
	'interview',
	'usability_test',
	'mvp',
	'pilot',
	'data_analysis',
	'ab_test',
	'technical_validation');

-- DROP TYPE public.experiment_status;

CREATE TYPE public.experiment_status AS ENUM (
	'planned',
	'in_progress',
	'completed',
	'cancelled');

-- DROP TYPE public.experimentmethod;

CREATE TYPE public.experimentmethod AS ENUM (
	'prototype',
	'interview',
	'usability_test',
	'mvp',
	'pilot',
	'data_analysis',
	'ab_test',
	'technical_validation');

-- DROP TYPE public.experimentstatus;

CREATE TYPE public.experimentstatus AS ENUM (
	'planned',
	'in_progress',
	'completed',
	'cancelled');

-- DROP TYPE public.followupactiontype;

CREATE TYPE public.followupactiontype AS ENUM (
	'schedule_meeting',
	'request_info',
	'send_material',
	'review_answer',
	'other');

-- DROP TYPE public.followupstatus;

CREATE TYPE public.followupstatus AS ENUM (
	'pending',
	'done',
	'cancelled');

-- DROP TYPE public.impact_level;

CREATE TYPE public.impact_level AS ENUM (
	'high',
	'medium',
	'low');

-- DROP TYPE public.impactlevel;

CREATE TYPE public.impactlevel AS ENUM (
	'high',
	'medium',
	'low');

-- DROP TYPE public.integration_provider;

CREATE TYPE public.integration_provider AS ENUM (
	'azure_devops',
	'openai',
	'anthropic',
	'azure_openai',
	'jira',
	'github',
	'gitlab',
	'slack',
	'teams',
	'webhook',
	'custom',
	'axet_flows');

COMMENT ON TYPE public.integration_provider IS 'Provedores de integração suportados pelo Product Lab.';
-- DROP TYPE public.integration_scope;

CREATE TYPE public.integration_scope AS ENUM (
	'global',
	'company',
	'product');

COMMENT ON TYPE public.integration_scope IS 'Escopo de visibilidade/uso de uma conexão de integração.';
-- DROP TYPE public.job_type;

CREATE TYPE public.job_type AS ENUM (
	'principal',
	'secondary');

-- DROP TYPE public.jobtype;

CREATE TYPE public.jobtype AS ENUM (
	'principal',
	'secondary');

-- DROP TYPE public.meetingentitytype;

CREATE TYPE public.meetingentitytype AS ENUM (
	'discovery_opportunity',
	'discovery_research',
	'roadmap_item',
	'backlog_item',
	'risk',
	'requirement',
	'decision',
	'process',
	'business_domain',
	'followup',
	'other');

-- DROP TYPE public.meetingrelationtype;

CREATE TYPE public.meetingrelationtype AS ENUM (
	'primary',
	'discussed',
	'decided',
	'impacted',
	'created_from',
	'related');

-- DROP TYPE public.meetingstatus;

CREATE TYPE public.meetingstatus AS ENUM (
	'scheduled',
	'in_progress',
	'completed',
	'cancelled');

-- DROP TYPE public.meetingtype;

CREATE TYPE public.meetingtype AS ENUM (
	'discovery',
	'review',
	'planning',
	'retrospective',
	'stakeholder',
	'requirements',
	'follow_up',
	'other');

-- DROP TYPE public.metric_type;

CREATE TYPE public.metric_type AS ENUM (
	'adoption',
	'efficiency',
	'quality',
	'satisfaction',
	'business_result',
	'data_reliability');

-- DROP TYPE public.metrictype;

CREATE TYPE public.metrictype AS ENUM (
	'adoption',
	'efficiency',
	'quality',
	'satisfaction',
	'business_result',
	'data_reliability');

-- DROP TYPE public.moscowvalue;

CREATE TYPE public.moscowvalue AS ENUM (
	'must',
	'should',
	'could',
	'wont');

-- DROP TYPE public.opportunity_status;

CREATE TYPE public.opportunity_status AS ENUM (
	'identified',
	'under_investigation',
	'validated',
	'paused',
	'discarded',
	'forwarded_to_roadmap');

-- DROP TYPE public.opportunityassessmentrecommendation;

CREATE TYPE public.opportunityassessmentrecommendation AS ENUM (
	'discovery_required',
	'ready_for_evaluation',
	'more_information_required',
	'hold',
	'merge',
	'do_not_pursue');

-- DROP TYPE public.opportunityassessmenttype;

CREATE TYPE public.opportunityassessmenttype AS ENUM (
	'initial',
	'post_discovery_review',
	'reassessment');

-- DROP TYPE public.opportunityjourneystage;

CREATE TYPE public.opportunityjourneystage AS ENUM (
	'capture',
	'assess',
	'discover',
	'evaluate',
	'decide');

-- DROP TYPE public.opportunitylifecyclestatus;

CREATE TYPE public.opportunitylifecyclestatus AS ENUM (
	'active',
	'on_hold',
	'closed');

-- DROP TYPE public.opportunitysourcetype;

CREATE TYPE public.opportunitysourcetype AS ENUM (
	'stakeholder_request',
	'customer_feedback',
	'data_analysis',
	'market_research',
	'consultant_discovery',
	'external_demand_system',
	'workshop',
	'regulatory_requirement',
	'internal_analysis',
	'other');

-- DROP TYPE public.opportunitystatus;

CREATE TYPE public.opportunitystatus AS ENUM (
	'identified',
	'under_investigation',
	'validated',
	'paused',
	'discarded',
	'forwarded_to_roadmap');

-- DROP TYPE public.prioritymethod;

CREATE TYPE public.prioritymethod AS ENUM (
	'RICE',
	'ICE',
	'MOSCOW',
	'WSJF',
	'EISENHOWER');

-- DROP TYPE public.productstatus;

CREATE TYPE public.productstatus AS ENUM (
	'active',
	'draft',
	'archived');

-- DROP TYPE public.reliability_level;

CREATE TYPE public.reliability_level AS ENUM (
	'high',
	'medium',
	'low');

-- DROP TYPE public.reliabilitylevel;

CREATE TYPE public.reliabilitylevel AS ENUM (
	'high',
	'medium',
	'low');

-- DROP TYPE public.research_type;

CREATE TYPE public.research_type AS ENUM (
	'interview',
	'meeting',
	'observation',
	'survey',
	'quantitative',
	'feedback',
	'document',
	'evidence');

-- DROP TYPE public.researchstatus;

CREATE TYPE public.researchstatus AS ENUM (
	'planned',
	'in_progress',
	'completed',
	'cancelled');

-- DROP TYPE public.researchtype;

CREATE TYPE public.researchtype AS ENUM (
	'interview',
	'meeting',
	'observation',
	'survey',
	'quantitative',
	'feedback',
	'document',
	'evidence');

-- DROP TYPE public.riskstatus;

CREATE TYPE public.riskstatus AS ENUM (
	'identified',
	'mitigated',
	'accepted',
	'closed');

-- DROP TYPE public.roadmapexecutivestatus;

CREATE TYPE public.roadmapexecutivestatus AS ENUM (
	'not_started',
	'on_track',
	'attention',
	'blocked',
	'waiting_owner',
	'completed');

-- DROP TYPE public.roadmapitemstatus;

CREATE TYPE public.roadmapitemstatus AS ENUM (
	'planned',
	'in_progress',
	'done',
	'cancelled');

-- DROP TYPE public.roadmapitemtype;

CREATE TYPE public.roadmapitemtype AS ENUM (
	'epic',
	'feature',
	'milestone');

-- DROP TYPE public.solution_complexity;

CREATE TYPE public.solution_complexity AS ENUM (
	'low',
	'medium',
	'high',
	'very_high');

-- DROP TYPE public.solution_status;

CREATE TYPE public.solution_status AS ENUM (
	'idea',
	'under_evaluation',
	'selected',
	'discarded');

-- DROP TYPE public.solutioncomplexity;

CREATE TYPE public.solutioncomplexity AS ENUM (
	'low',
	'medium',
	'high',
	'very_high');

-- DROP TYPE public.solutionstatus;

CREATE TYPE public.solutionstatus AS ENUM (
	'idea',
	'under_evaluation',
	'selected',
	'discarded');

-- DROP TYPE public.summarytype;

CREATE TYPE public.summarytype AS ENUM (
	'human',
	'ai',
	'executive',
	'bullets',
	'minutes');

-- DROP TYPE public.transcriptsourcetype;

CREATE TYPE public.transcriptsourcetype AS ENUM (
	'paste',
	'upload',
	'integration',
	'manual');

-- DROP TYPE public.uncertainty_level;

CREATE TYPE public.uncertainty_level AS ENUM (
	'high',
	'medium',
	'low');

-- DROP TYPE public.uncertaintylevel;

CREATE TYPE public.uncertaintylevel AS ENUM (
	'high',
	'medium',
	'low');

-- DROP TYPE public.vpctype;

CREATE TYPE public.vpctype AS ENUM (
	'job',
	'pain',
	'gain',
	'product',
	'pain_reliever',
	'gain_creator');

-- DROP SEQUENCE public.action_items_action_id_seq;

CREATE SEQUENCE public.action_items_action_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.agent_executions_agent_execution_id_seq;

CREATE SEQUENCE public.agent_executions_agent_execution_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.audience_members_audience_member_id_seq;

CREATE SEQUENCE public.audience_members_audience_member_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.audiences_audience_id_seq;

CREATE SEQUENCE public.audiences_audience_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.backlog_item_links_link_id_seq;

CREATE SEQUENCE public.backlog_item_links_link_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.backlog_item_notes_note_id_seq;

CREATE SEQUENCE public.backlog_item_notes_note_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.backlog_item_suggestions_suggestion_id_seq;

CREATE SEQUENCE public.backlog_item_suggestions_suggestion_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.backlog_item_types_item_type_id_seq;

CREATE SEQUENCE public.backlog_item_types_item_type_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.backlog_items_item_id_seq;

CREATE SEQUENCE public.backlog_items_item_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.business_areas_id_seq;

CREATE SEQUENCE public.business_areas_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.business_domains_id_seq;

CREATE SEQUENCE public.business_domains_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.business_subdomains_id_seq;

CREATE SEQUENCE public.business_subdomains_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.communication_audiences_communication_audience_id_seq;

CREATE SEQUENCE public.communication_audiences_communication_audience_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.communication_links_communication_link_id_seq;

CREATE SEQUENCE public.communication_links_communication_link_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.communication_schedules_communication_schedule_id_seq;

CREATE SEQUENCE public.communication_schedules_communication_schedule_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.communication_templates_communication_template_id_seq;

CREATE SEQUENCE public.communication_templates_communication_template_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.communication_types_communication_type_id_seq;

CREATE SEQUENCE public.communication_types_communication_type_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.communications_communication_id_seq;

CREATE SEQUENCE public.communications_communication_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.companies_id_seq;

CREATE SEQUENCE public.companies_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.company_area_members_id_seq;

CREATE SEQUENCE public.company_area_members_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.company_business_areas_id_seq;

CREATE SEQUENCE public.company_business_areas_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.decision_journal_decision_id_seq;

CREATE SEQUENCE public.decision_journal_decision_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.delivery_channels_delivery_channel_id_seq;

CREATE SEQUENCE public.delivery_channels_delivery_channel_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.delivery_recipients_delivery_recipient_id_seq;

CREATE SEQUENCE public.delivery_recipients_delivery_recipient_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.execution_evidences_execution_evidence_id_seq;

CREATE SEQUENCE public.execution_evidences_execution_evidence_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.knowledge_article_versions_version_id_seq;

CREATE SEQUENCE public.knowledge_article_versions_version_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.knowledge_articles_article_id_seq;

CREATE SEQUENCE public.knowledge_articles_article_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.knowledge_links_link_id_seq;

CREATE SEQUENCE public.knowledge_links_link_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.knowledge_references_reference_id_seq;

CREATE SEQUENCE public.knowledge_references_reference_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.knowledge_tags_tag_id_seq;

CREATE SEQUENCE public.knowledge_tags_tag_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.prioritization_criteria_criteria_id_seq;

CREATE SEQUENCE public.prioritization_criteria_criteria_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.prioritization_history_priority_id_seq;

CREATE SEQUENCE public.prioritization_history_priority_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.prioritization_scores_score_id_seq;

CREATE SEQUENCE public.prioritization_scores_score_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.process_edges_id_seq;

CREATE SEQUENCE public.process_edges_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.process_groups_id_seq;

CREATE SEQUENCE public.process_groups_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.process_node_relations_id_seq;

CREATE SEQUENCE public.process_node_relations_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.process_nodes_id_seq;

CREATE SEQUENCE public.process_nodes_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.process_process_id_seq;

CREATE SEQUENCE public.process_process_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.process_tools_id_seq;

CREATE SEQUENCE public.process_tools_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.processedge_edge_id_seq;

CREATE SEQUENCE public.processedge_edge_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.processes_id_seq;

CREATE SEQUENCE public.processes_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.processnode_node_id_seq;

CREATE SEQUENCE public.processnode_node_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.processnoderelation_relation_id_seq;

CREATE SEQUENCE public.processnoderelation_relation_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.product_capabilities_capability_id_seq;

CREATE SEQUENCE public.product_capabilities_capability_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.product_features_feature_id_seq;

CREATE SEQUENCE public.product_features_feature_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.product_impacts_impact_id_seq;

CREATE SEQUENCE public.product_impacts_impact_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.products_product_id_seq;

CREATE SEQUENCE public.products_product_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.publication_audiences_publication_audience_id_seq;

CREATE SEQUENCE public.publication_audiences_publication_audience_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.publication_deliveries_publication_delivery_id_seq;

CREATE SEQUENCE public.publication_deliveries_publication_delivery_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.publication_presentations_presentation_id_seq;

CREATE SEQUENCE public.publication_presentations_presentation_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.publication_reviews_publication_review_id_seq;

CREATE SEQUENCE public.publication_reviews_publication_review_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.publication_versions_publication_version_id_seq;

CREATE SEQUENCE public.publication_versions_publication_version_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.publications_publication_id_seq;

CREATE SEQUENCE public.publications_publication_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.raci_assignment_history_id_seq;

CREATE SEQUENCE public.raci_assignment_history_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.raci_assignments_id_seq;

CREATE SEQUENCE public.raci_assignments_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.requirement_change_requests_id_seq;

CREATE SEQUENCE public.requirement_change_requests_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.requirement_domain_links_id_seq;

CREATE SEQUENCE public.requirement_domain_links_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.requirement_features_id_seq;

CREATE SEQUENCE public.requirement_features_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.requirement_history_id_seq;

CREATE SEQUENCE public.requirement_history_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.requirement_relations_id_seq;

CREATE SEQUENCE public.requirement_relations_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.requirement_requirement_id_seq;

CREATE SEQUENCE public.requirement_requirement_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.requirement_user_stories_id_seq;

CREATE SEQUENCE public.requirement_user_stories_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.requirement_verifications_id_seq;

CREATE SEQUENCE public.requirement_verifications_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.requirementfeature_requirement_feature_id_seq;

CREATE SEQUENCE public.requirementfeature_requirement_feature_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.requirementrelation_relation_id_seq;

CREATE SEQUENCE public.requirementrelation_relation_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.requirements_id_seq;

CREATE SEQUENCE public.requirements_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.requirementuserstory_requirement_userstory_id_seq;

CREATE SEQUENCE public.requirementuserstory_requirement_userstory_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.requirementverification_verification_id_seq;

CREATE SEQUENCE public.requirementverification_verification_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.risk_links_id_seq;

CREATE SEQUENCE public.risk_links_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.roadmap_backlog_links_id_seq;

CREATE SEQUENCE public.roadmap_backlog_links_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.roadmap_item_related_business_areas_id_seq;

CREATE SEQUENCE public.roadmap_item_related_business_areas_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.sections_section_id_seq;

CREATE SEQUENCE public.sections_section_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.sprints_sprint_id_seq;

CREATE SEQUENCE public.sprints_sprint_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.stakeholder_interactions_interaction_id_seq;

CREATE SEQUENCE public.stakeholder_interactions_interaction_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.stakeholder_products_id_seq;

CREATE SEQUENCE public.stakeholder_products_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.stakeholders_stakeholder_id_seq;

CREATE SEQUENCE public.stakeholders_stakeholder_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.team_member_products_id_seq;

CREATE SEQUENCE public.team_member_products_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.team_members_member_id_seq;

CREATE SEQUENCE public.team_members_member_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.template_sections_template_section_id_seq;

CREATE SEQUENCE public.template_sections_template_section_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.user_companies_id_seq;

CREATE SEQUENCE public.user_companies_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.users_user_id_seq;

CREATE SEQUENCE public.users_user_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.wsjf_assessment_answers_answer_id_seq;

CREATE SEQUENCE public.wsjf_assessment_answers_answer_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.wsjf_assessment_history_history_id_seq;

CREATE SEQUENCE public.wsjf_assessment_history_history_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.wsjf_assessments_assessment_id_seq;

CREATE SEQUENCE public.wsjf_assessments_assessment_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.wsjf_question_options_option_id_seq;

CREATE SEQUENCE public.wsjf_question_options_option_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.wsjf_template_dimensions_dimension_id_seq;

CREATE SEQUENCE public.wsjf_template_dimensions_dimension_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.wsjf_template_questions_question_id_seq;

CREATE SEQUENCE public.wsjf_template_questions_question_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.wsjf_templates_template_id_seq;

CREATE SEQUENCE public.wsjf_templates_template_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;-- public.attachments definition

-- Drop table

-- DROP TABLE public.attachments;

CREATE TABLE public.attachments (
	id varchar(36) NOT NULL,
	entity_type varchar(50) NOT NULL,
	entity_id varchar(36) NOT NULL,
	file_name varchar(300) NOT NULL,
	mime_type varchar(120) DEFAULT 'application/octet-stream'::character varying NOT NULL,
	file_size int4 DEFAULT 0 NOT NULL,
	file_data bytea NOT NULL,
	uploaded_by varchar(200) NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT attachments_created_at_not_null NOT NULL created_at,
	CONSTRAINT attachments_entity_id_not_null NOT NULL entity_id,
	CONSTRAINT attachments_entity_type_not_null NOT NULL entity_type,
	CONSTRAINT attachments_file_data_not_null NOT NULL file_data,
	CONSTRAINT attachments_file_name_not_null NOT NULL file_name,
	CONSTRAINT attachments_file_size_not_null NOT NULL file_size,
	CONSTRAINT attachments_id_not_null NOT NULL id,
	CONSTRAINT attachments_mime_type_not_null NOT NULL mime_type,
	CONSTRAINT attachments_pkey PRIMARY KEY (id)
);
CREATE INDEX ix_attachments_created ON public.attachments USING btree (created_at DESC);
CREATE INDEX ix_attachments_entity ON public.attachments USING btree (entity_type, entity_id);


-- public.audience_members definition

-- Drop table

-- DROP TABLE public.audience_members;

CREATE TABLE public.audience_members (
	audience_member_id serial4 NOT NULL,
	audience_id int4 NOT NULL,
	stakeholder_id int4 NOT NULL,
	notes text NULL,
	created_at timestamp NOT NULL,
	CONSTRAINT audience_members_audience_id_not_null NOT NULL audience_id,
	CONSTRAINT audience_members_audience_member_id_not_null NOT NULL audience_member_id,
	CONSTRAINT audience_members_created_at_not_null NOT NULL created_at,
	CONSTRAINT audience_members_pkey PRIMARY KEY (audience_member_id),
	CONSTRAINT audience_members_stakeholder_id_not_null NOT NULL stakeholder_id
);
CREATE INDEX idx_audience_members_audience ON public.audience_members USING btree (audience_id);
CREATE INDEX idx_audience_members_stakeholder ON public.audience_members USING btree (stakeholder_id);


-- public.backlog_item_types definition

-- Drop table

-- DROP TABLE public.backlog_item_types;

CREATE TABLE public.backlog_item_types (
	item_type_id serial4 NOT NULL,
	"name" varchar(50) NOT NULL,
	description text NULL,
	display_order int4 DEFAULT 0 NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT backlog_item_types_display_order_not_null NOT NULL display_order,
	CONSTRAINT backlog_item_types_is_active_not_null NOT NULL is_active,
	CONSTRAINT backlog_item_types_item_type_id_not_null NOT NULL item_type_id,
	CONSTRAINT backlog_item_types_name_key UNIQUE (name),
	CONSTRAINT backlog_item_types_name_not_null NOT NULL name,
	CONSTRAINT backlog_item_types_pkey PRIMARY KEY (item_type_id)
);


-- public.backlog_items definition

-- Drop table

-- DROP TABLE public.backlog_items;

CREATE TABLE public.backlog_items (
	item_id serial4 NOT NULL,
	feature_id int4 NULL,
	ado_id varchar(50) NULL,
	title varchar(250) NULL,
	description text NULL,
	current_status varchar(30) NULL,
	product_id int4 NULL,
	sprint_id int4 NULL,
	priority int4 NULL,
	business_value text NULL,
	story_points int4 NULL,
	wsjf_business_value int4 NULL,
	wsjf_time_criticality int4 NULL,
	wsjf_risk_reduction int4 NULL,
	wsjf_job_size int4 NULL,
	wsjf_score numeric(6, 2) NULL,
	acceptance_criteria text NULL,
	completed_at timestamp NULL,
	item_type_id int4 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	requester_stakeholder_id int4 NULL,
	definition_of_done text NULL,
	assigned_to_member_id int4 NULL,
	business_rules text NULL,
	start_sprint_id int4 NULL,
	end_sprint_id int4 NULL,
	discovery_opportunity_id varchar(36) NULL,
	ado_work_item_type varchar(100) NULL,
	enabler_type varchar(100) NULL,
	management_owner_member_id int4 NULL,
	CONSTRAINT backlog_items_item_id_not_null NOT NULL item_id,
	CONSTRAINT backlog_items_pkey PRIMARY KEY (item_id)
);
CREATE INDEX idx_backlog_assigned ON public.backlog_items USING btree (assigned_to_member_id);
CREATE INDEX idx_backlog_items_discovery_opportunity ON public.backlog_items USING btree (discovery_opportunity_id);
CREATE INDEX idx_backlog_management_owner ON public.backlog_items USING btree (management_owner_member_id);


-- public.business_domains definition

-- Drop table

-- DROP TABLE public.business_domains;

CREATE TABLE public.business_domains (
	id serial4 NOT NULL,
	domain_code varchar(50) NOT NULL,
	domain_name varchar(200) NOT NULL,
	description text NULL,
	"owner" varchar(200) NULL,
	is_active bool NOT NULL,
	display_order int4 NOT NULL,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL,
	business_objective text NULL,
	scope_in text NULL,
	scope_out text NULL,
	business_value text NULL,
	document_status varchar(30) DEFAULT 'DRAFT'::character varying NOT NULL,
	"version" varchar(30) DEFAULT '1.0'::character varying NOT NULL,
	CONSTRAINT business_domains_created_at_not_null NOT NULL created_at,
	CONSTRAINT business_domains_display_order_not_null NOT NULL display_order,
	CONSTRAINT business_domains_document_status_not_null NOT NULL document_status,
	CONSTRAINT business_domains_domain_code_key UNIQUE (domain_code),
	CONSTRAINT business_domains_domain_code_not_null NOT NULL domain_code,
	CONSTRAINT business_domains_domain_name_not_null NOT NULL domain_name,
	CONSTRAINT business_domains_id_not_null NOT NULL id,
	CONSTRAINT business_domains_is_active_not_null NOT NULL is_active,
	CONSTRAINT business_domains_pkey PRIMARY KEY (id),
	CONSTRAINT business_domains_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT business_domains_version_not_null NOT NULL version
);
CREATE INDEX idx_bd_active ON public.business_domains USING btree (is_active);
CREATE INDEX idx_bd_code ON public.business_domains USING btree (domain_code);


-- public.communication_types definition

-- Drop table

-- DROP TABLE public.communication_types;

CREATE TABLE public.communication_types (
	communication_type_id int4 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	"name" varchar(120) NOT NULL,
	description text NULL,
	default_format varchar(50) NULL, -- Formato padr??o sugerido, como Magazine, Report, Minutes ou Release Notes.
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT communication_types_communication_type_id_not_null NOT NULL communication_type_id,
	CONSTRAINT communication_types_created_at_not_null NOT NULL created_at,
	CONSTRAINT communication_types_is_active_not_null NOT NULL is_active,
	CONSTRAINT communication_types_name_not_null NOT NULL name,
	CONSTRAINT communication_types_pkey PRIMARY KEY (communication_type_id),
	CONSTRAINT communication_types_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT uq_communication_types_name UNIQUE (name)
);
COMMENT ON TABLE public.communication_types IS 'Tipos de comunica????o suportados pelo Product Lab.';

-- Column comments

COMMENT ON COLUMN public.communication_types.default_format IS 'Formato padr??o sugerido, como Magazine, Report, Minutes ou Release Notes.';


-- public.companies definition

-- Drop table

-- DROP TABLE public.companies;

CREATE TABLE public.companies (
	id serial4 NOT NULL,
	company_name varchar(200) NOT NULL,
	company_type varchar(50) DEFAULT 'CLIENT'::character varying NULL,
	cnpj varchar(20) NULL,
	website varchar(200) NULL,
	country varchar(100) NULL,
	is_active bool DEFAULT true NOT NULL,
	notes text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	fiscal_year_start_month int2 DEFAULT 1 NOT NULL,
	fiscal_year_label varchar(30) NULL,
	planning_horizon_quarters int2 DEFAULT 4 NOT NULL,
	CONSTRAINT chk_companies_fiscal_year_start_month CHECK (((fiscal_year_start_month >= 1) AND (fiscal_year_start_month <= 12))),
	CONSTRAINT companies_company_name_not_null NOT NULL company_name,
	CONSTRAINT companies_created_at_not_null NOT NULL created_at,
	CONSTRAINT companies_fiscal_year_start_month_not_null NOT NULL fiscal_year_start_month,
	CONSTRAINT companies_id_not_null NOT NULL id,
	CONSTRAINT companies_is_active_not_null NOT NULL is_active,
	CONSTRAINT companies_pkey PRIMARY KEY (id),
	CONSTRAINT companies_planning_horizon_quarters_not_null NOT NULL planning_horizon_quarters,
	CONSTRAINT companies_updated_at_not_null NOT NULL updated_at
);


-- public.decision_journal definition

-- Drop table

-- DROP TABLE public.decision_journal;

CREATE TABLE public.decision_journal (
	decision_id serial4 NOT NULL,
	decision_date date NOT NULL,
	title varchar(200) NOT NULL,
	context text NOT NULL,
	decision_made text NOT NULL,
	rationale text NULL,
	expected_outcome text NULL,
	actual_outcome text NULL,
	lessons_learned text NULL,
	decision_status varchar(30) DEFAULT 'Active'::character varying NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT decision_journal_context_not_null NOT NULL context,
	CONSTRAINT decision_journal_decision_date_not_null NOT NULL decision_date,
	CONSTRAINT decision_journal_decision_id_not_null NOT NULL decision_id,
	CONSTRAINT decision_journal_decision_made_not_null NOT NULL decision_made,
	CONSTRAINT decision_journal_pkey PRIMARY KEY (decision_id),
	CONSTRAINT decision_journal_title_not_null NOT NULL title
);


-- public.delivery_channels definition

-- Drop table

-- DROP TABLE public.delivery_channels;

CREATE TABLE public.delivery_channels (
	delivery_channel_id int4 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	"name" varchar(80) NOT NULL,
	description text NULL,
	channel_type varchar(40) NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT ck_delivery_channels_type CHECK (((channel_type)::text = ANY (ARRAY[('FILE'::character varying)::text, ('EMAIL'::character varying)::text, ('TEAMS'::character varying)::text, ('WEB'::character varying)::text, ('SHAREPOINT'::character varying)::text, ('DASHBOARD'::character varying)::text, ('API'::character varying)::text, ('OTHER'::character varying)::text]))),
	CONSTRAINT delivery_channels_channel_type_not_null NOT NULL channel_type,
	CONSTRAINT delivery_channels_created_at_not_null NOT NULL created_at,
	CONSTRAINT delivery_channels_delivery_channel_id_not_null NOT NULL delivery_channel_id,
	CONSTRAINT delivery_channels_is_active_not_null NOT NULL is_active,
	CONSTRAINT delivery_channels_name_not_null NOT NULL name,
	CONSTRAINT delivery_channels_pkey PRIMARY KEY (delivery_channel_id),
	CONSTRAINT delivery_channels_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT uq_delivery_channels_name UNIQUE (name)
);
COMMENT ON TABLE public.delivery_channels IS 'Canais suportados para publica????o e distribui????o de comunica????es.';


-- public.followups definition

-- Drop table

-- DROP TABLE public.followups;

CREATE TABLE public.followups (
	id varchar(36) NOT NULL,
	entity_type varchar(50) NOT NULL,
	entity_id varchar(36) NOT NULL,
	action_type varchar(30) NOT NULL,
	description text NOT NULL,
	assigned_to varchar(200) NULL,
	due_date date NULL,
	status varchar(20) NOT NULL,
	notes text NULL,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL,
	CONSTRAINT followups_action_type_not_null NOT NULL action_type,
	CONSTRAINT followups_created_at_not_null NOT NULL created_at,
	CONSTRAINT followups_description_not_null NOT NULL description,
	CONSTRAINT followups_entity_id_not_null NOT NULL entity_id,
	CONSTRAINT followups_entity_type_not_null NOT NULL entity_type,
	CONSTRAINT followups_id_not_null NOT NULL id,
	CONSTRAINT followups_pkey PRIMARY KEY (id),
	CONSTRAINT followups_status_not_null NOT NULL status,
	CONSTRAINT followups_updated_at_not_null NOT NULL updated_at
);
CREATE INDEX ix_followups_assigned_to ON public.followups USING btree (assigned_to);
CREATE INDEX ix_followups_due_date ON public.followups USING btree (due_date);
CREATE INDEX ix_followups_entity ON public.followups USING btree (entity_type, entity_id);
CREATE INDEX ix_followups_entity_id ON public.followups USING btree (entity_id);
CREATE INDEX ix_followups_entity_type ON public.followups USING btree (entity_type);
CREATE INDEX ix_followups_status ON public.followups USING btree (status);


-- public.integration_field_schemas definition

-- Drop table

-- DROP TABLE public.integration_field_schemas;

CREATE TABLE public.integration_field_schemas (
	provider public.integration_provider NOT NULL,
	field_key varchar(100) NOT NULL,
	field_label varchar(200) NOT NULL,
	field_type varchar(50) NOT NULL,
	is_secret bool DEFAULT false NOT NULL, -- Se true, o valor será armazenado no campo secrets (encriptado) em vez de params.
	is_required bool DEFAULT true NOT NULL,
	"options" jsonb NULL, -- Lista de opções para campos do tipo select: [{"value":"...","label":"..."}].
	hint text NULL,
	placeholder varchar(300) NULL,
	sort_order int4 DEFAULT 0 NOT NULL,
	CONSTRAINT ck_ifs_field_type CHECK (((field_type)::text = ANY (ARRAY[('text'::character varying)::text, ('password'::character varying)::text, ('url'::character varying)::text, ('select'::character varying)::text, ('boolean'::character varying)::text, ('number'::character varying)::text, ('textarea'::character varying)::text]))),
	CONSTRAINT integration_field_schemas_field_key_not_null NOT NULL field_key,
	CONSTRAINT integration_field_schemas_field_label_not_null NOT NULL field_label,
	CONSTRAINT integration_field_schemas_field_type_not_null NOT NULL field_type,
	CONSTRAINT integration_field_schemas_is_required_not_null NOT NULL is_required,
	CONSTRAINT integration_field_schemas_is_secret_not_null NOT NULL is_secret,
	CONSTRAINT integration_field_schemas_pkey PRIMARY KEY (provider, field_key),
	CONSTRAINT integration_field_schemas_provider_not_null NOT NULL provider,
	CONSTRAINT integration_field_schemas_sort_order_not_null NOT NULL sort_order
);
CREATE INDEX idx_ifs_provider ON public.integration_field_schemas USING btree (provider);
COMMENT ON TABLE public.integration_field_schemas IS 'Schema dos campos necessários por provider. Permite que o frontend monte formulários dinâmicos sem hardcode.';

-- Column comments

COMMENT ON COLUMN public.integration_field_schemas.is_secret IS 'Se true, o valor será armazenado no campo secrets (encriptado) em vez de params.';
COMMENT ON COLUMN public.integration_field_schemas."options" IS 'Lista de opções para campos do tipo select: [{"value":"...","label":"..."}].';


-- public.knowledge_articles definition

-- Drop table

-- DROP TABLE public.knowledge_articles;

CREATE TABLE public.knowledge_articles (
	article_id serial4 NOT NULL,
	title varchar(200) NOT NULL,
	category varchar(50) DEFAULT 'Other'::character varying NULL,
	"content" text NOT NULL,
	status varchar(30) DEFAULT 'Draft'::character varying NULL,
	created_by varchar(150) NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	product_id int4 NULL,
	CONSTRAINT knowledge_articles_article_id_not_null NOT NULL article_id,
	CONSTRAINT knowledge_articles_content_not_null NOT NULL content,
	CONSTRAINT knowledge_articles_pkey PRIMARY KEY (article_id),
	CONSTRAINT knowledge_articles_title_not_null NOT NULL title
);


-- public.knowledge_tags definition

-- Drop table

-- DROP TABLE public.knowledge_tags;

CREATE TABLE public.knowledge_tags (
	tag_id serial4 NOT NULL,
	tag_name varchar(80) NOT NULL,
	CONSTRAINT knowledge_tags_pkey PRIMARY KEY (tag_id),
	CONSTRAINT knowledge_tags_tag_id_not_null NOT NULL tag_id,
	CONSTRAINT knowledge_tags_tag_name_key UNIQUE (tag_name),
	CONSTRAINT knowledge_tags_tag_name_not_null NOT NULL tag_name
);


-- public.meetings definition

-- Drop table

-- DROP TABLE public.meetings;

CREATE TABLE public.meetings (
	id varchar(36) NOT NULL,
	product_id int4 NULL,
	title varchar(300) NOT NULL,
	meeting_type varchar(30) DEFAULT 'other'::character varying NOT NULL,
	meeting_date date NULL,
	start_time varchar(5) NULL,
	duration_minutes int4 NULL,
	"location" varchar(200) NULL,
	status varchar(20) DEFAULT 'scheduled'::character varying NOT NULL,
	objective text NULL,
	agenda text NULL,
	transcript text NULL,
	decisions text NULL,
	notes text NULL,
	opportunity_id varchar(36) NULL,
	backlog_item_id varchar(36) NULL,
	roadmap_item_id varchar(36) NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	primary_entity_type varchar(40) NULL,
	primary_entity_id varchar(36) NULL,
	primary_relation_note text NULL,
	CONSTRAINT meetings_created_at_not_null NOT NULL created_at,
	CONSTRAINT meetings_id_not_null NOT NULL id,
	CONSTRAINT meetings_meeting_type_not_null NOT NULL meeting_type,
	CONSTRAINT meetings_pkey PRIMARY KEY (id),
	CONSTRAINT meetings_status_not_null NOT NULL status,
	CONSTRAINT meetings_title_not_null NOT NULL title,
	CONSTRAINT meetings_updated_at_not_null NOT NULL updated_at
);
CREATE INDEX ix_meetings_meeting_date ON public.meetings USING btree (meeting_date DESC);
CREATE INDEX ix_meetings_opportunity_id ON public.meetings USING btree (opportunity_id);
CREATE INDEX ix_meetings_primary_entity_id ON public.meetings USING btree (primary_entity_id);
CREATE INDEX ix_meetings_product_id ON public.meetings USING btree (product_id);
CREATE INDEX ix_meetings_status ON public.meetings USING btree (status);


-- public.prioritization_criteria definition

-- Drop table

-- DROP TABLE public.prioritization_criteria;

CREATE TABLE public.prioritization_criteria (
	criteria_id serial4 NOT NULL,
	"name" varchar(100) NOT NULL,
	description text NULL,
	weight numeric(5, 2) DEFAULT 1.00 NULL,
	is_active bool DEFAULT true NULL,
	CONSTRAINT prioritization_criteria_criteria_id_not_null NOT NULL criteria_id,
	CONSTRAINT prioritization_criteria_name_not_null NOT NULL name,
	CONSTRAINT prioritization_criteria_pkey PRIMARY KEY (criteria_id)
);


-- public.prioritization_eisenhower_items definition

-- Drop table

-- DROP TABLE public.prioritization_eisenhower_items;

CREATE TABLE public.prioritization_eisenhower_items (
	id varchar(36) NOT NULL,
	product_id varchar(36) NOT NULL,
	backlog_item_id int4 NULL,
	source_type varchar(30) DEFAULT 'manual'::character varying NOT NULL,
	source_id varchar(50) NULL,
	item_type varchar(50) NULL,
	title varchar(500) NOT NULL,
	description text NULL,
	urgency float8 DEFAULT 0.0 NOT NULL,
	importance float8 DEFAULT 0.0 NOT NULL,
	eisenhower_score float8 DEFAULT 0.0 NOT NULL,
	quadrant varchar(30) NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT prioritization_eisenhower_items_created_at_not_null NOT NULL created_at,
	CONSTRAINT prioritization_eisenhower_items_eisenhower_score_not_null NOT NULL eisenhower_score,
	CONSTRAINT prioritization_eisenhower_items_id_not_null NOT NULL id,
	CONSTRAINT prioritization_eisenhower_items_importance_not_null NOT NULL importance,
	CONSTRAINT prioritization_eisenhower_items_pkey PRIMARY KEY (id),
	CONSTRAINT prioritization_eisenhower_items_product_id_not_null NOT NULL product_id,
	CONSTRAINT prioritization_eisenhower_items_source_type_not_null NOT NULL source_type,
	CONSTRAINT prioritization_eisenhower_items_title_not_null NOT NULL title,
	CONSTRAINT prioritization_eisenhower_items_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT prioritization_eisenhower_items_urgency_not_null NOT NULL urgency
);
CREATE INDEX idx_prioritization_eisenhower_backlog_item ON public.prioritization_eisenhower_items USING btree (backlog_item_id);
CREATE INDEX idx_prioritization_eisenhower_product ON public.prioritization_eisenhower_items USING btree (product_id);


-- public.prioritization_history definition

-- Drop table

-- DROP TABLE public.prioritization_history;

CREATE TABLE public.prioritization_history (
	priority_id serial4 NOT NULL,
	item_type varchar(30) NOT NULL,
	item_id int4 NOT NULL,
	priority_level varchar(30) NOT NULL,
	score numeric(6, 2) NULL,
	rationale text NULL,
	changed_from varchar(30) NULL,
	changed_to varchar(30) NULL,
	changed_by varchar(150) NULL,
	changed_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT prioritization_history_item_id_not_null NOT NULL item_id,
	CONSTRAINT prioritization_history_item_type_not_null NOT NULL item_type,
	CONSTRAINT prioritization_history_pkey PRIMARY KEY (priority_id),
	CONSTRAINT prioritization_history_priority_id_not_null NOT NULL priority_id,
	CONSTRAINT prioritization_history_priority_level_not_null NOT NULL priority_level
);


-- public.prioritization_ice_items definition

-- Drop table

-- DROP TABLE public.prioritization_ice_items;

CREATE TABLE public.prioritization_ice_items (
	id varchar(36) NOT NULL,
	product_id varchar(36) NOT NULL,
	backlog_item_id int4 NULL,
	source_type varchar(30) DEFAULT 'manual'::character varying NOT NULL,
	source_id varchar(50) NULL,
	item_type varchar(50) NULL,
	title varchar(500) NOT NULL,
	description text NULL,
	impact float8 DEFAULT 0.0 NOT NULL,
	confidence float8 DEFAULT 0.0 NOT NULL,
	ease float8 DEFAULT 1.0 NOT NULL,
	ice_score float8 DEFAULT 0.0 NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT prioritization_ice_items_confidence_not_null NOT NULL confidence,
	CONSTRAINT prioritization_ice_items_created_at_not_null NOT NULL created_at,
	CONSTRAINT prioritization_ice_items_ease_not_null NOT NULL ease,
	CONSTRAINT prioritization_ice_items_ice_score_not_null NOT NULL ice_score,
	CONSTRAINT prioritization_ice_items_id_not_null NOT NULL id,
	CONSTRAINT prioritization_ice_items_impact_not_null NOT NULL impact,
	CONSTRAINT prioritization_ice_items_pkey PRIMARY KEY (id),
	CONSTRAINT prioritization_ice_items_product_id_not_null NOT NULL product_id,
	CONSTRAINT prioritization_ice_items_source_type_not_null NOT NULL source_type,
	CONSTRAINT prioritization_ice_items_title_not_null NOT NULL title,
	CONSTRAINT prioritization_ice_items_updated_at_not_null NOT NULL updated_at
);
CREATE INDEX idx_prioritization_ice_backlog_item ON public.prioritization_ice_items USING btree (backlog_item_id);
CREATE INDEX idx_prioritization_ice_product ON public.prioritization_ice_items USING btree (product_id);


-- public.prioritization_items definition

-- Drop table

-- DROP TABLE public.prioritization_items;

CREATE TABLE public.prioritization_items (
	id varchar(36) NOT NULL,
	product_id varchar(36) NOT NULL,
	title varchar(500) NOT NULL,
	description text NULL,
	priority_method public.prioritymethod NULL,
	reach float8 NULL,
	impact float8 NULL,
	confidence float8 NULL,
	effort float8 NULL,
	rice_score float8 NULL,
	moscow_value public.moscowvalue NULL,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL,
	tags _text NULL,
	backlog_item_id int4 NULL,
	source_type varchar(30) DEFAULT 'manual'::character varying NOT NULL,
	source_id varchar(50) NULL,
	item_type varchar(50) NULL,
	CONSTRAINT prioritization_items_created_at_not_null NOT NULL created_at,
	CONSTRAINT prioritization_items_id_not_null NOT NULL id,
	CONSTRAINT prioritization_items_pkey PRIMARY KEY (id),
	CONSTRAINT prioritization_items_product_id_not_null NOT NULL product_id,
	CONSTRAINT prioritization_items_source_type_not_null NOT NULL source_type,
	CONSTRAINT prioritization_items_title_not_null NOT NULL title,
	CONSTRAINT prioritization_items_updated_at_not_null NOT NULL updated_at
);
CREATE INDEX idx_prioritization_backlog_item ON public.prioritization_items USING btree (backlog_item_id);
CREATE INDEX ix_prioritization_items_product_id ON public.prioritization_items USING btree (product_id);


-- public.prioritization_moscow_items definition

-- Drop table

-- DROP TABLE public.prioritization_moscow_items;

CREATE TABLE public.prioritization_moscow_items (
	id varchar(36) NOT NULL,
	product_id varchar(36) NOT NULL,
	backlog_item_id int4 NULL,
	source_type varchar(30) DEFAULT 'manual'::character varying NOT NULL,
	source_id varchar(50) NULL,
	item_type varchar(50) NULL,
	title varchar(500) NOT NULL,
	description text NULL,
	moscow_value varchar(50) NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT prioritization_moscow_items_created_at_not_null NOT NULL created_at,
	CONSTRAINT prioritization_moscow_items_id_not_null NOT NULL id,
	CONSTRAINT prioritization_moscow_items_pkey PRIMARY KEY (id),
	CONSTRAINT prioritization_moscow_items_product_id_not_null NOT NULL product_id,
	CONSTRAINT prioritization_moscow_items_source_type_not_null NOT NULL source_type,
	CONSTRAINT prioritization_moscow_items_title_not_null NOT NULL title,
	CONSTRAINT prioritization_moscow_items_updated_at_not_null NOT NULL updated_at
);
CREATE INDEX idx_prioritization_moscow_backlog_item ON public.prioritization_moscow_items USING btree (backlog_item_id);
CREATE INDEX idx_prioritization_moscow_product ON public.prioritization_moscow_items USING btree (product_id);


-- public.prioritization_rice_items definition

-- Drop table

-- DROP TABLE public.prioritization_rice_items;

CREATE TABLE public.prioritization_rice_items (
	id varchar(36) NOT NULL,
	product_id varchar(36) NOT NULL,
	backlog_item_id int4 NULL,
	source_type varchar(30) DEFAULT 'manual'::character varying NOT NULL,
	source_id varchar(50) NULL,
	item_type varchar(50) NULL,
	title varchar(500) NOT NULL,
	description text NULL,
	reach float8 DEFAULT 0.0 NOT NULL,
	impact float8 DEFAULT 0.0 NOT NULL,
	confidence float8 DEFAULT 0.0 NOT NULL,
	effort float8 DEFAULT 1.0 NOT NULL,
	rice_score float8 DEFAULT 0.0 NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT prioritization_rice_items_confidence_not_null NOT NULL confidence,
	CONSTRAINT prioritization_rice_items_created_at_not_null NOT NULL created_at,
	CONSTRAINT prioritization_rice_items_effort_not_null NOT NULL effort,
	CONSTRAINT prioritization_rice_items_id_not_null NOT NULL id,
	CONSTRAINT prioritization_rice_items_impact_not_null NOT NULL impact,
	CONSTRAINT prioritization_rice_items_pkey PRIMARY KEY (id),
	CONSTRAINT prioritization_rice_items_product_id_not_null NOT NULL product_id,
	CONSTRAINT prioritization_rice_items_reach_not_null NOT NULL reach,
	CONSTRAINT prioritization_rice_items_rice_score_not_null NOT NULL rice_score,
	CONSTRAINT prioritization_rice_items_source_type_not_null NOT NULL source_type,
	CONSTRAINT prioritization_rice_items_title_not_null NOT NULL title,
	CONSTRAINT prioritization_rice_items_updated_at_not_null NOT NULL updated_at
);
CREATE INDEX idx_prioritization_rice_backlog_item ON public.prioritization_rice_items USING btree (backlog_item_id);
CREATE INDEX idx_prioritization_rice_product ON public.prioritization_rice_items USING btree (product_id);


-- public.prioritization_wsjf_items definition

-- Drop table

-- DROP TABLE public.prioritization_wsjf_items;

CREATE TABLE public.prioritization_wsjf_items (
	id varchar(36) NOT NULL,
	product_id varchar(36) NOT NULL,
	backlog_item_id int4 NULL,
	source_type varchar(30) DEFAULT 'manual'::character varying NOT NULL,
	source_id varchar(50) NULL,
	item_type varchar(50) NULL,
	title varchar(500) NOT NULL,
	description text NULL,
	business_value float8 DEFAULT 0.0 NOT NULL,
	time_criticality float8 DEFAULT 0.0 NOT NULL,
	risk_reduction float8 DEFAULT 0.0 NOT NULL,
	job_size float8 DEFAULT 1.0 NOT NULL,
	wsjf_score float8 DEFAULT 0.0 NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT prioritization_wsjf_items_business_value_not_null NOT NULL business_value,
	CONSTRAINT prioritization_wsjf_items_created_at_not_null NOT NULL created_at,
	CONSTRAINT prioritization_wsjf_items_id_not_null NOT NULL id,
	CONSTRAINT prioritization_wsjf_items_job_size_not_null NOT NULL job_size,
	CONSTRAINT prioritization_wsjf_items_pkey PRIMARY KEY (id),
	CONSTRAINT prioritization_wsjf_items_product_id_not_null NOT NULL product_id,
	CONSTRAINT prioritization_wsjf_items_risk_reduction_not_null NOT NULL risk_reduction,
	CONSTRAINT prioritization_wsjf_items_source_type_not_null NOT NULL source_type,
	CONSTRAINT prioritization_wsjf_items_time_criticality_not_null NOT NULL time_criticality,
	CONSTRAINT prioritization_wsjf_items_title_not_null NOT NULL title,
	CONSTRAINT prioritization_wsjf_items_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT prioritization_wsjf_items_wsjf_score_not_null NOT NULL wsjf_score
);
CREATE INDEX idx_prioritization_wsjf_backlog_item ON public.prioritization_wsjf_items USING btree (backlog_item_id);
CREATE INDEX idx_prioritization_wsjf_product ON public.prioritization_wsjf_items USING btree (product_id);


-- public.raci_assignment_history definition

-- Drop table

-- DROP TABLE public.raci_assignment_history;

CREATE TABLE public.raci_assignment_history (
	id serial4 NOT NULL,
	assignment_id int4 NOT NULL,
	product_id int4 NULL,
	object_type varchar(30) NOT NULL,
	object_id int4 NOT NULL,
	stakeholder_id int4 NOT NULL,
	stakeholder_name varchar(150) NULL,
	"role" varchar(1) NOT NULL,
	"action" varchar(20) NOT NULL, -- ADD=criaÃ§Ã£o, REMOVE=remoÃ§Ã£o, APPROVE=aprovaÃ§Ã£o registrada, REVOKE_APPROVAL=aprovaÃ§Ã£o revogada, UPDATE_NOTES=notas alteradas
	action_by varchar(150) NULL,
	action_at timestamp NOT NULL,
	notes text NULL,
	approved_at timestamp NULL,
	approval_method varchar(50) NULL,
	approval_evidence text NULL,
	approved_by varchar(150) NULL,
	CONSTRAINT raci_assignment_history_action_at_not_null NOT NULL action_at,
	CONSTRAINT raci_assignment_history_action_not_null NOT NULL action,
	CONSTRAINT raci_assignment_history_assignment_id_not_null NOT NULL assignment_id,
	CONSTRAINT raci_assignment_history_id_not_null NOT NULL id,
	CONSTRAINT raci_assignment_history_object_id_not_null NOT NULL object_id,
	CONSTRAINT raci_assignment_history_object_type_not_null NOT NULL object_type,
	CONSTRAINT raci_assignment_history_pkey PRIMARY KEY (id),
	CONSTRAINT raci_assignment_history_role_not_null NOT NULL role,
	CONSTRAINT raci_assignment_history_stakeholder_id_not_null NOT NULL stakeholder_id
);
CREATE INDEX idx_raci_history_assignment ON public.raci_assignment_history USING btree (assignment_id);
CREATE INDEX idx_raci_history_object ON public.raci_assignment_history USING btree (object_type, object_id);
CREATE INDEX ix_raci_assignment_history_assignment_id ON public.raci_assignment_history USING btree (assignment_id);
COMMENT ON TABLE public.raci_assignment_history IS 'HistÃ³rico imutÃ¡vel de todas as mudanÃ§as nas atribuiÃ§Ãµes RACI';

-- Column comments

COMMENT ON COLUMN public.raci_assignment_history."action" IS 'ADD=criaÃ§Ã£o, REMOVE=remoÃ§Ã£o, APPROVE=aprovaÃ§Ã£o registrada, REVOKE_APPROVAL=aprovaÃ§Ã£o revogada, UPDATE_NOTES=notas alteradas';


-- public.research_templates definition

-- Drop table

-- DROP TABLE public.research_templates;

CREATE TABLE public.research_templates (
	id varchar(36) NOT NULL,
	research_type public.research_type NOT NULL,
	"name" varchar(200) NOT NULL,
	description text NULL,
	objective text NULL,
	when_to_use text NULL,
	expected_outputs text NULL,
	opening_script text NULL,
	reference varchar(300) NULL,
	"version" varchar(10) DEFAULT '1.0'::character varying NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	sort_order int4 DEFAULT 0 NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT research_templates_created_at_not_null NOT NULL created_at,
	CONSTRAINT research_templates_id_not_null NOT NULL id,
	CONSTRAINT research_templates_is_active_not_null NOT NULL is_active,
	CONSTRAINT research_templates_name_not_null NOT NULL name,
	CONSTRAINT research_templates_pkey PRIMARY KEY (id),
	CONSTRAINT research_templates_research_type_not_null NOT NULL research_type,
	CONSTRAINT research_templates_sort_order_not_null NOT NULL sort_order,
	CONSTRAINT research_templates_version_not_null NOT NULL version
);
CREATE INDEX idx_research_templates_type ON public.research_templates USING btree (research_type);


-- public.roadmap_backlog_links definition

-- Drop table

-- DROP TABLE public.roadmap_backlog_links;

CREATE TABLE public.roadmap_backlog_links (
	id serial4 NOT NULL,
	roadmap_item_id varchar(36) NOT NULL,
	backlog_item_id int4 NOT NULL,
	created_at timestamp NOT NULL,
	executive_status varchar(30) NULL,
	executive_summary text NULL,
	executive_risk_dependency text NULL,
	executive_next_step text NULL,
	executive_owner_name varchar(150) NULL,
	committed_deadline timestamp NULL,
	attention_flag bool DEFAULT false NOT NULL,
	attention_reason text NULL,
	executive_updated_at timestamp NULL,
	executive_updated_by varchar(150) NULL,
	display_order int4 NULL,
	executive_owner_role varchar(150) NULL,
	CONSTRAINT roadmap_backlog_links_attention_flag_not_null NOT NULL attention_flag,
	CONSTRAINT roadmap_backlog_links_backlog_item_id_not_null NOT NULL backlog_item_id,
	CONSTRAINT roadmap_backlog_links_created_at_not_null NOT NULL created_at,
	CONSTRAINT roadmap_backlog_links_id_not_null NOT NULL id,
	CONSTRAINT roadmap_backlog_links_pkey PRIMARY KEY (id),
	CONSTRAINT roadmap_backlog_links_roadmap_item_id_not_null NOT NULL roadmap_item_id
);
CREATE INDEX ix_roadmap_backlog_links_backlog_item_id ON public.roadmap_backlog_links USING btree (backlog_item_id);
CREATE INDEX ix_roadmap_backlog_links_roadmap_item_id ON public.roadmap_backlog_links USING btree (roadmap_item_id);


-- public.sprints definition

-- Drop table

-- DROP TABLE public.sprints;

CREATE TABLE public.sprints (
	sprint_id serial4 NOT NULL,
	product_id int4 NOT NULL,
	"name" varchar(100) NOT NULL,
	goal text NULL,
	start_date date NULL,
	end_date date NULL,
	status varchar(20) DEFAULT 'planned'::character varying NOT NULL,
	velocity int4 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	capacity int4 NULL,
	CONSTRAINT sprints_created_at_not_null NOT NULL created_at,
	CONSTRAINT sprints_name_not_null NOT NULL name,
	CONSTRAINT sprints_pkey PRIMARY KEY (sprint_id),
	CONSTRAINT sprints_product_id_not_null NOT NULL product_id,
	CONSTRAINT sprints_sprint_id_not_null NOT NULL sprint_id,
	CONSTRAINT sprints_status_not_null NOT NULL status,
	CONSTRAINT sprints_updated_at_not_null NOT NULL updated_at
);
CREATE INDEX idx_sprints_product ON public.sprints USING btree (product_id);
CREATE INDEX idx_sprints_status ON public.sprints USING btree (status);


-- public.users definition

-- Drop table

-- DROP TABLE public.users;

CREATE TABLE public.users (
	user_id serial4 NOT NULL,
	user_full_name varchar(150) NOT NULL,
	user_email varchar(255) NOT NULL,
	user_password varchar(255) NOT NULL,
	user_is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	user_reset_token varchar(20) NULL,
	user_reset_token_expires_at timestamp NULL,
	user_role varchar(20) DEFAULT 'user'::character varying NOT NULL,
	user_theme varchar(10) DEFAULT 'dark'::character varying NOT NULL,
	user_language varchar(10) DEFAULT 'en'::character varying NOT NULL,
	module_order jsonb NULL,
	CONSTRAINT users_created_at_not_null NOT NULL created_at,
	CONSTRAINT users_pkey PRIMARY KEY (user_id),
	CONSTRAINT users_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT users_user_email_key UNIQUE (user_email),
	CONSTRAINT users_user_email_not_null NOT NULL user_email,
	CONSTRAINT users_user_full_name_not_null NOT NULL user_full_name,
	CONSTRAINT users_user_id_not_null NOT NULL user_id,
	CONSTRAINT users_user_is_active_not_null NOT NULL user_is_active,
	CONSTRAINT users_user_language_not_null NOT NULL user_language,
	CONSTRAINT users_user_password_not_null NOT NULL user_password,
	CONSTRAINT users_user_role_not_null NOT NULL user_role,
	CONSTRAINT users_user_theme_not_null NOT NULL user_theme
);


-- public.vpc_item_links definition

-- Drop table

-- DROP TABLE public.vpc_item_links;

CREATE TABLE public.vpc_item_links (
	id varchar(36) DEFAULT gen_random_uuid()::text NOT NULL,
	canvas_id varchar(36) NOT NULL,
	source_id varchar(36) NOT NULL,
	target_id varchar(36) NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT vpc_item_links_canvas_id_not_null NOT NULL canvas_id,
	CONSTRAINT vpc_item_links_id_not_null NOT NULL id,
	CONSTRAINT vpc_item_links_pkey PRIMARY KEY (id),
	CONSTRAINT vpc_item_links_source_id_not_null NOT NULL source_id,
	CONSTRAINT vpc_item_links_target_id_not_null NOT NULL target_id,
	CONSTRAINT vpc_item_links_unique UNIQUE (source_id, target_id)
);


-- public.wsjf_templates definition

-- Drop table

-- DROP TABLE public.wsjf_templates;

CREATE TABLE public.wsjf_templates (
	template_id serial4 NOT NULL,
	"name" varchar(150) NOT NULL,
	description text NULL,
	scale_type varchar(50) DEFAULT 'fibonacci_21'::character varying NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	is_default bool DEFAULT false NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT wsjf_templates_created_at_not_null NOT NULL created_at,
	CONSTRAINT wsjf_templates_is_active_not_null NOT NULL is_active,
	CONSTRAINT wsjf_templates_is_default_not_null NOT NULL is_default,
	CONSTRAINT wsjf_templates_name_not_null NOT NULL name,
	CONSTRAINT wsjf_templates_pkey PRIMARY KEY (template_id),
	CONSTRAINT wsjf_templates_scale_type_not_null NOT NULL scale_type,
	CONSTRAINT wsjf_templates_template_id_not_null NOT NULL template_id,
	CONSTRAINT wsjf_templates_updated_at_not_null NOT NULL updated_at
);
CREATE INDEX idx_wsjf_templates_active ON public.wsjf_templates USING btree (is_active);
CREATE UNIQUE INDEX uq_wsjf_templates_default_true ON public.wsjf_templates USING btree (is_default) WHERE (is_default = true);


-- public.backlog_item_links definition

-- Drop table

-- DROP TABLE public.backlog_item_links;

CREATE TABLE public.backlog_item_links (
	link_id serial4 NOT NULL,
	source_id int4 NOT NULL,
	target_id int4 NOT NULL,
	link_type varchar(30) NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT backlog_item_links_created_at_not_null NOT NULL created_at,
	CONSTRAINT backlog_item_links_link_id_not_null NOT NULL link_id,
	CONSTRAINT backlog_item_links_link_type_not_null NOT NULL link_type,
	CONSTRAINT backlog_item_links_pkey PRIMARY KEY (link_id),
	CONSTRAINT backlog_item_links_source_id_not_null NOT NULL source_id,
	CONSTRAINT backlog_item_links_target_id_not_null NOT NULL target_id,
	CONSTRAINT uq_item_link UNIQUE (source_id, target_id, link_type),
	CONSTRAINT backlog_item_links_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.backlog_items(item_id) ON DELETE CASCADE,
	CONSTRAINT backlog_item_links_target_id_fkey FOREIGN KEY (target_id) REFERENCES public.backlog_items(item_id) ON DELETE CASCADE
);
CREATE INDEX idx_links_source ON public.backlog_item_links USING btree (source_id);
CREATE INDEX idx_links_target ON public.backlog_item_links USING btree (target_id);


-- public.backlog_item_notes definition

-- Drop table

-- DROP TABLE public.backlog_item_notes;

CREATE TABLE public.backlog_item_notes (
	note_id serial4 NOT NULL,
	item_id int4 NOT NULL,
	author varchar(150) NOT NULL,
	"content" text NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	note_type varchar(50) DEFAULT 'information'::character varying NOT NULL,
	status varchar(30) DEFAULT 'open'::character varying NOT NULL,
	followup_id varchar(36) NULL,
	CONSTRAINT backlog_item_notes_author_not_null NOT NULL author,
	CONSTRAINT backlog_item_notes_content_not_null NOT NULL content,
	CONSTRAINT backlog_item_notes_created_at_not_null NOT NULL created_at,
	CONSTRAINT backlog_item_notes_item_id_not_null NOT NULL item_id,
	CONSTRAINT backlog_item_notes_note_id_not_null NOT NULL note_id,
	CONSTRAINT backlog_item_notes_note_type_not_null NOT NULL note_type,
	CONSTRAINT backlog_item_notes_pkey PRIMARY KEY (note_id),
	CONSTRAINT backlog_item_notes_status_not_null NOT NULL status,
	CONSTRAINT backlog_item_notes_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT backlog_item_notes_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.backlog_items(item_id) ON DELETE CASCADE
);
CREATE INDEX idx_notes_followup ON public.backlog_item_notes USING btree (followup_id);
CREATE INDEX idx_notes_item ON public.backlog_item_notes USING btree (item_id);


-- public.business_subdomains definition

-- Drop table

-- DROP TABLE public.business_subdomains;

CREATE TABLE public.business_subdomains (
	id serial4 NOT NULL,
	domain_id int4 NOT NULL,
	subdomain_code varchar(50) NOT NULL,
	subdomain_name varchar(200) NOT NULL,
	description text NULL,
	display_order int4 NOT NULL,
	is_active bool NOT NULL,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL,
	subdomain_type varchar(30) NULL,
	"owner" varchar(200) NULL,
	business_rules text NULL,
	CONSTRAINT business_subdomains_created_at_not_null NOT NULL created_at,
	CONSTRAINT business_subdomains_display_order_not_null NOT NULL display_order,
	CONSTRAINT business_subdomains_domain_id_not_null NOT NULL domain_id,
	CONSTRAINT business_subdomains_id_not_null NOT NULL id,
	CONSTRAINT business_subdomains_is_active_not_null NOT NULL is_active,
	CONSTRAINT business_subdomains_pkey PRIMARY KEY (id),
	CONSTRAINT business_subdomains_subdomain_code_not_null NOT NULL subdomain_code,
	CONSTRAINT business_subdomains_subdomain_name_not_null NOT NULL subdomain_name,
	CONSTRAINT business_subdomains_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT uq_subdomain_code UNIQUE (domain_id, subdomain_code),
	CONSTRAINT business_subdomains_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.business_domains(id) ON DELETE CASCADE
);
CREATE INDEX idx_bsd_domain ON public.business_subdomains USING btree (domain_id);
CREATE INDEX ix_business_subdomains_domain_id ON public.business_subdomains USING btree (domain_id);


-- public.communication_templates definition

-- Drop table

-- DROP TABLE public.communication_templates;

CREATE TABLE public.communication_templates (
	communication_template_id int4 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	communication_type_id int4 NOT NULL,
	"name" varchar(150) NOT NULL,
	description text NULL,
	general_prompt text NULL, -- Instru????es gerais fornecidas ao LLM ou Agent durante a gera????o do conte??do.
	default_language varchar(10) DEFAULT 'pt-BR'::character varying NOT NULL,
	default_tone varchar(50) NULL,
	default_detail_level varchar(30) NULL,
	default_output_format varchar(50) NULL,
	is_active bool DEFAULT true NOT NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT communication_templates_communication_template_id_not_null NOT NULL communication_template_id,
	CONSTRAINT communication_templates_communication_type_id_not_null NOT NULL communication_type_id,
	CONSTRAINT communication_templates_created_at_not_null NOT NULL created_at,
	CONSTRAINT communication_templates_default_language_not_null NOT NULL default_language,
	CONSTRAINT communication_templates_is_active_not_null NOT NULL is_active,
	CONSTRAINT communication_templates_name_not_null NOT NULL name,
	CONSTRAINT communication_templates_pkey PRIMARY KEY (communication_template_id),
	CONSTRAINT communication_templates_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT uq_communication_templates_name UNIQUE (communication_type_id, name),
	CONSTRAINT fk_communication_templates_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL,
	CONSTRAINT fk_communication_templates_type FOREIGN KEY (communication_type_id) REFERENCES public.communication_types(communication_type_id) ON DELETE RESTRICT,
	CONSTRAINT fk_communication_templates_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL
);
CREATE INDEX idx_communication_templates_type ON public.communication_templates USING btree (communication_type_id);
COMMENT ON TABLE public.communication_templates IS 'Templates reutiliz??veis que definem estrutura e orienta????o editorial das comunica????es.';

-- Column comments

COMMENT ON COLUMN public.communication_templates.general_prompt IS 'Instru????es gerais fornecidas ao LLM ou Agent durante a gera????o do conte??do.';


-- public.knowledge_article_tags definition

-- Drop table

-- DROP TABLE public.knowledge_article_tags;

CREATE TABLE public.knowledge_article_tags (
	article_id int4 NOT NULL,
	tag_id int4 NOT NULL,
	CONSTRAINT knowledge_article_tags_article_id_not_null NOT NULL article_id,
	CONSTRAINT knowledge_article_tags_pkey PRIMARY KEY (article_id, tag_id),
	CONSTRAINT knowledge_article_tags_tag_id_not_null NOT NULL tag_id,
	CONSTRAINT knowledge_article_tags_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.knowledge_articles(article_id),
	CONSTRAINT knowledge_article_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.knowledge_tags(tag_id)
);


-- public.knowledge_article_versions definition

-- Drop table

-- DROP TABLE public.knowledge_article_versions;

CREATE TABLE public.knowledge_article_versions (
	version_id serial4 NOT NULL,
	article_id int4 NOT NULL,
	version_number int4 NOT NULL,
	title varchar(200) NOT NULL,
	"content" text NOT NULL,
	change_summary text NULL,
	created_by varchar(150) NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT knowledge_article_versions_article_id_not_null NOT NULL article_id,
	CONSTRAINT knowledge_article_versions_article_id_version_number_key UNIQUE (article_id, version_number),
	CONSTRAINT knowledge_article_versions_content_not_null NOT NULL content,
	CONSTRAINT knowledge_article_versions_pkey PRIMARY KEY (version_id),
	CONSTRAINT knowledge_article_versions_title_not_null NOT NULL title,
	CONSTRAINT knowledge_article_versions_version_id_not_null NOT NULL version_id,
	CONSTRAINT knowledge_article_versions_version_number_not_null NOT NULL version_number,
	CONSTRAINT knowledge_article_versions_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.knowledge_articles(article_id)
);


-- public.knowledge_links definition

-- Drop table

-- DROP TABLE public.knowledge_links;

CREATE TABLE public.knowledge_links (
	link_id serial4 NOT NULL,
	article_id int4 NOT NULL,
	linked_entity_type varchar(50) NOT NULL,
	linked_entity_id int4 NOT NULL,
	relationship_type varchar(50) DEFAULT 'Related To'::character varying NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT knowledge_links_article_id_not_null NOT NULL article_id,
	CONSTRAINT knowledge_links_link_id_not_null NOT NULL link_id,
	CONSTRAINT knowledge_links_linked_entity_id_not_null NOT NULL linked_entity_id,
	CONSTRAINT knowledge_links_linked_entity_type_not_null NOT NULL linked_entity_type,
	CONSTRAINT knowledge_links_pkey PRIMARY KEY (link_id),
	CONSTRAINT knowledge_links_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.knowledge_articles(article_id)
);


-- public.knowledge_references definition

-- Drop table

-- DROP TABLE public.knowledge_references;

CREATE TABLE public.knowledge_references (
	reference_id serial4 NOT NULL,
	article_id int4 NULL,
	reference_type varchar(50) NOT NULL,
	reference_id_ext int4 NOT NULL,
	created_at timestamp DEFAULT now() NULL,
	CONSTRAINT knowledge_references_pkey PRIMARY KEY (reference_id),
	CONSTRAINT knowledge_references_reference_id_ext_not_null NOT NULL reference_id_ext,
	CONSTRAINT knowledge_references_reference_id_not_null NOT NULL reference_id,
	CONSTRAINT knowledge_references_reference_type_not_null NOT NULL reference_type,
	CONSTRAINT knowledge_references_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.knowledge_articles(article_id)
);


-- public.meeting_action_items definition

-- Drop table

-- DROP TABLE public.meeting_action_items;

CREATE TABLE public.meeting_action_items (
	id varchar(36) NOT NULL,
	meeting_id varchar(36) NOT NULL,
	description text NOT NULL,
	assigned_to varchar(200) NULL,
	due_date date NULL,
	status varchar(20) DEFAULT 'pending'::character varying NOT NULL,
	notes text NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT meeting_action_items_created_at_not_null NOT NULL created_at,
	CONSTRAINT meeting_action_items_description_not_null NOT NULL description,
	CONSTRAINT meeting_action_items_id_not_null NOT NULL id,
	CONSTRAINT meeting_action_items_meeting_id_not_null NOT NULL meeting_id,
	CONSTRAINT meeting_action_items_pkey PRIMARY KEY (id),
	CONSTRAINT meeting_action_items_status_not_null NOT NULL status,
	CONSTRAINT meeting_action_items_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT meeting_action_items_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE
);
CREATE INDEX ix_meeting_action_items_meeting_id ON public.meeting_action_items USING btree (meeting_id);
CREATE INDEX ix_meeting_action_items_status ON public.meeting_action_items USING btree (status);


-- public.meeting_links definition

-- Drop table

-- DROP TABLE public.meeting_links;

CREATE TABLE public.meeting_links (
	id varchar(36) NOT NULL,
	meeting_id varchar(36) NOT NULL,
	"label" varchar(200) NOT NULL,
	url text NOT NULL,
	link_type varchar(30) DEFAULT 'document'::character varying NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT meeting_links_created_at_not_null NOT NULL created_at,
	CONSTRAINT meeting_links_id_not_null NOT NULL id,
	CONSTRAINT meeting_links_label_not_null NOT NULL label,
	CONSTRAINT meeting_links_link_type_not_null NOT NULL link_type,
	CONSTRAINT meeting_links_meeting_id_not_null NOT NULL meeting_id,
	CONSTRAINT meeting_links_pkey PRIMARY KEY (id),
	CONSTRAINT meeting_links_url_not_null NOT NULL url,
	CONSTRAINT meeting_links_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE
);
CREATE INDEX ix_meeting_links_meeting_id ON public.meeting_links USING btree (meeting_id);


-- public.meeting_participants definition

-- Drop table

-- DROP TABLE public.meeting_participants;

CREATE TABLE public.meeting_participants (
	id varchar(36) NOT NULL,
	meeting_id varchar(36) NOT NULL,
	stakeholder_id int4 NULL,
	"name" varchar(200) NOT NULL,
	"role" varchar(100) NULL,
	attended varchar(5) DEFAULT 'true'::character varying NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT meeting_participants_attended_not_null NOT NULL attended,
	CONSTRAINT meeting_participants_created_at_not_null NOT NULL created_at,
	CONSTRAINT meeting_participants_id_not_null NOT NULL id,
	CONSTRAINT meeting_participants_meeting_id_not_null NOT NULL meeting_id,
	CONSTRAINT meeting_participants_name_not_null NOT NULL name,
	CONSTRAINT meeting_participants_pkey PRIMARY KEY (id),
	CONSTRAINT meeting_participants_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE
);
CREATE INDEX ix_meeting_participants_meeting_id ON public.meeting_participants USING btree (meeting_id);


-- public.meeting_relations definition

-- Drop table

-- DROP TABLE public.meeting_relations;

CREATE TABLE public.meeting_relations (
	id varchar(36) NOT NULL,
	meeting_id varchar(36) NOT NULL,
	entity_type public.meetingentitytype NOT NULL,
	entity_id varchar(36) NOT NULL,
	relation_type public.meetingrelationtype NOT NULL,
	"label" varchar(200) NULL,
	notes text NULL,
	created_at timestamp NOT NULL,
	CONSTRAINT meeting_relations_created_at_not_null NOT NULL created_at,
	CONSTRAINT meeting_relations_entity_id_not_null NOT NULL entity_id,
	CONSTRAINT meeting_relations_entity_type_not_null NOT NULL entity_type,
	CONSTRAINT meeting_relations_id_not_null NOT NULL id,
	CONSTRAINT meeting_relations_meeting_id_not_null NOT NULL meeting_id,
	CONSTRAINT meeting_relations_pkey PRIMARY KEY (id),
	CONSTRAINT meeting_relations_relation_type_not_null NOT NULL relation_type,
	CONSTRAINT meeting_relations_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE
);
CREATE INDEX ix_meeting_relations_entity ON public.meeting_relations USING btree (entity_type, entity_id);
CREATE INDEX ix_meeting_relations_entity_id ON public.meeting_relations USING btree (entity_id);
CREATE INDEX ix_meeting_relations_meeting_id ON public.meeting_relations USING btree (meeting_id);
CREATE INDEX ix_meeting_relations_relation_type ON public.meeting_relations USING btree (relation_type);


-- public.meeting_sessions definition

-- Drop table

-- DROP TABLE public.meeting_sessions;

CREATE TABLE public.meeting_sessions (
	id varchar(36) NOT NULL,
	meeting_id varchar(36) NOT NULL,
	title varchar(300) NULL,
	session_date date NULL,
	start_time varchar(5) NULL,
	end_time varchar(5) NULL,
	duration_minutes int4 NULL,
	"location" varchar(200) NULL,
	status public.meetingstatus NOT NULL,
	notes text NULL,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL,
	CONSTRAINT meeting_sessions_created_at_not_null NOT NULL created_at,
	CONSTRAINT meeting_sessions_id_not_null NOT NULL id,
	CONSTRAINT meeting_sessions_meeting_id_not_null NOT NULL meeting_id,
	CONSTRAINT meeting_sessions_pkey PRIMARY KEY (id),
	CONSTRAINT meeting_sessions_status_not_null NOT NULL status,
	CONSTRAINT meeting_sessions_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT meeting_sessions_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE
);
CREATE INDEX ix_meeting_sessions_meeting_id ON public.meeting_sessions USING btree (meeting_id);
CREATE INDEX ix_meeting_sessions_session_date ON public.meeting_sessions USING btree (session_date);


-- public.meeting_transcripts definition

-- Drop table

-- DROP TABLE public.meeting_transcripts;

CREATE TABLE public.meeting_transcripts (
	id varchar(36) NOT NULL,
	meeting_id varchar(36) NOT NULL,
	session_id varchar(36) NULL,
	title varchar(300) NOT NULL,
	content_text text NOT NULL,
	"language" varchar(20) NULL,
	source_type public.transcriptsourcetype NOT NULL,
	source_attachment_id varchar(36) NULL,
	created_by varchar(200) NULL,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL,
	CONSTRAINT meeting_transcripts_content_text_not_null NOT NULL content_text,
	CONSTRAINT meeting_transcripts_created_at_not_null NOT NULL created_at,
	CONSTRAINT meeting_transcripts_id_not_null NOT NULL id,
	CONSTRAINT meeting_transcripts_meeting_id_not_null NOT NULL meeting_id,
	CONSTRAINT meeting_transcripts_pkey PRIMARY KEY (id),
	CONSTRAINT meeting_transcripts_source_type_not_null NOT NULL source_type,
	CONSTRAINT meeting_transcripts_title_not_null NOT NULL title,
	CONSTRAINT meeting_transcripts_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT meeting_transcripts_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE,
	CONSTRAINT meeting_transcripts_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.meeting_sessions(id) ON DELETE CASCADE
);
CREATE INDEX ix_meeting_transcripts_meeting_id ON public.meeting_transcripts USING btree (meeting_id);
CREATE INDEX ix_meeting_transcripts_session_id ON public.meeting_transcripts USING btree (session_id);
CREATE INDEX ix_meeting_transcripts_source_type ON public.meeting_transcripts USING btree (source_type);


-- public.prioritization_scores definition

-- Drop table

-- DROP TABLE public.prioritization_scores;

CREATE TABLE public.prioritization_scores (
	score_id serial4 NOT NULL,
	priority_id int4 NOT NULL,
	criteria_id int4 NOT NULL,
	score int2 NOT NULL,
	notes text NULL,
	CONSTRAINT prioritization_scores_criteria_id_not_null NOT NULL criteria_id,
	CONSTRAINT prioritization_scores_pkey PRIMARY KEY (score_id),
	CONSTRAINT prioritization_scores_priority_id_not_null NOT NULL priority_id,
	CONSTRAINT prioritization_scores_score_id_not_null NOT NULL score_id,
	CONSTRAINT prioritization_scores_score_not_null NOT NULL score,
	CONSTRAINT prioritization_scores_criteria_id_fkey FOREIGN KEY (criteria_id) REFERENCES public.prioritization_criteria(criteria_id),
	CONSTRAINT prioritization_scores_priority_id_fkey FOREIGN KEY (priority_id) REFERENCES public.prioritization_history(priority_id)
);


-- public.products definition

-- Drop table

-- DROP TABLE public.products;

CREATE TABLE public.products (
	product_id serial4 NOT NULL,
	"name" varchar(150) NOT NULL,
	description text NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	status public.productstatus NULL,
	tags _varchar NULL,
	owner_user_id int4 NULL,
	company_id int4 NULL,
	CONSTRAINT products_name_not_null NOT NULL name,
	CONSTRAINT products_pkey PRIMARY KEY (product_id),
	CONSTRAINT products_product_id_not_null NOT NULL product_id,
	CONSTRAINT products_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL,
	CONSTRAINT products_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(user_id)
);
CREATE INDEX idx_products_company ON public.products USING btree (company_id);


-- public.research_template_questions definition

-- Drop table

-- DROP TABLE public.research_template_questions;

CREATE TABLE public.research_template_questions (
	id varchar(36) NOT NULL,
	template_id varchar(36) NOT NULL,
	"section" varchar(20) DEFAULT 'during'::character varying NOT NULL,
	question text NOT NULL,
	hint text NULL,
	is_research_question bool DEFAULT false NOT NULL,
	question_type varchar(30) DEFAULT 'open_text'::character varying NOT NULL,
	is_required bool DEFAULT false NOT NULL,
	sort_order int4 DEFAULT 0 NOT NULL,
	CONSTRAINT research_template_questions_id_not_null NOT NULL id,
	CONSTRAINT research_template_questions_is_required_not_null NOT NULL is_required,
	CONSTRAINT research_template_questions_is_research_question_not_null NOT NULL is_research_question,
	CONSTRAINT research_template_questions_pkey PRIMARY KEY (id),
	CONSTRAINT research_template_questions_question_not_null NOT NULL question,
	CONSTRAINT research_template_questions_question_type_not_null NOT NULL question_type,
	CONSTRAINT research_template_questions_section_not_null NOT NULL section,
	CONSTRAINT research_template_questions_sort_order_not_null NOT NULL sort_order,
	CONSTRAINT research_template_questions_template_id_not_null NOT NULL template_id,
	CONSTRAINT research_template_questions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.research_templates(id) ON DELETE CASCADE
);
CREATE INDEX idx_rtq_template ON public.research_template_questions USING btree (template_id);


-- public.stakeholders definition

-- Drop table

-- DROP TABLE public.stakeholders;

CREATE TABLE public.stakeholders (
	stakeholder_id serial4 NOT NULL,
	full_name varchar(150) NOT NULL,
	position_title varchar(150) NULL,
	email varchar(150) NULL,
	manager_name varchar(150) NULL,
	stakeholder_type varchar(50) DEFAULT 'Other'::character varying NULL,
	relationship_status varchar(50) DEFAULT 'Unknown'::character varying NULL,
	notes text NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	product_id int4 NULL,
	"role" varchar(255) NULL,
	influence int4 NULL,
	interest int4 NULL,
	company_id int4 NULL,
	CONSTRAINT stakeholders_full_name_not_null NOT NULL full_name,
	CONSTRAINT stakeholders_pkey PRIMARY KEY (stakeholder_id),
	CONSTRAINT stakeholders_stakeholder_id_not_null NOT NULL stakeholder_id,
	CONSTRAINT stakeholders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL
);
CREATE INDEX idx_stakeholders_company ON public.stakeholders USING btree (company_id);


-- public.team_members definition

-- Drop table

-- DROP TABLE public.team_members;

CREATE TABLE public.team_members (
	member_id serial4 NOT NULL,
	full_name varchar(150) NOT NULL,
	email varchar(255) NULL,
	resource_type varchar(30) DEFAULT 'internal'::character varying NOT NULL,
	department varchar(100) NULL,
	company varchar(150) NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	company_id int4 NULL,
	CONSTRAINT team_members_created_at_not_null NOT NULL created_at,
	CONSTRAINT team_members_full_name_not_null NOT NULL full_name,
	CONSTRAINT team_members_is_active_not_null NOT NULL is_active,
	CONSTRAINT team_members_member_id_not_null NOT NULL member_id,
	CONSTRAINT team_members_pkey PRIMARY KEY (member_id),
	CONSTRAINT team_members_resource_type_not_null NOT NULL resource_type,
	CONSTRAINT team_members_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT team_members_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL
);
CREATE INDEX idx_team_members_company ON public.team_members USING btree (company_id);


-- public.template_sections definition

-- Drop table

-- DROP TABLE public.template_sections;

CREATE TABLE public.template_sections (
	template_section_id int4 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	communication_template_id int4 NOT NULL,
	section_key varchar(80) NOT NULL, -- Identificador funcional da se????o, como EDITORIAL, RISKS ou BEFORE_AFTER.
	title varchar(200) NOT NULL,
	description text NULL,
	generation_prompt text NULL,
	display_order int4 DEFAULT 0 NOT NULL,
	is_required bool DEFAULT true NOT NULL,
	minimum_items int4 NULL,
	maximum_items int4 NULL,
	target_length int4 NULL, -- Tamanho textual esperado, normalmente medido em palavras.
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT ck_template_sections_display_order CHECK ((display_order >= 0)),
	CONSTRAINT ck_template_sections_item_range CHECK (((minimum_items IS NULL) OR (maximum_items IS NULL) OR (maximum_items >= minimum_items))),
	CONSTRAINT ck_template_sections_maximum_items CHECK (((maximum_items IS NULL) OR (maximum_items >= 0))),
	CONSTRAINT ck_template_sections_minimum_items CHECK (((minimum_items IS NULL) OR (minimum_items >= 0))),
	CONSTRAINT ck_template_sections_target_length CHECK (((target_length IS NULL) OR (target_length > 0))),
	CONSTRAINT template_sections_communication_template_id_not_null NOT NULL communication_template_id,
	CONSTRAINT template_sections_created_at_not_null NOT NULL created_at,
	CONSTRAINT template_sections_display_order_not_null NOT NULL display_order,
	CONSTRAINT template_sections_is_active_not_null NOT NULL is_active,
	CONSTRAINT template_sections_is_required_not_null NOT NULL is_required,
	CONSTRAINT template_sections_pkey PRIMARY KEY (template_section_id),
	CONSTRAINT template_sections_section_key_not_null NOT NULL section_key,
	CONSTRAINT template_sections_template_section_id_not_null NOT NULL template_section_id,
	CONSTRAINT template_sections_title_not_null NOT NULL title,
	CONSTRAINT template_sections_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT uq_template_sections_key UNIQUE (communication_template_id, section_key),
	CONSTRAINT fk_template_sections_template FOREIGN KEY (communication_template_id) REFERENCES public.communication_templates(communication_template_id) ON DELETE CASCADE
);
CREATE INDEX idx_template_sections_template_order ON public.template_sections USING btree (communication_template_id, display_order);
COMMENT ON TABLE public.template_sections IS 'Se????es padr??o pertencentes a um template de comunica????o.';

-- Column comments

COMMENT ON COLUMN public.template_sections.section_key IS 'Identificador funcional da se????o, como EDITORIAL, RISKS ou BEFORE_AFTER.';
COMMENT ON COLUMN public.template_sections.target_length IS 'Tamanho textual esperado, normalmente medido em palavras.';


-- public.user_companies definition

-- Drop table

-- DROP TABLE public.user_companies;

CREATE TABLE public.user_companies (
	id serial4 NOT NULL,
	user_id int4 NOT NULL,
	company_id int4 NOT NULL,
	"role" varchar(50) DEFAULT 'PM'::character varying NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT uq_user_company UNIQUE (user_id, company_id),
	CONSTRAINT user_companies_company_id_not_null NOT NULL company_id,
	CONSTRAINT user_companies_created_at_not_null NOT NULL created_at,
	CONSTRAINT user_companies_id_not_null NOT NULL id,
	CONSTRAINT user_companies_pkey PRIMARY KEY (id),
	CONSTRAINT user_companies_user_id_not_null NOT NULL user_id,
	CONSTRAINT user_companies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
	CONSTRAINT user_companies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);
CREATE INDEX idx_user_companies_company ON public.user_companies USING btree (company_id);
CREATE INDEX idx_user_companies_user ON public.user_companies USING btree (user_id);


-- public.wsjf_assessments definition

-- Drop table

-- DROP TABLE public.wsjf_assessments;

CREATE TABLE public.wsjf_assessments (
	assessment_id serial4 NOT NULL,
	product_id int4 NULL,
	backlog_item_id int4 NOT NULL,
	template_id int4 NOT NULL,
	status varchar(30) DEFAULT 'draft'::character varying NOT NULL,
	business_value_score int4 DEFAULT 0 NOT NULL,
	time_criticality_score int4 DEFAULT 0 NOT NULL,
	risk_reduction_score int4 DEFAULT 0 NOT NULL,
	job_size_score int4 DEFAULT 0 NOT NULL,
	cost_of_delay numeric(8, 2) DEFAULT 0 NOT NULL,
	wsjf_score numeric(10, 2) DEFAULT 0 NOT NULL,
	summary_justification text NULL,
	rationale_markdown text NULL,
	created_by varchar(150) NULL,
	updated_by varchar(150) NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	completed_at timestamp NULL,
	CONSTRAINT chk_wsjf_assessment_scores CHECK (((business_value_score = ANY (ARRAY[0, 1, 2, 3, 5, 8, 13, 21])) AND (time_criticality_score = ANY (ARRAY[0, 1, 2, 3, 5, 8, 13, 21])) AND (risk_reduction_score = ANY (ARRAY[0, 1, 2, 3, 5, 8, 13, 21])) AND (job_size_score = ANY (ARRAY[0, 1, 2, 3, 5, 8, 13, 21])))),
	CONSTRAINT chk_wsjf_assessment_status CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'final'::character varying, 'archived'::character varying])::text[]))),
	CONSTRAINT wsjf_assessments_assessment_id_not_null NOT NULL assessment_id,
	CONSTRAINT wsjf_assessments_backlog_item_id_not_null NOT NULL backlog_item_id,
	CONSTRAINT wsjf_assessments_business_value_score_not_null NOT NULL business_value_score,
	CONSTRAINT wsjf_assessments_cost_of_delay_not_null NOT NULL cost_of_delay,
	CONSTRAINT wsjf_assessments_created_at_not_null NOT NULL created_at,
	CONSTRAINT wsjf_assessments_job_size_score_not_null NOT NULL job_size_score,
	CONSTRAINT wsjf_assessments_pkey PRIMARY KEY (assessment_id),
	CONSTRAINT wsjf_assessments_risk_reduction_score_not_null NOT NULL risk_reduction_score,
	CONSTRAINT wsjf_assessments_status_not_null NOT NULL status,
	CONSTRAINT wsjf_assessments_template_id_not_null NOT NULL template_id,
	CONSTRAINT wsjf_assessments_time_criticality_score_not_null NOT NULL time_criticality_score,
	CONSTRAINT wsjf_assessments_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT wsjf_assessments_wsjf_score_not_null NOT NULL wsjf_score,
	CONSTRAINT fk_wsjf_assessments_backlog_item FOREIGN KEY (backlog_item_id) REFERENCES public.backlog_items(item_id) ON DELETE CASCADE,
	CONSTRAINT fk_wsjf_assessments_template FOREIGN KEY (template_id) REFERENCES public.wsjf_templates(template_id) ON DELETE RESTRICT
);
CREATE INDEX idx_wsjf_assessments_backlog_item ON public.wsjf_assessments USING btree (backlog_item_id, created_at DESC);
CREATE INDEX idx_wsjf_assessments_product ON public.wsjf_assessments USING btree (product_id, created_at DESC);
CREATE INDEX idx_wsjf_assessments_status ON public.wsjf_assessments USING btree (status);
CREATE INDEX idx_wsjf_assessments_template ON public.wsjf_assessments USING btree (template_id);
CREATE UNIQUE INDEX uq_wsjf_assessment_final_per_item ON public.wsjf_assessments USING btree (backlog_item_id) WHERE ((status)::text = 'final'::text);


-- public.wsjf_template_dimensions definition

-- Drop table

-- DROP TABLE public.wsjf_template_dimensions;

CREATE TABLE public.wsjf_template_dimensions (
	dimension_id serial4 NOT NULL,
	template_id int4 NOT NULL,
	code varchar(50) NOT NULL,
	"label" varchar(150) NOT NULL,
	description text NULL,
	display_order int4 DEFAULT 0 NOT NULL,
	is_required bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT chk_wsjf_dimension_code CHECK (((code)::text = ANY ((ARRAY['business_value'::character varying, 'time_criticality'::character varying, 'risk_reduction'::character varying, 'job_size'::character varying])::text[]))),
	CONSTRAINT uq_wsjf_template_dimensions_code UNIQUE (template_id, code),
	CONSTRAINT wsjf_template_dimensions_code_not_null NOT NULL code,
	CONSTRAINT wsjf_template_dimensions_created_at_not_null NOT NULL created_at,
	CONSTRAINT wsjf_template_dimensions_dimension_id_not_null NOT NULL dimension_id,
	CONSTRAINT wsjf_template_dimensions_display_order_not_null NOT NULL display_order,
	CONSTRAINT wsjf_template_dimensions_is_required_not_null NOT NULL is_required,
	CONSTRAINT wsjf_template_dimensions_label_not_null NOT NULL label,
	CONSTRAINT wsjf_template_dimensions_pkey PRIMARY KEY (dimension_id),
	CONSTRAINT wsjf_template_dimensions_template_id_not_null NOT NULL template_id,
	CONSTRAINT wsjf_template_dimensions_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT fk_wsjf_template_dimensions_template FOREIGN KEY (template_id) REFERENCES public.wsjf_templates(template_id) ON DELETE CASCADE
);
CREATE INDEX idx_wsjf_template_dimensions_template ON public.wsjf_template_dimensions USING btree (template_id, display_order);


-- public.wsjf_template_questions definition

-- Drop table

-- DROP TABLE public.wsjf_template_questions;

CREATE TABLE public.wsjf_template_questions (
	question_id serial4 NOT NULL,
	dimension_id int4 NOT NULL,
	question_text text NOT NULL,
	help_text text NULL,
	question_type varchar(30) DEFAULT 'single_choice'::character varying NOT NULL,
	display_order int4 DEFAULT 0 NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT chk_wsjf_question_type CHECK (((question_type)::text = ANY ((ARRAY['single_choice'::character varying, 'multi_choice'::character varying, 'text'::character varying])::text[]))),
	CONSTRAINT wsjf_template_questions_created_at_not_null NOT NULL created_at,
	CONSTRAINT wsjf_template_questions_dimension_id_not_null NOT NULL dimension_id,
	CONSTRAINT wsjf_template_questions_display_order_not_null NOT NULL display_order,
	CONSTRAINT wsjf_template_questions_is_active_not_null NOT NULL is_active,
	CONSTRAINT wsjf_template_questions_pkey PRIMARY KEY (question_id),
	CONSTRAINT wsjf_template_questions_question_id_not_null NOT NULL question_id,
	CONSTRAINT wsjf_template_questions_question_text_not_null NOT NULL question_text,
	CONSTRAINT wsjf_template_questions_question_type_not_null NOT NULL question_type,
	CONSTRAINT wsjf_template_questions_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT fk_wsjf_template_questions_dimension FOREIGN KEY (dimension_id) REFERENCES public.wsjf_template_dimensions(dimension_id) ON DELETE CASCADE
);
CREATE INDEX idx_wsjf_template_questions_dimension ON public.wsjf_template_questions USING btree (dimension_id, display_order);


-- public.action_items definition

-- Drop table

-- DROP TABLE public.action_items;

CREATE TABLE public.action_items (
	action_id serial4 NOT NULL,
	stakeholder_id int4 NULL,
	title varchar(200) NOT NULL,
	description text NULL,
	"owner" varchar(150) NULL,
	due_date date NULL,
	status varchar(30) DEFAULT 'Open'::character varying NULL,
	priority varchar(30) DEFAULT 'Medium'::character varying NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT action_items_action_id_not_null NOT NULL action_id,
	CONSTRAINT action_items_pkey PRIMARY KEY (action_id),
	CONSTRAINT action_items_title_not_null NOT NULL title,
	CONSTRAINT action_items_stakeholder_id_fkey FOREIGN KEY (stakeholder_id) REFERENCES public.stakeholders(stakeholder_id)
);


-- public.audiences definition

-- Drop table

-- DROP TABLE public.audiences;

CREATE TABLE public.audiences (
	audience_id int4 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	product_id int4 NULL, -- Quando nulo, a audi??ncia pode ser reutilizada globalmente.
	"name" varchar(150) NOT NULL,
	description text NULL,
	audience_type varchar(30) NOT NULL,
	preferred_language varchar(10) NULL,
	preferred_tone varchar(50) NULL,
	preferred_detail_level varchar(30) NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT audiences_audience_id_not_null NOT NULL audience_id,
	CONSTRAINT audiences_audience_type_not_null NOT NULL audience_type,
	CONSTRAINT audiences_created_at_not_null NOT NULL created_at,
	CONSTRAINT audiences_is_active_not_null NOT NULL is_active,
	CONSTRAINT audiences_name_not_null NOT NULL name,
	CONSTRAINT audiences_pkey PRIMARY KEY (audience_id),
	CONSTRAINT audiences_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT ck_audiences_type CHECK (((audience_type)::text = ANY (ARRAY[('PERSON'::character varying)::text, ('GROUP'::character varying)::text, ('BUSINESS_AREA'::character varying)::text, ('ROLE'::character varying)::text, ('COMMUNITY'::character varying)::text, ('EXTERNAL'::character varying)::text]))),
	CONSTRAINT uq_audiences_product_name UNIQUE (product_id, name),
	CONSTRAINT fk_audiences_product FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE
);
CREATE INDEX idx_audiences_product ON public.audiences USING btree (product_id);
CREATE INDEX idx_audiences_type ON public.audiences USING btree (audience_type);
COMMENT ON TABLE public.audiences IS 'P??blicos l??gicos aos quais uma publica????o pode ser direcionada.';

-- Column comments

COMMENT ON COLUMN public.audiences.product_id IS 'Quando nulo, a audi??ncia pode ser reutilizada globalmente.';


-- public.business_areas definition

-- Drop table

-- DROP TABLE public.business_areas;

CREATE TABLE public.business_areas (
	id serial4 NOT NULL,
	area_name varchar(150) NOT NULL,
	area_description varchar(400) NULL,
	area_color varchar(30) DEFAULT NULL::character varying NULL,
	display_order int4 DEFAULT 0 NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	product_id int4 NULL,
	area_type varchar(50) DEFAULT 'OPERATIONAL'::character varying NOT NULL,
	parent_area_id int4 NULL,
	"level" int4 DEFAULT 0 NOT NULL,
	CONSTRAINT business_areas_area_name_not_null NOT NULL area_name,
	CONSTRAINT business_areas_area_type_not_null NOT NULL area_type,
	CONSTRAINT business_areas_created_at_not_null NOT NULL created_at,
	CONSTRAINT business_areas_display_order_not_null NOT NULL display_order,
	CONSTRAINT business_areas_id_not_null NOT NULL id,
	CONSTRAINT business_areas_is_active_not_null NOT NULL is_active,
	CONSTRAINT business_areas_level_not_null NOT NULL level,
	CONSTRAINT business_areas_pkey PRIMARY KEY (id),
	CONSTRAINT business_areas_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT business_areas_parent_area_id_fkey FOREIGN KEY (parent_area_id) REFERENCES public.business_areas(id) ON DELETE SET NULL,
	CONSTRAINT business_areas_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE
);
CREATE INDEX idx_ba_active ON public.business_areas USING btree (is_active);
CREATE INDEX idx_ba_parent ON public.business_areas USING btree (parent_area_id);
CREATE INDEX idx_ba_type ON public.business_areas USING btree (area_type);
CREATE INDEX idx_business_areas_product ON public.business_areas USING btree (product_id);
COMMENT ON TABLE public.business_areas IS 'Áreas de negócio / equipes donas dos processos e requisitos. Usadas como swimlanes no Process Mapping.';


-- public.communications definition

-- Drop table

-- DROP TABLE public.communications;

CREATE TABLE public.communications (
	communication_id int4 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	product_id int4 NOT NULL,
	communication_type_id int4 NOT NULL,
	communication_template_id int4 NULL,
	"name" varchar(180) NOT NULL,
	description text NULL,
	objective text NOT NULL,
	trigger_type varchar(20) NOT NULL, -- Origem da comunica????o: SCHEDULED, EVENT ou MANUAL.
	default_language varchar(10) NULL,
	default_tone varchar(50) NULL,
	default_detail_level varchar(30) NULL,
	status varchar(20) DEFAULT 'DRAFT'::character varying NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	report_kind varchar(60) NULL,
	report_scope jsonb NULL,
	supported_export_formats jsonb NULL,
	CONSTRAINT ck_communications_status CHECK (((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('ACTIVE'::character varying)::text, ('INACTIVE'::character varying)::text, ('ARCHIVED'::character varying)::text]))),
	CONSTRAINT ck_communications_trigger_type CHECK (((trigger_type)::text = ANY (ARRAY[('SCHEDULED'::character varying)::text, ('EVENT'::character varying)::text, ('MANUAL'::character varying)::text]))),
	CONSTRAINT communications_communication_id_not_null NOT NULL communication_id,
	CONSTRAINT communications_communication_type_id_not_null NOT NULL communication_type_id,
	CONSTRAINT communications_created_at_not_null NOT NULL created_at,
	CONSTRAINT communications_is_active_not_null NOT NULL is_active,
	CONSTRAINT communications_name_not_null NOT NULL name,
	CONSTRAINT communications_objective_not_null NOT NULL objective,
	CONSTRAINT communications_pkey PRIMARY KEY (communication_id),
	CONSTRAINT communications_product_id_not_null NOT NULL product_id,
	CONSTRAINT communications_status_not_null NOT NULL status,
	CONSTRAINT communications_trigger_type_not_null NOT NULL trigger_type,
	CONSTRAINT communications_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT uq_communications_product_name UNIQUE (product_id, name),
	CONSTRAINT fk_communications_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL,
	CONSTRAINT fk_communications_product FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE RESTRICT,
	CONSTRAINT fk_communications_template FOREIGN KEY (communication_template_id) REFERENCES public.communication_templates(communication_template_id) ON DELETE SET NULL,
	CONSTRAINT fk_communications_type FOREIGN KEY (communication_type_id) REFERENCES public.communication_types(communication_type_id) ON DELETE RESTRICT,
	CONSTRAINT fk_communications_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL
);
CREATE INDEX idx_communications_product ON public.communications USING btree (product_id);
CREATE INDEX idx_communications_status ON public.communications USING btree (status);
CREATE INDEX idx_communications_template ON public.communications USING btree (communication_template_id);
CREATE INDEX idx_communications_type ON public.communications USING btree (communication_type_id);
COMMENT ON TABLE public.communications IS 'Defini????es permanentes de comunica????o associadas aos produtos.';

-- Column comments

COMMENT ON COLUMN public.communications.trigger_type IS 'Origem da comunica????o: SCHEDULED, EVENT ou MANUAL.';


-- public.company_area_members definition

-- Drop table

-- DROP TABLE public.company_area_members;

CREATE TABLE public.company_area_members (
	id serial4 NOT NULL,
	company_id int4 NOT NULL,
	business_area_id int4 NOT NULL,
	stakeholder_id int4 NOT NULL,
	role_in_area varchar(100) NULL,
	is_active bool DEFAULT true NOT NULL,
	notes text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	leadership_level varchar(50) NULL,
	is_current bool DEFAULT true NOT NULL,
	started_at date DEFAULT CURRENT_DATE NOT NULL,
	ended_at date NULL,
	reports_to_member_id int4 NULL,
	CONSTRAINT company_area_members_business_area_id_not_null NOT NULL business_area_id,
	CONSTRAINT company_area_members_company_id_not_null NOT NULL company_id,
	CONSTRAINT company_area_members_created_at_not_null NOT NULL created_at,
	CONSTRAINT company_area_members_id_not_null NOT NULL id,
	CONSTRAINT company_area_members_is_active_not_null NOT NULL is_active,
	CONSTRAINT company_area_members_is_current_not_null NOT NULL is_current,
	CONSTRAINT company_area_members_pkey PRIMARY KEY (id),
	CONSTRAINT company_area_members_stakeholder_id_not_null NOT NULL stakeholder_id,
	CONSTRAINT company_area_members_started_at_not_null NOT NULL started_at,
	CONSTRAINT company_area_members_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT uq_company_area_member UNIQUE (company_id, business_area_id, stakeholder_id),
	CONSTRAINT company_area_members_business_area_id_fkey FOREIGN KEY (business_area_id) REFERENCES public.business_areas(id) ON DELETE CASCADE,
	CONSTRAINT company_area_members_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
	CONSTRAINT company_area_members_reports_to_member_id_fkey FOREIGN KEY (reports_to_member_id) REFERENCES public.company_area_members(id) ON DELETE SET NULL,
	CONSTRAINT company_area_members_stakeholder_id_fkey FOREIGN KEY (stakeholder_id) REFERENCES public.stakeholders(stakeholder_id) ON DELETE CASCADE
);
CREATE INDEX idx_cam_active ON public.company_area_members USING btree (is_active);
CREATE INDEX idx_cam_area ON public.company_area_members USING btree (business_area_id);
CREATE INDEX idx_cam_company ON public.company_area_members USING btree (company_id);
CREATE INDEX idx_cam_current ON public.company_area_members USING btree (is_current);
CREATE INDEX idx_cam_leader ON public.company_area_members USING btree (leadership_level) WHERE (leadership_level IS NOT NULL);
CREATE INDEX idx_cam_reports_to ON public.company_area_members USING btree (reports_to_member_id);
CREATE INDEX idx_cam_stakeholder ON public.company_area_members USING btree (stakeholder_id);


-- public.company_business_areas definition

-- Drop table

-- DROP TABLE public.company_business_areas;

CREATE TABLE public.company_business_areas (
	id serial4 NOT NULL,
	company_id int4 NOT NULL,
	business_area_id int4 NOT NULL,
	notes text NULL,
	is_active bool DEFAULT true NOT NULL,
	display_order int4 DEFAULT 0 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT company_business_areas_business_area_id_not_null NOT NULL business_area_id,
	CONSTRAINT company_business_areas_company_id_not_null NOT NULL company_id,
	CONSTRAINT company_business_areas_created_at_not_null NOT NULL created_at,
	CONSTRAINT company_business_areas_id_not_null NOT NULL id,
	CONSTRAINT company_business_areas_is_active_not_null NOT NULL is_active,
	CONSTRAINT company_business_areas_pkey PRIMARY KEY (id),
	CONSTRAINT company_business_areas_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT uq_company_area UNIQUE (company_id, business_area_id),
	CONSTRAINT company_business_areas_business_area_id_fkey FOREIGN KEY (business_area_id) REFERENCES public.business_areas(id) ON DELETE CASCADE,
	CONSTRAINT company_business_areas_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);
CREATE INDEX idx_cba_active ON public.company_business_areas USING btree (is_active);
CREATE INDEX idx_cba_area ON public.company_business_areas USING btree (business_area_id);
CREATE INDEX idx_cba_company ON public.company_business_areas USING btree (company_id);


-- public.discovery_opportunities definition

-- Drop table

-- DROP TABLE public.discovery_opportunities;

CREATE TABLE public.discovery_opportunities (
	id varchar(36) NOT NULL,
	product_id int4 NOT NULL,
	title varchar(300) NOT NULL,
	description text NULL,
	origin varchar(200) NULL,
	identified_at date NULL,
	status public.opportunity_status DEFAULT 'identified'::opportunity_status NOT NULL,
	priority int4 DEFAULT 3 NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	responsible_stakeholder_id int4 NULL,
	impacted_area_id int4 NULL,
	journey_stage varchar(30) DEFAULT 'capture'::character varying NOT NULL,
	lifecycle_status varchar(30) DEFAULT 'active'::character varying NOT NULL,
	CONSTRAINT discovery_opportunities_created_at_not_null NOT NULL created_at,
	CONSTRAINT discovery_opportunities_id_not_null NOT NULL id,
	CONSTRAINT discovery_opportunities_journey_stage_not_null NOT NULL journey_stage,
	CONSTRAINT discovery_opportunities_lifecycle_status_not_null NOT NULL lifecycle_status,
	CONSTRAINT discovery_opportunities_pkey PRIMARY KEY (id),
	CONSTRAINT discovery_opportunities_priority_not_null NOT NULL priority,
	CONSTRAINT discovery_opportunities_product_id_not_null NOT NULL product_id,
	CONSTRAINT discovery_opportunities_status_not_null NOT NULL status,
	CONSTRAINT discovery_opportunities_title_not_null NOT NULL title,
	CONSTRAINT discovery_opportunities_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT fk_disco_opp_product FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE
);
CREATE INDEX idx_disco_opp_area ON public.discovery_opportunities USING btree (impacted_area_id);
CREATE INDEX idx_disco_opp_product ON public.discovery_opportunities USING btree (product_id);
CREATE INDEX idx_disco_opp_responsible ON public.discovery_opportunities USING btree (responsible_stakeholder_id);
CREATE INDEX idx_disco_opp_status ON public.discovery_opportunities USING btree (status);


-- public.discovery_opportunity_areas definition

-- Drop table

-- DROP TABLE public.discovery_opportunity_areas;

CREATE TABLE public.discovery_opportunity_areas (
	id varchar(36) DEFAULT gen_random_uuid()::text NOT NULL,
	opportunity_id varchar(36) NOT NULL,
	area_id int4 NOT NULL,
	impact_type varchar(20) DEFAULT 'direct'::character varying NOT NULL,
	is_primary bool DEFAULT false NOT NULL,
	notes text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT discovery_opportunity_areas_area_id_not_null NOT NULL area_id,
	CONSTRAINT discovery_opportunity_areas_created_at_not_null NOT NULL created_at,
	CONSTRAINT discovery_opportunity_areas_id_not_null NOT NULL id,
	CONSTRAINT discovery_opportunity_areas_impact_type_not_null NOT NULL impact_type,
	CONSTRAINT discovery_opportunity_areas_is_primary_not_null NOT NULL is_primary,
	CONSTRAINT discovery_opportunity_areas_opportunity_id_not_null NOT NULL opportunity_id,
	CONSTRAINT discovery_opportunity_areas_pkey PRIMARY KEY (id),
	CONSTRAINT uq_opp_area UNIQUE (opportunity_id, area_id),
	CONSTRAINT fk_opp_area_area FOREIGN KEY (area_id) REFERENCES public.business_areas(id) ON DELETE CASCADE,
	CONSTRAINT fk_opp_area_opp FOREIGN KEY (opportunity_id) REFERENCES public.discovery_opportunities(id) ON DELETE CASCADE
);
CREATE INDEX idx_opp_areas_area ON public.discovery_opportunity_areas USING btree (area_id);
CREATE INDEX idx_opp_areas_opp ON public.discovery_opportunity_areas USING btree (opportunity_id);


-- public.discovery_problem_statements definition

-- Drop table

-- DROP TABLE public.discovery_problem_statements;

CREATE TABLE public.discovery_problem_statements (
	id varchar(36) NOT NULL,
	opportunity_id varchar(36) NOT NULL,
	observed_problem text NULL,
	who_is_affected text NULL,
	current_impact text NULL,
	available_evidence text NULL,
	consequence_of_inaction text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT discovery_problem_statements_created_at_not_null NOT NULL created_at,
	CONSTRAINT discovery_problem_statements_id_not_null NOT NULL id,
	CONSTRAINT discovery_problem_statements_opportunity_id_not_null NOT NULL opportunity_id,
	CONSTRAINT discovery_problem_statements_pkey PRIMARY KEY (id),
	CONSTRAINT discovery_problem_statements_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT uq_disco_ps_opportunity UNIQUE (opportunity_id),
	CONSTRAINT fk_disco_ps_opportunity FOREIGN KEY (opportunity_id) REFERENCES public.discovery_opportunities(id) ON DELETE CASCADE
);
CREATE INDEX idx_disco_ps_opp ON public.discovery_problem_statements USING btree (opportunity_id);


-- public.discovery_research definition

-- Drop table

-- DROP TABLE public.discovery_research;

CREATE TABLE public.discovery_research (
	id varchar(36) NOT NULL,
	opportunity_id varchar(36) NOT NULL,
	research_type public.research_type NOT NULL,
	participants text NULL,
	research_date date NULL,
	questions text NULL,
	findings text NULL,
	evidence text NULL,
	"source" varchar(300) NULL,
	reliability public.reliability_level DEFAULT 'medium'::reliability_level NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	template_id varchar(36) NULL,
	objective text NULL,
	research_questions text NULL,
	consent_obtained bool DEFAULT false NULL,
	duration_minutes int4 NULL,
	context text NULL,
	summary text NULL,
	session_status varchar(20) DEFAULT 'planned'::character varying NOT NULL,
	CONSTRAINT discovery_research_created_at_not_null NOT NULL created_at,
	CONSTRAINT discovery_research_id_not_null NOT NULL id,
	CONSTRAINT discovery_research_opportunity_id_not_null NOT NULL opportunity_id,
	CONSTRAINT discovery_research_pkey PRIMARY KEY (id),
	CONSTRAINT discovery_research_reliability_not_null NOT NULL reliability,
	CONSTRAINT discovery_research_research_type_not_null NOT NULL research_type,
	CONSTRAINT discovery_research_session_status_not_null NOT NULL session_status,
	CONSTRAINT discovery_research_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT discovery_research_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.research_templates(id) ON DELETE SET NULL,
	CONSTRAINT fk_disco_research_opportunity FOREIGN KEY (opportunity_id) REFERENCES public.discovery_opportunities(id) ON DELETE CASCADE
);
CREATE INDEX idx_disco_research_opp ON public.discovery_research USING btree (opportunity_id);
CREATE INDEX idx_disco_research_type ON public.discovery_research USING btree (research_type);


-- public.discovery_solution_ideas definition

-- Drop table

-- DROP TABLE public.discovery_solution_ideas;

CREATE TABLE public.discovery_solution_ideas (
	id varchar(36) NOT NULL,
	opportunity_id varchar(36) NOT NULL,
	idea varchar(300) NOT NULL,
	description text NULL,
	related_problem text NULL,
	expected_benefit text NULL,
	estimated_complexity public.solution_complexity DEFAULT 'medium'::solution_complexity NOT NULL,
	risks text NULL,
	dependencies text NULL,
	status public.solution_status DEFAULT 'idea'::solution_status NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT discovery_solution_ideas_created_at_not_null NOT NULL created_at,
	CONSTRAINT discovery_solution_ideas_estimated_complexity_not_null NOT NULL estimated_complexity,
	CONSTRAINT discovery_solution_ideas_id_not_null NOT NULL id,
	CONSTRAINT discovery_solution_ideas_idea_not_null NOT NULL idea,
	CONSTRAINT discovery_solution_ideas_opportunity_id_not_null NOT NULL opportunity_id,
	CONSTRAINT discovery_solution_ideas_pkey PRIMARY KEY (id),
	CONSTRAINT discovery_solution_ideas_status_not_null NOT NULL status,
	CONSTRAINT discovery_solution_ideas_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT fk_disco_solution_opportunity FOREIGN KEY (opportunity_id) REFERENCES public.discovery_opportunities(id) ON DELETE CASCADE
);
CREATE INDEX idx_disco_solution_opp ON public.discovery_solution_ideas USING btree (opportunity_id);
CREATE INDEX idx_disco_solution_status ON public.discovery_solution_ideas USING btree (status);


-- public.discovery_success_metrics definition

-- Drop table

-- DROP TABLE public.discovery_success_metrics;

CREATE TABLE public.discovery_success_metrics (
	id varchar(36) NOT NULL,
	opportunity_id varchar(36) NOT NULL,
	metric varchar(300) NOT NULL,
	metric_type public.metric_type NOT NULL,
	baseline varchar(200) NULL,
	"target" varchar(200) NULL,
	data_source varchar(200) NULL,
	measurement_frequency varchar(100) NULL,
	responsible varchar(150) NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT discovery_success_metrics_created_at_not_null NOT NULL created_at,
	CONSTRAINT discovery_success_metrics_id_not_null NOT NULL id,
	CONSTRAINT discovery_success_metrics_metric_not_null NOT NULL metric,
	CONSTRAINT discovery_success_metrics_metric_type_not_null NOT NULL metric_type,
	CONSTRAINT discovery_success_metrics_opportunity_id_not_null NOT NULL opportunity_id,
	CONSTRAINT discovery_success_metrics_pkey PRIMARY KEY (id),
	CONSTRAINT discovery_success_metrics_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT fk_disco_metric_opportunity FOREIGN KEY (opportunity_id) REFERENCES public.discovery_opportunities(id) ON DELETE CASCADE
);
CREATE INDEX idx_disco_metric_opp ON public.discovery_success_metrics USING btree (opportunity_id);
CREATE INDEX idx_disco_metric_type ON public.discovery_success_metrics USING btree (metric_type);


-- public.integration_connections definition

-- Drop table

-- DROP TABLE public.integration_connections;

CREATE TABLE public.integration_connections (
	id varchar(36) DEFAULT gen_random_uuid()::text NOT NULL,
	"name" varchar(200) NOT NULL,
	description text NULL,
	provider public.integration_provider NOT NULL,
	"scope" public.integration_scope NOT NULL,
	company_id int4 NULL,
	product_id int4 NULL,
	params jsonb DEFAULT '{}'::jsonb NOT NULL, -- Parâmetros públicos da conexão em JSON (org, project, model, endpoint...).
	secrets jsonb DEFAULT '{}'::jsonb NOT NULL, -- Credenciais encriptadas em JSON (PAT, api_key, token...). NUNCA expor via API.
	is_active bool DEFAULT true NOT NULL,
	last_sync_at timestamp NULL,
	last_error text NULL,
	sync_cursor text NULL, -- Ponteiro de posição para sincronizações incrementais (continuation token, timestamp, etc.).
	created_by int4 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT ck_ic_scope_refs CHECK ((((scope = 'global'::integration_scope) AND (company_id IS NULL) AND (product_id IS NULL)) OR ((scope = 'company'::integration_scope) AND (company_id IS NOT NULL) AND (product_id IS NULL)) OR ((scope = 'product'::integration_scope) AND (product_id IS NOT NULL)))),
	CONSTRAINT integration_connections_created_at_not_null NOT NULL created_at,
	CONSTRAINT integration_connections_id_not_null NOT NULL id,
	CONSTRAINT integration_connections_is_active_not_null NOT NULL is_active,
	CONSTRAINT integration_connections_name_not_null NOT NULL name,
	CONSTRAINT integration_connections_params_not_null NOT NULL params,
	CONSTRAINT integration_connections_pkey PRIMARY KEY (id),
	CONSTRAINT integration_connections_provider_not_null NOT NULL provider,
	CONSTRAINT integration_connections_scope_not_null NOT NULL scope,
	CONSTRAINT integration_connections_secrets_not_null NOT NULL secrets,
	CONSTRAINT integration_connections_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT fk_ic_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
	CONSTRAINT fk_ic_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL,
	CONSTRAINT fk_ic_product FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE
);
CREATE INDEX idx_ic_active ON public.integration_connections USING btree (is_active);
CREATE INDEX idx_ic_company ON public.integration_connections USING btree (company_id);
CREATE INDEX idx_ic_product ON public.integration_connections USING btree (product_id);
CREATE INDEX idx_ic_provider ON public.integration_connections USING btree (provider);
CREATE INDEX idx_ic_scope ON public.integration_connections USING btree (scope);
COMMENT ON TABLE public.integration_connections IS 'Conexões com sistemas externos (ADO, OpenAI, Jira, etc.) com escopo global / empresa / produto.';

-- Column comments

COMMENT ON COLUMN public.integration_connections.params IS 'Parâmetros públicos da conexão em JSON (org, project, model, endpoint...).';
COMMENT ON COLUMN public.integration_connections.secrets IS 'Credenciais encriptadas em JSON (PAT, api_key, token...). NUNCA expor via API.';
COMMENT ON COLUMN public.integration_connections.sync_cursor IS 'Ponteiro de posição para sincronizações incrementais (continuation token, timestamp, etc.).';


-- public.integration_sync_logs definition

-- Drop table

-- DROP TABLE public.integration_sync_logs;

CREATE TABLE public.integration_sync_logs (
	id varchar(36) DEFAULT gen_random_uuid()::text NOT NULL,
	connection_id varchar(36) NOT NULL,
	status varchar(20) DEFAULT 'running'::character varying NOT NULL,
	started_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	finished_at timestamp NULL,
	items_created int4 DEFAULT 0 NOT NULL,
	items_updated int4 DEFAULT 0 NOT NULL,
	items_skipped int4 DEFAULT 0 NOT NULL,
	error_message text NULL,
	details jsonb NULL,
	triggered_by int4 NULL,
	operation_type varchar(20) DEFAULT 'full_sync'::character varying NOT NULL,
	CONSTRAINT ck_isl_status CHECK (((status)::text = ANY (ARRAY[('running'::character varying)::text, ('completed'::character varying)::text, ('failed'::character varying)::text, ('partial'::character varying)::text]))),
	CONSTRAINT integration_sync_logs_connection_id_not_null NOT NULL connection_id,
	CONSTRAINT integration_sync_logs_id_not_null NOT NULL id,
	CONSTRAINT integration_sync_logs_items_created_not_null NOT NULL items_created,
	CONSTRAINT integration_sync_logs_items_skipped_not_null NOT NULL items_skipped,
	CONSTRAINT integration_sync_logs_items_updated_not_null NOT NULL items_updated,
	CONSTRAINT integration_sync_logs_operation_type_not_null NOT NULL operation_type,
	CONSTRAINT integration_sync_logs_pkey PRIMARY KEY (id),
	CONSTRAINT integration_sync_logs_started_at_not_null NOT NULL started_at,
	CONSTRAINT integration_sync_logs_status_not_null NOT NULL status,
	CONSTRAINT fk_isl_connection FOREIGN KEY (connection_id) REFERENCES public.integration_connections(id) ON DELETE CASCADE,
	CONSTRAINT fk_isl_triggered_by FOREIGN KEY (triggered_by) REFERENCES public.users(user_id) ON DELETE SET NULL
);
CREATE INDEX idx_isl_connection ON public.integration_sync_logs USING btree (connection_id);
CREATE INDEX idx_isl_started_at ON public.integration_sync_logs USING btree (started_at);
CREATE INDEX idx_isl_status ON public.integration_sync_logs USING btree (status);
COMMENT ON TABLE public.integration_sync_logs IS 'Histórico de execuções de sincronização de integrações.';


-- public.meeting_summaries definition

-- Drop table

-- DROP TABLE public.meeting_summaries;

CREATE TABLE public.meeting_summaries (
	id varchar(36) NOT NULL,
	meeting_id varchar(36) NOT NULL,
	session_id varchar(36) NULL,
	transcript_id varchar(36) NULL,
	title varchar(300) NOT NULL,
	summary_type public.summarytype NOT NULL,
	"content" text NOT NULL,
	created_by varchar(200) NULL,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL,
	CONSTRAINT meeting_summaries_content_not_null NOT NULL content,
	CONSTRAINT meeting_summaries_created_at_not_null NOT NULL created_at,
	CONSTRAINT meeting_summaries_id_not_null NOT NULL id,
	CONSTRAINT meeting_summaries_meeting_id_not_null NOT NULL meeting_id,
	CONSTRAINT meeting_summaries_pkey PRIMARY KEY (id),
	CONSTRAINT meeting_summaries_summary_type_not_null NOT NULL summary_type,
	CONSTRAINT meeting_summaries_title_not_null NOT NULL title,
	CONSTRAINT meeting_summaries_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT meeting_summaries_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE,
	CONSTRAINT meeting_summaries_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.meeting_sessions(id) ON DELETE CASCADE,
	CONSTRAINT meeting_summaries_transcript_id_fkey FOREIGN KEY (transcript_id) REFERENCES public.meeting_transcripts(id) ON DELETE SET NULL
);
CREATE INDEX ix_meeting_summaries_meeting_id ON public.meeting_summaries USING btree (meeting_id);
CREATE INDEX ix_meeting_summaries_session_id ON public.meeting_summaries USING btree (session_id);
CREATE INDEX ix_meeting_summaries_transcript_id ON public.meeting_summaries USING btree (transcript_id);


-- public.opportunity_assessments definition

-- Drop table

-- DROP TABLE public.opportunity_assessments;

CREATE TABLE public.opportunity_assessments (
	id varchar(36) NOT NULL,
	opportunity_id varchar(36) NOT NULL,
	assessment_type public.opportunityassessmenttype NOT NULL,
	problem_clarity public.assessmentlevel NOT NULL,
	evidence_strength public.assessmentlevel NOT NULL,
	business_impact public.assessmentlevel NOT NULL,
	expected_outcome_clarity public.assessmentlevel NOT NULL,
	potential_business_value public.assessmentlevel NOT NULL,
	strategic_alignment public.assessmentlevel NOT NULL,
	urgency public.assessmentlevel NOT NULL,
	business_uncertainty public.assessmentlevel NOT NULL,
	solution_uncertainty public.assessmentlevel NOT NULL,
	initial_viability public.assessmentlevel NOT NULL,
	recommendation public.opportunityassessmentrecommendation NULL,
	rationale text NULL,
	assessed_by varchar(200) NULL,
	assessed_at timestamp NULL,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL,
	CONSTRAINT opportunity_assessments_assessment_type_not_null NOT NULL assessment_type,
	CONSTRAINT opportunity_assessments_business_impact_not_null NOT NULL business_impact,
	CONSTRAINT opportunity_assessments_business_uncertainty_not_null NOT NULL business_uncertainty,
	CONSTRAINT opportunity_assessments_created_at_not_null NOT NULL created_at,
	CONSTRAINT opportunity_assessments_evidence_strength_not_null NOT NULL evidence_strength,
	CONSTRAINT opportunity_assessments_expected_outcome_clarity_not_null NOT NULL expected_outcome_clarity,
	CONSTRAINT opportunity_assessments_id_not_null NOT NULL id,
	CONSTRAINT opportunity_assessments_initial_viability_not_null NOT NULL initial_viability,
	CONSTRAINT opportunity_assessments_opportunity_id_not_null NOT NULL opportunity_id,
	CONSTRAINT opportunity_assessments_pkey PRIMARY KEY (id),
	CONSTRAINT opportunity_assessments_potential_business_value_not_null NOT NULL potential_business_value,
	CONSTRAINT opportunity_assessments_problem_clarity_not_null NOT NULL problem_clarity,
	CONSTRAINT opportunity_assessments_solution_uncertainty_not_null NOT NULL solution_uncertainty,
	CONSTRAINT opportunity_assessments_strategic_alignment_not_null NOT NULL strategic_alignment,
	CONSTRAINT opportunity_assessments_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT opportunity_assessments_urgency_not_null NOT NULL urgency,
	CONSTRAINT opportunity_assessments_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.discovery_opportunities(id) ON DELETE CASCADE
);
CREATE INDEX idx_oppass_assessed_at ON public.opportunity_assessments USING btree (assessed_at);
CREATE INDEX idx_oppass_opp ON public.opportunity_assessments USING btree (opportunity_id);
CREATE INDEX ix_opportunity_assessments_opportunity_id ON public.opportunity_assessments USING btree (opportunity_id);


-- public.opportunity_sources definition

-- Drop table

-- DROP TABLE public.opportunity_sources;

CREATE TABLE public.opportunity_sources (
	id varchar(36) NOT NULL,
	opportunity_id varchar(36) NOT NULL,
	source_type public.opportunitysourcetype NOT NULL,
	source_system varchar(200) NULL,
	external_reference varchar(200) NULL,
	external_url varchar(500) NULL,
	requester_reference varchar(200) NULL,
	requester_name varchar(200) NULL,
	sponsor_reference varchar(200) NULL,
	sponsor_name varchar(200) NULL,
	received_at timestamp NULL,
	original_context text NULL,
	is_primary bool NOT NULL,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL,
	CONSTRAINT opportunity_sources_created_at_not_null NOT NULL created_at,
	CONSTRAINT opportunity_sources_id_not_null NOT NULL id,
	CONSTRAINT opportunity_sources_is_primary_not_null NOT NULL is_primary,
	CONSTRAINT opportunity_sources_opportunity_id_not_null NOT NULL opportunity_id,
	CONSTRAINT opportunity_sources_pkey PRIMARY KEY (id),
	CONSTRAINT opportunity_sources_source_type_not_null NOT NULL source_type,
	CONSTRAINT opportunity_sources_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT opportunity_sources_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.discovery_opportunities(id) ON DELETE CASCADE
);
CREATE INDEX idx_oppsrc_opp ON public.opportunity_sources USING btree (opportunity_id);
CREATE INDEX idx_oppsrc_primary ON public.opportunity_sources USING btree (opportunity_id, is_primary);
CREATE INDEX ix_opportunity_sources_opportunity_id ON public.opportunity_sources USING btree (opportunity_id);


-- public.process definition

-- Drop table

-- DROP TABLE public.process;

CREATE TABLE public.process (
	process_id int8 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	product_id int8 NULL,
	business_area_id int8 NULL,
	process_name varchar(200) NOT NULL,
	process_description text NULL,
	process_version varchar(30) DEFAULT '1.0'::character varying NOT NULL,
	process_type varchar(20) DEFAULT 'AS_IS'::character varying NOT NULL,
	process_status varchar(20) DEFAULT 'DRAFT'::character varying NOT NULL,
	process_owner varchar(150) NULL,
	process_trigger text NULL,
	process_outcome text NULL,
	created_by int8 NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_by int8 NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	is_deleted bool DEFAULT false NOT NULL,
	CONSTRAINT ck_tbprocess_status CHECK (((process_status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('VALIDATED'::character varying)::text, ('APPROVED'::character varying)::text, ('ARCHIVED'::character varying)::text]))),
	CONSTRAINT ck_tbprocess_type CHECK (((process_type)::text = ANY (ARRAY[('AS_IS'::character varying)::text, ('TO_BE'::character varying)::text]))),
	CONSTRAINT process_created_at_not_null NOT NULL created_at,
	CONSTRAINT process_is_deleted_not_null NOT NULL is_deleted,
	CONSTRAINT process_pkey PRIMARY KEY (process_id),
	CONSTRAINT process_process_id_not_null NOT NULL process_id,
	CONSTRAINT process_process_name_not_null NOT NULL process_name,
	CONSTRAINT process_process_status_not_null NOT NULL process_status,
	CONSTRAINT process_process_type_not_null NOT NULL process_type,
	CONSTRAINT process_process_version_not_null NOT NULL process_version,
	CONSTRAINT process_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT uq_tbprocess_name_version UNIQUE (product_id, process_name, process_version),
	CONSTRAINT fk_process_business_area FOREIGN KEY (business_area_id) REFERENCES public.business_areas(id) ON DELETE SET NULL
);
CREATE INDEX ix_process_business_area ON public.process USING btree (business_area_id);
CREATE INDEX ix_process_product ON public.process USING btree (product_id);
CREATE INDEX ix_process_status ON public.process USING btree (process_status);
CREATE INDEX ix_process_type ON public.process USING btree (process_type);

-- Table Triggers

create trigger trg_process_updated_at before
update
    on
    public.process for each row execute function fn_set_updated_at();


-- public.processes definition

-- Drop table

-- DROP TABLE public.processes;

CREATE TABLE public.processes (
	id serial4 NOT NULL,
	product_id int4 NULL,
	business_area_id int4 NULL,
	process_name varchar(200) NOT NULL,
	process_description text NULL,
	process_version varchar(30) NOT NULL,
	process_type varchar(20) NOT NULL,
	process_status varchar(20) NOT NULL,
	process_owner varchar(150) NULL,
	process_trigger text NULL,
	process_outcome text NULL,
	created_by int4 NULL,
	created_at timestamp NOT NULL,
	updated_by int4 NULL,
	updated_at timestamp NOT NULL,
	is_deleted bool NOT NULL,
	is_macro bool DEFAULT false NOT NULL,
	process_scope varchar(20) DEFAULT 'PRODUCT'::character varying NOT NULL,
	CONSTRAINT processes_created_at_not_null NOT NULL created_at,
	CONSTRAINT processes_id_not_null NOT NULL id,
	CONSTRAINT processes_is_deleted_not_null NOT NULL is_deleted,
	CONSTRAINT processes_is_macro_not_null NOT NULL is_macro,
	CONSTRAINT processes_pkey PRIMARY KEY (id),
	CONSTRAINT processes_process_name_not_null NOT NULL process_name,
	CONSTRAINT processes_process_scope_not_null NOT NULL process_scope,
	CONSTRAINT processes_process_status_not_null NOT NULL process_status,
	CONSTRAINT processes_process_type_not_null NOT NULL process_type,
	CONSTRAINT processes_process_version_not_null NOT NULL process_version,
	CONSTRAINT processes_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT fk_proc_ba FOREIGN KEY (business_area_id) REFERENCES public.business_areas(id) ON DELETE SET NULL,
	CONSTRAINT fk_processes_business_area FOREIGN KEY (business_area_id) REFERENCES public.business_areas(id) ON DELETE SET NULL
);
CREATE INDEX idx_proc_product ON public.processes USING btree (product_id);
CREATE INDEX idx_proc_status ON public.processes USING btree (process_status);
CREATE INDEX ix_processes_business_area_id ON public.processes USING btree (business_area_id);
CREATE INDEX ix_processes_product_id ON public.processes USING btree (product_id);


-- public.product_capabilities definition

-- Drop table

-- DROP TABLE public.product_capabilities;

CREATE TABLE public.product_capabilities (
	capability_id serial4 NOT NULL,
	product_id int4 NOT NULL,
	"name" varchar(150) NOT NULL,
	description text NULL,
	is_active bool DEFAULT true NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT product_capabilities_capability_id_not_null NOT NULL capability_id,
	CONSTRAINT product_capabilities_name_not_null NOT NULL name,
	CONSTRAINT product_capabilities_pkey PRIMARY KEY (capability_id),
	CONSTRAINT product_capabilities_product_id_not_null NOT NULL product_id,
	CONSTRAINT product_capabilities_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id)
);


-- public.product_features definition

-- Drop table

-- DROP TABLE public.product_features;

CREATE TABLE public.product_features (
	feature_id serial4 NOT NULL,
	capability_id int4 NULL,
	title varchar(200) NOT NULL,
	description text NULL,
	business_area varchar(100) NULL,
	current_status varchar(30) DEFAULT 'Backlog'::character varying NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT product_features_feature_id_not_null NOT NULL feature_id,
	CONSTRAINT product_features_pkey PRIMARY KEY (feature_id),
	CONSTRAINT product_features_title_not_null NOT NULL title,
	CONSTRAINT product_features_capability_id_fkey FOREIGN KEY (capability_id) REFERENCES public.product_capabilities(capability_id)
);


-- public.product_impacts definition

-- Drop table

-- DROP TABLE public.product_impacts;

CREATE TABLE public.product_impacts (
	impact_id serial4 NOT NULL,
	product_id int4 NULL,
	feature_id int4 NULL,
	backlog_item_id int4 NULL,
	vpc_id int4 NULL,
	title varchar(200) NOT NULL,
	impacted_area varchar(120) NULL,
	impacted_team varchar(120) NULL,
	before_scenario text NULL,
	after_scenario text NULL,
	impact_summary text NOT NULL,
	metric_name varchar(120) NULL,
	metric_before varchar(100) NULL,
	metric_after varchar(100) NULL,
	metric_unit varchar(50) NULL,
	value_statement text NULL,
	evidence_notes text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT product_impacts_impact_id_not_null NOT NULL impact_id,
	CONSTRAINT product_impacts_impact_summary_not_null NOT NULL impact_summary,
	CONSTRAINT product_impacts_pkey PRIMARY KEY (impact_id),
	CONSTRAINT product_impacts_title_not_null NOT NULL title,
	CONSTRAINT product_impacts_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.product_features(feature_id),
	CONSTRAINT product_impacts_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id)
);


-- public.publications definition

-- Drop table

-- DROP TABLE public.publications;

CREATE TABLE public.publications (
	publication_id int4 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	communication_id int4 NOT NULL,
	reference_label varchar(150) NULL, -- Identifica????o textual da ocorr??ncia, como Issue 004, Sprint 12 ou July 2026.
	title varchar(250) NOT NULL,
	subtitle varchar(300) NULL,
	reference_start_date date NULL,
	reference_end_date date NULL,
	planned_publication_date date NULL,
	published_at timestamp NULL,
	status varchar(30) DEFAULT 'DRAFT'::character varying NOT NULL,
	editorial_summary text NULL,
	version_number int4 DEFAULT 1 NOT NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	rendered_html text NULL,
	export_payload jsonb NULL,
	CONSTRAINT ck_publications_reference_dates CHECK (((reference_start_date IS NULL) OR (reference_end_date IS NULL) OR (reference_end_date >= reference_start_date))),
	CONSTRAINT ck_publications_status CHECK (((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('GENERATING'::character varying)::text, ('GENERATED'::character varying)::text, ('IN_REVIEW'::character varying)::text, ('APPROVED'::character varying)::text, ('PUBLISHED'::character varying)::text, ('ARCHIVED'::character varying)::text, ('CANCELLED'::character varying)::text]))),
	CONSTRAINT ck_publications_version_number CHECK ((version_number > 0)),
	CONSTRAINT publications_communication_id_not_null NOT NULL communication_id,
	CONSTRAINT publications_created_at_not_null NOT NULL created_at,
	CONSTRAINT publications_pkey PRIMARY KEY (publication_id),
	CONSTRAINT publications_publication_id_not_null NOT NULL publication_id,
	CONSTRAINT publications_status_not_null NOT NULL status,
	CONSTRAINT publications_title_not_null NOT NULL title,
	CONSTRAINT publications_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT publications_version_number_not_null NOT NULL version_number,
	CONSTRAINT uq_publications_reference UNIQUE (communication_id, reference_label),
	CONSTRAINT fk_publications_communication FOREIGN KEY (communication_id) REFERENCES public.communications(communication_id) ON DELETE RESTRICT,
	CONSTRAINT fk_publications_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL,
	CONSTRAINT fk_publications_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL
);
CREATE INDEX idx_publications_communication ON public.publications USING btree (communication_id);
CREATE INDEX idx_publications_planned_date ON public.publications USING btree (planned_publication_date);
CREATE INDEX idx_publications_published_at ON public.publications USING btree (published_at);
CREATE INDEX idx_publications_reference_dates ON public.publications USING btree (reference_start_date, reference_end_date);
CREATE INDEX idx_publications_status ON public.publications USING btree (status);
COMMENT ON TABLE public.publications IS 'Ocorr??ncias concretas das comunica????es, como uma edi????o da Magazine ou uma ATA.';

-- Column comments

COMMENT ON COLUMN public.publications.reference_label IS 'Identifica????o textual da ocorr??ncia, como Issue 004, Sprint 12 ou July 2026.';


-- public.raci_assignments definition

-- Drop table

-- DROP TABLE public.raci_assignments;

CREATE TABLE public.raci_assignments (
	id serial4 NOT NULL,
	product_id int4 NULL,
	object_type varchar(30) NOT NULL,
	object_id int4 NOT NULL,
	stakeholder_id int4 NOT NULL,
	"role" varchar(1) NOT NULL,
	notes text NULL,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL,
	approved_at timestamptz NULL, -- Timestamp when the approval (role A) was formally given
	approval_method varchar(50) NULL, -- Channel through which approval was given (email, verbal, document, meeting, other)
	approval_evidence text NULL, -- Text snippet or reference that proves the approval (e.g. email subject/body excerpt)
	approved_by varchar(150) NULL, -- Name of the PM/person who registered this approval in the system
	is_active bool DEFAULT true NOT NULL,
	removed_at timestamptz NULL,
	removed_by varchar(150) NULL,
	remove_reason text NULL,
	CONSTRAINT raci_assignments_created_at_not_null NOT NULL created_at,
	CONSTRAINT raci_assignments_id_not_null NOT NULL id,
	CONSTRAINT raci_assignments_is_active_not_null NOT NULL is_active,
	CONSTRAINT raci_assignments_object_id_not_null NOT NULL object_id,
	CONSTRAINT raci_assignments_object_type_not_null NOT NULL object_type,
	CONSTRAINT raci_assignments_pkey PRIMARY KEY (id),
	CONSTRAINT raci_assignments_role_not_null NOT NULL role,
	CONSTRAINT raci_assignments_stakeholder_id_not_null NOT NULL stakeholder_id,
	CONSTRAINT raci_assignments_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT uq_raci_assignment UNIQUE (object_type, object_id, stakeholder_id, role),
	CONSTRAINT raci_assignments_stakeholder_id_fkey FOREIGN KEY (stakeholder_id) REFERENCES public.stakeholders(stakeholder_id) ON DELETE CASCADE
);
CREATE INDEX idx_raci_active ON public.raci_assignments USING btree (object_type, object_id, is_active);
CREATE INDEX idx_raci_object ON public.raci_assignments USING btree (object_type, object_id);
CREATE INDEX idx_raci_product ON public.raci_assignments USING btree (product_id);
CREATE INDEX idx_raci_stakeholder ON public.raci_assignments USING btree (stakeholder_id);
CREATE INDEX ix_raci_assignments_product_id ON public.raci_assignments USING btree (product_id);
CREATE INDEX ix_raci_assignments_stakeholder_id ON public.raci_assignments USING btree (stakeholder_id);

-- Column comments

COMMENT ON COLUMN public.raci_assignments.approved_at IS 'Timestamp when the approval (role A) was formally given';
COMMENT ON COLUMN public.raci_assignments.approval_method IS 'Channel through which approval was given (email, verbal, document, meeting, other)';
COMMENT ON COLUMN public.raci_assignments.approval_evidence IS 'Text snippet or reference that proves the approval (e.g. email subject/body excerpt)';
COMMENT ON COLUMN public.raci_assignments.approved_by IS 'Name of the PM/person who registered this approval in the system';


-- public.requirement definition

-- Drop table

-- DROP TABLE public.requirement;

CREATE TABLE public.requirement (
	requirement_id int8 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	product_id int8 NULL,
	business_area_id int8 NULL,
	requirement_code varchar(50) NOT NULL,
	requirement_title varchar(250) NOT NULL,
	requirement_description text NOT NULL,
	requirement_type varchar(30) DEFAULT 'FUNCTIONAL'::character varying NOT NULL,
	requirement_source varchar(100) NULL,
	priority varchar(20) DEFAULT 'MEDIUM'::character varying NOT NULL,
	lifecycle_status varchar(20) DEFAULT 'DRAFT'::character varying NOT NULL,
	fulfillment_status varchar(30) DEFAULT 'NOT_STARTED'::character varying NOT NULL,
	acceptance_definition text NULL,
	requirement_owner varchar(150) NULL,
	created_by int8 NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_by int8 NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	is_deleted bool DEFAULT false NOT NULL,
	CONSTRAINT ck_requirement_fulfillment CHECK (((fulfillment_status)::text = ANY (ARRAY[('NOT_STARTED'::character varying)::text, ('PARTIALLY_MET'::character varying)::text, ('MET'::character varying)::text, ('NOT_MET'::character varying)::text, ('NOT_APPLICABLE'::character varying)::text]))),
	CONSTRAINT ck_requirement_lifecycle CHECK (((lifecycle_status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('PROPOSED'::character varying)::text, ('VALIDATED'::character varying)::text, ('APPROVED'::character varying)::text, ('REJECTED'::character varying)::text, ('OBSOLETE'::character varying)::text]))),
	CONSTRAINT ck_requirement_priority CHECK (((priority)::text = ANY (ARRAY[('LOW'::character varying)::text, ('MEDIUM'::character varying)::text, ('HIGH'::character varying)::text, ('CRITICAL'::character varying)::text]))),
	CONSTRAINT ck_requirement_type CHECK (((requirement_type)::text = ANY (ARRAY[('BUSINESS'::character varying)::text, ('FUNCTIONAL'::character varying)::text, ('NON_FUNCTIONAL'::character varying)::text, ('DATA'::character varying)::text, ('INTEGRATION'::character varying)::text, ('SECURITY'::character varying)::text, ('COMPLIANCE'::character varying)::text, ('UX'::character varying)::text]))),
	CONSTRAINT requirement_created_at_not_null NOT NULL created_at,
	CONSTRAINT requirement_fulfillment_status_not_null NOT NULL fulfillment_status,
	CONSTRAINT requirement_is_deleted_not_null NOT NULL is_deleted,
	CONSTRAINT requirement_lifecycle_status_not_null NOT NULL lifecycle_status,
	CONSTRAINT requirement_pkey PRIMARY KEY (requirement_id),
	CONSTRAINT requirement_priority_not_null NOT NULL priority,
	CONSTRAINT requirement_requirement_code_not_null NOT NULL requirement_code,
	CONSTRAINT requirement_requirement_description_not_null NOT NULL requirement_description,
	CONSTRAINT requirement_requirement_id_not_null NOT NULL requirement_id,
	CONSTRAINT requirement_requirement_title_not_null NOT NULL requirement_title,
	CONSTRAINT requirement_requirement_type_not_null NOT NULL requirement_type,
	CONSTRAINT requirement_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT uq_requirement_code UNIQUE (product_id, requirement_code),
	CONSTRAINT fk_requirement_business_area FOREIGN KEY (business_area_id) REFERENCES public.business_areas(id) ON DELETE SET NULL
);
CREATE INDEX ix_requirement_business_area ON public.requirement USING btree (business_area_id);
CREATE INDEX ix_requirement_fulfillment ON public.requirement USING btree (fulfillment_status);
CREATE INDEX ix_requirement_lifecycle ON public.requirement USING btree (lifecycle_status);
CREATE INDEX ix_requirement_product ON public.requirement USING btree (product_id);
CREATE INDEX ix_requirement_type ON public.requirement USING btree (requirement_type);

-- Table Triggers

create trigger trg_requirement_updated_at before
update
    on
    public.requirement for each row execute function fn_set_updated_at();


-- public.requirementfeature definition

-- Drop table

-- DROP TABLE public.requirementfeature;

CREATE TABLE public.requirementfeature (
	requirement_feature_id int8 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	requirement_id int8 NOT NULL,
	feature_id int8 NOT NULL,
	coverage_type varchar(20) DEFAULT 'PRIMARY'::character varying NOT NULL,
	notes text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT ck_requirementfeature_coverage CHECK (((coverage_type)::text = ANY (ARRAY[('PRIMARY'::character varying)::text, ('SUPPORTING'::character varying)::text, ('PARTIAL'::character varying)::text]))),
	CONSTRAINT requirementfeature_coverage_type_not_null NOT NULL coverage_type,
	CONSTRAINT requirementfeature_created_at_not_null NOT NULL created_at,
	CONSTRAINT requirementfeature_feature_id_not_null NOT NULL feature_id,
	CONSTRAINT requirementfeature_pkey PRIMARY KEY (requirement_feature_id),
	CONSTRAINT requirementfeature_requirement_feature_id_not_null NOT NULL requirement_feature_id,
	CONSTRAINT requirementfeature_requirement_id_not_null NOT NULL requirement_id,
	CONSTRAINT uq_requirement_feature UNIQUE (requirement_id, feature_id),
	CONSTRAINT fk_requirementfeature_requirement FOREIGN KEY (requirement_id) REFERENCES public.requirement(requirement_id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX ix_requirementfeature_feature ON public.requirementfeature USING btree (feature_id);


-- public.requirementrelation definition

-- Drop table

-- DROP TABLE public.requirementrelation;

CREATE TABLE public.requirementrelation (
	relation_id int8 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	requirement_id int8 NOT NULL,
	entity_type varchar(30) NOT NULL,
	entity_id int8 NOT NULL,
	relation_type varchar(50) NULL,
	notes text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT ck_requirementrel_entity_type CHECK (((entity_type)::text = ANY (ARRAY[('RESEARCH'::character varying)::text, ('INSIGHT'::character varying)::text, ('PROCESS_NODE'::character varying)::text, ('VPC_PAIN'::character varying)::text, ('RISK'::character varying)::text, ('DECISION'::character varying)::text, ('RELEASE'::character varying)::text, ('METRIC'::character varying)::text]))),
	CONSTRAINT requirementrelation_created_at_not_null NOT NULL created_at,
	CONSTRAINT requirementrelation_entity_id_not_null NOT NULL entity_id,
	CONSTRAINT requirementrelation_entity_type_not_null NOT NULL entity_type,
	CONSTRAINT requirementrelation_pkey PRIMARY KEY (relation_id),
	CONSTRAINT requirementrelation_relation_id_not_null NOT NULL relation_id,
	CONSTRAINT requirementrelation_requirement_id_not_null NOT NULL requirement_id,
	CONSTRAINT fk_requirementrel_requirement FOREIGN KEY (requirement_id) REFERENCES public.requirement(requirement_id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX ix_requirementrel_entity ON public.requirementrelation USING btree (entity_type, entity_id);
CREATE INDEX ix_requirementrel_requirement ON public.requirementrelation USING btree (requirement_id);
CREATE UNIQUE INDEX uq_requirementrel ON public.requirementrelation USING btree (requirement_id, entity_type, entity_id, COALESCE(relation_type, ''::character varying));


-- public.requirements definition

-- Drop table

-- DROP TABLE public.requirements;

CREATE TABLE public.requirements (
	id serial4 NOT NULL,
	product_id int4 NULL,
	business_area_id int4 NULL,
	requirement_code varchar(50) NOT NULL,
	requirement_title varchar(250) NOT NULL,
	requirement_description text NOT NULL,
	requirement_type varchar(30) NOT NULL,
	requirement_source varchar(100) NULL,
	priority varchar(20) NOT NULL,
	lifecycle_status varchar(20) NOT NULL,
	fulfillment_status varchar(30) NOT NULL,
	acceptance_definition text NULL,
	requirement_owner varchar(150) NULL,
	created_by int4 NULL,
	created_at timestamp NOT NULL,
	updated_by int4 NULL,
	updated_at timestamp NOT NULL,
	is_deleted bool NOT NULL,
	requirement_classification varchar(50) NULL,
	CONSTRAINT requirements_created_at_not_null NOT NULL created_at,
	CONSTRAINT requirements_fulfillment_status_not_null NOT NULL fulfillment_status,
	CONSTRAINT requirements_id_not_null NOT NULL id,
	CONSTRAINT requirements_is_deleted_not_null NOT NULL is_deleted,
	CONSTRAINT requirements_lifecycle_status_not_null NOT NULL lifecycle_status,
	CONSTRAINT requirements_pkey PRIMARY KEY (id),
	CONSTRAINT requirements_priority_not_null NOT NULL priority,
	CONSTRAINT requirements_requirement_code_not_null NOT NULL requirement_code,
	CONSTRAINT requirements_requirement_description_not_null NOT NULL requirement_description,
	CONSTRAINT requirements_requirement_title_not_null NOT NULL requirement_title,
	CONSTRAINT requirements_requirement_type_not_null NOT NULL requirement_type,
	CONSTRAINT requirements_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT fk_req_ba FOREIGN KEY (business_area_id) REFERENCES public.business_areas(id) ON DELETE SET NULL,
	CONSTRAINT fk_requirements_business_area FOREIGN KEY (business_area_id) REFERENCES public.business_areas(id) ON DELETE SET NULL
);
CREATE INDEX idx_req_classification ON public.requirements USING btree (requirement_classification);
CREATE INDEX idx_req_lifecycle ON public.requirements USING btree (lifecycle_status);
CREATE INDEX idx_req_product ON public.requirements USING btree (product_id);
CREATE INDEX idx_req_type ON public.requirements USING btree (requirement_type);
CREATE INDEX ix_requirements_business_area_id ON public.requirements USING btree (business_area_id);
CREATE INDEX ix_requirements_product_id ON public.requirements USING btree (product_id);


-- public.requirementuserstory definition

-- Drop table

-- DROP TABLE public.requirementuserstory;

CREATE TABLE public.requirementuserstory (
	requirement_userstory_id int8 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	requirement_id int8 NOT NULL,
	user_story_id int8 NOT NULL,
	coverage_percentage numeric(5, 2) NULL,
	coverage_status varchar(20) DEFAULT 'NOT_STARTED'::character varying NOT NULL,
	notes text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT chk_requirementuserstory_coverage CHECK (((coverage_percentage IS NULL) OR ((coverage_percentage >= (0)::numeric) AND (coverage_percentage <= (100)::numeric)))),
	CONSTRAINT ck_requirementuserstory_status CHECK (((coverage_status)::text = ANY (ARRAY[('NOT_STARTED'::character varying)::text, ('PARTIAL'::character varying)::text, ('COVERED'::character varying)::text, ('GAP'::character varying)::text]))),
	CONSTRAINT requirementuserstory_coverage_status_not_null NOT NULL coverage_status,
	CONSTRAINT requirementuserstory_created_at_not_null NOT NULL created_at,
	CONSTRAINT requirementuserstory_pkey PRIMARY KEY (requirement_userstory_id),
	CONSTRAINT requirementuserstory_requirement_id_not_null NOT NULL requirement_id,
	CONSTRAINT requirementuserstory_requirement_userstory_id_not_null NOT NULL requirement_userstory_id,
	CONSTRAINT requirementuserstory_user_story_id_not_null NOT NULL user_story_id,
	CONSTRAINT uq_requirement_userstory UNIQUE (requirement_id, user_story_id),
	CONSTRAINT fk_requirementuserstory_requirement FOREIGN KEY (requirement_id) REFERENCES public.requirement(requirement_id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX ix_requirementuserstory_story ON public.requirementuserstory USING btree (user_story_id);


-- public.requirementverification definition

-- Drop table

-- DROP TABLE public.requirementverification;

CREATE TABLE public.requirementverification (
	verification_id int8 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	requirement_id int8 NOT NULL,
	verification_type varchar(30) NOT NULL,
	verification_result varchar(20) DEFAULT 'NOT_VERIFIED'::character varying NOT NULL,
	verified_by int8 NULL,
	verified_at timestamptz NULL,
	evidence text NULL,
	notes text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT ck_requirementverification_result CHECK (((verification_result)::text = ANY (ARRAY[('PASS'::character varying)::text, ('PARTIAL'::character varying)::text, ('FAIL'::character varying)::text, ('NOT_VERIFIED'::character varying)::text]))),
	CONSTRAINT ck_requirementverification_type CHECK (((verification_type)::text = ANY (ARRAY[('TEST'::character varying)::text, ('USER_ACCEPTANCE'::character varying)::text, ('DOCUMENT_REVIEW'::character varying)::text, ('METRIC'::character varying)::text, ('MANUAL_VALIDATION'::character varying)::text]))),
	CONSTRAINT requirementverification_created_at_not_null NOT NULL created_at,
	CONSTRAINT requirementverification_pkey PRIMARY KEY (verification_id),
	CONSTRAINT requirementverification_requirement_id_not_null NOT NULL requirement_id,
	CONSTRAINT requirementverification_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT requirementverification_verification_id_not_null NOT NULL verification_id,
	CONSTRAINT requirementverification_verification_result_not_null NOT NULL verification_result,
	CONSTRAINT requirementverification_verification_type_not_null NOT NULL verification_type,
	CONSTRAINT fk_requirementverification_requirement FOREIGN KEY (requirement_id) REFERENCES public.requirement(requirement_id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX ix_requirementverification_requirement ON public.requirementverification USING btree (requirement_id);
CREATE INDEX ix_requirementverification_result ON public.requirementverification USING btree (verification_result);

-- Table Triggers

create trigger trg_requirementverification_updated_at before
update
    on
    public.requirementverification for each row execute function fn_set_updated_at();


-- public.research_answers definition

-- Drop table

-- DROP TABLE public.research_answers;

CREATE TABLE public.research_answers (
	id varchar(36) NOT NULL,
	research_id varchar(36) NOT NULL,
	question_id varchar(36) NULL,
	custom_question text NULL,
	answer text NULL,
	status varchar(20) DEFAULT 'pending'::character varying NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	"section" varchar(20) DEFAULT 'during'::character varying NOT NULL,
	sort_order int4 DEFAULT 0 NOT NULL,
	CONSTRAINT research_answers_id_not_null NOT NULL id,
	CONSTRAINT research_answers_pkey PRIMARY KEY (id),
	CONSTRAINT research_answers_research_id_not_null NOT NULL research_id,
	CONSTRAINT research_answers_section_not_null NOT NULL section,
	CONSTRAINT research_answers_sort_order_not_null NOT NULL sort_order,
	CONSTRAINT research_answers_status_not_null NOT NULL status,
	CONSTRAINT research_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.research_template_questions(id) ON DELETE SET NULL,
	CONSTRAINT research_answers_research_id_fkey FOREIGN KEY (research_id) REFERENCES public.discovery_research(id) ON DELETE CASCADE
);
CREATE INDEX idx_research_answers_question ON public.research_answers USING btree (question_id);
CREATE INDEX idx_research_answers_research ON public.research_answers USING btree (research_id);


-- public.risks definition

-- Drop table

-- DROP TABLE public.risks;

CREATE TABLE public.risks (
	id varchar(36) NOT NULL,
	product_id varchar(36) NOT NULL,
	title varchar(500) NOT NULL,
	description text NULL,
	probability int4 NULL,
	impact int4 NULL,
	risk_score int4 NULL,
	status public.riskstatus NULL,
	mitigation_plan text NULL,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL,
	discovery_opportunity_id varchar(36) NULL,
	category varchar(100) NULL,
	responsible varchar(150) NULL,
	domain_id int4 NULL,
	subdomain_id int4 NULL,
	requirement_id int4 NULL,
	CONSTRAINT risks_created_at_not_null NOT NULL created_at,
	CONSTRAINT risks_id_not_null NOT NULL id,
	CONSTRAINT risks_pkey PRIMARY KEY (id),
	CONSTRAINT risks_product_id_not_null NOT NULL product_id,
	CONSTRAINT risks_title_not_null NOT NULL title,
	CONSTRAINT risks_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT risks_discovery_opportunity_id_fkey FOREIGN KEY (discovery_opportunity_id) REFERENCES public.discovery_opportunities(id) ON DELETE SET NULL
);
CREATE INDEX idx_risks_disco_opp ON public.risks USING btree (discovery_opportunity_id);
CREATE INDEX idx_risks_domain ON public.risks USING btree (domain_id);
CREATE INDEX idx_risks_requirement ON public.risks USING btree (requirement_id);
CREATE INDEX idx_risks_subdomain ON public.risks USING btree (subdomain_id);


-- public.roadmap_items definition

-- Drop table

-- DROP TABLE public.roadmap_items;

CREATE TABLE public.roadmap_items (
	id varchar(36) NOT NULL,
	product_id varchar(36) NOT NULL,
	title varchar(500) NOT NULL,
	description text NULL,
	"type" public.roadmapitemtype NULL,
	status public.roadmapitemstatus NULL,
	start_date timestamp NULL,
	end_date timestamp NULL,
	quarter varchar(20) NULL,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL,
	item_type_id int4 NULL,
	executive_status varchar(30) DEFAULT 'not_started'::character varying NOT NULL,
	executive_summary text NULL,
	executive_risk_dependency text NULL,
	executive_next_step text NULL,
	executive_owner_name varchar(150) NULL,
	committed_deadline timestamp NULL,
	attention_flag bool DEFAULT false NOT NULL,
	attention_reason text NULL,
	executive_updated_at timestamp NULL,
	executive_updated_by varchar(150) NULL,
	owner_member_id int4 NULL,
	sponsor_stakeholder_id int4 NULL,
	primary_company_area_id int4 NULL,
	executive_owner_role varchar(150) NULL,
	CONSTRAINT roadmap_items_attention_flag_not_null NOT NULL attention_flag,
	CONSTRAINT roadmap_items_created_at_not_null NOT NULL created_at,
	CONSTRAINT roadmap_items_executive_status_not_null NOT NULL executive_status,
	CONSTRAINT roadmap_items_id_not_null NOT NULL id,
	CONSTRAINT roadmap_items_pkey PRIMARY KEY (id),
	CONSTRAINT roadmap_items_product_id_not_null NOT NULL product_id,
	CONSTRAINT roadmap_items_title_not_null NOT NULL title,
	CONSTRAINT roadmap_items_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT fk_roadmap_items_owner_stakeholder FOREIGN KEY (owner_member_id) REFERENCES public.stakeholders(stakeholder_id),
	CONSTRAINT fk_roadmap_items_primary_company_area FOREIGN KEY (primary_company_area_id) REFERENCES public.company_business_areas(id),
	CONSTRAINT fk_roadmap_items_sponsor_stakeholder FOREIGN KEY (sponsor_stakeholder_id) REFERENCES public.stakeholders(stakeholder_id)
);
CREATE INDEX ix_roadmap_items_owner_stakeholder_id ON public.roadmap_items USING btree (owner_member_id);
CREATE INDEX ix_roadmap_items_primary_company_area_id ON public.roadmap_items USING btree (primary_company_area_id);
CREATE INDEX ix_roadmap_items_product_id ON public.roadmap_items USING btree (product_id);
CREATE INDEX ix_roadmap_items_sponsor_stakeholder_id ON public.roadmap_items USING btree (sponsor_stakeholder_id);


-- public.sections definition

-- Drop table

-- DROP TABLE public.sections;

CREATE TABLE public.sections (
	section_id int4 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	publication_id int4 NOT NULL,
	template_section_id int4 NULL,
	section_key varchar(80) NOT NULL,
	title varchar(250) NOT NULL,
	subtitle varchar(300) NULL,
	current_content text NULL,
	display_order int4 DEFAULT 0 NOT NULL,
	status varchar(20) DEFAULT 'DRAFT'::character varying NOT NULL,
	is_ai_generated bool DEFAULT false NOT NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT ck_sections_display_order CHECK ((display_order >= 0)),
	CONSTRAINT ck_sections_status CHECK (((status)::text = ANY (ARRAY[('DRAFT'::character varying)::text, ('GENERATING'::character varying)::text, ('GENERATED'::character varying)::text, ('REVIEWED'::character varying)::text, ('APPROVED'::character varying)::text, ('PUBLISHED'::character varying)::text]))),
	CONSTRAINT sections_created_at_not_null NOT NULL created_at,
	CONSTRAINT sections_display_order_not_null NOT NULL display_order,
	CONSTRAINT sections_is_ai_generated_not_null NOT NULL is_ai_generated,
	CONSTRAINT sections_pkey PRIMARY KEY (section_id),
	CONSTRAINT sections_publication_id_not_null NOT NULL publication_id,
	CONSTRAINT sections_section_id_not_null NOT NULL section_id,
	CONSTRAINT sections_section_key_not_null NOT NULL section_key,
	CONSTRAINT sections_status_not_null NOT NULL status,
	CONSTRAINT sections_title_not_null NOT NULL title,
	CONSTRAINT sections_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT uq_sections_publication_key UNIQUE (publication_id, section_key),
	CONSTRAINT fk_sections_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL,
	CONSTRAINT fk_sections_publication FOREIGN KEY (publication_id) REFERENCES public.publications(publication_id) ON DELETE CASCADE,
	CONSTRAINT fk_sections_template_section FOREIGN KEY (template_section_id) REFERENCES public.template_sections(template_section_id) ON DELETE SET NULL,
	CONSTRAINT fk_sections_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL
);
CREATE INDEX idx_sections_publication_order ON public.sections USING btree (publication_id, display_order);
CREATE INDEX idx_sections_status ON public.sections USING btree (status);
COMMENT ON TABLE public.sections IS 'Se????es e conte??dos correntes pertencentes ??s publica????es.';


-- public.stakeholder_interactions definition

-- Drop table

-- DROP TABLE public.stakeholder_interactions;

CREATE TABLE public.stakeholder_interactions (
	interaction_id serial4 NOT NULL,
	stakeholder_id int4 NOT NULL,
	interaction_date timestamp NOT NULL,
	interaction_type varchar(50) DEFAULT 'Other'::character varying NULL,
	topic varchar(200) NOT NULL,
	summary text NOT NULL,
	perceived_sentiment varchar(50) DEFAULT 'Unknown'::character varying NULL,
	impact_on_product varchar(30) DEFAULT 'Unknown'::character varying NULL,
	follow_up_needed bool DEFAULT false NULL,
	follow_up_description text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT stakeholder_interactions_interaction_date_not_null NOT NULL interaction_date,
	CONSTRAINT stakeholder_interactions_interaction_id_not_null NOT NULL interaction_id,
	CONSTRAINT stakeholder_interactions_pkey PRIMARY KEY (interaction_id),
	CONSTRAINT stakeholder_interactions_stakeholder_id_not_null NOT NULL stakeholder_id,
	CONSTRAINT stakeholder_interactions_summary_not_null NOT NULL summary,
	CONSTRAINT stakeholder_interactions_topic_not_null NOT NULL topic,
	CONSTRAINT stakeholder_interactions_stakeholder_id_fkey FOREIGN KEY (stakeholder_id) REFERENCES public.stakeholders(stakeholder_id)
);


-- public.stakeholder_products definition

-- Drop table

-- DROP TABLE public.stakeholder_products;

CREATE TABLE public.stakeholder_products (
	id serial4 NOT NULL,
	stakeholder_id int4 NOT NULL,
	product_id int4 NOT NULL,
	"role" varchar(255) NULL,
	influence int4 DEFAULT 3 NULL,
	interest int4 DEFAULT 3 NULL,
	created_at timestamp DEFAULT now() NULL,
	is_active bool DEFAULT true NOT NULL,
	updated_at timestamp NULL,
	power_level int2 NULL,
	alignment_level int2 NULL,
	risk_level int2 NULL,
	sentiment varchar(50) NULL,
	expectation text NULL,
	concern text NULL,
	strategy text NULL,
	CONSTRAINT stakeholder_products_id_not_null NOT NULL id,
	CONSTRAINT stakeholder_products_is_active_not_null NOT NULL is_active,
	CONSTRAINT stakeholder_products_pkey PRIMARY KEY (id),
	CONSTRAINT stakeholder_products_product_id_not_null NOT NULL product_id,
	CONSTRAINT stakeholder_products_stakeholder_id_not_null NOT NULL stakeholder_id,
	CONSTRAINT uq_stakeholder_product UNIQUE (stakeholder_id, product_id),
	CONSTRAINT stakeholder_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE,
	CONSTRAINT stakeholder_products_stakeholder_id_fkey FOREIGN KEY (stakeholder_id) REFERENCES public.stakeholders(stakeholder_id) ON DELETE CASCADE
);


-- public.team_member_products definition

-- Drop table

-- DROP TABLE public.team_member_products;

CREATE TABLE public.team_member_products (
	id serial4 NOT NULL,
	member_id int4 NOT NULL,
	product_id int4 NOT NULL,
	"role" varchar(100) NULL,
	start_date date NULL,
	end_date date NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT team_member_products_created_at_not_null NOT NULL created_at,
	CONSTRAINT team_member_products_id_not_null NOT NULL id,
	CONSTRAINT team_member_products_is_active_not_null NOT NULL is_active,
	CONSTRAINT team_member_products_member_id_not_null NOT NULL member_id,
	CONSTRAINT team_member_products_pkey PRIMARY KEY (id),
	CONSTRAINT team_member_products_product_id_not_null NOT NULL product_id,
	CONSTRAINT team_member_products_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT uq_team_member_product UNIQUE (member_id, product_id),
	CONSTRAINT team_member_products_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.team_members(member_id) ON DELETE CASCADE
);
CREATE INDEX idx_tmp_active ON public.team_member_products USING btree (product_id, is_active);
CREATE INDEX idx_tmp_member ON public.team_member_products USING btree (member_id);
CREATE INDEX idx_tmp_product ON public.team_member_products USING btree (product_id);


-- public.vpc_canvas definition

-- Drop table

-- DROP TABLE public.vpc_canvas;

CREATE TABLE public.vpc_canvas (
	id varchar(36) NOT NULL,
	product_id varchar(36) NOT NULL,
	"name" varchar(150) DEFAULT 'Canvas Principal'::character varying NOT NULL,
	description text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	discovery_opportunity_id varchar(36) NULL,
	CONSTRAINT vpc_canvas_created_at_not_null NOT NULL created_at,
	CONSTRAINT vpc_canvas_id_not_null NOT NULL id,
	CONSTRAINT vpc_canvas_name_not_null NOT NULL name,
	CONSTRAINT vpc_canvas_pkey PRIMARY KEY (id),
	CONSTRAINT vpc_canvas_product_id_not_null NOT NULL product_id,
	CONSTRAINT vpc_canvas_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT vpc_canvas_discovery_opportunity_id_fkey FOREIGN KEY (discovery_opportunity_id) REFERENCES public.discovery_opportunities(id) ON DELETE SET NULL
);
CREATE INDEX idx_vpc_canvas_disco_opp ON public.vpc_canvas USING btree (discovery_opportunity_id);
CREATE INDEX ix_vpc_canvas_product_id ON public.vpc_canvas USING btree (product_id);


-- public.vpc_items definition

-- Drop table

-- DROP TABLE public.vpc_items;

CREATE TABLE public.vpc_items (
	id varchar(36) NOT NULL,
	product_id varchar(36) NOT NULL,
	"type" public.vpctype NOT NULL,
	"content" text NOT NULL,
	priority int4 NULL,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL,
	canvas_id varchar(36) NULL,
	parent_id varchar(36) NULL,
	"name" varchar(150) NULL,
	CONSTRAINT vpc_items_content_not_null NOT NULL content,
	CONSTRAINT vpc_items_created_at_not_null NOT NULL created_at,
	CONSTRAINT vpc_items_id_not_null NOT NULL id,
	CONSTRAINT vpc_items_pkey PRIMARY KEY (id),
	CONSTRAINT vpc_items_product_id_not_null NOT NULL product_id,
	CONSTRAINT vpc_items_type_not_null NOT NULL type,
	CONSTRAINT vpc_items_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT fk_vpc_items_canvas FOREIGN KEY (canvas_id) REFERENCES public.vpc_canvas(id) ON DELETE CASCADE
);
CREATE INDEX ix_vpc_items_canvas_id ON public.vpc_items USING btree (canvas_id);
CREATE INDEX ix_vpc_items_parent_id ON public.vpc_items USING btree (parent_id);
CREATE INDEX ix_vpc_items_product_id ON public.vpc_items USING btree (product_id);


-- public.wsjf_assessment_history definition

-- Drop table

-- DROP TABLE public.wsjf_assessment_history;

CREATE TABLE public.wsjf_assessment_history (
	history_id serial4 NOT NULL,
	assessment_id int4 NOT NULL,
	version_number int4 NOT NULL,
	snapshot_json jsonb NOT NULL,
	changed_by varchar(150) NULL,
	change_reason varchar(255) NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT uq_wsjf_assessment_history_version UNIQUE (assessment_id, version_number),
	CONSTRAINT wsjf_assessment_history_assessment_id_not_null NOT NULL assessment_id,
	CONSTRAINT wsjf_assessment_history_created_at_not_null NOT NULL created_at,
	CONSTRAINT wsjf_assessment_history_history_id_not_null NOT NULL history_id,
	CONSTRAINT wsjf_assessment_history_pkey PRIMARY KEY (history_id),
	CONSTRAINT wsjf_assessment_history_snapshot_json_not_null NOT NULL snapshot_json,
	CONSTRAINT wsjf_assessment_history_version_number_not_null NOT NULL version_number,
	CONSTRAINT fk_wsjf_assessment_history_assessment FOREIGN KEY (assessment_id) REFERENCES public.wsjf_assessments(assessment_id) ON DELETE CASCADE
);
CREATE INDEX idx_wsjf_assessment_history_assessment ON public.wsjf_assessment_history USING btree (assessment_id, version_number DESC);


-- public.wsjf_question_options definition

-- Drop table

-- DROP TABLE public.wsjf_question_options;

CREATE TABLE public.wsjf_question_options (
	option_id serial4 NOT NULL,
	question_id int4 NOT NULL,
	option_label varchar(255) NOT NULL,
	option_value varchar(100) NULL,
	score_value int4 NULL,
	justification_template text NULL,
	display_order int4 DEFAULT 0 NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT chk_wsjf_score_value CHECK (((score_value IS NULL) OR (score_value = ANY (ARRAY[1, 2, 3, 5, 8, 13, 21])))),
	CONSTRAINT wsjf_question_options_created_at_not_null NOT NULL created_at,
	CONSTRAINT wsjf_question_options_display_order_not_null NOT NULL display_order,
	CONSTRAINT wsjf_question_options_is_active_not_null NOT NULL is_active,
	CONSTRAINT wsjf_question_options_option_id_not_null NOT NULL option_id,
	CONSTRAINT wsjf_question_options_option_label_not_null NOT NULL option_label,
	CONSTRAINT wsjf_question_options_pkey PRIMARY KEY (option_id),
	CONSTRAINT wsjf_question_options_question_id_not_null NOT NULL question_id,
	CONSTRAINT wsjf_question_options_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT fk_wsjf_question_options_question FOREIGN KEY (question_id) REFERENCES public.wsjf_template_questions(question_id) ON DELETE CASCADE
);
CREATE INDEX idx_wsjf_question_options_question ON public.wsjf_question_options USING btree (question_id, display_order);


-- public.agent_executions definition

-- Drop table

-- DROP TABLE public.agent_executions;

CREATE TABLE public.agent_executions (
	agent_execution_id int4 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	section_id int4 NOT NULL,
	provider varchar(80) NULL,
	agent_name varchar(150) NULL,
	model_name varchar(150) NULL,
	model_version varchar(100) NULL,
	general_prompt text NULL,
	section_prompt text NULL,
	assembled_context text NULL, -- Contexto final enviado ao modelo, incluindo objetivo, audi??ncia e demais instru????es.
	model_parameters jsonb NULL, -- Par??metros da execu????o armazenados em JSON, preservando compatibilidade entre provedores.
	generated_content text NULL,
	input_tokens int4 NULL,
	output_tokens int4 NULL,
	total_tokens int4 NULL,
	estimated_cost numeric(18, 8) NULL,
	currency bpchar(3) NULL,
	execution_time_ms int8 NULL,
	temperature numeric(5, 3) NULL,
	status varchar(30) DEFAULT 'PENDING'::character varying NOT NULL,
	error_message text NULL,
	requested_by int4 NULL,
	started_at timestamp NULL,
	completed_at timestamp NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT agent_executions_agent_execution_id_not_null NOT NULL agent_execution_id,
	CONSTRAINT agent_executions_created_at_not_null NOT NULL created_at,
	CONSTRAINT agent_executions_pkey PRIMARY KEY (agent_execution_id),
	CONSTRAINT agent_executions_section_id_not_null NOT NULL section_id,
	CONSTRAINT agent_executions_status_not_null NOT NULL status,
	CONSTRAINT ck_agent_executions_dates CHECK (((started_at IS NULL) OR (completed_at IS NULL) OR (completed_at >= started_at))),
	CONSTRAINT ck_agent_executions_estimated_cost CHECK (((estimated_cost IS NULL) OR (estimated_cost >= (0)::numeric))),
	CONSTRAINT ck_agent_executions_execution_time CHECK (((execution_time_ms IS NULL) OR (execution_time_ms >= 0))),
	CONSTRAINT ck_agent_executions_input_tokens CHECK (((input_tokens IS NULL) OR (input_tokens >= 0))),
	CONSTRAINT ck_agent_executions_output_tokens CHECK (((output_tokens IS NULL) OR (output_tokens >= 0))),
	CONSTRAINT ck_agent_executions_status CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('RUNNING'::character varying)::text, ('COMPLETED'::character varying)::text, ('FAILED'::character varying)::text, ('CANCELLED'::character varying)::text, ('REJECTED'::character varying)::text, ('ACCEPTED'::character varying)::text]))),
	CONSTRAINT ck_agent_executions_temperature CHECK (((temperature IS NULL) OR (temperature >= (0)::numeric))),
	CONSTRAINT ck_agent_executions_total_tokens CHECK (((total_tokens IS NULL) OR (total_tokens >= 0))),
	CONSTRAINT fk_agent_executions_requested_by FOREIGN KEY (requested_by) REFERENCES public.users(user_id) ON DELETE SET NULL,
	CONSTRAINT fk_agent_executions_section FOREIGN KEY (section_id) REFERENCES public.sections(section_id) ON DELETE CASCADE
);
CREATE INDEX idx_agent_executions_created_at ON public.agent_executions USING btree (created_at);
CREATE INDEX idx_agent_executions_model ON public.agent_executions USING btree (provider, model_name);
CREATE INDEX idx_agent_executions_section ON public.agent_executions USING btree (section_id);
CREATE INDEX idx_agent_executions_status ON public.agent_executions USING btree (status);
COMMENT ON TABLE public.agent_executions IS 'Hist??rico completo das execu????es de LLMs e Agents realizadas para gerar conte??do.';

-- Column comments

COMMENT ON COLUMN public.agent_executions.assembled_context IS 'Contexto final enviado ao modelo, incluindo objetivo, audi??ncia e demais instru????es.';
COMMENT ON COLUMN public.agent_executions.model_parameters IS 'Par??metros da execu????o armazenados em JSON, preservando compatibilidade entre provedores.';


-- public.backlog_item_suggestions definition

-- Drop table

-- DROP TABLE public.backlog_item_suggestions;

CREATE TABLE public.backlog_item_suggestions (
	suggestion_id serial4 NOT NULL,
	vpc_id int4 NULL,
	feature_id int4 NULL,
	suggested_type varchar(50) NOT NULL,
	title varchar(250) NOT NULL,
	description text NULL,
	rationale text NULL,
	acceptance_criteria text NULL,
	status varchar(30) DEFAULT 'Draft'::character varying NULL,
	reviewed_by varchar(150) NULL,
	reviewed_at timestamp NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT backlog_item_suggestions_pkey PRIMARY KEY (suggestion_id),
	CONSTRAINT backlog_item_suggestions_suggested_type_not_null NOT NULL suggested_type,
	CONSTRAINT backlog_item_suggestions_suggestion_id_not_null NOT NULL suggestion_id,
	CONSTRAINT backlog_item_suggestions_title_not_null NOT NULL title,
	CONSTRAINT backlog_item_suggestions_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.product_features(feature_id)
);


-- public.communication_audiences definition

-- Drop table

-- DROP TABLE public.communication_audiences;

CREATE TABLE public.communication_audiences (
	communication_audience_id bigserial NOT NULL,
	communication_id int4 NOT NULL,
	audience_id int4 NOT NULL,
	is_primary bool DEFAULT false NOT NULL,
	custom_language varchar(10) NULL,
	custom_tone varchar(50) NULL,
	custom_detail_level varchar(30) NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT communication_audiences_audience_id_not_null NOT NULL audience_id,
	CONSTRAINT communication_audiences_communication_audience_id_not_null NOT NULL communication_audience_id,
	CONSTRAINT communication_audiences_communication_id_not_null NOT NULL communication_id,
	CONSTRAINT communication_audiences_created_at_not_null NOT NULL created_at,
	CONSTRAINT communication_audiences_is_primary_not_null NOT NULL is_primary,
	CONSTRAINT communication_audiences_pkey PRIMARY KEY (communication_audience_id),
	CONSTRAINT uq_communication_audiences UNIQUE (communication_id, audience_id),
	CONSTRAINT fk_communication_audiences_audience FOREIGN KEY (audience_id) REFERENCES public.audiences(audience_id) ON DELETE RESTRICT,
	CONSTRAINT fk_communication_audiences_communication FOREIGN KEY (communication_id) REFERENCES public.communications(communication_id) ON DELETE CASCADE
);
CREATE INDEX idx_communication_audiences_audience ON public.communication_audiences USING btree (audience_id);
CREATE INDEX idx_communication_audiences_communication ON public.communication_audiences USING btree (communication_id);
CREATE UNIQUE INDEX uq_communication_audiences_one_primary ON public.communication_audiences USING btree (communication_id) WHERE (is_primary = true);


-- public.communication_links definition

-- Drop table

-- DROP TABLE public.communication_links;

CREATE TABLE public.communication_links (
	communication_link_id bigserial NOT NULL,
	communication_id int4 NOT NULL,
	entity_type varchar(50) NOT NULL,
	entity_id varchar(100) NOT NULL,
	link_role varchar(30) DEFAULT 'RELATED'::character varying NOT NULL,
	is_primary bool DEFAULT false NOT NULL,
	notes text NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT ck_communication_links_entity_type CHECK (((entity_type)::text = ANY ((ARRAY['OPPORTUNITY'::character varying, 'ROADMAP_ITEM'::character varying, 'BACKLOG_ITEM'::character varying, 'RISK'::character varying, 'DECISION'::character varying, 'REQUIREMENT'::character varying])::text[]))),
	CONSTRAINT ck_communication_links_link_role CHECK (((link_role)::text = ANY ((ARRAY['PRIMARY'::character varying, 'RELATED'::character varying, 'SOURCE'::character varying, 'TARGET'::character varying])::text[]))),
	CONSTRAINT communication_links_communication_id_not_null NOT NULL communication_id,
	CONSTRAINT communication_links_communication_link_id_not_null NOT NULL communication_link_id,
	CONSTRAINT communication_links_created_at_not_null NOT NULL created_at,
	CONSTRAINT communication_links_entity_id_not_null NOT NULL entity_id,
	CONSTRAINT communication_links_entity_type_not_null NOT NULL entity_type,
	CONSTRAINT communication_links_is_primary_not_null NOT NULL is_primary,
	CONSTRAINT communication_links_link_role_not_null NOT NULL link_role,
	CONSTRAINT communication_links_pkey PRIMARY KEY (communication_link_id),
	CONSTRAINT communication_links_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT fk_communication_links_communication FOREIGN KEY (communication_id) REFERENCES public.communications(communication_id) ON DELETE CASCADE
);
CREATE INDEX idx_communication_links_communication_id ON public.communication_links USING btree (communication_id);
CREATE INDEX idx_communication_links_entity ON public.communication_links USING btree (entity_type, entity_id);
CREATE INDEX idx_communication_links_primary ON public.communication_links USING btree (entity_type, entity_id, is_primary);
CREATE UNIQUE INDEX uq_communication_links_one_primary_per_entity ON public.communication_links USING btree (entity_type, entity_id) WHERE (is_primary = true);
CREATE UNIQUE INDEX uq_communication_links_unique_link ON public.communication_links USING btree (communication_id, entity_type, entity_id, link_role);

-- Table Triggers

create trigger trg_communication_links_updated_at before
update
    on
    public.communication_links for each row execute function set_communication_links_updated_at();


-- public.communication_schedules definition

-- Drop table

-- DROP TABLE public.communication_schedules;

CREATE TABLE public.communication_schedules (
	communication_schedule_id int4 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	communication_id int4 NOT NULL,
	recurrence_type varchar(30) NOT NULL,
	recurrence_interval int4 DEFAULT 1 NOT NULL,
	reference_event varchar(80) NULL, -- Evento de refer??ncia, como SPRINT_REVIEW ou MONTH_END.
	publication_offset_days int4 DEFAULT 0 NOT NULL, -- Quantidade de dias entre o evento de refer??ncia e a publica????o.
	day_of_week int2 NULL,
	day_of_month int2 NULL,
	execution_time time NULL,
	timezone varchar(100) DEFAULT 'America/Sao_Paulo'::character varying NOT NULL,
	cron_expression varchar(255) NULL,
	starts_at date NULL,
	ends_at date NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT ck_communication_schedules_date_range CHECK (((starts_at IS NULL) OR (ends_at IS NULL) OR (ends_at >= starts_at))),
	CONSTRAINT ck_communication_schedules_day_of_month CHECK (((day_of_month IS NULL) OR ((day_of_month >= 1) AND (day_of_month <= 31)))),
	CONSTRAINT ck_communication_schedules_day_of_week CHECK (((day_of_week IS NULL) OR ((day_of_week >= 0) AND (day_of_week <= 6)))),
	CONSTRAINT ck_communication_schedules_interval CHECK ((recurrence_interval > 0)),
	CONSTRAINT ck_communication_schedules_recurrence_type CHECK (((recurrence_type)::text = ANY (ARRAY[('SPRINT'::character varying)::text, ('DAILY'::character varying)::text, ('WEEKLY'::character varying)::text, ('MONTHLY'::character varying)::text, ('QUARTERLY'::character varying)::text, ('YEARLY'::character varying)::text, ('CRON'::character varying)::text]))),
	CONSTRAINT communication_schedules_communication_id_not_null NOT NULL communication_id,
	CONSTRAINT communication_schedules_communication_schedule_id_not_null NOT NULL communication_schedule_id,
	CONSTRAINT communication_schedules_created_at_not_null NOT NULL created_at,
	CONSTRAINT communication_schedules_is_active_not_null NOT NULL is_active,
	CONSTRAINT communication_schedules_pkey PRIMARY KEY (communication_schedule_id),
	CONSTRAINT communication_schedules_publication_offset_days_not_null NOT NULL publication_offset_days,
	CONSTRAINT communication_schedules_recurrence_interval_not_null NOT NULL recurrence_interval,
	CONSTRAINT communication_schedules_recurrence_type_not_null NOT NULL recurrence_type,
	CONSTRAINT communication_schedules_timezone_not_null NOT NULL timezone,
	CONSTRAINT communication_schedules_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT uq_communication_schedules_communication UNIQUE (communication_id),
	CONSTRAINT fk_communication_schedules_communication FOREIGN KEY (communication_id) REFERENCES public.communications(communication_id) ON DELETE CASCADE
);
CREATE INDEX idx_communication_schedules_active ON public.communication_schedules USING btree (is_active);
COMMENT ON TABLE public.communication_schedules IS 'Regras de recorr??ncia aplicadas ??s comunica????es programadas.';

-- Column comments

COMMENT ON COLUMN public.communication_schedules.reference_event IS 'Evento de refer??ncia, como SPRINT_REVIEW ou MONTH_END.';
COMMENT ON COLUMN public.communication_schedules.publication_offset_days IS 'Quantidade de dias entre o evento de refer??ncia e a publica????o.';


-- public.decisions definition

-- Drop table

-- DROP TABLE public.decisions;

CREATE TABLE public.decisions (
	id varchar(36) NOT NULL,
	product_id varchar(36) NOT NULL,
	title varchar(500) NOT NULL,
	context text NULL,
	decision text NULL,
	consequences text NULL,
	status public.decisionstatus NULL,
	tags _varchar NULL,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL,
	discovery_opportunity_id varchar(36) NULL,
	evidence_refs text NULL,
	approved_scope text NULL,
	responsible varchar(300) NULL,
	decision_date timestamp NULL,
	business_case_id varchar(36) NULL,
	decided_by varchar(200) NULL,
	CONSTRAINT decisions_created_at_not_null NOT NULL created_at,
	CONSTRAINT decisions_id_not_null NOT NULL id,
	CONSTRAINT decisions_pkey PRIMARY KEY (id),
	CONSTRAINT decisions_product_id_not_null NOT NULL product_id,
	CONSTRAINT decisions_title_not_null NOT NULL title,
	CONSTRAINT decisions_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT decisions_discovery_opportunity_id_fkey FOREIGN KEY (discovery_opportunity_id) REFERENCES public.discovery_opportunities(id) ON DELETE SET NULL
);
CREATE INDEX idx_decisions_business_case ON public.decisions USING btree (business_case_id);
CREATE INDEX idx_decisions_disco_opp ON public.decisions USING btree (discovery_opportunity_id);
CREATE INDEX idx_decisions_opportunity ON public.decisions USING btree (discovery_opportunity_id);
CREATE INDEX ix_decisions_product_id ON public.decisions USING btree (product_id);


-- public.discovery_assumptions definition

-- Drop table

-- DROP TABLE public.discovery_assumptions;

CREATE TABLE public.discovery_assumptions (
	id varchar(36) NOT NULL,
	opportunity_id varchar(36) NOT NULL,
	hypothesis text NOT NULL,
	assumption_type public.assumption_type NOT NULL,
	impact public.impact_level DEFAULT 'medium'::impact_level NOT NULL,
	uncertainty_level public.uncertainty_level DEFAULT 'high'::uncertainty_level NOT NULL,
	existing_evidence text NULL,
	validation_method text NULL,
	status public.assumption_status DEFAULT 'unvalidated'::assumption_status NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT discovery_assumptions_assumption_type_not_null NOT NULL assumption_type,
	CONSTRAINT discovery_assumptions_created_at_not_null NOT NULL created_at,
	CONSTRAINT discovery_assumptions_hypothesis_not_null NOT NULL hypothesis,
	CONSTRAINT discovery_assumptions_id_not_null NOT NULL id,
	CONSTRAINT discovery_assumptions_impact_not_null NOT NULL impact,
	CONSTRAINT discovery_assumptions_opportunity_id_not_null NOT NULL opportunity_id,
	CONSTRAINT discovery_assumptions_pkey PRIMARY KEY (id),
	CONSTRAINT discovery_assumptions_status_not_null NOT NULL status,
	CONSTRAINT discovery_assumptions_uncertainty_level_not_null NOT NULL uncertainty_level,
	CONSTRAINT discovery_assumptions_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT fk_disco_assumption_opportunity FOREIGN KEY (opportunity_id) REFERENCES public.discovery_opportunities(id) ON DELETE CASCADE
);
CREATE INDEX idx_disco_assumption_opp ON public.discovery_assumptions USING btree (opportunity_id);
CREATE INDEX idx_disco_assumption_status ON public.discovery_assumptions USING btree (status);


-- public.discovery_business_cases definition

-- Drop table

-- DROP TABLE public.discovery_business_cases;

CREATE TABLE public.discovery_business_cases (
	id varchar(36) NOT NULL,
	opportunity_id varchar(36) NOT NULL,
	product_id int4 NOT NULL,
	title varchar(300) NOT NULL,
	executive_summary text NULL,
	problem_statement text NULL,
	current_scenario text NULL,
	proposed_solution text NULL,
	expected_benefits text NULL,
	strategic_alignment text NULL,
	financial_impact text NULL,
	estimated_cost varchar(120) NULL,
	estimated_effort varchar(120) NULL,
	risks_summary text NULL,
	dependencies_summary text NULL,
	assumptions text NULL,
	"constraints" text NULL,
	go_no_go_recommendation text NULL,
	status public.businesscasestatus NOT NULL,
	approved_by int4 NULL,
	approved_at timestamp NULL,
	created_by int4 NULL,
	created_at timestamp NOT NULL,
	updated_by int4 NULL,
	updated_at timestamp NOT NULL,
	is_deleted bool NOT NULL,
	CONSTRAINT discovery_business_cases_created_at_not_null NOT NULL created_at,
	CONSTRAINT discovery_business_cases_id_not_null NOT NULL id,
	CONSTRAINT discovery_business_cases_is_deleted_not_null NOT NULL is_deleted,
	CONSTRAINT discovery_business_cases_opportunity_id_not_null NOT NULL opportunity_id,
	CONSTRAINT discovery_business_cases_pkey PRIMARY KEY (id),
	CONSTRAINT discovery_business_cases_product_id_not_null NOT NULL product_id,
	CONSTRAINT discovery_business_cases_status_not_null NOT NULL status,
	CONSTRAINT discovery_business_cases_title_not_null NOT NULL title,
	CONSTRAINT discovery_business_cases_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT discovery_business_cases_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.discovery_opportunities(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX ix_discovery_business_cases_opportunity_id ON public.discovery_business_cases USING btree (opportunity_id);
CREATE INDEX ix_discovery_business_cases_product_id ON public.discovery_business_cases USING btree (product_id);


-- public.discovery_experiments definition

-- Drop table

-- DROP TABLE public.discovery_experiments;

CREATE TABLE public.discovery_experiments (
	id varchar(36) NOT NULL,
	opportunity_id varchar(36) NOT NULL,
	assumption_id varchar(36) NULL,
	"method" public.experiment_method NOT NULL,
	participants text NULL,
	success_criteria text NULL,
	"result" text NULL,
	evidence text NULL,
	conclusion text NULL,
	next_action text NULL,
	status public.experiment_status DEFAULT 'planned'::experiment_status NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT discovery_experiments_created_at_not_null NOT NULL created_at,
	CONSTRAINT discovery_experiments_id_not_null NOT NULL id,
	CONSTRAINT discovery_experiments_method_not_null NOT NULL method,
	CONSTRAINT discovery_experiments_opportunity_id_not_null NOT NULL opportunity_id,
	CONSTRAINT discovery_experiments_pkey PRIMARY KEY (id),
	CONSTRAINT discovery_experiments_status_not_null NOT NULL status,
	CONSTRAINT discovery_experiments_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT fk_disco_experiment_assumption FOREIGN KEY (assumption_id) REFERENCES public.discovery_assumptions(id) ON DELETE SET NULL,
	CONSTRAINT fk_disco_experiment_opportunity FOREIGN KEY (opportunity_id) REFERENCES public.discovery_opportunities(id) ON DELETE CASCADE
);
CREATE INDEX idx_disco_experiment_assumption ON public.discovery_experiments USING btree (assumption_id);
CREATE INDEX idx_disco_experiment_opp ON public.discovery_experiments USING btree (opportunity_id);
CREATE INDEX idx_disco_experiment_status ON public.discovery_experiments USING btree (status);


-- public.discovery_insights definition

-- Drop table

-- DROP TABLE public.discovery_insights;

CREATE TABLE public.discovery_insights (
	id varchar(36) NOT NULL,
	opportunity_id varchar(36) NOT NULL,
	research_id varchar(36) NULL,
	insight text NOT NULL,
	affected_audience text NULL,
	impact public.impact_level DEFAULT 'medium'::impact_level NOT NULL,
	observed_frequency varchar(100) NULL,
	confidence public.confidence_level DEFAULT 'medium'::confidence_level NOT NULL,
	product_implication text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT discovery_insights_confidence_not_null NOT NULL confidence,
	CONSTRAINT discovery_insights_created_at_not_null NOT NULL created_at,
	CONSTRAINT discovery_insights_id_not_null NOT NULL id,
	CONSTRAINT discovery_insights_impact_not_null NOT NULL impact,
	CONSTRAINT discovery_insights_insight_not_null NOT NULL insight,
	CONSTRAINT discovery_insights_opportunity_id_not_null NOT NULL opportunity_id,
	CONSTRAINT discovery_insights_pkey PRIMARY KEY (id),
	CONSTRAINT discovery_insights_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT fk_disco_insight_opportunity FOREIGN KEY (opportunity_id) REFERENCES public.discovery_opportunities(id) ON DELETE CASCADE,
	CONSTRAINT fk_disco_insight_research FOREIGN KEY (research_id) REFERENCES public.discovery_research(id) ON DELETE SET NULL
);
CREATE INDEX idx_disco_insight_opp ON public.discovery_insights USING btree (opportunity_id);
CREATE INDEX idx_disco_insight_research ON public.discovery_insights USING btree (research_id);


-- public.discovery_jtbd definition

-- Drop table

-- DROP TABLE public.discovery_jtbd;

CREATE TABLE public.discovery_jtbd (
	id varchar(36) NOT NULL,
	product_id int4 NOT NULL,
	opportunity_id varchar(36) NULL,
	description text NOT NULL,
	job_type public.job_type DEFAULT 'principal'::job_type NOT NULL,
	priority int4 DEFAULT 3 NOT NULL,
	frequency varchar(100) NULL,
	context text NULL,
	expected_result text NULL,
	vpc_item_id varchar(36) NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	impacted_area_id int4 NULL,
	CONSTRAINT discovery_jtbd_created_at_not_null NOT NULL created_at,
	CONSTRAINT discovery_jtbd_description_not_null NOT NULL description,
	CONSTRAINT discovery_jtbd_id_not_null NOT NULL id,
	CONSTRAINT discovery_jtbd_job_type_not_null NOT NULL job_type,
	CONSTRAINT discovery_jtbd_pkey PRIMARY KEY (id),
	CONSTRAINT discovery_jtbd_priority_not_null NOT NULL priority,
	CONSTRAINT discovery_jtbd_product_id_not_null NOT NULL product_id,
	CONSTRAINT discovery_jtbd_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT fk_disco_jtbd_opportunity FOREIGN KEY (opportunity_id) REFERENCES public.discovery_opportunities(id) ON DELETE SET NULL,
	CONSTRAINT fk_disco_jtbd_product FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE,
	CONSTRAINT fk_jtbd_area FOREIGN KEY (impacted_area_id) REFERENCES public.business_areas(id) ON DELETE SET NULL
);
CREATE INDEX idx_disco_jtbd_opp ON public.discovery_jtbd USING btree (opportunity_id);
CREATE INDEX idx_disco_jtbd_product ON public.discovery_jtbd USING btree (product_id);
CREATE INDEX idx_jtbd_area ON public.discovery_jtbd USING btree (impacted_area_id);


-- public.discovery_problem_affected_areas definition

-- Drop table

-- DROP TABLE public.discovery_problem_affected_areas;

CREATE TABLE public.discovery_problem_affected_areas (
	id varchar(36) DEFAULT gen_random_uuid()::text NOT NULL,
	problem_statement_id varchar(36) NOT NULL,
	area_id int4 NOT NULL,
	impact_type varchar(20) DEFAULT 'direct'::character varying NOT NULL,
	description text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT discovery_problem_affected_areas_area_id_not_null NOT NULL area_id,
	CONSTRAINT discovery_problem_affected_areas_created_at_not_null NOT NULL created_at,
	CONSTRAINT discovery_problem_affected_areas_id_not_null NOT NULL id,
	CONSTRAINT discovery_problem_affected_areas_impact_type_not_null NOT NULL impact_type,
	CONSTRAINT discovery_problem_affected_areas_pkey PRIMARY KEY (id),
	CONSTRAINT discovery_problem_affected_areas_problem_statement_id_not_null NOT NULL problem_statement_id,
	CONSTRAINT uq_ps_area UNIQUE (problem_statement_id, area_id),
	CONSTRAINT fk_ps_area_area FOREIGN KEY (area_id) REFERENCES public.business_areas(id) ON DELETE CASCADE,
	CONSTRAINT fk_ps_area_ps FOREIGN KEY (problem_statement_id) REFERENCES public.discovery_problem_statements(id) ON DELETE CASCADE
);


-- public.execution_evidences definition

-- Drop table

-- DROP TABLE public.execution_evidences;

CREATE TABLE public.execution_evidences (
	execution_evidence_id int4 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	agent_execution_id int4 NOT NULL,
	source_type varchar(80) NOT NULL, -- Tipo da entidade de origem, como PRODUCT_IMPACT, BACKLOG_ITEM, DECISION ou VPC.
	source_id int4 NOT NULL,
	relevance_notes text NULL,
	evidence_snapshot jsonb NULL, -- Snapshot opcional da evid??ncia no momento da execu????o, permitindo reprodutibilidade.
	display_order int4 DEFAULT 0 NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT ck_execution_evidences_display_order CHECK ((display_order >= 0)),
	CONSTRAINT execution_evidences_agent_execution_id_not_null NOT NULL agent_execution_id,
	CONSTRAINT execution_evidences_created_at_not_null NOT NULL created_at,
	CONSTRAINT execution_evidences_display_order_not_null NOT NULL display_order,
	CONSTRAINT execution_evidences_execution_evidence_id_not_null NOT NULL execution_evidence_id,
	CONSTRAINT execution_evidences_pkey PRIMARY KEY (execution_evidence_id),
	CONSTRAINT execution_evidences_source_id_not_null NOT NULL source_id,
	CONSTRAINT execution_evidences_source_type_not_null NOT NULL source_type,
	CONSTRAINT uq_execution_evidences_source UNIQUE (agent_execution_id, source_type, source_id),
	CONSTRAINT fk_execution_evidences_execution FOREIGN KEY (agent_execution_id) REFERENCES public.agent_executions(agent_execution_id) ON DELETE CASCADE
);
CREATE INDEX idx_execution_evidences_execution ON public.execution_evidences USING btree (agent_execution_id);
CREATE INDEX idx_execution_evidences_source ON public.execution_evidences USING btree (source_type, source_id);
COMMENT ON TABLE public.execution_evidences IS 'Evid??ncias utilizadas por uma execu????o espec??fica de LLM ou Agent.';

-- Column comments

COMMENT ON COLUMN public.execution_evidences.source_type IS 'Tipo da entidade de origem, como PRODUCT_IMPACT, BACKLOG_ITEM, DECISION ou VPC.';
COMMENT ON COLUMN public.execution_evidences.evidence_snapshot IS 'Snapshot opcional da evid??ncia no momento da execu????o, permitindo reprodutibilidade.';


-- public.process_groups definition

-- Drop table

-- DROP TABLE public.process_groups;

CREATE TABLE public.process_groups (
	id serial4 NOT NULL,
	process_id int4 NOT NULL,
	group_name varchar(200) NOT NULL,
	group_type varchar(30) DEFAULT 'PHASE'::character varying NOT NULL,
	parent_group_id int4 NULL,
	display_order int4 DEFAULT 0 NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT ck_process_groups_type CHECK (((group_type)::text = ANY (ARRAY[('PHASE'::character varying)::text, ('SUB_FLOW'::character varying)::text, ('CONTAINER'::character varying)::text]))),
	CONSTRAINT process_groups_created_at_not_null NOT NULL created_at,
	CONSTRAINT process_groups_display_order_not_null NOT NULL display_order,
	CONSTRAINT process_groups_group_name_not_null NOT NULL group_name,
	CONSTRAINT process_groups_group_type_not_null NOT NULL group_type,
	CONSTRAINT process_groups_id_not_null NOT NULL id,
	CONSTRAINT process_groups_pkey PRIMARY KEY (id),
	CONSTRAINT process_groups_process_id_not_null NOT NULL process_id,
	CONSTRAINT process_groups_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT process_groups_parent_group_id_fkey FOREIGN KEY (parent_group_id) REFERENCES public.process_groups(id) ON DELETE SET NULL,
	CONSTRAINT process_groups_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.processes(id) ON DELETE CASCADE
);
CREATE INDEX idx_process_groups_parent ON public.process_groups USING btree (parent_group_id);
CREATE INDEX idx_process_groups_process ON public.process_groups USING btree (process_id);


-- public.process_nodes definition

-- Drop table

-- DROP TABLE public.process_nodes;

CREATE TABLE public.process_nodes (
	id serial4 NOT NULL,
	process_id int4 NOT NULL,
	node_type varchar(30) NOT NULL,
	node_title varchar(200) NOT NULL,
	node_description text NULL,
	role_name varchar(150) NULL,
	business_area_id int4 NULL,
	system_name varchar(150) NULL,
	duration_minutes numeric(12, 2) NULL,
	is_manual bool NOT NULL,
	is_bottleneck bool NOT NULL,
	x_position numeric(12, 2) NOT NULL,
	y_position numeric(12, 2) NOT NULL,
	width numeric(12, 2) NULL,
	height numeric(12, 2) NULL,
	display_order int4 NULL,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL,
	node_icon varchar(100) DEFAULT NULL::character varying NULL,
	node_subtitle varchar(200) DEFAULT NULL::character varying NULL,
	group_id int4 NULL,
	child_process_id int4 NULL,
	CONSTRAINT process_nodes_created_at_not_null NOT NULL created_at,
	CONSTRAINT process_nodes_id_not_null NOT NULL id,
	CONSTRAINT process_nodes_is_bottleneck_not_null NOT NULL is_bottleneck,
	CONSTRAINT process_nodes_is_manual_not_null NOT NULL is_manual,
	CONSTRAINT process_nodes_node_title_not_null NOT NULL node_title,
	CONSTRAINT process_nodes_node_type_not_null NOT NULL node_type,
	CONSTRAINT process_nodes_pkey PRIMARY KEY (id),
	CONSTRAINT process_nodes_process_id_not_null NOT NULL process_id,
	CONSTRAINT process_nodes_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT process_nodes_x_position_not_null NOT NULL x_position,
	CONSTRAINT process_nodes_y_position_not_null NOT NULL y_position,
	CONSTRAINT fk_pnode_ba FOREIGN KEY (business_area_id) REFERENCES public.business_areas(id) ON DELETE SET NULL,
	CONSTRAINT fk_process_nodes_business_area FOREIGN KEY (business_area_id) REFERENCES public.business_areas(id) ON DELETE SET NULL,
	CONSTRAINT process_nodes_child_process_id_fkey FOREIGN KEY (child_process_id) REFERENCES public.processes(id) ON DELETE SET NULL,
	CONSTRAINT process_nodes_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.process_groups(id) ON DELETE SET NULL,
	CONSTRAINT process_nodes_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.processes(id) ON DELETE CASCADE
);
CREATE INDEX idx_pnode_child_proc ON public.process_nodes USING btree (child_process_id);
CREATE INDEX idx_pnode_process ON public.process_nodes USING btree (process_id);
CREATE INDEX ix_process_nodes_process_id ON public.process_nodes USING btree (process_id);


-- public.process_tools definition

-- Drop table

-- DROP TABLE public.process_tools;

CREATE TABLE public.process_tools (
	id serial4 NOT NULL,
	process_id int4 NOT NULL,
	tool_name varchar(150) NOT NULL,
	tool_description varchar(300) DEFAULT NULL::character varying NULL,
	tool_icon varchar(100) DEFAULT NULL::character varying NULL,
	display_order int4 DEFAULT 0 NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT process_tools_created_at_not_null NOT NULL created_at,
	CONSTRAINT process_tools_display_order_not_null NOT NULL display_order,
	CONSTRAINT process_tools_id_not_null NOT NULL id,
	CONSTRAINT process_tools_pkey PRIMARY KEY (id),
	CONSTRAINT process_tools_process_id_not_null NOT NULL process_id,
	CONSTRAINT process_tools_tool_name_not_null NOT NULL tool_name,
	CONSTRAINT process_tools_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT process_tools_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.processes(id) ON DELETE CASCADE
);
CREATE INDEX idx_process_tools_process ON public.process_tools USING btree (process_id);


-- public.processnode definition

-- Drop table

-- DROP TABLE public.processnode;

CREATE TABLE public.processnode (
	node_id int8 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	process_id int8 NOT NULL,
	node_type varchar(30) NOT NULL,
	node_title varchar(200) NOT NULL,
	node_description text NULL,
	role_name varchar(150) NULL,
	business_area_id int8 NULL,
	system_name varchar(150) NULL,
	duration_minutes numeric(12, 2) NULL,
	is_manual bool DEFAULT false NOT NULL,
	is_bottleneck bool DEFAULT false NOT NULL,
	x_position numeric(12, 2) DEFAULT 0 NOT NULL,
	y_position numeric(12, 2) DEFAULT 0 NOT NULL,
	width numeric(12, 2) NULL,
	height numeric(12, 2) NULL,
	display_order int4 NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	node_icon varchar(100) DEFAULT NULL::character varying NULL,
	node_subtitle varchar(200) DEFAULT NULL::character varying NULL,
	group_id int8 NULL,
	CONSTRAINT ck_processnode_type CHECK (((node_type)::text = ANY (ARRAY[('START'::character varying)::text, ('ACTIVITY'::character varying)::text, ('DECISION'::character varying)::text, ('END'::character varying)::text, ('SUBPROCESS'::character varying)::text, ('SYSTEM'::character varying)::text, ('WAIT'::character varying)::text, ('HANDOFF'::character varying)::text]))),
	CONSTRAINT processnode_created_at_not_null NOT NULL created_at,
	CONSTRAINT processnode_is_bottleneck_not_null NOT NULL is_bottleneck,
	CONSTRAINT processnode_is_manual_not_null NOT NULL is_manual,
	CONSTRAINT processnode_node_id_not_null NOT NULL node_id,
	CONSTRAINT processnode_node_title_not_null NOT NULL node_title,
	CONSTRAINT processnode_node_type_not_null NOT NULL node_type,
	CONSTRAINT processnode_pkey PRIMARY KEY (node_id),
	CONSTRAINT processnode_process_id_not_null NOT NULL process_id,
	CONSTRAINT processnode_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT processnode_x_position_not_null NOT NULL x_position,
	CONSTRAINT processnode_y_position_not_null NOT NULL y_position,
	CONSTRAINT fk_processnode_business_area FOREIGN KEY (business_area_id) REFERENCES public.business_areas(id) ON DELETE SET NULL,
	CONSTRAINT fk_processnode_process FOREIGN KEY (process_id) REFERENCES public.process(process_id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT processnode_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.process_groups(id) ON DELETE SET NULL
);
CREATE INDEX ix_processnode_business_area ON public.processnode USING btree (business_area_id);
CREATE INDEX ix_processnode_process ON public.processnode USING btree (process_id);
CREATE INDEX ix_processnode_type ON public.processnode USING btree (node_type);

-- Table Triggers

create trigger trg_processnode_updated_at before
update
    on
    public.processnode for each row execute function fn_set_updated_at();


-- public.processnoderelation definition

-- Drop table

-- DROP TABLE public.processnoderelation;

CREATE TABLE public.processnoderelation (
	relation_id int8 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	node_id int8 NOT NULL,
	entity_type varchar(30) NOT NULL,
	entity_id int8 NOT NULL,
	relation_type varchar(50) NULL,
	notes text NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT ck_processnoderel_entity_type CHECK (((entity_type)::text = ANY (ARRAY[('REQUIREMENT'::character varying)::text, ('FEATURE'::character varying)::text, ('USER_STORY'::character varying)::text, ('RISK'::character varying)::text, ('INSIGHT'::character varying)::text, ('VPC_PAIN'::character varying)::text, ('VPC_GAIN'::character varying)::text, ('RESEARCH'::character varying)::text]))),
	CONSTRAINT processnoderelation_created_at_not_null NOT NULL created_at,
	CONSTRAINT processnoderelation_entity_id_not_null NOT NULL entity_id,
	CONSTRAINT processnoderelation_entity_type_not_null NOT NULL entity_type,
	CONSTRAINT processnoderelation_node_id_not_null NOT NULL node_id,
	CONSTRAINT processnoderelation_pkey PRIMARY KEY (relation_id),
	CONSTRAINT processnoderelation_relation_id_not_null NOT NULL relation_id,
	CONSTRAINT fk_processnoderel_node FOREIGN KEY (node_id) REFERENCES public.processnode(node_id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX ix_processnoderel_entity ON public.processnoderelation USING btree (entity_type, entity_id);
CREATE INDEX ix_processnoderel_node ON public.processnoderelation USING btree (node_id);
CREATE UNIQUE INDEX uq_processnoderel ON public.processnoderelation USING btree (node_id, entity_type, entity_id, COALESCE(relation_type, ''::character varying));


-- public.project_charters definition

-- Drop table

-- DROP TABLE public.project_charters;

CREATE TABLE public.project_charters (
	id varchar(36) NOT NULL,
	business_case_id varchar(36) NULL,
	opportunity_id varchar(36) NULL,
	roadmap_item_id varchar(36) NULL,
	product_id int4 NOT NULL,
	project_name varchar(300) NOT NULL,
	project_purpose text NULL,
	business_objective text NULL,
	objectives text NULL,
	scope_in text NULL,
	scope_out text NULL,
	success_criteria text NULL,
	high_level_requirements text NULL,
	major_deliverables text NULL,
	high_level_timeline text NULL,
	budget_summary text NULL,
	risks_summary text NULL,
	assumptions_constraints text NULL,
	sponsor_name varchar(200) NULL,
	project_manager_name varchar(200) NULL,
	status public.charterstatus NOT NULL,
	approved_by int4 NULL,
	approved_at timestamp NULL,
	created_by int4 NULL,
	created_at timestamp NOT NULL,
	updated_by int4 NULL,
	updated_at timestamp NOT NULL,
	is_deleted bool NOT NULL,
	CONSTRAINT project_charters_created_at_not_null NOT NULL created_at,
	CONSTRAINT project_charters_id_not_null NOT NULL id,
	CONSTRAINT project_charters_is_deleted_not_null NOT NULL is_deleted,
	CONSTRAINT project_charters_pkey PRIMARY KEY (id),
	CONSTRAINT project_charters_product_id_not_null NOT NULL product_id,
	CONSTRAINT project_charters_project_name_not_null NOT NULL project_name,
	CONSTRAINT project_charters_status_not_null NOT NULL status,
	CONSTRAINT project_charters_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT project_charters_business_case_id_fkey FOREIGN KEY (business_case_id) REFERENCES public.discovery_business_cases(id) ON DELETE SET NULL,
	CONSTRAINT project_charters_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.discovery_opportunities(id) ON DELETE SET NULL,
	CONSTRAINT project_charters_roadmap_item_id_fkey FOREIGN KEY (roadmap_item_id) REFERENCES public.roadmap_items(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX ix_project_charters_business_case_id ON public.project_charters USING btree (business_case_id);
CREATE INDEX ix_project_charters_opportunity_id ON public.project_charters USING btree (opportunity_id);
CREATE INDEX ix_project_charters_product_id ON public.project_charters USING btree (product_id);
CREATE INDEX ix_project_charters_roadmap_item_id ON public.project_charters USING btree (roadmap_item_id);


-- public.publication_audiences definition

-- Drop table

-- DROP TABLE public.publication_audiences;

CREATE TABLE public.publication_audiences (
	publication_audience_id int4 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	publication_id int4 NOT NULL,
	audience_id int4 NOT NULL,
	is_primary bool DEFAULT false NOT NULL,
	custom_language varchar(10) NULL,
	custom_tone varchar(50) NULL,
	custom_detail_level varchar(30) NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT publication_audiences_audience_id_not_null NOT NULL audience_id,
	CONSTRAINT publication_audiences_created_at_not_null NOT NULL created_at,
	CONSTRAINT publication_audiences_is_primary_not_null NOT NULL is_primary,
	CONSTRAINT publication_audiences_pkey PRIMARY KEY (publication_audience_id),
	CONSTRAINT publication_audiences_publication_audience_id_not_null NOT NULL publication_audience_id,
	CONSTRAINT publication_audiences_publication_id_not_null NOT NULL publication_id,
	CONSTRAINT uq_publication_audiences UNIQUE (publication_id, audience_id),
	CONSTRAINT fk_publication_audiences_audience FOREIGN KEY (audience_id) REFERENCES public.audiences(audience_id) ON DELETE RESTRICT,
	CONSTRAINT fk_publication_audiences_publication FOREIGN KEY (publication_id) REFERENCES public.publications(publication_id) ON DELETE CASCADE
);
CREATE INDEX idx_publication_audiences_audience ON public.publication_audiences USING btree (audience_id);
CREATE INDEX idx_publication_audiences_publication ON public.publication_audiences USING btree (publication_id);
COMMENT ON TABLE public.publication_audiences IS 'Audi??ncias definidas para uma publica????o espec??fica.';


-- public.publication_reviews definition

-- Drop table

-- DROP TABLE public.publication_reviews;

CREATE TABLE public.publication_reviews (
	publication_review_id int4 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	publication_id int4 NOT NULL,
	"action" varchar(40) NOT NULL,
	"comments" text NULL,
	performed_by int4 NULL,
	performed_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT ck_publication_reviews_action CHECK (((action)::text = ANY (ARRAY[('SUBMITTED_FOR_REVIEW'::character varying)::text, ('REVIEWED'::character varying)::text, ('CHANGES_REQUESTED'::character varying)::text, ('APPROVED'::character varying)::text, ('REJECTED'::character varying)::text, ('PUBLISHED'::character varying)::text, ('REPUBLISHED'::character varying)::text, ('ARCHIVED'::character varying)::text]))),
	CONSTRAINT publication_reviews_action_not_null NOT NULL action,
	CONSTRAINT publication_reviews_performed_at_not_null NOT NULL performed_at,
	CONSTRAINT publication_reviews_pkey PRIMARY KEY (publication_review_id),
	CONSTRAINT publication_reviews_publication_id_not_null NOT NULL publication_id,
	CONSTRAINT publication_reviews_publication_review_id_not_null NOT NULL publication_review_id,
	CONSTRAINT fk_publication_reviews_performed_by FOREIGN KEY (performed_by) REFERENCES public.users(user_id) ON DELETE SET NULL,
	CONSTRAINT fk_publication_reviews_publication FOREIGN KEY (publication_id) REFERENCES public.publications(publication_id) ON DELETE CASCADE
);
CREATE INDEX idx_publication_reviews_performed_at ON public.publication_reviews USING btree (performed_at);
CREATE INDEX idx_publication_reviews_publication ON public.publication_reviews USING btree (publication_id);
COMMENT ON TABLE public.publication_reviews IS 'Hist??rico de revis??es, aprova????es e demais a????es humanas realizadas sobre uma publica????o.';


-- public.publication_versions definition

-- Drop table

-- DROP TABLE public.publication_versions;

CREATE TABLE public.publication_versions (
	publication_version_id int4 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	publication_id int4 NOT NULL,
	version_number int4 NOT NULL,
	version_label varchar(50) NULL,
	change_reason text NULL,
	publication_snapshot jsonb NOT NULL, -- Snapshot contendo metadados e conte??do das se????es na vers??o registrada.
	created_by int4 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT ck_publication_versions_number CHECK ((version_number > 0)),
	CONSTRAINT publication_versions_created_at_not_null NOT NULL created_at,
	CONSTRAINT publication_versions_pkey PRIMARY KEY (publication_version_id),
	CONSTRAINT publication_versions_publication_id_not_null NOT NULL publication_id,
	CONSTRAINT publication_versions_publication_snapshot_not_null NOT NULL publication_snapshot,
	CONSTRAINT publication_versions_publication_version_id_not_null NOT NULL publication_version_id,
	CONSTRAINT publication_versions_version_number_not_null NOT NULL version_number,
	CONSTRAINT uq_publication_versions UNIQUE (publication_id, version_number),
	CONSTRAINT fk_publication_versions_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL,
	CONSTRAINT fk_publication_versions_publication FOREIGN KEY (publication_id) REFERENCES public.publications(publication_id) ON DELETE CASCADE
);
CREATE INDEX idx_publication_versions_publication ON public.publication_versions USING btree (publication_id);
COMMENT ON TABLE public.publication_versions IS 'Snapshots oficiais e imut??veis das vers??es de uma publica????o.';

-- Column comments

COMMENT ON COLUMN public.publication_versions.publication_snapshot IS 'Snapshot contendo metadados e conte??do das se????es na vers??o registrada.';


-- public.quarter_prioritization_items definition

-- Drop table

-- DROP TABLE public.quarter_prioritization_items;

CREATE TABLE public.quarter_prioritization_items (
	id varchar(36) NOT NULL,
	company_id int4 NOT NULL,
	product_id int4 NOT NULL,
	roadmap_item_id varchar(36) NOT NULL,
	fiscal_year int4 NOT NULL,
	quarter varchar(2) NOT NULL,
	priority_rank int4 NULL,
	planning_status varchar(20) DEFAULT 'candidate'::character varying NOT NULL,
	business_value numeric(10, 2) DEFAULT 0 NOT NULL,
	strategic_alignment numeric(10, 2) DEFAULT 0 NOT NULL,
	urgency numeric(10, 2) DEFAULT 0 NOT NULL,
	dependency_readiness numeric(10, 2) DEFAULT 0 NOT NULL,
	delivery_risk numeric(10, 2) DEFAULT 0 NOT NULL,
	confidence numeric(10, 2) DEFAULT 0 NOT NULL,
	estimated_effort numeric(10, 2) DEFAULT 0 NOT NULL,
	planned_capacity_share numeric(10, 2) NULL,
	quarter_score numeric(12, 2) DEFAULT 0 NOT NULL,
	decision_rationale text NULL,
	notes text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT chk_qpi_quarter CHECK (((quarter)::text = ANY ((ARRAY['Q1'::character varying, 'Q2'::character varying, 'Q3'::character varying, 'Q4'::character varying])::text[]))),
	CONSTRAINT chk_qpi_status CHECK (((planning_status)::text = ANY ((ARRAY['candidate'::character varying, 'committed'::character varying, 'stretch'::character varying, 'deferred'::character varying, 'blocked'::character varying])::text[]))),
	CONSTRAINT quarter_prioritization_items_business_value_not_null NOT NULL business_value,
	CONSTRAINT quarter_prioritization_items_company_id_not_null NOT NULL company_id,
	CONSTRAINT quarter_prioritization_items_confidence_not_null NOT NULL confidence,
	CONSTRAINT quarter_prioritization_items_created_at_not_null NOT NULL created_at,
	CONSTRAINT quarter_prioritization_items_delivery_risk_not_null NOT NULL delivery_risk,
	CONSTRAINT quarter_prioritization_items_dependency_readiness_not_null NOT NULL dependency_readiness,
	CONSTRAINT quarter_prioritization_items_estimated_effort_not_null NOT NULL estimated_effort,
	CONSTRAINT quarter_prioritization_items_fiscal_year_not_null NOT NULL fiscal_year,
	CONSTRAINT quarter_prioritization_items_id_not_null NOT NULL id,
	CONSTRAINT quarter_prioritization_items_pkey PRIMARY KEY (id),
	CONSTRAINT quarter_prioritization_items_planning_status_not_null NOT NULL planning_status,
	CONSTRAINT quarter_prioritization_items_product_id_not_null NOT NULL product_id,
	CONSTRAINT quarter_prioritization_items_quarter_not_null NOT NULL quarter,
	CONSTRAINT quarter_prioritization_items_quarter_score_not_null NOT NULL quarter_score,
	CONSTRAINT quarter_prioritization_items_roadmap_item_id_not_null NOT NULL roadmap_item_id,
	CONSTRAINT quarter_prioritization_items_strategic_alignment_not_null NOT NULL strategic_alignment,
	CONSTRAINT quarter_prioritization_items_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT quarter_prioritization_items_urgency_not_null NOT NULL urgency,
	CONSTRAINT uq_qpi_company_product_roadmap_fy_q UNIQUE (company_id, product_id, roadmap_item_id, fiscal_year, quarter),
	CONSTRAINT quarter_prioritization_items_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
	CONSTRAINT quarter_prioritization_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE,
	CONSTRAINT quarter_prioritization_items_roadmap_item_id_fkey FOREIGN KEY (roadmap_item_id) REFERENCES public.roadmap_items(id) ON DELETE CASCADE
);
CREATE INDEX idx_qpi_company ON public.quarter_prioritization_items USING btree (company_id);
CREATE INDEX idx_qpi_fiscal_year_quarter ON public.quarter_prioritization_items USING btree (fiscal_year, quarter);
CREATE INDEX idx_qpi_priority_rank ON public.quarter_prioritization_items USING btree (priority_rank);
CREATE INDEX idx_qpi_product ON public.quarter_prioritization_items USING btree (product_id);
CREATE INDEX idx_qpi_roadmap_item ON public.quarter_prioritization_items USING btree (roadmap_item_id);
CREATE INDEX idx_qpi_status ON public.quarter_prioritization_items USING btree (planning_status);
CREATE INDEX idx_quarter_prioritization_company ON public.quarter_prioritization_items USING btree (company_id);
CREATE INDEX idx_quarter_prioritization_fy_q ON public.quarter_prioritization_items USING btree (fiscal_year, quarter);
CREATE INDEX idx_quarter_prioritization_product ON public.quarter_prioritization_items USING btree (product_id);
CREATE INDEX idx_quarter_prioritization_roadmap ON public.quarter_prioritization_items USING btree (roadmap_item_id);


-- public.requirement_change_requests definition

-- Drop table

-- DROP TABLE public.requirement_change_requests;

CREATE TABLE public.requirement_change_requests (
	id serial4 NOT NULL,
	requirement_id int4 NOT NULL,
	requested_by varchar(200) NOT NULL,
	requested_at timestamp NOT NULL,
	change_description text NOT NULL,
	impact_analysis text NULL,
	priority varchar(20) NOT NULL,
	status varchar(20) NOT NULL,
	approved_by varchar(200) NULL,
	approved_at timestamp NULL,
	rejection_reason text NULL,
	updated_at timestamp NOT NULL,
	CONSTRAINT requirement_change_requests_change_description_not_null NOT NULL change_description,
	CONSTRAINT requirement_change_requests_id_not_null NOT NULL id,
	CONSTRAINT requirement_change_requests_pkey PRIMARY KEY (id),
	CONSTRAINT requirement_change_requests_priority_not_null NOT NULL priority,
	CONSTRAINT requirement_change_requests_requested_at_not_null NOT NULL requested_at,
	CONSTRAINT requirement_change_requests_requested_by_not_null NOT NULL requested_by,
	CONSTRAINT requirement_change_requests_requirement_id_not_null NOT NULL requirement_id,
	CONSTRAINT requirement_change_requests_status_not_null NOT NULL status,
	CONSTRAINT requirement_change_requests_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT requirement_change_requests_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE
);
CREATE INDEX idx_req_cr_req ON public.requirement_change_requests USING btree (requirement_id);
CREATE INDEX idx_req_cr_status ON public.requirement_change_requests USING btree (status);
CREATE INDEX ix_requirement_change_requests_requirement_id ON public.requirement_change_requests USING btree (requirement_id);


-- public.requirement_domain_links definition

-- Drop table

-- DROP TABLE public.requirement_domain_links;

CREATE TABLE public.requirement_domain_links (
	id serial4 NOT NULL,
	requirement_id int4 NOT NULL,
	domain_id int4 NOT NULL,
	subdomain_id int4 NULL,
	created_at timestamp NOT NULL,
	CONSTRAINT requirement_domain_links_created_at_not_null NOT NULL created_at,
	CONSTRAINT requirement_domain_links_domain_id_not_null NOT NULL domain_id,
	CONSTRAINT requirement_domain_links_id_not_null NOT NULL id,
	CONSTRAINT requirement_domain_links_pkey PRIMARY KEY (id),
	CONSTRAINT requirement_domain_links_requirement_id_not_null NOT NULL requirement_id,
	CONSTRAINT uq_req_domain UNIQUE (requirement_id, domain_id),
	CONSTRAINT requirement_domain_links_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.business_domains(id) ON DELETE CASCADE,
	CONSTRAINT requirement_domain_links_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE,
	CONSTRAINT requirement_domain_links_subdomain_id_fkey FOREIGN KEY (subdomain_id) REFERENCES public.business_subdomains(id) ON DELETE SET NULL
);
CREATE INDEX idx_rdl_domain ON public.requirement_domain_links USING btree (domain_id);
CREATE INDEX idx_rdl_requirement ON public.requirement_domain_links USING btree (requirement_id);
CREATE INDEX idx_rdl_subdomain ON public.requirement_domain_links USING btree (subdomain_id);
CREATE INDEX ix_requirement_domain_links_domain_id ON public.requirement_domain_links USING btree (domain_id);
CREATE INDEX ix_requirement_domain_links_requirement_id ON public.requirement_domain_links USING btree (requirement_id);
CREATE INDEX ix_requirement_domain_links_subdomain_id ON public.requirement_domain_links USING btree (subdomain_id);


-- public.requirement_features definition

-- Drop table

-- DROP TABLE public.requirement_features;

CREATE TABLE public.requirement_features (
	id serial4 NOT NULL,
	requirement_id int4 NOT NULL,
	feature_id int4 NOT NULL,
	coverage_type varchar(20) NOT NULL,
	notes text NULL,
	created_at timestamp NOT NULL,
	CONSTRAINT requirement_features_coverage_type_not_null NOT NULL coverage_type,
	CONSTRAINT requirement_features_created_at_not_null NOT NULL created_at,
	CONSTRAINT requirement_features_feature_id_not_null NOT NULL feature_id,
	CONSTRAINT requirement_features_id_not_null NOT NULL id,
	CONSTRAINT requirement_features_pkey PRIMARY KEY (id),
	CONSTRAINT requirement_features_requirement_id_not_null NOT NULL requirement_id,
	CONSTRAINT requirement_features_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE
);
CREATE INDEX idx_req_feat_req ON public.requirement_features USING btree (requirement_id);
CREATE INDEX ix_requirement_features_requirement_id ON public.requirement_features USING btree (requirement_id);


-- public.requirement_history definition

-- Drop table

-- DROP TABLE public.requirement_history;

CREATE TABLE public.requirement_history (
	id serial4 NOT NULL,
	requirement_id int4 NOT NULL,
	changed_by varchar(200) NULL,
	changed_at timestamp NOT NULL,
	change_type varchar(30) NOT NULL,
	field_name varchar(100) NULL,
	old_value text NULL,
	new_value text NULL,
	change_reason text NULL,
	CONSTRAINT requirement_history_change_type_not_null NOT NULL change_type,
	CONSTRAINT requirement_history_changed_at_not_null NOT NULL changed_at,
	CONSTRAINT requirement_history_id_not_null NOT NULL id,
	CONSTRAINT requirement_history_pkey PRIMARY KEY (id),
	CONSTRAINT requirement_history_requirement_id_not_null NOT NULL requirement_id,
	CONSTRAINT requirement_history_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE
);
CREATE INDEX idx_req_hist_field ON public.requirement_history USING btree (field_name);
CREATE INDEX idx_req_hist_req ON public.requirement_history USING btree (requirement_id);
CREATE INDEX idx_req_hist_type ON public.requirement_history USING btree (change_type);
CREATE INDEX ix_requirement_history_requirement_id ON public.requirement_history USING btree (requirement_id);


-- public.requirement_relations definition

-- Drop table

-- DROP TABLE public.requirement_relations;

CREATE TABLE public.requirement_relations (
	id serial4 NOT NULL,
	requirement_id int4 NOT NULL,
	entity_type varchar(30) NOT NULL,
	entity_id int4 NOT NULL,
	relation_type varchar(50) NULL,
	notes text NULL,
	created_at timestamp NOT NULL,
	CONSTRAINT requirement_relations_created_at_not_null NOT NULL created_at,
	CONSTRAINT requirement_relations_entity_id_not_null NOT NULL entity_id,
	CONSTRAINT requirement_relations_entity_type_not_null NOT NULL entity_type,
	CONSTRAINT requirement_relations_id_not_null NOT NULL id,
	CONSTRAINT requirement_relations_pkey PRIMARY KEY (id),
	CONSTRAINT requirement_relations_requirement_id_not_null NOT NULL requirement_id,
	CONSTRAINT requirement_relations_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE
);
CREATE INDEX idx_req_rel_req ON public.requirement_relations USING btree (requirement_id);
CREATE INDEX ix_requirement_relations_requirement_id ON public.requirement_relations USING btree (requirement_id);


-- public.requirement_user_stories definition

-- Drop table

-- DROP TABLE public.requirement_user_stories;

CREATE TABLE public.requirement_user_stories (
	id serial4 NOT NULL,
	requirement_id int4 NOT NULL,
	user_story_id int4 NOT NULL,
	coverage_percentage numeric(5, 2) NULL,
	coverage_status varchar(20) NOT NULL,
	notes text NULL,
	created_at timestamp NOT NULL,
	CONSTRAINT requirement_user_stories_coverage_status_not_null NOT NULL coverage_status,
	CONSTRAINT requirement_user_stories_created_at_not_null NOT NULL created_at,
	CONSTRAINT requirement_user_stories_id_not_null NOT NULL id,
	CONSTRAINT requirement_user_stories_pkey PRIMARY KEY (id),
	CONSTRAINT requirement_user_stories_requirement_id_not_null NOT NULL requirement_id,
	CONSTRAINT requirement_user_stories_user_story_id_not_null NOT NULL user_story_id,
	CONSTRAINT requirement_user_stories_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE
);
CREATE INDEX idx_req_us_req ON public.requirement_user_stories USING btree (requirement_id);
CREATE INDEX ix_requirement_user_stories_requirement_id ON public.requirement_user_stories USING btree (requirement_id);


-- public.requirement_verifications definition

-- Drop table

-- DROP TABLE public.requirement_verifications;

CREATE TABLE public.requirement_verifications (
	id serial4 NOT NULL,
	requirement_id int4 NOT NULL,
	verification_type varchar(30) NOT NULL,
	verification_result varchar(20) NOT NULL,
	verified_by int4 NULL,
	verified_at timestamp NULL,
	evidence text NULL,
	notes text NULL,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL,
	CONSTRAINT requirement_verifications_created_at_not_null NOT NULL created_at,
	CONSTRAINT requirement_verifications_id_not_null NOT NULL id,
	CONSTRAINT requirement_verifications_pkey PRIMARY KEY (id),
	CONSTRAINT requirement_verifications_requirement_id_not_null NOT NULL requirement_id,
	CONSTRAINT requirement_verifications_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT requirement_verifications_verification_result_not_null NOT NULL verification_result,
	CONSTRAINT requirement_verifications_verification_type_not_null NOT NULL verification_type,
	CONSTRAINT requirement_verifications_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE
);
CREATE INDEX idx_req_ver_req ON public.requirement_verifications USING btree (requirement_id);
CREATE INDEX ix_requirement_verifications_requirement_id ON public.requirement_verifications USING btree (requirement_id);


-- public.risk_links definition

-- Drop table

-- DROP TABLE public.risk_links;

CREATE TABLE public.risk_links (
	id serial4 NOT NULL,
	risk_id varchar(36) NOT NULL,
	entity_type varchar(50) NOT NULL,
	entity_id varchar(50) NOT NULL,
	created_at timestamp NOT NULL,
	CONSTRAINT risk_links_created_at_not_null NOT NULL created_at,
	CONSTRAINT risk_links_entity_id_not_null NOT NULL entity_id,
	CONSTRAINT risk_links_entity_type_not_null NOT NULL entity_type,
	CONSTRAINT risk_links_id_not_null NOT NULL id,
	CONSTRAINT risk_links_pkey PRIMARY KEY (id),
	CONSTRAINT risk_links_risk_id_not_null NOT NULL risk_id,
	CONSTRAINT risk_links_unique UNIQUE (risk_id, entity_type, entity_id),
	CONSTRAINT risk_links_risk_fk FOREIGN KEY (risk_id) REFERENCES public.risks(id) ON DELETE CASCADE
);
CREATE INDEX idx_risk_links_entity ON public.risk_links USING btree (entity_type, entity_id);
CREATE INDEX idx_risk_links_risk ON public.risk_links USING btree (risk_id);


-- public.roadmap_item_related_business_areas definition

-- Drop table

-- DROP TABLE public.roadmap_item_related_business_areas;

CREATE TABLE public.roadmap_item_related_business_areas (
	id serial4 NOT NULL,
	roadmap_item_id varchar(36) NOT NULL,
	company_area_id int4 NOT NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	CONSTRAINT roadmap_item_related_business_areas_company_area_id_not_null NOT NULL company_area_id,
	CONSTRAINT roadmap_item_related_business_areas_created_at_not_null NOT NULL created_at,
	CONSTRAINT roadmap_item_related_business_areas_id_not_null NOT NULL id,
	CONSTRAINT roadmap_item_related_business_areas_pkey PRIMARY KEY (id),
	CONSTRAINT roadmap_item_related_business_areas_roadmap_item_id_not_null NOT NULL roadmap_item_id,
	CONSTRAINT uq_rirba_roadmap_item_company_area UNIQUE (roadmap_item_id, company_area_id),
	CONSTRAINT fk_rirba_company_area FOREIGN KEY (company_area_id) REFERENCES public.company_business_areas(id),
	CONSTRAINT fk_rirba_roadmap_item FOREIGN KEY (roadmap_item_id) REFERENCES public.roadmap_items(id) ON DELETE CASCADE
);
CREATE INDEX ix_rirba_company_area_id ON public.roadmap_item_related_business_areas USING btree (company_area_id);
CREATE INDEX ix_rirba_roadmap_item_id ON public.roadmap_item_related_business_areas USING btree (roadmap_item_id);


-- public.wsjf_assessment_answers definition

-- Drop table

-- DROP TABLE public.wsjf_assessment_answers;

CREATE TABLE public.wsjf_assessment_answers (
	answer_id serial4 NOT NULL,
	assessment_id int4 NOT NULL,
	question_id int4 NOT NULL,
	selected_option_id int4 NULL,
	answer_text text NULL,
	derived_dimension_code varchar(50) NULL,
	derived_score int4 NULL,
	justification_snapshot text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT chk_wsjf_assessment_answers_dimension CHECK (((derived_dimension_code IS NULL) OR ((derived_dimension_code)::text = ANY ((ARRAY['business_value'::character varying, 'time_criticality'::character varying, 'risk_reduction'::character varying, 'job_size'::character varying])::text[])))),
	CONSTRAINT chk_wsjf_assessment_answers_score CHECK (((derived_score IS NULL) OR (derived_score = ANY (ARRAY[1, 2, 3, 5, 8, 13, 21])))),
	CONSTRAINT wsjf_assessment_answers_answer_id_not_null NOT NULL answer_id,
	CONSTRAINT wsjf_assessment_answers_assessment_id_not_null NOT NULL assessment_id,
	CONSTRAINT wsjf_assessment_answers_created_at_not_null NOT NULL created_at,
	CONSTRAINT wsjf_assessment_answers_pkey PRIMARY KEY (answer_id),
	CONSTRAINT wsjf_assessment_answers_question_id_not_null NOT NULL question_id,
	CONSTRAINT wsjf_assessment_answers_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT fk_wsjf_assessment_answers_assessment FOREIGN KEY (assessment_id) REFERENCES public.wsjf_assessments(assessment_id) ON DELETE CASCADE,
	CONSTRAINT fk_wsjf_assessment_answers_option FOREIGN KEY (selected_option_id) REFERENCES public.wsjf_question_options(option_id) ON DELETE SET NULL,
	CONSTRAINT fk_wsjf_assessment_answers_question FOREIGN KEY (question_id) REFERENCES public.wsjf_template_questions(question_id) ON DELETE RESTRICT
);
CREATE INDEX idx_wsjf_assessment_answers_assessment ON public.wsjf_assessment_answers USING btree (assessment_id);
CREATE UNIQUE INDEX uq_wsjf_assessment_question ON public.wsjf_assessment_answers USING btree (assessment_id, question_id);


-- public.process_edges definition

-- Drop table

-- DROP TABLE public.process_edges;

CREATE TABLE public.process_edges (
	id serial4 NOT NULL,
	process_id int4 NOT NULL,
	source_node_id int4 NOT NULL,
	target_node_id int4 NOT NULL,
	edge_label varchar(150) NULL,
	edge_type varchar(20) NOT NULL,
	condition_expression text NULL,
	sequence_order int4 NULL,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL,
	source_handle varchar(20) NULL,
	target_handle varchar(20) NULL,
	CONSTRAINT process_edges_created_at_not_null NOT NULL created_at,
	CONSTRAINT process_edges_edge_type_not_null NOT NULL edge_type,
	CONSTRAINT process_edges_id_not_null NOT NULL id,
	CONSTRAINT process_edges_pkey PRIMARY KEY (id),
	CONSTRAINT process_edges_process_id_not_null NOT NULL process_id,
	CONSTRAINT process_edges_source_node_id_not_null NOT NULL source_node_id,
	CONSTRAINT process_edges_target_node_id_not_null NOT NULL target_node_id,
	CONSTRAINT process_edges_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT process_edges_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.processes(id) ON DELETE CASCADE,
	CONSTRAINT process_edges_source_node_id_fkey FOREIGN KEY (source_node_id) REFERENCES public.process_nodes(id) ON DELETE CASCADE,
	CONSTRAINT process_edges_target_node_id_fkey FOREIGN KEY (target_node_id) REFERENCES public.process_nodes(id) ON DELETE CASCADE
);
CREATE INDEX idx_pedge_process ON public.process_edges USING btree (process_id);
CREATE INDEX idx_pedge_source ON public.process_edges USING btree (source_node_id);
CREATE INDEX idx_pedge_target ON public.process_edges USING btree (target_node_id);
CREATE INDEX ix_process_edges_process_id ON public.process_edges USING btree (process_id);
CREATE INDEX ix_process_edges_source_node_id ON public.process_edges USING btree (source_node_id);
CREATE INDEX ix_process_edges_target_node_id ON public.process_edges USING btree (target_node_id);


-- public.process_node_relations definition

-- Drop table

-- DROP TABLE public.process_node_relations;

CREATE TABLE public.process_node_relations (
	id serial4 NOT NULL,
	node_id int4 NOT NULL,
	entity_type varchar(30) NOT NULL,
	entity_id int4 NOT NULL,
	relation_type varchar(50) NULL,
	notes text NULL,
	created_at timestamp NOT NULL,
	CONSTRAINT process_node_relations_created_at_not_null NOT NULL created_at,
	CONSTRAINT process_node_relations_entity_id_not_null NOT NULL entity_id,
	CONSTRAINT process_node_relations_entity_type_not_null NOT NULL entity_type,
	CONSTRAINT process_node_relations_id_not_null NOT NULL id,
	CONSTRAINT process_node_relations_node_id_not_null NOT NULL node_id,
	CONSTRAINT process_node_relations_pkey PRIMARY KEY (id),
	CONSTRAINT process_node_relations_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.process_nodes(id) ON DELETE CASCADE
);
CREATE INDEX idx_pnrel_node ON public.process_node_relations USING btree (node_id);
CREATE INDEX ix_process_node_relations_node_id ON public.process_node_relations USING btree (node_id);


-- public.processedge definition

-- Drop table

-- DROP TABLE public.processedge;

CREATE TABLE public.processedge (
	edge_id int8 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	process_id int8 NOT NULL,
	source_node_id int8 NOT NULL,
	target_node_id int8 NOT NULL,
	edge_label varchar(150) NULL,
	edge_type varchar(20) DEFAULT 'SEQUENCE'::character varying NOT NULL,
	condition_expression text NULL,
	sequence_order int4 NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT chk_processedge_nodes CHECK ((source_node_id <> target_node_id)),
	CONSTRAINT ck_processedge_type CHECK (((edge_type)::text = ANY (ARRAY[('SEQUENCE'::character varying)::text, ('CONDITIONAL'::character varying)::text, ('DEFAULT'::character varying)::text, ('EXCEPTION'::character varying)::text]))),
	CONSTRAINT processedge_created_at_not_null NOT NULL created_at,
	CONSTRAINT processedge_edge_id_not_null NOT NULL edge_id,
	CONSTRAINT processedge_edge_type_not_null NOT NULL edge_type,
	CONSTRAINT processedge_pkey PRIMARY KEY (edge_id),
	CONSTRAINT processedge_process_id_not_null NOT NULL process_id,
	CONSTRAINT processedge_source_node_id_not_null NOT NULL source_node_id,
	CONSTRAINT processedge_target_node_id_not_null NOT NULL target_node_id,
	CONSTRAINT processedge_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT fk_processedge_process FOREIGN KEY (process_id) REFERENCES public.process(process_id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT fk_processedge_source FOREIGN KEY (source_node_id) REFERENCES public.processnode(node_id) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT fk_processedge_target FOREIGN KEY (target_node_id) REFERENCES public.processnode(node_id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX ix_processedge_process ON public.processedge USING btree (process_id);
CREATE INDEX ix_processedge_source ON public.processedge USING btree (source_node_id);
CREATE INDEX ix_processedge_target ON public.processedge USING btree (target_node_id);

-- Table Triggers

create trigger trg_processedge_updated_at before
update
    on
    public.processedge for each row execute function fn_set_updated_at();


-- public.publication_deliveries definition

-- Drop table

-- DROP TABLE public.publication_deliveries;

CREATE TABLE public.publication_deliveries (
	publication_delivery_id int4 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	publication_id int4 NOT NULL,
	publication_version_id int4 NULL,
	delivery_channel_id int4 NOT NULL,
	status varchar(30) DEFAULT 'PENDING'::character varying NOT NULL,
	destination varchar(500) NULL,
	artifact_uri text NULL,
	external_reference varchar(255) NULL,
	error_message text NULL,
	delivered_by int4 NULL,
	scheduled_at timestamp NULL,
	delivered_at timestamp NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT ck_publication_deliveries_status CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('SCHEDULED'::character varying)::text, ('PROCESSING'::character varying)::text, ('DELIVERED'::character varying)::text, ('PARTIALLY_DELIVERED'::character varying)::text, ('FAILED'::character varying)::text, ('CANCELLED'::character varying)::text]))),
	CONSTRAINT publication_deliveries_created_at_not_null NOT NULL created_at,
	CONSTRAINT publication_deliveries_delivery_channel_id_not_null NOT NULL delivery_channel_id,
	CONSTRAINT publication_deliveries_pkey PRIMARY KEY (publication_delivery_id),
	CONSTRAINT publication_deliveries_publication_delivery_id_not_null NOT NULL publication_delivery_id,
	CONSTRAINT publication_deliveries_publication_id_not_null NOT NULL publication_id,
	CONSTRAINT publication_deliveries_status_not_null NOT NULL status,
	CONSTRAINT fk_publication_deliveries_channel FOREIGN KEY (delivery_channel_id) REFERENCES public.delivery_channels(delivery_channel_id) ON DELETE RESTRICT,
	CONSTRAINT fk_publication_deliveries_delivered_by FOREIGN KEY (delivered_by) REFERENCES public.users(user_id) ON DELETE SET NULL,
	CONSTRAINT fk_publication_deliveries_publication FOREIGN KEY (publication_id) REFERENCES public.publications(publication_id) ON DELETE CASCADE,
	CONSTRAINT fk_publication_deliveries_version FOREIGN KEY (publication_version_id) REFERENCES public.publication_versions(publication_version_id) ON DELETE SET NULL
);
CREATE INDEX idx_publication_deliveries_channel ON public.publication_deliveries USING btree (delivery_channel_id);
CREATE INDEX idx_publication_deliveries_publication ON public.publication_deliveries USING btree (publication_id);
CREATE INDEX idx_publication_deliveries_status ON public.publication_deliveries USING btree (status);
CREATE INDEX idx_publication_deliveries_version ON public.publication_deliveries USING btree (publication_version_id);
COMMENT ON TABLE public.publication_deliveries IS 'Entregas concretas de uma publica????o por um determinado canal.';


-- public.publication_presentations definition

-- Drop table

-- DROP TABLE public.publication_presentations;

CREATE TABLE public.publication_presentations (
	presentation_id int4 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	publication_id int4 NOT NULL,
	publication_version_id int4 NULL,
	meeting_id varchar(36) NULL,
	presentation_date date NOT NULL,
	presented_at timestamp NULL,
	presented_by int4 NULL,
	context_label varchar(200) NULL,
	audience_label varchar(200) NULL,
	notes text NULL,
	presentation_mode varchar(30) DEFAULT 'LIVE'::character varying NOT NULL,
	status varchar(20) DEFAULT 'COMPLETED'::character varying NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT ck_publication_presentations_mode CHECK (((presentation_mode)::text = ANY (ARRAY[('LIVE'::character varying)::text, ('HTML'::character varying)::text, ('PDF'::character varying)::text, ('PPT'::character varying)::text, ('OTHER'::character varying)::text]))),
	CONSTRAINT ck_publication_presentations_status CHECK (((status)::text = ANY (ARRAY[('PLANNED'::character varying)::text, ('COMPLETED'::character varying)::text, ('CANCELLED'::character varying)::text]))),
	CONSTRAINT publication_presentations_created_at_not_null NOT NULL created_at,
	CONSTRAINT publication_presentations_pkey PRIMARY KEY (presentation_id),
	CONSTRAINT publication_presentations_presentation_date_not_null NOT NULL presentation_date,
	CONSTRAINT publication_presentations_presentation_id_not_null NOT NULL presentation_id,
	CONSTRAINT publication_presentations_presentation_mode_not_null NOT NULL presentation_mode,
	CONSTRAINT publication_presentations_publication_id_not_null NOT NULL publication_id,
	CONSTRAINT publication_presentations_status_not_null NOT NULL status,
	CONSTRAINT publication_presentations_updated_at_not_null NOT NULL updated_at,
	CONSTRAINT fk_publication_presentations_meeting FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE SET NULL,
	CONSTRAINT fk_publication_presentations_presented_by FOREIGN KEY (presented_by) REFERENCES public.users(user_id) ON DELETE SET NULL,
	CONSTRAINT fk_publication_presentations_publication FOREIGN KEY (publication_id) REFERENCES public.publications(publication_id) ON DELETE CASCADE,
	CONSTRAINT fk_publication_presentations_version FOREIGN KEY (publication_version_id) REFERENCES public.publication_versions(publication_version_id) ON DELETE SET NULL
);
CREATE INDEX idx_publication_presentations_date ON public.publication_presentations USING btree (presentation_date DESC);
CREATE INDEX idx_publication_presentations_meeting ON public.publication_presentations USING btree (meeting_id);
CREATE INDEX idx_publication_presentations_publication ON public.publication_presentations USING btree (publication_id);
CREATE INDEX idx_publication_presentations_publication_date ON public.publication_presentations USING btree (publication_id, presentation_date DESC);
CREATE INDEX idx_publication_presentations_version ON public.publication_presentations USING btree (publication_version_id);


-- public.delivery_recipients definition

-- Drop table

-- DROP TABLE public.delivery_recipients;

CREATE TABLE public.delivery_recipients (
	delivery_recipient_id int4 GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	publication_delivery_id int4 NOT NULL,
	recipient_type varchar(30) NOT NULL,
	recipient_name varchar(180) NULL,
	recipient_address varchar(320) NULL,
	status varchar(30) DEFAULT 'PENDING'::character varying NOT NULL,
	delivered_at timestamp NULL,
	error_message text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT ck_delivery_recipients_status CHECK (((status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('DELIVERED'::character varying)::text, ('FAILED'::character varying)::text, ('SKIPPED'::character varying)::text, ('CANCELLED'::character varying)::text]))),
	CONSTRAINT ck_delivery_recipients_type CHECK (((recipient_type)::text = ANY (ARRAY[('PERSON'::character varying)::text, ('EMAIL'::character varying)::text, ('GROUP'::character varying)::text, ('TEAMS_CHANNEL'::character varying)::text, ('URL'::character varying)::text, ('SYSTEM'::character varying)::text, ('OTHER'::character varying)::text]))),
	CONSTRAINT delivery_recipients_created_at_not_null NOT NULL created_at,
	CONSTRAINT delivery_recipients_delivery_recipient_id_not_null NOT NULL delivery_recipient_id,
	CONSTRAINT delivery_recipients_pkey PRIMARY KEY (delivery_recipient_id),
	CONSTRAINT delivery_recipients_publication_delivery_id_not_null NOT NULL publication_delivery_id,
	CONSTRAINT delivery_recipients_recipient_type_not_null NOT NULL recipient_type,
	CONSTRAINT delivery_recipients_status_not_null NOT NULL status,
	CONSTRAINT fk_delivery_recipients_delivery FOREIGN KEY (publication_delivery_id) REFERENCES public.publication_deliveries(publication_delivery_id) ON DELETE CASCADE
);
CREATE INDEX idx_delivery_recipients_address ON public.delivery_recipients USING btree (recipient_address);
CREATE INDEX idx_delivery_recipients_delivery ON public.delivery_recipients USING btree (publication_delivery_id);
COMMENT ON TABLE public.delivery_recipients IS 'Destinat??rios concretos que receberam ou deveriam receber uma entrega.';


-- public.vwprocesssummary source

CREATE OR REPLACE VIEW public.vwprocesssummary
AS SELECT p.process_id,
    p.product_id,
    p.process_name,
    p.process_version,
    p.process_type,
    p.process_status,
    count(DISTINCT n.node_id) AS node_count,
    count(DISTINCT e.edge_id) AS edge_count,
    count(DISTINCT n.node_id) FILTER (WHERE n.is_manual = true) AS manual_node_count,
    count(DISTINCT n.node_id) FILTER (WHERE n.is_bottleneck = true) AS bottleneck_count
   FROM process p
     LEFT JOIN processnode n ON n.process_id = p.process_id
     LEFT JOIN processedge e ON e.process_id = p.process_id
  WHERE p.is_deleted = false
  GROUP BY p.process_id, p.product_id, p.process_name, p.process_version, p.process_type, p.process_status;


-- public.vwrequirementcoverage source

CREATE OR REPLACE VIEW public.vwrequirementcoverage
AS SELECT r.requirement_id,
    r.product_id,
    r.requirement_code,
    r.requirement_title,
    r.requirement_type,
    r.priority,
    r.lifecycle_status,
    r.fulfillment_status,
    count(DISTINCT rf.feature_id) AS feature_count,
    count(DISTINCT rus.user_story_id) AS user_story_count,
    count(DISTINCT rus.user_story_id) FILTER (WHERE rus.coverage_status::text = 'COVERED'::text) AS covered_story_count,
        CASE
            WHEN bool_or(rv.verification_result::text = 'PASS'::text) THEN 1
            ELSE 0
        END AS has_pass_verification
   FROM requirement r
     LEFT JOIN requirementfeature rf ON rf.requirement_id = r.requirement_id
     LEFT JOIN requirementuserstory rus ON rus.requirement_id = r.requirement_id
     LEFT JOIN requirementverification rv ON rv.requirement_id = r.requirement_id
  WHERE r.is_deleted = false
  GROUP BY r.requirement_id, r.product_id, r.requirement_code, r.requirement_title, r.requirement_type, r.priority, r.lifecycle_status, r.fulfillment_status;



-- DROP FUNCTION public.fn_set_updated_at();

CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$
;

-- DROP FUNCTION public.set_communication_links_updated_at();

CREATE OR REPLACE FUNCTION public.set_communication_links_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

-- DROP FUNCTION public.set_updated_at_timestamp();

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$
;