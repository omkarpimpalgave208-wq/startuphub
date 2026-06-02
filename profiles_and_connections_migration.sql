-- =====================================================
-- DATABASE SCHEMA MIGRATION: PROFILES & CONNECTIONS & CHAT
-- =====================================================
-- Execute these commands in the Supabase SQL Editor:
-- https://app.supabase.com/project/lmcuatpisrsvroislhgf/sql/new

-- 1. ADD MISSING COLUMNS TO PROFILES TABLE
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_style text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}'::text[] NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS achievements text[] DEFAULT '{}'::text[] NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience jsonb[] DEFAULT '{}'::jsonb[] NOT NULL;

-- 2. CREATE CONNECTION REQUESTS TABLE (If not exists)
CREATE TABLE IF NOT EXISTS public.connection_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(sender_id, receiver_id)
);

-- 3. CREATE CONNECTIONS TABLE (If not exists)
CREATE TABLE IF NOT EXISTS public.connections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_one_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_two_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_one_id, user_two_id),
  CONSTRAINT user_order_check CHECK (user_one_id < user_two_id)
);

-- 4. CREATE CONVERSATIONS TABLE (If not exists)
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. CREATE CONVERSATION PARTICIPANTS TABLE (If not exists)
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(conversation_id, user_id)
);

-- 6. CREATE MESSAGES TABLE (If not exists)
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. CREATE INDEXES FOR OPTIMAL PERFORMANCE
CREATE INDEX IF NOT EXISTS connection_requests_sender_id_idx ON public.connection_requests(sender_id);
CREATE INDEX IF NOT EXISTS connection_requests_receiver_id_idx ON public.connection_requests(receiver_id);
CREATE INDEX IF NOT EXISTS connections_user_one_id_idx ON public.connections(user_one_id);
CREATE INDEX IF NOT EXISTS connections_user_two_id_idx ON public.connections(user_two_id);
CREATE INDEX IF NOT EXISTS conversations_created_by_idx ON public.conversations(created_by);
CREATE INDEX IF NOT EXISTS conversation_participants_conversation_id_idx ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS conversation_participants_user_id_idx ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);

-- 8. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 9. CREATE RLS POLICIES

-- Connection Requests Policies
DROP POLICY IF EXISTS "authenticated_send_connection_requests" ON public.connection_requests;
CREATE POLICY "authenticated_send_connection_requests" ON public.connection_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "allow_request_participants_to_select_connection_requests" ON public.connection_requests;
CREATE POLICY "allow_request_participants_to_select_connection_requests" ON public.connection_requests
  FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "allow_recipient_to_respond_to_connection_requests" ON public.connection_requests;
CREATE POLICY "allow_recipient_to_respond_to_connection_requests" ON public.connection_requests
  FOR UPDATE TO authenticated USING (auth.uid() = receiver_id AND status = 'pending') WITH CHECK (status IN ('accepted', 'rejected'));

DROP POLICY IF EXISTS "allow_request_participants_to_delete_connection_requests" ON public.connection_requests;
CREATE POLICY "allow_request_participants_to_delete_connection_requests" ON public.connection_requests
  FOR DELETE TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Connections Policies
DROP POLICY IF EXISTS "authenticated_create_connections" ON public.connections;
CREATE POLICY "authenticated_create_connections" ON public.connections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_one_id OR auth.uid() = user_two_id);

DROP POLICY IF EXISTS "allow_users_to_read_their_connections" ON public.connections;
CREATE POLICY "allow_users_to_read_their_connections" ON public.connections
  FOR SELECT TO authenticated USING (auth.uid() = user_one_id OR auth.uid() = user_two_id);

DROP POLICY IF EXISTS "allow_users_to_delete_their_connections" ON public.connections;
CREATE POLICY "allow_users_to_delete_their_connections" ON public.connections
  FOR DELETE TO authenticated USING (auth.uid() = user_one_id OR auth.uid() = user_two_id);

-- Conversations Policies
DROP POLICY IF EXISTS "Allow participants to read conversations" ON public.conversations;
CREATE POLICY "Allow participants to read conversations" ON public.conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = public.conversations.id AND cp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Allow authenticated users to create conversations" ON public.conversations;
CREATE POLICY "Allow authenticated users to create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Conversation Participants Policies
DROP POLICY IF EXISTS "Allow participants to read conversation participants" ON public.conversation_participants;
CREATE POLICY "Allow participants to read conversation participants" ON public.conversation_participants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = public.conversation_participants.conversation_id AND cp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Allow participants to join conversations" ON public.conversation_participants;
CREATE POLICY "Allow participants to join conversations" ON public.conversation_participants
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR auth.uid() = (SELECT created_by FROM public.conversations WHERE id = conversation_id)
  );

DROP POLICY IF EXISTS "Allow participants to delete their own conversation membership" ON public.conversation_participants;
CREATE POLICY "Allow participants to delete their own conversation membership" ON public.conversation_participants
  FOR DELETE USING (
    auth.uid() = user_id OR auth.uid() = (SELECT created_by FROM public.conversations WHERE id = conversation_id)
  );

-- Messages Policies
DROP POLICY IF EXISTS "Allow participants to read messages" ON public.messages;
CREATE POLICY "Allow participants to read messages" ON public.messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = public.messages.conversation_id AND cp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Allow participants to send messages" ON public.messages;
CREATE POLICY "Allow participants to send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = public.messages.conversation_id AND cp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Allow participants to update their own or mark messages read" ON public.messages;
CREATE POLICY "Allow participants to update their own or mark messages read" ON public.messages
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = public.messages.conversation_id AND cp.user_id = auth.uid())
  ) WITH CHECK (
    auth.uid() = sender_id OR (sender_id != auth.uid() AND is_read = true)
  );
