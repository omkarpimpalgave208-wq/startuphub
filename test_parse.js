import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

let VITE_SUPABASE_URL = '';
let VITE_SUPABASE_ANON_KEY = '';

envContent.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) {
    VITE_SUPABASE_URL = line.split('=')[1].replace(/"/g, '').trim();
  }
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    VITE_SUPABASE_ANON_KEY = line.split('=')[1].replace(/"/g, '').trim();
  }
});

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

async function testParse() {
  const { data: profile } = await supabase
    .from('profiles')
    .select('achievements')
    .eq('username', 'omkar_208')
    .single();

  const achievements = profile.achievements || [];
  console.log('Achievements array:', achievements);
  
  for (const ach of achievements) {
    console.log('Raw string:', ach);
    try {
      const parsed = JSON.parse(ach);
      console.log('Parsed successfully:', parsed);
    } catch (e) {
      console.log('Failed to parse:', e.message);
    }
  }
}

testParse();
