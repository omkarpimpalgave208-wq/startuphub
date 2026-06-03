-- =================================================================
-- MESSAGING SYSTEM AUDIT QUERIES
-- Paste this script into your Supabase SQL Editor and click Run.
-- https://app.supabase.com/project/lmcuatpisrsvroislhgf/sql/new
-- =================================================================

-- -----------------------------------------------------------------
-- PART 1: SUPERUSER INSPECTION (RLS bypassed)
-- -----------------------------------------------------------------
\echo '--- 1. Inspect most recent messages ---'
SELECT 
  id AS message_id, 
  conversation_id, 
  sender_id, 
  recipient_id, 
  left(content, 30) AS message_preview, 
  is_read, 
  created_at
FROM public.messages
ORDER BY created_at DESC
LIMIT 5;

\echo '--- 2. Inspect conversation participants for the most recent message ---'
SELECT 
  cp.conversation_id,
  cp.user_id,
  p.username
FROM public.conversation_participants cp
JOIN public.profiles p ON p.id = cp.user_id
WHERE cp.conversation_id = (
  SELECT conversation_id FROM public.messages ORDER BY created_at DESC LIMIT 1
);

-- -----------------------------------------------------------------
-- PART 2: SIMULATED SESSION EVALUATION
-- -----------------------------------------------------------------
-- We will simulate User B (the recipient of the most recent message)
-- and evaluate how the policies behave.

DO $$
DECLARE
  v_conv_id uuid;
  v_recipient_id uuid;
  v_sender_id uuid;
  v_recipient_username text;
  v_msg_count int;
  v_conv_exists boolean;
  v_nested_msg_count int;
BEGIN
  -- Get details from the latest message
  SELECT conversation_id, sender_id, recipient_id 
  INTO v_conv_id, v_sender_id, v_recipient_id
  FROM public.messages 
  ORDER BY created_at DESC 
  LIMIT 1;

  IF v_conv_id IS NULL THEN
    RAISE NOTICE 'No messages found in the database. Please send a test message first.';
    RETURN;
  END IF;

  SELECT username INTO v_recipient_username FROM public.profiles WHERE id = v_recipient_id;
  
  RAISE NOTICE 'Evaluating RLS queries as User B (ID: %, Username: %)', v_recipient_id, v_recipient_username;
  RAISE NOTICE 'Target Conversation ID: %', v_conv_id;

  -- Temporarily assume the identity of User B (authenticated role)
  -- request.jwt.claim.sub is what auth.uid() evaluates to in Supabase RLS
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', v_recipient_id::text, true);

  -- 1. Test direct message SELECT policy
  SELECT COUNT(*) INTO v_msg_count 
  FROM public.messages 
  WHERE conversation_id = v_conv_id;
  
  RAISE NOTICE '  Direct Query: SELECT * FROM messages returned % rows', v_msg_count;

  -- 2. Test getConversation query (simulated conversations table SELECT)
  SELECT EXISTS(SELECT 1 FROM public.conversations WHERE id = v_conv_id) INTO v_conv_exists;
  RAISE NOTICE '  getConversation: Does conversation row exist under User B? %', v_conv_exists;

  -- 3. Test nested messages select
  -- PostgREST runs a query on public.messages for the child rows
  SELECT COUNT(*) INTO v_nested_msg_count 
  FROM public.messages 
  WHERE conversation_id = v_conv_id;
  RAISE NOTICE '  Nested query messages:messages(*) returned % rows', v_nested_msg_count;

  -- Reset connection state
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
END $$;
