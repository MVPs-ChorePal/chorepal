-- 1. One parent per household: only children can join one with a code.
--    Before: anyone who knew the household code (which every child in the
--    family is given) could sign up a new account as a 'parent', join the
--    household with that code, and then create, complete and approve chores
--    for themselves - unlimited coins - and read every family member's profile.
--
-- 2. No more username -> email lookups. find_email_by_username() could be
--    called without logging in and returned the account's email: a parent's
--    real address for a parent username, and parent+child@... (the parent's
--    address again) for a child. Children now always sign in with
--    <username>@chorepal.internal, which the app works out from the username,
--    so nothing has to be looked up. Reset codes for children are emailed to
--    their parent's CURRENT address by the child-reset-code edge function
--    (so they also follow the parent when the parent changes email).
--
-- 3. Smaller fixes: chores can't be worth negative coins, usernames must be
--    3-30 of a-z 0-9 . _ - (also what makes <username>@chorepal.internal a
--    valid address), and functions that only make sense when logged in can
--    no longer be called anonymously.

-- 1 ----------------------------------------------------------------------
DROP POLICY IF EXISTS "users can create their own starting profile" ON public.users;
CREATE POLICY "users can create their own starting profile"
ON public.users FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = id
  AND COALESCE(current_balance, 0) = 0
  AND lower(email) = lower(auth.jwt() ->> 'email')
  AND (
    -- a child starts outside any household and signs in as <username>@chorepal.internal
    (role = 'child' AND family_id IS NULL AND secret_code IS NULL
      AND lower(email) = lower(username) || '@chorepal.internal')
    -- a parent always starts their own household, rooted at their own id
    OR (role = 'parent' AND family_id = id AND secret_code IS NOT NULL
      AND lower(email) NOT LIKE '%@chorepal.internal')
  )
);

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
  IF v_me.role IS DISTINCT FROM 'child' THEN RAISE EXCEPTION 'only children can join a household'; END IF;
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

-- 2 ----------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.find_email_by_username(TEXT);
DROP FUNCTION IF EXISTS public.find_family_by_code(TEXT);   -- unused since join_household

-- move every child back to <username>@chorepal.internal. public.users.email
-- follows automatically through the sync_user_email trigger.
DO $$
DECLARE
  c RECORD;
  v_target TEXT;
  v_holder UUID;
  v_holder_profile public.users%ROWTYPE;
  v_aside TEXT;
BEGIN
  FOR c IN
    SELECT u.id, u.username, u.family_id
    FROM public.users u JOIN auth.users a ON a.id = u.id
    WHERE u.role = 'child' AND lower(a.email) IS DISTINCT FROM lower(u.username) || '@chorepal.internal'
    ORDER BY (u.family_id IS NULL), u.created_at NULLS LAST    -- children in a household go first
  LOOP
    v_target := lower(c.username) || '@chorepal.internal';

    -- another account already holds that address (two accounts with the same username)
    SELECT id INTO v_holder FROM auth.users WHERE lower(email) = v_target AND id <> c.id;
    IF v_holder IS NOT NULL THEN
      SELECT * INTO v_holder_profile FROM public.users WHERE id = v_holder;
      IF FOUND AND NOT (v_holder_profile.role = 'child' AND v_holder_profile.family_id IS NULL) THEN
        RAISE NOTICE 'child % keeps its old login email: % belongs to another active account', c.id, v_target;
        CONTINUE;
      END IF;
      -- the holder never joined a household (or never finished signing up):
      -- give it a new, unique username so the child who is in a household gets theirs
      v_aside := lower(coalesce(v_holder_profile.username, 'unused')) || '-' || left(v_holder::text, 4);
      UPDATE public.users SET username = v_aside WHERE id = v_holder;
      UPDATE auth.users SET email = v_aside || '@chorepal.internal' WHERE id = v_holder;
      UPDATE auth.identities
      SET identity_data = identity_data || jsonb_build_object('email', v_aside || '@chorepal.internal')
      WHERE user_id = v_holder AND provider = 'email';
      RAISE NOTICE 'household-less account % renamed to "%" to free "%"', v_holder, v_aside, c.username;
    END IF;

    UPDATE auth.users
    SET email = v_target,
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        email_change = '', email_change_token_new = '', email_change_token_current = '',
        email_change_confirm_status = 0
    WHERE id = c.id;
    UPDATE auth.identities
    SET identity_data = identity_data || jsonb_build_object('email', v_target)
    WHERE user_id = c.id AND provider = 'email';
  END LOOP;
END;
$$;

-- 3 ----------------------------------------------------------------------
-- no negative chores (approving one would take coins away)
ALTER TABLE public.chores
  ADD CONSTRAINT chores_reward_amount_not_negative CHECK (reward_amount >= 0);

-- username format, checked only when a username is set or changed (one
-- existing 2-letter username stays valid; usernames can't be edited anyway)
CREATE OR REPLACE FUNCTION public.check_username()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.username IS NULL OR NEW.username !~ '^[a-z0-9._-]{3,30}$' THEN
    RAISE EXCEPTION 'usernames must be 3-30 characters: lowercase letters, numbers, . _ or -'
      USING errcode = '22023';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_username() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS check_username ON public.users;
CREATE TRIGGER check_username
  BEFORE INSERT OR UPDATE OF username ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.check_username();

-- logged-in-only functions: nobody needs to call these anonymously.
-- (is_username_taken stays public - the signup screen checks it before the
-- account exists. It only answers yes/no.)
REVOKE EXECUTE ON FUNCTION public.approve_chore(BIGINT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_chore(BIGINT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_reward(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_reward_given(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_household_code() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_family_id() FROM PUBLIC, anon;
-- an event trigger, never meant to be called through the API
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
