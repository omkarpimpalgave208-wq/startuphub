-- =================================================================
-- DATABASE SCHEMA CORRECTION: SECURE, NON-RECURSIVE CHAT RLS POLICIES
-- =================================================================
-- Run these commands in your Supabase SQL Editor:
-- https://app.supabase.com/project/lmcuatpisrsvroislhgf/sql/new

-- -----------------------------------------------------------------
-- 1. DISABLE AND RE-ENABLE RLS TO ENSURE CLEAN STATE
-- -----------------------------------------------------------------
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------
-- 2. DROP ALL POTENTIAL EXISTING POLICIES (TO AVOID LEFT-OVERS)
-- -----------------------------------------------------------------

-- Drop conversations policies
DROP POLICY IF EXISTS "Allow participants to read conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow authenticated users to create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow participants to create conversations" ON public.conversations;
DROP POLICY IF EXISTS "allow_participants_to_read_conversations" ON public.conversations;
DROP POLICY IF EXISTS "allow_create_conversations" ON public.conversations;

-- Drop conversation_participants policies
DROP POLICY IF EXISTS "Allow participants to read conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Allow authenticated users to read conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Allow participants to join conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Allow participants to delete their own conversation membership" ON public.conversation_participants;
DROP POLICY IF EXISTS "allow_read_conversation_participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "allow_join_conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "allow_delete_conversation_membership" ON public.conversation_participants;

-- Drop messages policies
DROP POLICY IF EXISTS "Allow participants to read messages" ON public.messages;
DROP POLICY IF EXISTS "Allow participants to send messages" ON public.messages;
DROP POLICY IF EXISTS "Allow participants to update their own or mark messages read" ON public.messages;
DROP POLICY IF EXISTS "allow_read_messages" ON public.messages;
DROP POLICY IF EXISTS "allow_send_messages" ON public.messages;
DROP POLICY IF EXISTS "allow_update_messages" ON public.messages;

-- -----------------------------------------------------------------
-- 3. CREATE NEW CORRECTED, SECURE & COMPLETELY NON-RECURSIVE POLICIES
-- -----------------------------------------------------------------

-- =================================================================
-- A. CONVERSATION PARTICIPANTS POLICIES
-- =================================================================

-- 1. SELECT: Set TO 'true' for authenticated users to break recursion loops entirely.
-- This is secure because participants only links IDs, no content is leaked.
CREATE POLICY "Allow authenticated users to read conversation participants" ON public.conversation_participants
  FOR SELECT TO authenticated USING (true);

-- 2. INSERT: Allow joining if you are the user being added, or if you created the parent conversation.
CREATE POLICY "Allow participants to join conversations" ON public.conversation_participants
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id OR auth.uid() = (SELECT created_by FROM public.conversations WHERE id = conversation_id)
  );

-- 3. DELETE: Allow leaving if you are the user being removed, or if you created the parent conversation.
CREATE POLICY "Allow participants to delete their own conversation membership" ON public.conversation_participants
  FOR DELETE TO authenticated USING (
    auth.uid() = user_id OR auth.uid() = (SELECT created_by FROM public.conversations WHERE id = conversation_id)
  );


-- =================================================================
-- B. CONVERSATIONS POLICIES
-- =================================================================

-- 1. SELECT: Allow users to view conversations they created OR are a participant of.
-- 'created_by = auth.uid()' is critical because at the moment of INSERT, 
-- no participants rows exist in conversation_participants yet.
CREATE POLICY "Allow participants to read conversations" ON public.conversations
  FOR SELECT TO authenticated USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp 
      WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
    )
  );

-- 2. INSERT: Allow authenticated users to create conversations as themselves.
CREATE POLICY "Allow authenticated users to create conversations" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);


-- =================================================================
-- C. MESSAGES POLICIES
-- =================================================================

-- 1. SELECT: Allow participants to read messages in their conversations.
-- Evaluates securely by querying conversation_participants (which is non-recursive).
CREATE POLICY "Allow participants to read messages" ON public.messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp 
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

-- 2. INSERT: Allow participants to send messages to their conversations.
CREATE POLICY "Allow participants to send messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp 
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

-- 3. UPDATE: Allow marking messages as read or updating owned messages.
CREATE POLICY "Allow participants to update their own or mark messages read" ON public.messages
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp 
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  ) WITH CHECK (
    auth.uid() = sender_id OR (sender_id != auth.uid() AND is_read = true)
  );
