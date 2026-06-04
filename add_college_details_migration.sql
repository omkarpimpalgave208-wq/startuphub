-- =====================================================
-- DATABASE MIGRATION: ADD COLLEGE DETAILS TO PROFILES
-- =====================================================
-- Run these commands in the Supabase SQL Editor:
-- https://app.supabase.com/project/_/sql/new

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS college_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS studying_year text;
