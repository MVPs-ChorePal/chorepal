-- Server-only helpers for the update-profile edge function.
--
-- Supabase Auth's admin API reports "email/phone already used by another
-- account" only as a generic 500, and ignores an empty phone (so a phone can't
-- be removed through it). These two functions cover both. They can only be
-- called with the service role key (i.e. from edge functions), never from the app.

-- returns 'email' or 'phone' if another account already uses it, else NULL
CREATE OR REPLACE FUNCTION public.auth_identifier_taken(p_user UUID, p_email TEXT, p_phone TEXT)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_email IS NOT NULL AND EXISTS (
      SELECT 1 FROM auth.users WHERE lower(email) = lower(p_email) AND id <> p_user
    ) THEN 'email'
    WHEN NULLIF(p_phone, '') IS NOT NULL AND EXISTS (
      SELECT 1 FROM auth.users WHERE phone = p_phone AND id <> p_user
    ) THEN 'phone'
  END;
$$;

-- removes a user's phone number (and the phone sign-in identity Auth created for it)
CREATE OR REPLACE FUNCTION public.clear_auth_phone(p_user UUID)
RETURNS VOID
LANGUAGE sql SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE auth.users
  SET phone = NULL, phone_confirmed_at = NULL, phone_change = '', phone_change_token = ''
  WHERE id = p_user;
  DELETE FROM auth.identities WHERE user_id = p_user AND provider = 'phone';
$$;

REVOKE ALL ON FUNCTION public.auth_identifier_taken(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clear_auth_phone(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_identifier_taken(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.clear_auth_phone(UUID) TO service_role;
