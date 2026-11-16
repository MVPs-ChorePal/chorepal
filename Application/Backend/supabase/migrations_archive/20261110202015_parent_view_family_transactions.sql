-- transactions only had "users can view their own transactions" (user_id =
-- auth.uid()), so a parent could never see their own children's chore
-- payouts or reward redemptions - the parent Rewards screen's "Requests"
-- card was hardcoded local state instead of real data partly because of
-- this gap. Mirrors the same current_family_id() pattern already used for
-- rewards/users.
CREATE POLICY "household members can view their family's transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (user_id IN (SELECT id FROM public.users WHERE family_id = public.current_family_id()));
