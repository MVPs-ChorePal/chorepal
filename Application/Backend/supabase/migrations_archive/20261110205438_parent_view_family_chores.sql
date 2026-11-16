-- chores only had "users can view their own chores" (assigned_to = auth.uid()
-- OR created_by = auth.uid()), so in a two-parent household, a parent who
-- didn't personally create a given chore couldn't see it at all - the
-- chores list and home dashboard would silently show an incomplete set.
-- No household currently has 2+ parents, but signup-page.tsx explicitly
-- supports a parent joining an existing one, so this is a reachable gap,
-- not hypothetical. Scoped to parents only (not a blanket family-wide
-- SELECT) so a child still can't browse siblings' chores through this.
CREATE POLICY "parents can view their family's chores"
ON public.chores FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'parent'
  AND assigned_to IN (SELECT id FROM public.users WHERE family_id = public.current_family_id())
);
