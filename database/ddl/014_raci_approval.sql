-- 014_raci_approval.sql
-- Adds approval-evidence fields to raci_assignments for role A (Accountable/Aprovador)

ALTER TABLE raci_assignments
  ADD COLUMN IF NOT EXISTS approved_at        TIMESTAMPTZ  NULL,
  ADD COLUMN IF NOT EXISTS approval_method    VARCHAR(50)  NULL,   -- email | verbal | document | meeting | other
  ADD COLUMN IF NOT EXISTS approval_evidence  TEXT         NULL,   -- e-mail excerpt, reference, or any text evidence
  ADD COLUMN IF NOT EXISTS approved_by        VARCHAR(150) NULL;   -- name of the person who registered the approval

COMMENT ON COLUMN raci_assignments.approved_at       IS 'Timestamp when the approval (role A) was formally given';
COMMENT ON COLUMN raci_assignments.approval_method   IS 'Channel through which approval was given (email, verbal, document, meeting, other)';
COMMENT ON COLUMN raci_assignments.approval_evidence IS 'Text snippet or reference that proves the approval (e.g. email subject/body excerpt)';
COMMENT ON COLUMN raci_assignments.approved_by       IS 'Name of the PM/person who registered this approval in the system';
