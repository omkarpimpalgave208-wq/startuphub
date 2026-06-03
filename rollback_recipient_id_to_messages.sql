-- -------------------------------------------------------------
-- ROLLBACK MIGRATION: Revert recipient_id column and restore original RLS policies
-- -------------------------------------------------------------

-- 1. Drop trigger populate_message_recipient_trigger
DROP TRIGGER IF EXISTS populate_message_recipient_trigger ON public.messages;

-- 2. Drop trigger function populate_message_recipient
DROP FUNCTION IF EXISTS public.populate_message_recipient();

-- 3. Drop current RLS policies on public.messages
DROP POLICY IF EXISTS "Allow participants to read messages" ON public.messages;
DROP POLICY IF EXISTS "Allow participants to send messages" ON public.messages;
DROP POLICY IF EXISTS "Allow participants to update their own or mark messages read" ON public.messages;

-- 4. Restore original RLS policies (which use subqueries/joins)
CREATE POLICY "Allow participants to read messages" ON public.messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp 
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow participants to send messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp 
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow participants to update their own or mark messages read" ON public.messages
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp 
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  ) WITH CHECK (
    auth.uid() = sender_id OR (sender_id != auth.uid() AND is_read = true)
  );

-- 5. Drop recipient_id column
ALTER TABLE public.messages DROP COLUMN IF EXISTS recipient_id;
