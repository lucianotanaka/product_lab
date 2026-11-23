INSERT INTO public.integration_field_schemas
    (provider, field_key, field_label, field_type, is_secret, is_required, hint, placeholder, sort_order)
VALUES
    ('webhook', 'url',    'Webhook URL',    'url',      false, true,  'URL para onde as notificacoes serao enviadas', 'https://...', 1),
    ('webhook', 'secret', 'Webhook Secret', 'password', true,  false, 'Segredo para assinar o payload (HMAC)',        '',            2)
ON CONFLICT DO NOTHING;
