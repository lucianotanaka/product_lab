-- 015_raci_soft_delete_history.sql
-- Opção A: Soft delete + histórico de mudanças da RACI

-- ── 1. Soft delete em raci_assignments ───────────────────────────────────────
ALTER TABLE raci_assignments
  ADD COLUMN IF NOT EXISTS is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS removed_at   TIMESTAMPTZ  NULL,
  ADD COLUMN IF NOT EXISTS removed_by   VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS remove_reason TEXT         NULL;

-- Index para queries filtrando apenas ativos
CREATE INDEX IF NOT EXISTS idx_raci_active ON raci_assignments (object_type, object_id, is_active);

-- ── 2. Tabela de histórico ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS raci_assignment_history (
    id              SERIAL        PRIMARY KEY,
    assignment_id   INTEGER       NOT NULL,   -- referência ao raci_assignments original
    product_id      INTEGER,
    object_type     VARCHAR(30)   NOT NULL,
    object_id       INTEGER       NOT NULL,
    stakeholder_id  INTEGER       NOT NULL,
    stakeholder_name VARCHAR(150),            -- nome desnormalizado (sobrevive mesmo se stakeholder for deletado)
    role            VARCHAR(1)    NOT NULL,   -- R|A|C|I
    action          VARCHAR(20)   NOT NULL,   -- ADD|REMOVE|APPROVE|REVOKE_APPROVAL|UPDATE_NOTES
    action_by       VARCHAR(150),             -- nome de quem executou a ação
    action_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    notes           TEXT,                     -- contexto/justificativa da mudança
    -- campos de aprovação (snapshot no momento do evento)
    approved_at     TIMESTAMPTZ,
    approval_method VARCHAR(50),
    approval_evidence TEXT,
    approved_by     VARCHAR(150)
);

CREATE INDEX IF NOT EXISTS idx_raci_history_assignment ON raci_assignment_history (assignment_id);
CREATE INDEX IF NOT EXISTS idx_raci_history_object ON raci_assignment_history (object_type, object_id);

COMMENT ON TABLE raci_assignment_history IS 'Histórico imutável de todas as mudanças nas atribuições RACI';
COMMENT ON COLUMN raci_assignment_history.action IS 'ADD=criação, REMOVE=remoção, APPROVE=aprovação registrada, REVOKE_APPROVAL=aprovação revogada, UPDATE_NOTES=notas alteradas';
