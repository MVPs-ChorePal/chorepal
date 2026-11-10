-- The live chores table never actually had a `description` column, despite
-- Database/schema.sql claiming it did (that snapshot was stale) - create-chore.tsx
-- inserts `description` on every new chore, which was failing with
-- "Could not find the 'description' column of 'chores' in the schema cache".
ALTER TABLE public.chores ADD COLUMN IF NOT EXISTS description TEXT;
