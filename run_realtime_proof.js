import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let supabaseAnonKey = '';

const lines = envContent.split('\n');
for (const line of lines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim();
  }
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseAnonKey = line.split('=')[1].trim();
  }
}

const clientA = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
const clientB = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

const emailA = 'user_a_1780513709271@gmail.com';
const emailB = 'user_b_1780513709271@gmail.com';
const password = 'TestPassword123!';

async function runProof() {
  try {
    console.log('Signing in User A (existing confirmed user)...');
    const { data: authA, error: aErrA } = await clientA.auth.signInWithPassword({ email: emailA, password });
    if (aErrA) throw aErrA;
    const userA = authA.user;

    console.log('Signing in User B (existing confirmed user)...');
    const { data: authB, error: aErrB } = await clientB.auth.signInWithPassword({ email: emailB, password });
    if (aErrB) throw aErrB;
    const userB = authB.user;

    console.log('User A ID:', userA.id);
    console.log('User B ID:', userB.id);

    // 3. User A creates conversation
    const conversationId = crypto.randomUUID();
    console.log('Creating conversation:', conversationId);
    
    // Insert conversation
    const { error: convErr } = await clientA.from('conversations').insert({
      id: conversationId,
      created_by: userA.id,
      conversation_type: 'private'
    });
    if (convErr) throw convErr;

    // Insert participant A using client A
    console.log('Inserting Participant A...');
    const { error: partErr1 } = await clientA.from('conversation_participants').insert({
      conversation_id: conversationId,
      user_id: userA.id
    });
    if (partErr1) throw partErr1;

    // Insert participant B using client B
    console.log('Inserting Participant B...');
    const { error: partErr2 } = await clientB.from('conversation_participants').insert({
      conversation_id: conversationId,
      user_id: userB.id
    });
    if (partErr2) throw partErr2;

    // 4. Setup Realtime subscription on User B (Exactly as in MessagesPage.tsx)
    const uniqueSuffix = Math.random().toString(36).substring(2, 11);
    const channelName = `messages:${conversationId}-${uniqueSuffix}`;
    
    console.log('channel name:', channelName);

    let subscribedPromiseResolve;
    const subscribedPromise = new Promise(resolve => { subscribedPromiseResolve = resolve; });

    let payloadPromiseResolve;
    const payloadPromise = new Promise(resolve => { payloadPromiseResolve = resolve; });

    const channel = clientB
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('payload received', payload);
          console.log('[Realtime Payload Received - INSERT]:', payload);
          payloadPromiseResolve();
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime Subscription Status]:', status);
        if (status === 'SUBSCRIBED') {
          console.log('SUBSCRIBED');
          console.log('[Realtime Subscribed] Successfully connected to channel:', channelName);
          subscribedPromiseResolve();
        } else if (status === 'CLOSED') {
          console.log('[Realtime Closed] Channel closed:', channelName);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('CHANNEL_ERROR', err);
          console.error('[Realtime Error] Channel error:', err);
        } else if (status === 'TIMED_OUT') {
          console.warn('[Realtime Timeout] Channel timed out:', channelName);
        }
      });

    // Wait for B to reach SUBSCRIBED
    await subscribedPromise;
    console.log('User B channel successfully subscribed. Waiting 1 second before sending message...');
    await new Promise(r => setTimeout(r, 1000));

    // 5. User A sends a message to User B
    console.log('User A sending message...');
    const { error: sendErr } = await clientA
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userA.id,
        recipient_id: userB.id,
        content: 'Hello User B, this is a real-time message!'
      });
    if (sendErr) throw sendErr;

    // 6. Wait for B to receive payload
    console.log('Waiting for User B to receive realtime event...');
    await payloadPromise;
    console.log('Proof completed successfully!');

    // Cleanup channel
    clientB.removeChannel(channel);
    process.exit(0);

  } catch (err) {
    console.error('Error during proof execution:', err);
    process.exit(1);
  }
}

runProof();
