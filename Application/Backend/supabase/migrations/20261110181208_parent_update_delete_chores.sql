-- chores had INSERT (parents) and UPDATE (children, on their own assigned
-- chores) policies, but no policy let the parent who created a chore
-- update or delete it - with RLS enabled and no matching policy, those
-- operations silently affect zero rows instead of erroring, which is why
-- the parent edit/delete chore feature looked like it was doing nothing.
-- No separate "not yet approved" check needed here: transactions.chore_id
-- has no cascade, so deleting an approved (already paid out) chore is
-- already blocked at the foreign-key level.
CREATE POLICY "parents can update chores they created"
ON public.chores FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "parents can delete chores they created"
ON public.chores FOR DELETE
TO authenticated
USING (auth.uid() = created_by);
