-- ─────────────────────────────────────────────────────────────────────────────
-- DDL 007 — Integration Connections
-- Tabelas genéricas para conexões com sistemas externos (ADO, OpenAI, Jira, etc.)
-- Suporta escopo global / por empresa / por produto com parâmetros dinâmicos.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. ENUMS ──────────────────────────────────────────────────────────────────

CREATE TYPE public.integration_provider AS ENUM (
    'azure_devops',
    'openai',
    'anthropic',
    'azure_openai',
    'axet_flows',
    'jira',
    'github',
    'gitlab',
    'slack',
    'teams',
    'webhook',
    'custom'
);
COMMENT ON TYPE public.integration_provider IS 'Provedores de integração suportados pelo Product Lab.';

CREATE TYPE public.integration_scope AS ENUM (
    'global',    -- compartilhada por toda a plataforma
    'company',   -- pertence a uma empresa cliente
    'product'    -- pertence a um produto específico
);
COMMENT ON TYPE public.integration_scope IS 'Escopo de visibilidade/uso de uma conexão de integração.';

-- ── 2. integration_field_schemas ─────────────────────────────────────────────
-- Define quais campos cada provider precisa (form dinâmico no frontend).

CREATE TABLE public.integration_field_schemas (
    provider      public.integration_provider NOT NULL,
    field_key     varchar(100) NOT NULL,
    field_label   varchar(200) NOT NULL,
    field_type    varchar(50)  NOT NULL,          -- text | password | url | select | boolean | number
    is_secret     bool         DEFAULT false NOT NULL,
    is_required   bool         DEFAULT true  NOT NULL,
    options       jsonb        NULL,              -- para field_type = 'select': [{"value":"gpt-4o","label":"GPT-4o"}]
    hint          text         NULL,
    placeholder   varchar(300) NULL,
    sort_order    int4         DEFAULT 0     NOT NULL,
    CONSTRAINT integration_field_schemas_pkey PRIMARY KEY (provider, field_key),
    CONSTRAINT ck_ifs_field_type CHECK (
        field_type IN ('text','password','url','select','boolean','number','textarea')
    )
);

COMMENT ON TABLE  public.integration_field_schemas IS 'Schema dos campos necessários por provider. Permite que o frontend monte formulários dinâmicos sem hardcode.';
COMMENT ON COLUMN public.integration_field_schemas.is_secret IS 'Se true, o valor será armazenado no campo secrets (encriptado) em vez de params.';
COMMENT ON COLUMN public.integration_field_schemas.options    IS 'Lista de opções para campos do tipo select: [{"value":"...","label":"..."}].';

CREATE INDEX idx_ifs_provider ON public.integration_field_schemas (provider);

-- ── 3. integration_connections ───────────────────────────────────────────────

CREATE TABLE public.integration_connections (
    id            varchar(36)                  NOT NULL DEFAULT gen_random_uuid()::text,
    name          varchar(200)                 NOT NULL,
    description   text                         NULL,
    provider      public.integration_provider  NOT NULL,
    scope         public.integration_scope     NOT NULL,

    -- Escopo de vínculo (apenas um deve ser preenchido conforme scope)
    company_id    int4   NULL,
    product_id    int4   NULL,

    -- Parâmetros públicos (org, project, model, endpoint, etc.)
    params        jsonb  NOT NULL DEFAULT '{}',

    -- Credenciais encriptadas (PAT, API key, token, etc.)
    -- IMPORTANTE: nunca expor este campo via API — retornar apenas { has_secrets: true }
    -- Encriptar com pgp_sym_encrypt() ou Fernet no backend antes de inserir.
    secrets       jsonb  NOT NULL DEFAULT '{}',

    is_active     bool   DEFAULT true  NOT NULL,

    -- Última sincronização (para integrações que fazem sync periódico)
    last_sync_at  timestamp  NULL,
    last_error    text       NULL,
    sync_cursor   text       NULL,    -- ex: ADO continuation token, GitHub since, etc.

    created_by    int4   NULL,
    created_at    timestamp  DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at    timestamp  DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT integration_connections_pkey PRIMARY KEY (id),

    -- Garante consistência entre scope e os campos de vínculo
    CONSTRAINT ck_ic_scope_refs CHECK (
        (scope = 'global'  AND company_id IS NULL AND product_id IS NULL) OR
        (scope = 'company' AND company_id IS NOT NULL AND product_id IS NULL) OR
        (scope = 'product' AND product_id IS NOT NULL)
    ),

    CONSTRAINT fk_ic_company    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_ic_product    FOREIGN KEY (product_id) REFERENCES public.products(product_id) ON DELETE CASCADE,
    CONSTRAINT fk_ic_created_by FOREIGN KEY (created_by) REFERENCES public.users(user_id)   ON DELETE SET NULL
);

