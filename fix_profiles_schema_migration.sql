-- ============================================================
-- MIGRATION: ADD ALL MISSING COLUMNS TO public.profiles
-- ============================================================
-- Run this in the Supabase SQL Editor:
-- https://app.supabase.com/project/_/sql/new
--
-- All statements use IF NOT EXISTS / safe ALTER TABLE so they
-- can be re-run without error if partially applied before.
-- ============================================================

-- Education fields (were created in add_college_details_migration.sql
-- but never run against the live database)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS college_name    text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS studying_year   text;

-- Skills & achievements (array columns used by SettingsPage / ProfilePage)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills          text[]  DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS achievements    text[]  DEFAULT '{}';

-- Experience (structured JSON array, used in profile types)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience      jsonb   DEFAULT '[]';

-- Social / presence columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location        text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url      text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_style    text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website_url     text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen       timestamp with time zone;

-- ============================================================
-- BACK-FILL: ensure existing rows have non-null array defaults
-- ============================================================
UPDATE public.profiles SET skills       = '{}'  WHERE skills       IS NULL;
UPDATE public.profiles SET achievements = '{}'  WHERE achievements IS NULL;
UPDATE public.profiles SET experience   = '[]'  WHERE experience   IS NULL;

-- ============================================================
-- VERIFY: list all current profiles columns
-- ============================================================
SELECT column_name, data_type, is_nullable, column_default
FROM   information_schema.columns
WHERE  table_schema = 'public'
  AND  table_name   = 'profiles'
ORDER  BY ordinal_position;
