-- =========================================================================
-- MIGRATION: Fix Connections Count Policy
-- Description: Allow any authenticated or anonymous user to select rows
--              from public.connections to compute accurate connection counts
--              on profile pages.
-- =========================================================================
-- Run these commands in your Supabase SQL Editor:
-- https://app.supabase.com/project/lmcuatpisrsvroislhgf/sql/new

-- 1. Drop existing restricted select policy
DROP POLICY IF EXISTS "allow_users_to_read_their_connections" ON public.connections;

-- 2. Create new public select policy allowing anyone to read connections (needed for count calculation)
CREATE POLICY "allow_users_to_read_their_connections" ON public.connections
  FOR SELECT USING (true);
