-- chore_analysis's "View analysis history" policy only checked assigned_to/
-- created_by on the referenced chore - when chores got a family-wide SELECT
-- policy for parents (20261110205438_parent_view_family_chores.sql), this
-- table wasn't widened the same way. In a two-parent household, a parent who
-- didn't personally create a given chore could see the chore itself but not
-- its chore_analysis rows (photos, AI feedback) - same class of gap, just
-- not yet closed on this table. Scoped to parents only, same as chores'.
CREATE POLICY "parents can view their family's chore analysis"
ON public.chore_analysis FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'parent'
  AND chore_id IN (
    SELECT id FROM public.chores
    WHERE assigned_to IN (SELECT id FROM public.users WHERE family_id = public.current_family_id())
  )
);
