-- RLS for users/chores/transactions, matching what the app's existing
-- queries actually need (see: login-page.tsx, index.tsx, join-household.tsx,
-- create-chore.tsx, (child)/chores.tsx, (parent)/account.tsx).
--
-- current_family_id() is SECURITY DEFINER so a policy on `users` can look up
-- the caller's own family_id without recursively re-querying `users` under
-- its own RLS policy (a policy that queries its own table in USING can
-- recurse/misbehave - this sidesteps that entirely).
CREATE OR REPLACE FUNCTION public.current_family_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT family_id FROM public.users WHERE id = auth.uid();
$$;

-- users ----------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- own row (login/session checks, account screen) or a family member's row
-- (create-chore.tsx listing "my kids")
CREATE POLICY "users can view their own row or their family's"
ON public.users FOR SELECT
TO authenticated
USING (id = auth.uid() OR family_id = public.current_family_id());

-- signup inserts exactly one row: the new user's own
CREATE POLICY "users can create their own row"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- chores -----------------------------------------------------------------
ALTER TABLE public.chores ENABLE ROW LEVEL SECURITY;

-- a child sees their own chores; anyone in the family can see the family's
CREATE POLICY "users can view chores in their family"
ON public.chores FOR SELECT
TO authenticated
USING (
  assigned_to = auth.uid()
  OR assigned_to IN (SELECT id FROM public.users WHERE family_id = public.current_family_id())
);

-- a parent can only create chores assigned to kids in their own family
CREATE POLICY "users can create chores for their family"
ON public.chores FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND assigned_to IN (SELECT id FROM public.users WHERE family_id = public.current_family_id())
);

-- transactions -------------------------------------------------------------
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- read-only for now - nothing client-side writes to this table yet;
-- future reward payouts should be written by a trusted backend process
CREATE POLICY "users can view their own transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (user_id = auth.uid());