COMMENT ON TABLE  public.integration_connections IS 'Conexões com sistemas externos (ADO, OpenAI, Jira, etc.) com escopo global / empresa / produto.';
COMMENT ON COLUMN public.integration_connections.params     IS 'Parâmetros públicos da conexão em JSON (org, project, model, endpoint...).';
COMMENT ON COLUMN public.integration_connections.secrets    IS 'Credenciais encriptadas em JSON (PAT, api_key, token...). NUNCA expor via API.';
COMMENT ON COLUMN public.integration_connections.sync_cursor IS 'Ponteiro de posição para sincronizações incrementais (continuation token, timestamp, etc.).';

CREATE INDEX idx_ic_provider   ON public.integration_connections (provider);
CREATE INDEX idx_ic_scope      ON public.integration_connections (scope);
CREATE INDEX idx_ic_company    ON public.integration_connections (company_id);
CREATE INDEX idx_ic_product    ON public.integration_connections (product_id);
CREATE INDEX idx_ic_active     ON public.integration_connections (is_active);

-- ── 4. integration_sync_logs ─────────────────────────────────────────────────
-- Histórico de execuções de sync (ADO import, etc.)

CREATE TABLE public.integration_sync_logs (
    id              varchar(36)  NOT NULL DEFAULT gen_random_uuid()::text,
    connection_id   varchar(36)  NOT NULL,
    status          varchar(20)  NOT NULL DEFAULT 'running',  -- running | completed | failed | partial
    started_at      timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at     timestamp    NULL,
    items_created   int4         DEFAULT 0 NOT NULL,
    items_updated   int4         DEFAULT 0 NOT NULL,
    items_skipped   int4         DEFAULT 0 NOT NULL,
    error_message   text         NULL,
    details         jsonb        NULL,   -- metadados adicionais do sync
    triggered_by    int4         NULL,   -- user_id que acionou (null = automático)

    CONSTRAINT integration_sync_logs_pkey PRIMARY KEY (id),
    CONSTRAINT ck_isl_status CHECK (status IN ('running','completed','failed','partial')),
    CONSTRAINT fk_isl_connection FOREIGN KEY (connection_id)
        REFERENCES public.integration_connections(id) ON DELETE CASCADE,
    CONSTRAINT fk_isl_triggered_by FOREIGN KEY (triggered_by)
        REFERENCES public.users(user_id) ON DELETE SET NULL
);

COMMENT ON TABLE public.integration_sync_logs IS 'Histórico de execuções de sincronização de integrações.';

CREATE INDEX idx_isl_connection  ON public.integration_sync_logs (connection_id);
CREATE INDEX idx_isl_status      ON public.integration_sync_logs (status);
CREATE INDEX idx_isl_started_at  ON public.integration_sync_logs (started_at);

-- ── 5. SEED — schemas dos providers ──────────────────────────────────────────

-- Azure DevOps
INSERT INTO public.integration_field_schemas
    (provider, field_key, field_label, field_type, is_secret, is_required, hint, placeholder, sort_order)
VALUES
    ('azure_devops', 'org_url',      'Organization URL',      'url',      false, true,  'Ex: https://dev.azure.com/nttdata-brasil',     'https://dev.azure.com/sua-org',  1),
    ('azure_devops', 'project',      'Project Name',          'text',     false, true,  'Nome do projeto no ADO',                      'Renewals',                       2),
    ('azure_devops', 'team',         'Team Name (opcional)',  'text',     false, false, 'Nome do time no ADO. Deixe vazio para todos.', 'SA Team',                        3),
    ('azure_devops', 'area_path',    'Area Path (opcional)',  'text',     false, false, 'Ex: Renewals\\SA. Filtro de área no ADO.',     'Renewals\\SA',                   4),
    ('azure_devops', 'pat',          'Personal Access Token', 'password', true,  true,  'PAT com escopo Work Items (Read ou Read & Write)', '',                           5),
    ('azure_devops', 'sync_types',   'Work Item Types',       'text',     false, false, 'Tipos a importar separados por vírgula',       'User Story,Task,Bug',            6);

-- OpenAI
INSERT INTO public.integration_field_schemas
    (provider, field_key, field_label, field_type, is_secret, is_required, options, hint, placeholder, sort_order)
