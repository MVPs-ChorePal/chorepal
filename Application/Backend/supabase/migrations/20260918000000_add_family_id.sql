-- Add a families table (household grouping) and users.family_id, replacing
-- users.account_owner_id (one parent per child) and users.secret_code.
-- Invite codes now live in a separate `invites` table (see later migration)
-- rather than on families/users, so families holds no sensitive data at all.

CREATE TABLE public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.users ADD COLUMN family_id UUID REFERENCES public.families(id);

-- Backfill: one new family per existing parent, linked individually
-- (a plain INSERT...SELECT can't correlate each new family back to its parent)
DO $$
DECLARE
  parent_row RECORD;
  new_family_id UUID;
BEGIN
  FOR parent_row IN SELECT id FROM public.users WHERE role = 'parent' LOOP
    INSERT INTO public.families DEFAULT VALUES RETURNING id INTO new_family_id;
    UPDATE public.users SET family_id = new_family_id WHERE id = parent_row.id;
  END LOOP;
END $$;

-- Backfill: children inherit their parent's new family_id
UPDATE public.users c
SET family_id = p.family_id
FROM public.users p
WHERE c.role = 'child' AND c.account_owner_id = p.id;

ALTER TABLE public.users DROP COLUMN account_owner_id;
ALTER TABLE public.users DROP COLUMN secret_code;
