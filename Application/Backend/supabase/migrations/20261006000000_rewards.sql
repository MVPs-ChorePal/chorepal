-- Rewards: parent approval pays out points, children redeem points in the household store.
-- Balance changes happen inside these functions so the ledger (transactions) and
-- users.current_balance always move together.

-- lets a parent remove a reward from the store without breaking redemption history
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

-- parent approves an ai-verified chore: marks it approved and credits the child
CREATE OR REPLACE FUNCTION public.approve_chore(p_chore_id BIGINT)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent public.users%ROWTYPE;
  v_child public.users%ROWTYPE;
  v_chore public.chores%ROWTYPE;
  v_balance NUMERIC;
BEGIN
  SELECT * INTO v_parent FROM public.users WHERE id = auth.uid();
  IF v_parent.role IS DISTINCT FROM 'parent' OR v_parent.family_id IS NULL THEN
    RAISE EXCEPTION 'only a parent in a household can approve chores';
  END IF;

  SELECT * INTO v_chore FROM public.chores WHERE id = p_chore_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'chore not found'; END IF;

  SELECT * INTO v_child FROM public.users WHERE id = v_chore.assigned_to FOR UPDATE;
  IF v_child.family_id IS DISTINCT FROM v_parent.family_id THEN
    RAISE EXCEPTION 'chore is not in your household';
  END IF;

  IF v_chore.status <> 'completed' THEN
    RAISE EXCEPTION 'chore is not waiting for approval';
  END IF;

  UPDATE public.chores
  SET status = 'approved', approved_at = NOW(), approved_by = auth.uid()
  WHERE id = p_chore_id;

  INSERT INTO public.transactions (user_id, chore_id, amount, type)
  VALUES (v_chore.assigned_to, p_chore_id, v_chore.reward_amount, 'credit');

  UPDATE public.users
  SET current_balance = COALESCE(current_balance, 0) + v_chore.reward_amount
  WHERE id = v_chore.assigned_to
  RETURNING current_balance INTO v_balance;

  RETURN v_balance;
END;
$$;

-- parent rejects an ai-verified chore: sends it back for a new after photo, no points
CREATE OR REPLACE FUNCTION public.reject_chore(p_chore_id BIGINT, p_note TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent public.users%ROWTYPE;
  v_child public.users%ROWTYPE;
  v_chore public.chores%ROWTYPE;
  v_before_key TEXT;
BEGIN
  SELECT * INTO v_parent FROM public.users WHERE id = auth.uid();
  IF v_parent.role IS DISTINCT FROM 'parent' OR v_parent.family_id IS NULL THEN
    RAISE EXCEPTION 'only a parent in a household can reject chores';
  END IF;

  SELECT * INTO v_chore FROM public.chores WHERE id = p_chore_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'chore not found'; END IF;

  SELECT * INTO v_child FROM public.users WHERE id = v_chore.assigned_to;
  IF v_child.family_id IS DISTINCT FROM v_parent.family_id THEN
    RAISE EXCEPTION 'chore is not in your household';
  END IF;

  IF v_chore.status <> 'completed' THEN
    RAISE EXCEPTION 'chore is not waiting for approval';
  END IF;

  UPDATE public.chores SET status = 'pending', ai_verified = false WHERE id = p_chore_id;

  -- open attempt row: the child's next after photo fills it in, and the note shows on their camera screen
  SELECT before_image_key INTO v_before_key
  FROM public.chore_analysis
  WHERE chore_id = p_chore_id
  ORDER BY created_at ASC
  LIMIT 1;

  INSERT INTO public.chore_analysis (chore_id, before_image_key, ai_feedback, needs_revision)
  VALUES (p_chore_id, v_before_key, COALESCE(NULLIF(TRIM(p_note), ''), 'your parent asked you to redo this. take a new after photo.'), true);
END;
$$;

-- child spends points on a reward from their household's store
CREATE OR REPLACE FUNCTION public.redeem_reward(p_reward_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_child public.users%ROWTYPE;
  v_reward public.rewards%ROWTYPE;
  v_owner_family UUID;
  v_balance NUMERIC;
BEGIN
  SELECT * INTO v_child FROM public.users WHERE id = auth.uid() FOR UPDATE;
  IF v_child.role IS DISTINCT FROM 'child' OR v_child.family_id IS NULL THEN
    RAISE EXCEPTION 'only a child in a household can redeem rewards';
  END IF;

  SELECT * INTO v_reward FROM public.rewards WHERE id = p_reward_id;
  IF NOT FOUND OR v_reward.archived THEN RAISE EXCEPTION 'reward not available'; END IF;

  SELECT family_id INTO v_owner_family FROM public.users WHERE id = v_reward.created_by;
  IF v_owner_family IS DISTINCT FROM v_child.family_id THEN
    RAISE EXCEPTION 'reward is not in your household';
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

REVOKE ALL ON FUNCTION public.approve_chore(BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_chore(BIGINT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_reward(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_chore(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_chore(BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_reward(UUID) TO authenticated;
