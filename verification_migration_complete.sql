-- =========================================================================
-- COMPLETE MIGRATION: VERIFICATION BADGES SYSTEM
-- =========================================================================

-- 1. Create table to store configurable admin email allow‑list
CREATE TABLE IF NOT EXISTS public.admin_allowlist (
  email TEXT PRIMARY KEY
);

-- 2. Create the main verification_requests table
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
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

-- 3. Enable row‑level security on verification_requests
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- 4. Enable SELECT policies for verification_requests
CREATE POLICY "users_can_view_own_verification_requests"
  ON public.verification_requests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "admins_can_view_all_verification_requests"
  ON public.verification_requests
  FOR SELECT
  USING (auth.email() IN (SELECT email FROM public.admin_allowlist));

-- 5. Enable INSERT policy (WITH CHECK) for verification_requests
CREATE POLICY "users_can_insert_own_verification_request"
  ON public.verification_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6. Enable UPDATE policy for admin review of verification_requests
CREATE POLICY "admin_can_manage_verification_requests"
  ON public.verification_requests
  FOR UPDATE
  USING (auth.email() IN (SELECT email FROM public.admin_allowlist));

-- 7. Add verification badge columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS student_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS founder_verified BOOLEAN DEFAULT FALSE;

-- 8. Create the storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', true)
ON CONFLICT (id) DO NOTHING;

-- 9. Setup storage policies for the verification-documents bucket
DROP POLICY IF EXISTS "Allow users to upload verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view own docs and admins to view all" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete own verification documents" ON storage.objects;

-- Allow authenticated users to upload documents to their own subfolder
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

-- 10. (Optional) Insert default admin email to bootstrap allow-list
-- Replace the email below with your admin email:
-- INSERT INTO public.admin_allowlist (email) VALUES ('your-admin-email@example.com') ON CONFLICT DO NOTHING;
