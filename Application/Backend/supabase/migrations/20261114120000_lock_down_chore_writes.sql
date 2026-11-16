-- Closes two holes in chores' write policies (live policies confirmed via
-- pg_policies on 2026-11-14 - neither was ever captured in a migration):
--
-- 1. "children can update their assigned chores" only checked
--    assigned_to = auth.uid(), with no limit on which columns change. A child
--    could set status = 'completed' directly (skipping the AI check in
--    verify-with-ai) and set reward_amount to anything, which approve_chore
--    then pays out in full.
--
-- 2. "Allow parents to insert chores" only checked created_by = auth.uid() -
--    it never checked the caller is a parent. A child could insert a chore
--    assigned to themselves, already 'completed', with any reward_amount, and
--    it would land in the parent's "Needs your OK" list. It also let anyone
--    assign chores to a child in another family.

-- children ---------------------------------------------------------------
-- The only chores write a child legitimately makes is todo -> pending after
-- taking the before photo ((child)/chores/[id].tsx). Everything else is done
-- by verify-with-ai (service role) or the SECURITY DEFINER RPCs, so children
-- get no direct UPDATE at all - RLS can't restrict which columns an UPDATE
-- touches (same reasoning as mark_reward_given).
DROP POLICY IF EXISTS "children can update their assigned chores" ON public.chores;

CREATE OR REPLACE FUNCTION public.start_chore(p_chore_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chore public.chores%ROWTYPE;
BEGIN
  SELECT * INTO v_chore FROM public.chores WHERE id = p_chore_id FOR UPDATE;
  IF NOT FOUND OR v_chore.assigned_to IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'chore not found';
  END IF;

  IF v_chore.status IS DISTINCT FROM 'todo' THEN
    RAISE EXCEPTION 'this chore has already been started';
  END IF;

  -- the app inserts the before-photo chore_analysis row right before this
  IF NOT EXISTS (
    SELECT 1 FROM public.chore_analysis
    WHERE chore_id = p_chore_id AND before_image_key IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'take a before photo first';
  END IF;

  UPDATE public.chores SET status = 'pending' WHERE id = p_chore_id;
END;
$$;

REVOKE ALL ON FUNCTION public.start_chore(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_chore(BIGINT) TO authenticated;

-- parents: insert --------------------------------------------------------
-- only a parent, only for a child in their own household, and only as a
-- fresh, unsubmitted, unapproved chore
DROP POLICY IF EXISTS "Allow parents to insert chores" ON public.chores;
DROP POLICY IF EXISTS "parents can create chores for their own kids" ON public.chores;

CREATE POLICY "parents can create chores for their own kids"
ON public.chores FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'parent'
  AND assigned_to IN (
    SELECT id FROM public.users
    WHERE family_id = public.current_family_id() AND role = 'child'
  )
  AND status = 'todo'
  AND ai_verified IS NOT TRUE
  AND approved_by IS NULL
  AND approved_at IS NULL
  AND submitted_at IS NULL
);

-- parents: update --------------------------------------------------------
-- same as before (only chores you created), plus: the row can't be
-- re-pointed at a child outside your household
DROP POLICY IF EXISTS "parents can update chores they created" ON public.chores;

CREATE POLICY "parents can update chores they created"
ON public.chores FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (
  auth.uid() = created_by
  AND assigned_to IN (
    SELECT id FROM public.users
    WHERE family_id = public.current_family_id() AND role = 'child'
  )
);

-- make the api pick up the new function right away
NOTIFY pgrst, 'reload schema';
