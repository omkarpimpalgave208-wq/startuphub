import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Querying DB for RLS policies...');
  // Profiles is readable, let's see if we can query RLS policies via a RPC or check if we can query tables
  // Let's do a simple update on messages to see if it throws an RLS error!
  // Wait, to do an update we need to be signed in.
  // Can we sign in with a test user?
  // Let's check if there is an existing test user or if we can sign in.
  // In many tests, there's a user 'opimpalgave' or 'omkar_208'.
  // But we don't know the password.
  // Let's see if we can read the messages table directly.
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Messages select error:', error.message);
  } else {
    console.log('Messages select success! Rows returned:', data.length);
  }
}

check();
