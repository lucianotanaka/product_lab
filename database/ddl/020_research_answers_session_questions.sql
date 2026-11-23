-- Add support for custom session questions with section and ordering
ALTER TABLE public.research_answers
    ADD COLUMN IF NOT EXISTS section varchar(20) NOT NULL DEFAULT 'during',
    ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_research_answers_section_sort
    ON public.research_answers USING btree (research_id, section, sort_order);

-- Backfill existing rows from template question metadata when available
UPDATE public.research_answers ra
SET
    section = rtq.section,
    sort_order = rtq.sort_order
FROM public.research_template_questions rtq
WHERE ra.question_id = rtq.id
  AND (
    ra.section IS DISTINCT FROM rtq.section
    OR ra.sort_order IS DISTINCT FROM rtq.sort_order
  );
