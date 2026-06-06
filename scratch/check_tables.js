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
  console.log('Querying database information_schema...');
  
  // Try querying tables from public schema using Supabase SQL (via an RPC or query if allowed)
  // Since we cannot run raw SQL queries directly through supabase-js unless we have a custom RPC,
  // we can test fetching from 'startups', 'projects', 'products' to see which ones exist and succeed!
  
  const tables = ['profiles', 'products', 'startups', 'projects', 'discussions'];
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.log(`- Table "${table}": Error / Does not exist (${error.message})`);
      } else {
        console.log(`- Table "${table}": EXISTS (Row count: ${count})`);
      }
    } catch (err) {
      console.log(`- Table "${table}": Exception (${err.message})`);
    }
  }
}

check();
