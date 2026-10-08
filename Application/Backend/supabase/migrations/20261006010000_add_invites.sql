-- Single-use invite codes: a parent generates one per person joining
-- (a child, or a 2nd/3rd parent), instead of one long-lived shared code.

CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- a parent can create invites, but only for their own family
-- (no SELECT policy - nothing reads this table directly; redeem_invite()
-- below is SECURITY DEFINER and does its own lookup internally)
CREATE POLICY "users can create invites for their own family"
ON public.invites FOR INSERT
TO authenticated
WITH CHECK (family_id = (SELECT family_id FROM public.users WHERE id = auth.uid()));

-- Redeeming a code deliberately does NOT go through a client-side SELECT
-- policy (that would require a broad read allowing anyone to list/race for
-- any pending code). Instead this function does the lookup + claim + family
-- link atomically with elevated privileges, returning only the outcome.
-- Single-use is enforced by deleting the row on redemption - "already used"
-- and "never existed" end up as the same (indistinguishable) outcome.
CREATE OR REPLACE FUNCTION public.redeem_invite(input_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_family_id UUID;
BEGIN
  DELETE FROM public.invites
  WHERE code = input_code
  RETURNING family_id INTO matched_family_id;

  IF matched_family_id IS NULL THEN
    RAISE EXCEPTION 'invalid or already used invite code';
  END IF;

  UPDATE public.users SET family_id = matched_family_id WHERE id = auth.uid();

  RETURN matched_family_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_invite(TEXT) TO authenticated;
