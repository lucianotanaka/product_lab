-- 018_discovery_business_case_project_charter.sql
-- Adds Business Case and Project Charter support for Discovery and Roadmap.

CREATE TABLE IF NOT EXISTS discovery_business_cases (
    id VARCHAR(36) PRIMARY KEY,
    opportunity_id VARCHAR(36) NOT NULL UNIQUE,
    product_id INTEGER NOT NULL,
    title VARCHAR(300) NOT NULL,
    executive_summary TEXT NULL,
    problem_statement TEXT NULL,
    current_scenario TEXT NULL,
    proposed_solution TEXT NULL,
    expected_benefits TEXT NULL,
    strategic_alignment TEXT NULL,
    financial_impact TEXT NULL,
    estimated_cost VARCHAR(120) NULL,
    estimated_effort VARCHAR(120) NULL,
    risks_summary TEXT NULL,
    dependencies_summary TEXT NULL,
    assumptions TEXT NULL,
    constraints TEXT NULL,
    go_no_go_recommendation TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    approved_by INTEGER NULL,
    approved_at TIMESTAMP NULL,
    created_by INTEGER NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_discovery_business_cases_opportunity
        FOREIGN KEY (opportunity_id) REFERENCES discovery_opportunities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_discovery_business_cases_product_id
    ON discovery_business_cases(product_id);

CREATE INDEX IF NOT EXISTS idx_discovery_business_cases_status
    ON discovery_business_cases(status);

CREATE TABLE IF NOT EXISTS project_charters (
    id VARCHAR(36) PRIMARY KEY,
    business_case_id VARCHAR(36) NULL UNIQUE,
    opportunity_id VARCHAR(36) NULL,
    roadmap_item_id VARCHAR(36) NULL,
    product_id INTEGER NOT NULL,
    project_name VARCHAR(300) NOT NULL,
    project_purpose TEXT NULL,
    business_objective TEXT NULL,
    objectives TEXT NULL,
    scope_in TEXT NULL,
    scope_out TEXT NULL,
    success_criteria TEXT NULL,
    high_level_requirements TEXT NULL,
    major_deliverables TEXT NULL,
    high_level_timeline TEXT NULL,
    budget_summary TEXT NULL,
    risks_summary TEXT NULL,
    assumptions_constraints TEXT NULL,
    sponsor_name VARCHAR(200) NULL,
    project_manager_name VARCHAR(200) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    approved_by INTEGER NULL,
    approved_at TIMESTAMP NULL,
    created_by INTEGER NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_project_charters_business_case
        FOREIGN KEY (business_case_id) REFERENCES discovery_business_cases(id) ON DELETE SET NULL,
    CONSTRAINT fk_project_charters_opportunity
        FOREIGN KEY (opportunity_id) REFERENCES discovery_opportunities(id) ON DELETE SET NULL,
    CONSTRAINT fk_project_charters_roadmap_item
        FOREIGN KEY (roadmap_item_id) REFERENCES roadmap_items(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_project_charters_product_id
    ON project_charters(product_id);

CREATE INDEX IF NOT EXISTS idx_project_charters_opportunity_id
    ON project_charters(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_project_charters_roadmap_item_id
    ON project_charters(roadmap_item_id);

CREATE INDEX IF NOT EXISTS idx_project_charters_status
    ON project_charters(status);
