-- URGENT SECURITY FIX: this policy let any signed-in user read every
-- column of every row in `users` (balances, secret_code, family_id,
-- names) for the entire app, not just their own family.
DROP POLICY IF EXISTS "enable users to find parents by code" ON public.users;

-- Replaces it with two narrow, purpose-built functions that return only
-- what's actually needed, not the whole row.

-- used by join-household.tsx: find which family a code belongs to
CREATE OR REPLACE FUNCTION public.find_family_by_code(p_code TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT family_id FROM public.users WHERE secret_code = p_code LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_family_by_code(TEXT) TO authenticated;

-- used by household-code.tsx: a parent looking up their OWN family's code
CREATE OR REPLACE FUNCTION public.get_household_code()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT secret_code FROM public.users
  WHERE family_id = (SELECT family_id FROM public.users WHERE id = auth.uid())
    AND secret_code IS NOT NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_household_code() TO authenticated;
