-- Add columns the app already writes/reads but schema.sql was missing
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.chores ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;
