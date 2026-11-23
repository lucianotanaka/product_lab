-- ============================================================
-- 019 — OpenAI & Azure OpenAI field schemas for Integration Hub
-- ============================================================

-- ── OpenAI (standard / Enterprise) ───────────────────────────────────────────
INSERT INTO integration_field_schemas
  (provider, field_key, field_label, field_type, is_secret, is_required, hint, placeholder, sort_order)
VALUES
  ('openai', 'org_id',        'Organization ID',           'text',     false, false, 'ID da organização OpenAI Enterprise (ex: org-xxxx). Deixe em branco para usar a org padrão da API Key.', 'org-xxxxxxxxxxxx', 1),
  ('openai', 'api_key',       'API Key',                   'password', true,  true,  'Chave de API OpenAI — começa com sk-', 'sk-...', 2),
  ('openai', 'model',         'Model',                     'select',   false, false, 'Modelo de linguagem. Recomendado: gpt-4o para melhor qualidade de extração.', NULL, 3),
  ('openai', 'system_prompt', 'System Prompt (opcional)',  'textarea', false, false, 'Instruções customizadas para o agente. Deixe em branco para usar o prompt padrão do Product Lab.', NULL, 4),
  ('openai', 'temperature',   'Temperature',               'text',     false, false, 'Criatividade: 0.0 = determinístico, 1.0 = criativo. Recomendado: 0.2', '0.2', 5)
ON CONFLICT (provider, field_key) DO NOTHING;

UPDATE integration_field_schemas
SET options = '[
  {"value":"gpt-4o",        "label":"GPT-4o (recomendado)"},
  {"value":"gpt-4o-mini",   "label":"GPT-4o mini (rápido)"},
  {"value":"gpt-4-turbo",   "label":"GPT-4 Turbo"},
  {"value":"gpt-4",         "label":"GPT-4"},
  {"value":"gpt-3.5-turbo", "label":"GPT-3.5 Turbo (econômico)"}
]'::jsonb
WHERE provider = 'openai' AND field_key = 'model';

-- ── Azure OpenAI ──────────────────────────────────────────────────────────────
INSERT INTO integration_field_schemas
  (provider, field_key, field_label, field_type, is_secret, is_required, hint, placeholder, sort_order)
VALUES
  ('azure_openai', 'endpoint',        'Azure OpenAI Endpoint', 'url',      false, true,  'URL base do recurso Azure OpenAI (sem trailing slash).', 'https://sua-org.openai.azure.com', 1),
  ('azure_openai', 'deployment_name', 'Deployment Name',       'text',     false, true,  'Nome do deployment no Azure OpenAI Studio.', 'gpt-4o', 2),
  ('azure_openai', 'api_version',     'API Version',           'text',     false, true,  'Versão da API Azure OpenAI.', '2024-08-01-preview', 3),
  ('azure_openai', 'api_key',         'API Key',               'password', true,  true,  'Chave de API do Azure OpenAI.', NULL, 4),
  ('azure_openai', 'system_prompt',   'System Prompt (opcional)', 'textarea', false, false, 'Instruções customizadas para o agente.', NULL, 5),
  ('azure_openai', 'temperature',     'Temperature',           'text',     false, false, 'Criatividade: 0.0 = determinístico, 1.0 = criativo. Recomendado: 0.2', '0.2', 6)
ON CONFLICT (provider, field_key) DO NOTHING;
