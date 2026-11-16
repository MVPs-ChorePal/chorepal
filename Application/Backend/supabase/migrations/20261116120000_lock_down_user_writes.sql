-- Lock down writes to public.users.
--
-- Before this, "users can update their own data" + GRANT ALL let any signed-in
-- user PATCH every column of their own row straight through the REST API:
--   * current_balance -> give yourself unlimited points, then redeem rewards
--   * role            -> make yourself a parent
--   * family_id       -> move yourself into any household and read its members
-- and the signup insert policy let a new user create their row with any of those.
--
-- After this:
--   * direct UPDATEs can only touch display_name, email, avatar_url
--   * the signup INSERT must be a clean starting row (balance 0, and either no
--     household or - for a parent starting one - a household rooted at their own id)
--   * joining a household goes through join_household(code), which checks the code
--   * balance changes only ever happen inside approve_chore / redeem_reward

-- column-level privileges: only the harmless profile fields are directly writable
REVOKE INSERT, UPDATE, DELETE ON public.users FROM anon;
REVOKE UPDATE ON public.users FROM authenticated;
GRANT UPDATE (display_name, email, avatar_url) ON public.users TO authenticated;

-- signup
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.users;
DROP POLICY IF EXISTS "users can create their own starting profile" ON public.users;

CREATE POLICY "users can create their own starting profile"
ON public.users FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = id
  AND role IN ('parent', 'child')
  AND COALESCE(current_balance, 0) = 0
  AND (
    -- not in a household yet (joins later with a code)
    (family_id IS NULL AND secret_code IS NULL)
    -- a parent starting their own household, rooted at their own id
    OR (role = 'parent' AND family_id = id)
  )
);

-- joining a household by its code
CREATE OR REPLACE FUNCTION public.join_household(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.users%ROWTYPE;
  v_family UUID;
BEGIN
  SELECT * INTO v_me FROM public.users WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'profile not found'; END IF;
  IF v_me.family_id IS NOT NULL THEN RAISE EXCEPTION 'already in a household'; END IF;

  SELECT family_id INTO v_family FROM public.users
  WHERE secret_code = p_code AND family_id IS NOT NULL
  LIMIT 1;
  IF v_family IS NULL THEN RAISE EXCEPTION 'invalid household code'; END IF;

  UPDATE public.users SET family_id = v_family WHERE id = v_me.id;
  RETURN v_family;
END;
$$;

REVOKE ALL ON FUNCTION public.join_household(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_household(TEXT) TO authenticated;
