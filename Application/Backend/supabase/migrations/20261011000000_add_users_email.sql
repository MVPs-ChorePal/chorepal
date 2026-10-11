-- Supports username-based login. public.users has no email column at all
-- (only auth.users does, which client code can't query), so there's
-- currently no way to resolve "username" -> the backing auth email needed
-- to call signInWithPassword(). Children get a synthetic internal email at
-- signup (never seen or typed) that only exists to satisfy Supabase Auth's
-- requirement for one - this is what makes looking it up by username work.

ALTER TABLE public.users ADD COLUMN email TEXT UNIQUE;

CREATE OR REPLACE FUNCTION public.find_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT email FROM public.users WHERE username = p_username LIMIT 1;
$$;

-- must work before a session exists (this is used during login itself)
GRANT EXECUTE ON FUNCTION public.find_email_by_username(TEXT) TO anon, authenticated;
