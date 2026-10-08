-- Enable RLS on families. This table only ever holds an id + created_at -
-- no personal data and (since invite codes moved to their own table) no
-- secret at all - so a broad policy here is harmless.

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read families"
ON public.families FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "authenticated users can create a family"
ON public.families FOR INSERT
TO authenticated
WITH CHECK (true);