VALUES
    ('openai', 'model',       'Model',        'select',   false, true,
     '[{"value":"gpt-4o","label":"GPT-4o"},{"value":"gpt-4o-mini","label":"GPT-4o Mini"},{"value":"gpt-4-turbo","label":"GPT-4 Turbo"},{"value":"gpt-3.5-turbo","label":"GPT-3.5 Turbo"}]',
     'Modelo padrão para geração de conteúdo', 'gpt-4o', 1),
    ('openai', 'api_key',     'API Key',      'password', true,  true,  NULL, 'Chave da API OpenAI',           'sk-...',    2),
    ('openai', 'temperature', 'Temperature',  'number',   false, false, NULL, 'Entre 0 e 2. Padrão: 0.3',      '0.3',       3),
    ('openai', 'max_tokens',  'Max Tokens',   'number',   false, false, NULL, 'Tokens máximos por resposta',   '4096',      4),
    ('openai', 'org_id',      'Organization ID (opcional)', 'text', false, false, NULL, 'ID da org OpenAI (org-...)', '', 5);

-- Azure OpenAI
INSERT INTO public.integration_field_schemas
    (provider, field_key, field_label, field_type, is_secret, is_required, hint, placeholder, sort_order)
VALUES
    ('azure_openai', 'endpoint',        'Endpoint URL',      'url',      false, true,  'Ex: https://sua-instancia.openai.azure.com/', '',    1),
    ('azure_openai', 'deployment_name', 'Deployment Name',   'text',     false, true,  'Nome do deployment no Azure OpenAI',          '',    2),
    ('azure_openai', 'api_version',     'API Version',       'text',     false, true,  'Ex: 2024-02-01',                              '2024-02-01', 3),
    ('azure_openai', 'api_key',         'API Key',           'password', true,  true,  'Chave de acesso do Azure OpenAI',             '',    4),
    ('azure_openai', 'temperature',     'Temperature',       'number',   false, false, 'Entre 0 e 2. Padrão: 0.3',                    '0.3', 5),
    ('azure_openai', 'max_tokens',      'Max Tokens',        'number',   false, false, 'Tokens máximos por resposta',                 '4096',6);

-- Anthropic (Claude)
INSERT INTO public.integration_field_schemas
    (provider, field_key, field_label, field_type, is_secret, is_required, options, hint, placeholder, sort_order)
VALUES
    ('anthropic', 'model',       'Model',      'select',   false, true,
     '[{"value":"claude-3-5-sonnet-20241022","label":"Claude 3.5 Sonnet"},{"value":"claude-3-5-haiku-20241022","label":"Claude 3.5 Haiku"},{"value":"claude-3-opus-20240229","label":"Claude 3 Opus"}]',
     'Modelo Anthropic', '', 1),
    ('anthropic', 'api_key',     'API Key',    'password', true,  true,  NULL, 'Chave da API Anthropic', 'sk-ant-...', 2),
    ('anthropic', 'max_tokens',  'Max Tokens', 'number',   false, false, NULL, 'Tokens máximos',         '4096',       3);

-- aXet Flows
INSERT INTO public.integration_field_schemas
    (provider, field_key, field_label, field_type, is_secret, is_required, options, hint, placeholder, sort_order)
VALUES
    ('axet_flows', 'endpoint_mode', 'Connection Mode', 'select', false, true,
     '[{"value":"auto_discovery","label":"Auto-discovery"},{"value":"fixed_port","label":"Fixed port"}]',
     'Define se o Product Lab deve descobrir a porta automaticamente ou usar uma porta fixa.', 'auto_discovery', 1),
    ('axet_flows', 'scheme', 'Scheme', 'select', false, true,
     '[{"value":"http","label":"HTTP"},{"value":"https","label":"HTTPS"}]',
     'Protocolo HTTP do endpoint do aXet Flows.', 'http', 2),
    ('axet_flows', 'host', 'Host', 'text', false, true,
     'Hostname do endpoint do aXet Flows. Em modo auto-discovery normalmente permanece localhost.', 'localhost', 3),
    ('axet_flows', 'port', 'Port', 'number', false, false,
     'Usado principalmente no modo fixed_port. Em auto-discovery será preenchido automaticamente.', '1880', 4),
    ('axet_flows', 'ask_path', 'Ask Path', 'text', false, true,
     'Path HTTP do endpoint principal do agente.', '/pergunta', 5),
    ('axet_flows', 'timeout_seconds', 'Timeout (seconds)', 'number', false, false,
     'Tempo máximo de espera das chamadas HTTP.', '300', 6),
    ('axet_flows', 'verify_tls', 'Verify TLS', 'boolean', false, false,
     'Se true, valida o certificado TLS do endpoint.', 'false', 7),
    ('axet_flows', 'request_question_field', 'Request Question Field', 'text', false, false,
     'Nome do campo JSON que recebe a pergunta.', 'pergunta', 8),
    ('axet_flows', 'request_context_field', 'Request Context Field', 'text', false, false,
     'Nome do campo JSON que recebe o contexto.', 'contexto', 9),
    ('axet_flows', 'response_answer_field', 'Response Answer Field', 'text', false, false,
     'Nome do campo JSON esperado na resposta textual.', 'resposta', 10),
    ('axet_flows', 'status_path', 'Status Path', 'text', false, false,
     'Path HTTP usado para polling de status do agente.', '/agent/status', 11),
    ('axet_flows', 'mode', 'Response Mode', 'select', false, false,
     '[{"value":"text","label":"Text"},{"value":"structured","label":"Structured JSON"}]',
     'Modo de resposta esperado do aXet Flows.', 'structured', 12);

