-- =====================================================
-- Supabase Row-Level Security (RLS) Setup for Secure Delete
-- =====================================================
-- 
-- This SQL script sets up the required RLS policies for the products table
-- to enable secure product deletion where users can only delete their own products.
--
-- Execute these commands in the Supabase SQL Editor:
-- https://app.supabase.com/project/[your-project-id]/sql/new

-- =====================================================
-- 1. Enable RLS on the products table (if not already enabled)
-- =====================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. DELETE Policy: Allow authenticated users to delete only their own products
-- =====================================================
-- This policy ensures users can only delete products where user_id = auth.uid()
CREATE POLICY "authenticated_delete_own_products" ON products
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- 3. SELECT Policy: Allow anyone to read products (if not already set)
-- =====================================================
-- This policy allows users to view all products (public read access)
CREATE POLICY "public_read_products" ON products
  FOR SELECT
  USING (true);

-- =====================================================
-- 4. INSERT Policy: Allow authenticated users to create products
-- =====================================================
-- This policy ensures new products can only be created with the current user's id
CREATE POLICY "authenticated_insert_products" ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 5. UPDATE Policy: Allow authenticated users to update only their own products
-- =====================================================
-- This policy ensures users can only update products they own
CREATE POLICY "authenticated_update_own_products" ON products
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- Verification: Check that RLS is enabled and policies are active
-- =====================================================
-- Run this query to verify RLS setup:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'products';
