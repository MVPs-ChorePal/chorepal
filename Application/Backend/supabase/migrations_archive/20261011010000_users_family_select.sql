-- Regression fix: the security fix in 20261007020000 correctly dropped the
-- dangerous "enable users to find parents by code" policy (USING (true)),
-- but that policy was also the only thing letting a parent see their own
-- children's rows, as a side effect of being too permissive. Nothing
-- replaced that legitimate case, so users SELECT has been "your own row
-- only" since then - breaking create-chore.tsx's children picker, among
-- anything else that lists family members.
--
-- current_family_id() already exists (added in
-- 20261008000000_rewards_transactions_rls_cleanup.sql).

DROP POLICY IF EXISTS "Users can view their own data" ON public.users;

CREATE POLICY "users can view their own row or their family's"
ON public.users FOR SELECT
TO authenticated
USING (id = auth.uid() OR family_id = public.current_family_id());
