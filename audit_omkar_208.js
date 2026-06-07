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

async function runAudit() {
  console.log('--- AUDIT REPORT ---');
  
  // 1. Which user_id owns the startup "Grameen Saathi"
  const { data: grameenProduct, error: err1 } = await supabase
    .from('products')
    .select('user_id, name')
    .eq('name', 'Grameen Saathi')
    .single();
    
  if (err1) {
    console.log('Error fetching Grameen Saathi:', err1.message);
  } else {
    console.log(`1. Startup "Grameen Saathi" is owned by user_id: ${grameenProduct.user_id}`);
  }
  
  // 2. Which user_id belongs to profile omkar_208
  const { data: omkarProfile, error: err2 } = await supabase
    .from('profiles')
    .select('id, username, achievements')
    .eq('username', 'omkar_208')
    .single();
    
  if (err2) {
    console.log('Error fetching omkar_208 profile:', err2.message);
  } else {
    console.log(`2. Profile omkar_208 belongs to user_id: ${omkarProfile.id}`);
    
    // 3. & 4. Does the first_startup achievement JSON exist for omkar_208?
    const achievements = omkarProfile.achievements || [];
    const firstStartupAch = achievements.find(a => a.includes('first_startup') || a.includes('First Startup Launched'));
    
    if (firstStartupAch) {
      console.log('3. YES, the first_startup achievement exists in the achievements column for omkar_208.');
      console.log(`4. Exact stored JSON/string: ${firstStartupAch}`);
    } else {
      console.log('3. NO, the first_startup achievement does NOT exist in the achievements column for omkar_208.');
      console.log('4. N/A');
      
      // 5. Why was it skipped?
      console.log('5. Let\'s check if omkar_208 has any products.');
      const { data: omkarProducts, error: err3 } = await supabase
        .from('products')
        .select('id, name')
        .eq('user_id', omkarProfile.id);
        
      if (omkarProducts && omkarProducts.length > 0) {
        console.log(`   omkar_208 DOES have products: ${omkarProducts.map(p => p.name).join(', ')}`);
        console.log('   If they have products but were skipped, we need to trace backfill logic.');
      } else {
        console.log('   omkar_208 DOES NOT have any products. The backfill skipped this account because their startup count is 0.');
      }
    }
  }
}

runAudit();
