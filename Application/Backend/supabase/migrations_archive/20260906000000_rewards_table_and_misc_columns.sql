-- Documents the rewards table and a few other columns that exist live but
-- were never captured in any migration (created directly on the
-- dashboard). Dated before 20261006000000_rewards.sql, which already
-- ALTERs this table (adding `archived`) and would fail against a fresh
-- database without rewards existing first.

CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES public.users(id) DEFAULT auth.uid() NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  point_cost NUMERIC,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- enabled here (idempotent, safe to re-run) since this is what creates the
-- table on a fresh database - the policies added later assume RLS is on
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reward_id UUID REFERENCES public.rewards(id);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
