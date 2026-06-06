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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Searching profiles...');
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', 'user_%');
  
  if (pError) {
    console.error('Profiles query error:', pError.message);
    return;
  }
  
  console.log('Found profiles:', profiles.length);
  profiles.forEach(p => {
    console.log(`- ID: ${p.id} | Username: ${p.username} | CreatedAt: ${p.created_at}`);
  });
}

check();
