-- =================================================================
-- MIGRATION: Fix RLS Policies using SECURITY DEFINER Helper Functions
-- Description: Resolves infinite recursion on public.conversation_participants
--              and public.conversations, and simplifies messages RLS.
-- =================================================================

-- 1. DROP ALL POTENTIAL EXISTING POLICIES
-- Drop messages policies
DROP POLICY IF EXISTS "Allow participants to read messages" ON public.messages;
DROP POLICY IF EXISTS "Allow participants to send messages" ON public.messages;
DROP POLICY IF EXISTS "Allow participants to update their own or mark messages read" ON public.messages;
DROP POLICY IF EXISTS "Allow sender or recipient to read messages" ON public.messages;
DROP POLICY IF EXISTS "Allow members to insert messages" ON public.messages;
DROP POLICY IF EXISTS "Allow members to update messages" ON public.messages;
DROP POLICY IF EXISTS "allow_read_messages" ON public.messages;
DROP POLICY IF EXISTS "allow_send_messages" ON public.messages;
DROP POLICY IF EXISTS "allow_update_messages" ON public.messages;

-- Drop conversations policies
DROP POLICY IF EXISTS "Allow participants to read conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow authenticated users to create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow participants to create conversations" ON public.conversations;
DROP POLICY IF EXISTS "allow_participants_to_read_conversations" ON public.conversations;
DROP POLICY IF EXISTS "allow_create_conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow members to read conversations" ON public.conversations;

-- Drop conversation_participants policies
DROP POLICY IF EXISTS "Allow participants to read conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Allow authenticated users to read conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Allow participants to join conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Allow participants to delete their own conversation membership" ON public.conversation_participants;
DROP POLICY IF EXISTS "allow_read_conversation_participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "allow_join_conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "allow_delete_conversation_membership" ON public.conversation_participants;
DROP POLICY IF EXISTS "Allow members to read participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Allow creator or partner to join" ON public.conversation_participants;
DROP POLICY IF EXISTS "Allow creator or partner to leave" ON public.conversation_participants;
DROP POLICY IF EXISTS "Allow joining conversation" ON public.conversation_participants;
DROP POLICY IF EXISTS "Allow leaving conversation" ON public.conversation_participants;
DROP POLICY IF EXISTS "Allow users to read their own participant rows" ON public.conversation_participants;
DROP POLICY IF EXISTS "Allow members to read conversation participants" ON public.conversation_participants;

-- 2. CREATE SECURITY DEFINER HELPER FUNCTIONS

-- Helper function to check conversation membership without RLS recursion
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper function to check if the user is conversation creator without RLS recursion
CREATE OR REPLACE FUNCTION public.is_conversation_creator(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id AND created_by = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper function to check message access without RLS recursion
CREATE OR REPLACE FUNCTION public.can_access_message(p_message_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.messages
    WHERE id = p_message_id AND (sender_id = auth.uid() OR recipient_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. CREATE NEW SECURE, NON-RECURSIVE POLICIES

-- A. CONVERSATIONS POLICIES
-- SELECT: Users can only read conversations they belong to
CREATE POLICY "Allow members to read conversations" ON public.conversations
  FOR SELECT TO authenticated USING (
    public.is_conversation_member(id)
  );

-- INSERT: Authenticated users can create conversations they own
CREATE POLICY "Allow authenticated users to create conversations" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = created_by
  );

-- B. CONVERSATION PARTICIPANTS POLICIES
-- SELECT 1: Users can read their own participant rows (subquery-free, Realtime compatible)
CREATE POLICY "Allow users to read their own participant rows" ON public.conversation_participants
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id
  );

-- SELECT 2: Users can read other participants of conversations they belong to (REST query compatible)
CREATE POLICY "Allow members to read conversation participants" ON public.conversation_participants
  FOR SELECT TO authenticated USING (
    public.is_conversation_member(conversation_id)
  );

-- INSERT: Creator or partner can join the conversation
CREATE POLICY "Allow joining conversation" ON public.conversation_participants
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id OR public.is_conversation_creator(conversation_id, auth.uid())
  );

-- DELETE: Creator or partner can leave the conversation
CREATE POLICY "Allow leaving conversation" ON public.conversation_participants
  FOR DELETE TO authenticated USING (
    auth.uid() = user_id OR public.is_conversation_creator(conversation_id, auth.uid())
  );

-- C. MESSAGES POLICIES
-- SELECT: Users can read messages where they are the sender or recipient (subquery-free, Realtime compatible)
CREATE POLICY "Allow sender or recipient to read messages" ON public.messages
  FOR SELECT TO authenticated USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

-- INSERT: Simple insert policy allowing authenticated users to send messages where they are the sender (subquery-free)
CREATE POLICY "allow_send_messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = sender_id
  );

-- UPDATE: Users can update their own messages or mark incoming messages as read (subquery-free, Realtime compatible)
CREATE POLICY "Allow members to update messages" ON public.messages
  FOR UPDATE TO authenticated USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  ) WITH CHECK (
    auth.uid() = sender_id OR (auth.uid() = recipient_id AND is_read = true)
  );

-- 4. ENABLE SUPABASE REALTIME FOR MESSAGES AND CONVERSATIONS TABLES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
END $$;
