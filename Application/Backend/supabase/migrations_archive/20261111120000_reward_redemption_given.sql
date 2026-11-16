-- Lets a parent mark a child's reward redemption as handed over.
--
-- redeem_reward() debits points immediately with no approval step, so the
-- parent Rewards screen lists redemptions as "to hand out" - this records
-- when the parent actually gave it, so it can drop off that list.
--
-- Written through a SECURITY DEFINER function rather than an UPDATE policy:
-- RLS can't restrict which columns an UPDATE touches, so a parent update
-- policy on transactions would also let them edit amount/type/user_id.

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS given_at TIMESTAMP WITH TIME ZONE;

CREATE OR REPLACE FUNCTION public.mark_reward_given(p_transaction_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent public.users%ROWTYPE;
  v_tx public.transactions%ROWTYPE;
  v_child_family UUID;
BEGIN
  SELECT * INTO v_parent FROM public.users WHERE id = auth.uid();
  IF v_parent.role IS DISTINCT FROM 'parent' OR v_parent.family_id IS NULL THEN
    RAISE EXCEPTION 'only a parent in a household can mark rewards as given';
  END IF;

  SELECT * INTO v_tx FROM public.transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND OR v_tx.type IS DISTINCT FROM 'debit' OR v_tx.reward_id IS NULL THEN
    RAISE EXCEPTION 'not a reward redemption';
  END IF;

  SELECT family_id INTO v_child_family FROM public.users WHERE id = v_tx.user_id;
  IF v_child_family IS DISTINCT FROM v_parent.family_id THEN
    RAISE EXCEPTION 'redemption is not in your household';
  END IF;

  -- idempotent: a second tap keeps the original hand-over time
  UPDATE public.transactions SET given_at = COALESCE(given_at, NOW()) WHERE id = p_transaction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_reward_given(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_reward_given(UUID) TO authenticated;

-- make the api pick up the new column and function right away
NOTIFY pgrst, 'reload schema';
