-- Make public.users.email a mirror of the confirmed auth email.
--
-- Before this, users could write any value to their own users.email, and the
-- edit-profile screen wrote it before the new address was confirmed. That
-- column is what find_email_by_username resolves a username login to, and what
-- link-child-email builds a child's recovery address from - so a typo or an
-- unconfirmed address could break logins or send recovery emails elsewhere.
--
-- After this:
--   * users.email can't be written directly (only display_name, avatar_url)
--   * the signup row must carry the account's real auth email
--   * a trigger copies auth.users.email over whenever Supabase Auth changes it,
--     which for an email change only happens once the new address is confirmed

REVOKE UPDATE ON public.users FROM authenticated;
GRANT UPDATE (display_name, avatar_url) ON public.users TO authenticated;

-- signup: same rules as 20261116120000, plus the email must be the caller's auth email
DROP POLICY IF EXISTS "users can create their own starting profile" ON public.users;
CREATE POLICY "users can create their own starting profile"
ON public.users FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = id
  AND role IN ('parent', 'child')
  AND COALESCE(current_balance, 0) = 0
  AND (email IS NULL OR lower(email) = lower(auth.jwt() ->> 'email'))
  AND (
    (family_id IS NULL AND secret_code IS NULL)
    OR (role = 'parent' AND family_id = id)
  )
);

-- keep users.email in step with the confirmed auth email
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_user_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_user_email ON auth.users;
CREATE TRIGGER sync_user_email
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION public.sync_user_email();

-- one-off: fix any rows that already drifted from their auth email
UPDATE public.users u
SET email = a.email
FROM auth.users a
WHERE a.id = u.id AND u.email IS DISTINCT FROM a.email;
