-- transactions.created_at had no column default at all, despite schema.sql
-- claiming DEFAULT NOW() - another case of the live table not matching that
-- hand-maintained snapshot (same class of drift as chores.description).
-- Neither redeem_reward nor approve_chore sets created_at explicitly, so
-- every transaction row ended up with created_at = NULL. In the frontend,
-- new Date(null) is the Unix epoch, which in a negative-UTC-offset timezone
-- renders as "dec 31" (1969) - exactly the bug reported against the parent
-- Rewards screen's recent-activity feed.
ALTER TABLE public.transactions ALTER COLUMN created_at SET DEFAULT NOW();

-- One-time backfill for existing rows - their real creation time is lost,
-- but "now" reads correctly instead of "dec 31" and is closer to the truth
-- than epoch for anything created recently.
UPDATE public.transactions SET created_at = NOW() WHERE created_at IS NULL;
