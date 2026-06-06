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
  const tables = ['profiles', 'products', 'startups', 'projects', 'discussions'];
  for (const table of tables) {
    const { data, count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact' })
      .limit(1);
      
    console.log(`--- Table "${table}" ---`);
    console.log('Error:', error);
    console.log('Count:', count);
    console.log('Data sample:', data);
  }
}

check();