-- Jira
INSERT INTO public.integration_field_schemas
    (provider, field_key, field_label, field_type, is_secret, is_required, hint, placeholder, sort_order)
VALUES
    ('jira', 'base_url',     'Base URL',        'url',      false, true,  'Ex: https://suaempresa.atlassian.net', '', 1),
    ('jira', 'project_key',  'Project Key',     'text',     false, true,  'Chave do projeto no Jira. Ex: NTT',   '', 2),
    ('jira', 'email',        'User Email',      'text',     false, true,  'Email da conta Jira',                 '', 3),
    ('jira', 'api_token',    'API Token',       'password', true,  true,  'Token de API do Jira',                '', 4),
    ('jira', 'issue_types',  'Issue Types',     'text',     false, false, 'Tipos separados por vírgula',         'Story,Task,Bug', 5);

-- Slack
INSERT INTO public.integration_field_schemas
    (provider, field_key, field_label, field_type, is_secret, is_required, hint, placeholder, sort_order)
VALUES
    ('slack', 'channel',     'Channel',          'text',     false, true,  'Ex: #produto-ntt360', '#channel', 1),
    ('slack', 'webhook_url', 'Incoming Webhook', 'password', true,  true,  'URL do Incoming Webhook do Slack', 'https://hooks.slack.com/...', 2);

-- Microsoft Teams
INSERT INTO public.integration_field_schemas
    (provider, field_key, field_label, field_type, is_secret, is_required, hint, placeholder, sort_order)
VALUES
    ('teams', 'channel_name', 'Channel Name',     'text',     false, true,  'Nome do canal Teams',                     '', 1),
    ('teams', 'webhook_url',  'Incoming Webhook', 'password', true,  true,  'URL do Incoming Webhook do Teams',        'https://xxx.webhook.office.com/...', 2);

-- Webhook genérico
INSERT INTO public.integration_field_schemas
    (provider, field_key, field_label, field_type, is_secret, is_required, hint, placeholder, sort_order)
VALUES
    ('webhook', 'url',     'Webhook URL',    'url',      false, true,  'URL para onde as notificações serão enviadas', 'https://...', 1),
    ('webhook', 'secret',  'Webhook Secret', 'password', true,  false, 'Segredo para assinar o payload (HMAC)',        '',            2),
    ('webhook', 'method',  'HTTP Method',    'select',   false, false,
     '[{"value":"POST","label":"POST"},{"value":"PUT","label":"PUT"}]',
     'Método HTTP', 'POST', 3);

-- GitHub
INSERT INTO public.integration_field_schemas
    (provider, field_key, field_label, field_type, is_secret, is_required, hint, placeholder, sort_order)
VALUES
    ('github', 'owner',       'Owner (org ou user)', 'text',     false, true,  'Nome da organização ou usuário no GitHub', 'nttdata-brasil', 1),
    ('github', 'repo',        'Repository',          'text',     false, false, 'Nome do repositório (opcional)',           'product-lab',    2),
    ('github', 'access_token','Personal Access Token','password', true,  true,  'PAT com escopo repo ou read:org',         'ghp_...',        3);

-- GitLab
INSERT INTO public.integration_field_schemas
    (provider, field_key, field_label, field_type, is_secret, is_required, hint, placeholder, sort_order)
VALUES
    ('gitlab', 'base_url',    'GitLab URL',    'url',      false, true,  'Ex: https://gitlab.com ou instância self-hosted', 'https://gitlab.com', 1),
    ('gitlab', 'project_id',  'Project ID',    'text',     false, false, 'ID numérico do projeto GitLab',                   '',                   2),
    ('gitlab', 'access_token','Access Token',  'password', true,  true,  'Personal ou Project Access Token',                'glpat-...',          3);
