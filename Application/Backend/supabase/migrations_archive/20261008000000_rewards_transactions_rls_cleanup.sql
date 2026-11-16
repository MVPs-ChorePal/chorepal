-- Adds the missing RLS policies on rewards/transactions (currently enabled
-- with zero policies, so every direct client read/write silently returns
-- nothing), and drops redundant duplicate policies on chores/chore_analysis
-- left over from dashboard trial-and-error.

-- Reusable helper: the caller's own family_id, looked up with elevated
-- privileges so a policy that needs it never has to recursively re-query
-- the same table it's protecting.
CREATE OR REPLACE FUNCTION public.current_family_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT family_id FROM public.users WHERE id = auth.uid();
$$;

-- rewards ------------------------------------------------------------------
-- matches (child)/rewards.tsx and (parent)/rewards.tsx: both read the
-- catalog scoped to "parents in my own family", and a parent creates/
-- archives rewards they created.

CREATE POLICY "household members can view their family's rewards"
ON public.rewards FOR SELECT
TO authenticated
USING (created_by IN (SELECT id FROM public.users WHERE family_id = public.current_family_id()));

CREATE POLICY "parents can create rewards for their own family"
ON public.rewards FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "household members can update their family's rewards"
ON public.rewards FOR UPDATE
TO authenticated
USING (created_by IN (SELECT id FROM public.users WHERE family_id = public.current_family_id()))
WITH CHECK (created_by IN (SELECT id FROM public.users WHERE family_id = public.current_family_id()));

-- transactions ---------------------------------------------------------------
-- matches (child)/rewards.tsx: a user reading their own reward/chore
-- history. All writes already happen inside approve_chore()/redeem_reward(),
-- which are SECURITY DEFINER and bypass RLS - no client-side write policy
-- needed.

CREATE POLICY "users can view their own transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- cleanup: redundant duplicate policies -------------------------------------
-- chore_analysis had two near-identical SELECT policies and two near-
-- identical UPDATE policies; chores had a SELECT policy that's a strict
-- subset of a broader one already covering the same case.

DROP POLICY IF EXISTS "Children can view their own analysis history" ON public.chore_analysis;
DROP POLICY IF EXISTS "allow children to update analysis" ON public.chore_analysis;
DROP POLICY IF EXISTS "Allow parents to view their own created chores" ON public.chores;
