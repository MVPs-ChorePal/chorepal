-- Gives users.family_id something real to reference, without changing how
-- creating/joining a household works. A household's family_id is still
-- just the founding parent's own id (set in signup-page.tsx) - this backs
-- that value with a real row and a foreign key instead of leaving it a
-- free-floating UUID.

CREATE TABLE public.families (
  id UUID PRIMARY KEY
);

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

-- a user can only create a family rooted at their own id, matching the
-- app's existing rule (familyId = the creating parent's own auth id)
CREATE POLICY "users can create a family rooted at their own id"
ON public.families FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- backfill: one families row per existing household - every family_id
-- value already in use is already some parent's own id
INSERT INTO public.families (id)
SELECT DISTINCT family_id FROM public.users WHERE family_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.users
  ADD CONSTRAINT users_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id);
