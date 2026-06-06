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

async function testCounts() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  console.log('30 days ago timestamp:', thirtyDaysAgo);

  const [usersRes, startupsRes, projectsRes, activeRes] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('discussions').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen', thirtyDaysAgo)
  ]);

  console.log('Total Users count:', usersRes.count, 'error:', usersRes.error);
  console.log('Startups Registered count:', startupsRes.count, 'error:', startupsRes.error);
  console.log('Projects Shared count:', projectsRes.count, 'error:', projectsRes.error);
  console.log('Active Members count:', activeRes.count, 'error:', activeRes.error);
}

testCounts();
