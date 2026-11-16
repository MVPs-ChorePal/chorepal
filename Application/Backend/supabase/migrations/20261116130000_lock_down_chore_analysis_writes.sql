-- Lock down writes to public.chore_analysis (one row per photo attempt).
--
-- Before this, a child could PATCH any column of their own attempt rows,
-- including the AI's verdict (ai_detected_label, ai_confidence_score,
-- ai_feedback, needs_revision). That couldn't complete a chore or earn points,
-- but it could show the parent a fake "AI approved" result, block the real
-- check (verify-with-ai refuses already-labelled attempts), or swap the after
-- photo after the AI had judged a different one.
--
-- After this:
--   * children can only INSERT the photo fields of an attempt
--   * children can only UPDATE after_image_key, and only while the attempt has
--     no after photo and no AI verdict yet (the app fills it in exactly once)
--   * the AI fields are written only by verify-with-ai (service role)

REVOKE INSERT, UPDATE, DELETE ON public.chore_analysis FROM anon;
REVOKE INSERT, UPDATE ON public.chore_analysis FROM authenticated;
GRANT INSERT (chore_id, before_image_key, after_image_key, attempt_number) ON public.chore_analysis TO authenticated;
GRANT UPDATE (after_image_key) ON public.chore_analysis TO authenticated;

DROP POLICY IF EXISTS "children can update their analysis rows" ON public.chore_analysis;
DROP POLICY IF EXISTS "children can add the after photo to an open attempt" ON public.chore_analysis;

CREATE POLICY "children can add the after photo to an open attempt"
ON public.chore_analysis FOR UPDATE TO authenticated
USING (
  auth.uid() = (SELECT assigned_to FROM public.chores WHERE chores.id = chore_analysis.chore_id)
  AND after_image_key IS NULL
  AND ai_detected_label IS NULL
)
WITH CHECK (
  auth.uid() = (SELECT assigned_to FROM public.chores WHERE chores.id = chore_analysis.chore_id)
);
