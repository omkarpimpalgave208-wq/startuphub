-- Create hackathons table
CREATE TABLE IF NOT EXISTS public.hackathons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organizer TEXT NOT NULL,
  description TEXT NOT NULL,
  website_url TEXT,
  registration_url TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  prize_pool TEXT,
  team_size TEXT,
  category TEXT,
  banner_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.hackathons ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy: Anyone can view hackathons
CREATE POLICY "anyone_can_view_hackathons" ON public.hackathons
  FOR SELECT
  USING (true);

-- 2. INSERT Policy: Only admins (emails in admin_allowlist) can create hackathons
CREATE POLICY "admins_can_insert_hackathons" ON public.hackathons
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.email() IN (SELECT email FROM public.admin_allowlist)
  );

-- 3. UPDATE Policy: Only admins (emails in admin_allowlist) can update hackathons
CREATE POLICY "admins_can_update_hackathons" ON public.hackathons
  FOR UPDATE
  TO authenticated
  USING (
    auth.email() IN (SELECT email FROM public.admin_allowlist)
  )
  WITH CHECK (
    auth.email() IN (SELECT email FROM public.admin_allowlist)
  );

-- 4. DELETE Policy: Only admins (emails in admin_allowlist) can delete hackathons
CREATE POLICY "admins_can_delete_hackathons" ON public.hackathons
  FOR DELETE
  TO authenticated
  USING (
    auth.email() IN (SELECT email FROM public.admin_allowlist)
  );
