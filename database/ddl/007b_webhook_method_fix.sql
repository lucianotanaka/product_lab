INSERT INTO public.integration_field_schemas
    (provider, field_key, field_label, field_type, is_secret, is_required, options, hint, placeholder, sort_order)
VALUES
    ('webhook', 'method', 'HTTP Method', 'select', false, false,
     '[{"value":"POST","label":"POST"},{"value":"PUT","label":"PUT"}]',
     'Metodo HTTP', 'POST', 3)
ON CONFLICT DO NOTHING;
