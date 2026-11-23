-- ============================================================
-- 017_business_domains.sql — Business Domain / Subdomain
-- Transversal: domains float above products.
-- Requirements can be linked to one domain + optional subdomain.
-- ============================================================

CREATE TABLE IF NOT EXISTS business_domains (
    id              SERIAL PRIMARY KEY,
    domain_code     VARCHAR(50)  NOT NULL UNIQUE,   -- e.g. 'CISCO-LCI'
    domain_name     VARCHAR(200) NOT NULL,
    description     TEXT,
    owner           VARCHAR(200),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    display_order   INTEGER      NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bd_active ON business_domains(is_active);
CREATE INDEX IF NOT EXISTS idx_bd_code   ON business_domains(domain_code);

CREATE TABLE IF NOT EXISTS business_subdomains (
    id              SERIAL PRIMARY KEY,
    domain_id       INTEGER      NOT NULL REFERENCES business_domains(id) ON DELETE CASCADE,
    subdomain_code  VARCHAR(50)  NOT NULL,           -- e.g. 'CISCO-LCI-CALC'
    subdomain_name  VARCHAR(200) NOT NULL,
    description     TEXT,
    display_order   INTEGER      NOT NULL DEFAULT 0,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (domain_id, subdomain_code)
);

CREATE INDEX IF NOT EXISTS idx_bsd_domain  ON business_subdomains(domain_id);
CREATE INDEX IF NOT EXISTS idx_bsd_active  ON business_subdomains(is_active);

-- Link: many-to-many requirement ↔ domain (with optional subdomain)
CREATE TABLE IF NOT EXISTS requirement_domain_links (
    id              SERIAL PRIMARY KEY,
    requirement_id  INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    domain_id       INTEGER NOT NULL REFERENCES business_domains(id) ON DELETE CASCADE,
    subdomain_id    INTEGER REFERENCES business_subdomains(id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (requirement_id, domain_id)
);

CREATE INDEX IF NOT EXISTS idx_rdl_requirement ON requirement_domain_links(requirement_id);
CREATE INDEX IF NOT EXISTS idx_rdl_domain      ON requirement_domain_links(domain_id);
CREATE INDEX IF NOT EXISTS idx_rdl_subdomain   ON requirement_domain_links(subdomain_id);
