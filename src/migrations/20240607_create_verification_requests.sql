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

-- INSERT policy: each user may insert their own request (WITH CHECK)
CREATE POLICY "users_can_insert_own_verification_request"
  ON verification_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy: only admins (emails in admin_allowlist) may update status
CREATE POLICY "admin_can_manage_verification_requests"
  ON verification_requests
  FOR UPDATE
  USING (auth.email() IN (SELECT email FROM admin_allowlist));

-- Add badge columns to profiles table (if not already present)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS student_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS founder_verified BOOLEAN DEFAULT FALSE;
