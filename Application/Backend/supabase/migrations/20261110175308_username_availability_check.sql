-- Lets signup check whether a chosen username is already taken before
-- creating the auth user - same SECURITY DEFINER pattern as
-- find_email_by_username, since this must work pre-session (anon) too, and
-- RLS on users (20261011010000_users_family_select.sql) only lets a caller
-- see their own row/family, not arbitrary usernames.
CREATE OR REPLACE FUNCTION public.is_username_taken(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE username = p_username);
$$;

GRANT EXECUTE ON FUNCTION public.is_username_taken(TEXT) TO anon, authenticated;
