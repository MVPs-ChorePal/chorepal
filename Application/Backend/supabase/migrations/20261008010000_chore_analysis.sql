-- Documents chore_analysis and the chores columns the approval/AI-review
-- workflow depends on - all created directly on the dashboard, never
-- captured in a migration. Written idempotently (IF NOT EXISTS / DROP+
-- CREATE POLICY) so it's safe to run against a fresh database or the
-- current live one without erroring or changing anything that's already
-- correct.

CREATE TABLE IF NOT EXISTS public.chore_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_id BIGINT REFERENCES public.chores(id) ON DELETE CASCADE,
  before_image_key TEXT,
  after_image_key TEXT,
  ai_detected_label TEXT,
  ai_confidence_score NUMERIC,
  ai_feedback TEXT,
  needs_revision BOOLEAN DEFAULT false,
  attempt_number INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.chore_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Strict child analysis submission" ON public.chore_analysis;
CREATE POLICY "Strict child analysis submission"
ON public.chore_analysis FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = (SELECT assigned_to FROM public.chores WHERE id = chore_analysis.chore_id));

DROP POLICY IF EXISTS "View analysis history" ON public.chore_analysis;
CREATE POLICY "View analysis history"
ON public.chore_analysis FOR SELECT
TO authenticated
USING (
  auth.uid() = (SELECT assigned_to FROM public.chores WHERE id = chore_analysis.chore_id)
  OR auth.uid() = (SELECT created_by FROM public.chores WHERE id = chore_analysis.chore_id)
);

DROP POLICY IF EXISTS "children can update their analysis rows" ON public.chore_analysis;
CREATE POLICY "children can update their analysis rows"
ON public.chore_analysis FOR UPDATE
TO authenticated
USING (auth.uid() = (SELECT assigned_to FROM public.chores WHERE id = chore_analysis.chore_id));

-- chores: columns the approval/analysis workflow depends on
ALTER TABLE public.chores ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id);
ALTER TABLE public.chores ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.chores ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.chores ADD COLUMN IF NOT EXISTS ai_verified BOOLEAN DEFAULT false;

-- superseded by chore_analysis's own before/after_image_key (one row per
-- attempt, rather than a single image per chore)
ALTER TABLE public.chores DROP COLUMN IF EXISTS after_image_key;
