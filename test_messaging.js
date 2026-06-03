import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load Supabase configuration from .env
let supabaseUrl = '';
let supabaseAnonKey = '';

try {
  const envContent = fs.readFileSync('.env', 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.split('=')[1].trim();
    }
  }
} catch (e) {
  console.error('Failed to read .env:', e.message);
  process.exit(1);
}

const clientA = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
const clientB = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

// Reusing User A (confirmed via SQL trigger) and creating User B
const emailA = 'user_a_1780503118317@gmail.com';
const emailB = `user_b_${Date.now()}@gmail.com`;
const password = 'TestPassword123!';

async function testFlow() {
  console.log('--- STARTING END-TO-END CHAT AUDIT TEST ---');
  try {
    // 1. Log in User A
    console.log(`Logging in User A (${emailA})...`);
    const { data: authA, error: errA } = await clientA.auth.signInWithPassword({ email: emailA, password });
    if (errA) throw new Error('Log in A failed: ' + errA.message);
    const userA = authA.user;
    console.log('User A logged in successfully. ID:', userA.id);

    // 2. Sign up User B
    console.log(`Signing up User B (${emailB})...`);
    const { data: authB, error: errB } = await clientB.auth.signUp({ email: emailB, password });
    if (errB) throw new Error('Sign up B failed: ' + errB.message);
    const userB = authB.user;
    console.log('User B signed up successfully (auto-confirmed via trigger). ID:', userB.id);

    // 3. Make sure profiles exist
    console.log('Verifying profiles in public.profiles...');
    const { data: profileA, error: pErrA } = await clientA.from('profiles').select('*').eq('id', userA.id).single();
    if (pErrA) throw new Error('Profile A check failed: ' + pErrA.message);
    console.log('Profile A exists:', profileA.username);

    const { data: profileB, error: pErrB } = await clientB.from('profiles').select('*').eq('id', userB.id).single();
    if (pErrB) throw new Error('Profile B check failed: ' + pErrB.message);
    console.log('Profile B exists:', profileB.username);

    // 4. Setup Realtime subscription on User B
    console.log('Setting up Realtime subscription on User B...');
    let realtimeReceived = false;
    let realtimePayload = null;
    let realtimeUpdateReceived = false;
    let realtimeUpdatePayload = null;

    // Use unique channel name to avoid collisions
    const uniqueChannelB = `messages-channel-b-${Date.now()}`;
    const channelB = clientB
      .channel(uniqueChannelB)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        console.log(`[Realtime B] Event received: ${payload.eventType}`);
        if (payload.eventType === 'INSERT') {
          realtimeReceived = true;
          realtimePayload = payload.new;
          console.log('[Realtime B] INSERT payload:', payload.new.content);
        } else if (payload.eventType === 'UPDATE') {
          realtimeUpdateReceived = true;
          realtimeUpdatePayload = payload.new;
          console.log('[Realtime B] UPDATE payload: is_read =', payload.new.is_read);
        }
      })
      .subscribe((status) => {
        console.log(`[Realtime B] Subscription status: ${status}`);
      });

    // Wait a brief moment for the subscription to connect
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 5. User A creates conversation with User B
    console.log('User A: Creating conversation with User B...');
    const newConvId = crypto.randomUUID();
    
    // Insert conversation
    const { error: convErr } = await clientA.from('conversations').insert({
      id: newConvId,
      created_by: userA.id,
      conversation_type: 'private'
    });
    if (convErr) throw convErr;

    // Insert participants
    const { error: partErr1 } = await clientA.from('conversation_participants').insert({
      conversation_id: newConvId,
      user_id: userA.id
    });
    if (partErr1) throw partErr1;

    const { error: partErr2 } = await clientA.from('conversation_participants').insert({
      conversation_id: newConvId,
      user_id: userB.id
    });
    if (partErr2) throw partErr2;
    console.log('Conversation and participants created successfully! ID:', newConvId);

    // 6. User A sends a message to User B
    console.log('User A: Sending message to User B...');
    const messageText = 'Hello User B, this is a real-time message!';
    const { data: sentMsg, error: sendErr } = await clientA
      .from('messages')
      .insert({
        conversation_id: newConvId,
        sender_id: userA.id,
        recipient_id: userB.id,
        content: messageText
      })
      .select()
      .single();

    if (sendErr) throw sendErr;
    console.log('Message sent. ID:', sentMsg.id, 'recipient_id:', sentMsg.recipient_id);

    // 7. Wait and check if User B received the INSERT event in real-time
    console.log('Waiting for Realtime B to receive message...');
    for (let i = 0; i < 15; i++) {
      if (realtimeReceived) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (!realtimeReceived) {
      throw new Error('FAILED: User B did not receive the real-time INSERT event! Real-time message broadcasting is failing.');
    }
    console.log('SUCCESS: User B received the realtime INSERT event!');

    // 8. Verify B's unread count
    console.log('User B: Fetching unread message count...');
    const { data: bUnread, error: bUnreadErr } = await clientB
      .from('messages')
      .select('id')
      .eq('conversation_id', newConvId)
      .neq('sender_id', userB.id)
      .eq('is_read', false);

    if (bUnreadErr) throw bUnreadErr;
    console.log('User B unread count in DB:', bUnread.length);
    if (bUnread.length !== 1) {
      throw new Error(`FAILED: Expected unread count to be 1, got ${bUnread.length}`);
    }
    console.log('SUCCESS: Unread count in DB is exactly 1.');

    // 9. User B opens conversation (marks messages read)
    console.log('User B: Marking messages as read...');
    const { error: markErr } = await clientB
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', newConvId)
      .neq('sender_id', userB.id)
      .eq('is_read', false);

    if (markErr) throw markErr;
    console.log('Messages updated to is_read = true in DB.');

    // 10. Wait and check if User B (and User A) received the UPDATE event in real-time
    console.log('Waiting for Realtime B to receive UPDATE event...');
    for (let i = 0; i < 15; i++) {
      if (realtimeUpdateReceived) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (!realtimeUpdateReceived) {
      throw new Error('FAILED: User B did not receive the real-time UPDATE event! Realtime updating is broken.');
    }
    console.log('SUCCESS: User B received the realtime UPDATE event!');

    // 11. Verify B's unread count is now 0
    const { data: bUnreadAfter, error: bUnreadAfterErr } = await clientB
      .from('messages')
      .select('id')
      .eq('conversation_id', newConvId)
      .neq('sender_id', userB.id)
      .eq('is_read', false);

    if (bUnreadAfterErr) throw bUnreadAfterErr;
    console.log('User B unread count in DB after update:', bUnreadAfter.length);
    if (bUnreadAfter.length !== 0) {
      throw new Error(`FAILED: Expected unread count to be 0, got ${bUnreadAfter.length}`);
    }
    console.log('SUCCESS: Unread count in DB is exactly 0.');

    // 12. Refresh simulation: select conversation again to verify persistence
    console.log('Refresh simulation: Verifying conversation and messages persist...');
    const { data: convCheck, error: convCheckErr } = await clientB
      .from('conversations')
      .select(`
        *,
        messages:messages (*)
      `)
      .eq('id', newConvId)
      .single();

    if (convCheckErr) throw convCheckErr;
    console.log('Conversation fetched successfully on refresh simulation!');
    console.log('Messages returned:', convCheck.messages.length);
    if (convCheck.messages.length !== 1) {
      throw new Error(`FAILED: Expected 1 message to be persisted, found ${convCheck.messages.length}`);
    }
    console.log('Message content:', convCheck.messages[0].content);
    console.log('Message is_read status:', convCheck.messages[0].is_read);

    console.log('--- ALL END-TO-END CHAT AUDIT TESTS PASSED SUCCESSFULLY! ---');

    // Cleanup channels
    clientB.removeChannel(channelB);
  } catch (err) {
    console.error('TEST FAILED:', err.message);
    process.exit(1);
  }
}

testFlow();
