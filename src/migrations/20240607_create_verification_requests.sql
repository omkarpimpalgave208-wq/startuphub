-- Migration for verification_requests table and related structures

-- Table to store admin email allow‑list (configurable without code changes)
CREATE TABLE IF NOT EXISTS admin_allowlist (
  email TEXT PRIMARY KEY
);

-- Main verification_requests table
CREATE TABLE IF NOT EXISTS verification_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  verification_type VARCHAR(20) NOT NULL CHECK (verification_type IN ('student', 'founder')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  college_name TEXT,
  startup_name TEXT,
  document_url TEXT,
  website_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable row‑level security on verification_requests
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- 1. SELECT policies
CREATE POLICY "users_can_view_own_verification_requests"
  ON verification_requests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "admins_can_view_all_verification_requests"
  ON verification_requests
  FOR SELECT
  USING (auth.email() IN (SELECT email FROM admin_allowlist));

-- 2. INSERT policy: each user may insert their own request (WITH CHECK)
CREATE POLICY "users_can_insert_own_verification_request"
  ON verification_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE policy: only admins (emails in admin_allowlist) may update status
CREATE POLICY "admin_can_manage_verification_requests"
  ON verification_requests
  FOR UPDATE
  USING (auth.email() IN (SELECT email FROM admin_allowlist));

-- Add badge columns to profiles table (if not already present)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS student_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS founder_verified BOOLEAN DEFAULT FALSE;

-- Ensure storage schema setup
CREATE SCHEMA IF NOT EXISTS storage;

-- Create storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for verification-documents bucket
-- Drop existing policies if they exist to prevent errors during rerun
DROP POLICY IF EXISTS "Allow users to upload verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view own docs and admins to view all" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own verification documents" ON storage.objects;

-- Allow authenticated users to upload documents to their own folder
CREATE POLICY "Allow users to upload verification documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own documents or admins to view all
CREATE POLICY "Allow users to view own docs and admins to view all"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    auth.email() IN (SELECT email FROM public.admin_allowlist)
  )
);

-- Allow users to delete their own documents
CREATE POLICY "Allow users to delete own verification documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
