-- -------------------------------------------------------------
-- MIGRATION: Add recipient_id to public.messages for Real-time
-- Description: Optimizes RLS policies to bypass Supabase Realtime's subquery limits
-- -------------------------------------------------------------

-- 1. Add recipient_id column if it does not exist
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES public.profiles(id);

-- 2. Backfill recipient_id for existing private messages
UPDATE public.messages m
SET recipient_id = (
  SELECT cp.user_id 
  FROM public.conversation_participants cp 
  WHERE cp.conversation_id = m.conversation_id AND cp.user_id != m.sender_id
  LIMIT 1
)
WHERE recipient_id IS NULL;

-- 3. Create a helper trigger function to auto-populate recipient_id on insert as a database-level fallback
CREATE OR REPLACE FUNCTION public.populate_message_recipient()
RETURNS trigger AS $$
DECLARE
  v_recipient_id uuid;
BEGIN
  IF NEW.recipient_id IS NULL THEN
    SELECT user_id INTO v_recipient_id
    FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id
    LIMIT 1;

    NEW.recipient_id := v_recipient_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the before-insert trigger
DROP TRIGGER IF EXISTS populate_message_recipient_trigger ON public.messages;
CREATE TRIGGER populate_message_recipient_trigger
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.populate_message_recipient();

-- 5. Drop old RLS policies on public.messages
DROP POLICY IF EXISTS "Allow participants to read messages" ON public.messages;
DROP POLICY IF EXISTS "Allow participants to send messages" ON public.messages;
DROP POLICY IF EXISTS "Allow participants to update their own or mark messages read" ON public.messages;

-- 6. Create optimized, subquery-free RLS policies to support Supabase Realtime
CREATE POLICY "Allow participants to read messages" ON public.messages
  FOR SELECT TO authenticated USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
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
    auth.uid() = sender_id OR auth.uid() = recipient_id
  ) WITH CHECK (
    auth.uid() = sender_id OR (auth.uid() = recipient_id AND is_read = true)
  );
