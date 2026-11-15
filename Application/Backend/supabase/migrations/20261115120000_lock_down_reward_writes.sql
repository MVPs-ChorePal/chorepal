-- Closes the rewards write holes (policies from
-- 20261008000000_rewards_transactions_rls_cleanup.sql):
--
-- 1. "household members can update their family's rewards" let any family
--    member - children included - edit any family reward, e.g. set a
--    reward's point_cost to 0 and redeem it for free.
--
-- 2. "parents can create rewards for their own family" only checked
--    created_by = auth.uid(), never that the caller is a parent. Combined
--    with redeem_reward() (which only checked the creator's family, not
--    their role or the price), a child could create a reward with a negative
--    point_cost and redeem it - `balance - point_cost` then ADDS coins.
--
-- Children never write rewards directly (redeeming goes through
-- redeem_reward), so both policies become parent-only. redeem_reward also
-- re-checks creator role and price itself, as defense in depth and to cover
-- any bad rows created before this migration.

-- rewards: insert ----------------------------------------------------------
DROP POLICY IF EXISTS "parents can create rewards for their own family" ON public.rewards;

CREATE POLICY "parents can create rewards for their own family"
ON public.rewards FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'parent'
  AND public.current_family_id() IS NOT NULL
  AND point_cost > 0
);

-- rewards: update ----------------------------------------------------------
-- any parent in the household can edit/archive the household's rewards
-- (same family-wide scope as before), but children can't, and an edit
-- can't move a reward to a non-parent creator or a non-positive price
DROP POLICY IF EXISTS "household members can update their family's rewards" ON public.rewards;
DROP POLICY IF EXISTS "parents can update their family's rewards" ON public.rewards;

CREATE POLICY "parents can update their family's rewards"
ON public.rewards FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'parent'
  AND created_by IN (SELECT id FROM public.users WHERE family_id = public.current_family_id() AND role = 'parent')
)
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'parent'
  AND created_by IN (SELECT id FROM public.users WHERE family_id = public.current_family_id() AND role = 'parent')
  AND point_cost > 0
);

-- table-level guard: prices must be positive. NOT VALID = enforced for new
-- and updated rows only, so this can't fail on any bad rows already there
-- (redeem_reward below refuses those).
ALTER TABLE public.rewards DROP CONSTRAINT IF EXISTS rewards_point_cost_positive;
ALTER TABLE public.rewards
  ADD CONSTRAINT rewards_point_cost_positive CHECK (point_cost > 0) NOT VALID;

-- redeem_reward: same as 20261006000000_rewards.sql, plus the reward must
-- have been created by a parent and have a positive price --------------------
CREATE OR REPLACE FUNCTION public.redeem_reward(p_reward_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_child public.users%ROWTYPE;
  v_reward public.rewards%ROWTYPE;
  v_owner public.users%ROWTYPE;
  v_balance NUMERIC;
BEGIN
  SELECT * INTO v_child FROM public.users WHERE id = auth.uid() FOR UPDATE;
  IF v_child.role IS DISTINCT FROM 'child' OR v_child.family_id IS NULL THEN
    RAISE EXCEPTION 'only a child in a household can redeem rewards';
  END IF;

  SELECT * INTO v_reward FROM public.rewards WHERE id = p_reward_id;
  IF NOT FOUND OR v_reward.archived THEN RAISE EXCEPTION 'reward not available'; END IF;

  SELECT * INTO v_owner FROM public.users WHERE id = v_reward.created_by;
  IF v_owner.family_id IS DISTINCT FROM v_child.family_id THEN
    RAISE EXCEPTION 'reward is not in your household';
  END IF;

  -- only parent-made rewards with a real price can be redeemed - also
  -- covers any child-made or zero/negative-price rows from before this fix
  IF v_owner.role IS DISTINCT FROM 'parent' OR v_reward.point_cost IS NULL OR v_reward.point_cost <= 0 THEN
    RAISE EXCEPTION 'reward not available';
  END IF;

  IF COALESCE(v_child.current_balance, 0) < v_reward.point_cost THEN
    RAISE EXCEPTION 'not enough points';
  END IF;

  INSERT INTO public.transactions (user_id, reward_id, amount, type)
  VALUES (v_child.id, p_reward_id, v_reward.point_cost, 'debit');

  UPDATE public.users
  SET current_balance = COALESCE(current_balance, 0) - v_reward.point_cost
  WHERE id = v_child.id
  RETURNING current_balance INTO v_balance;

  RETURN v_balance;
END;
$$;

NOTIFY pgrst, 'reload schema';
