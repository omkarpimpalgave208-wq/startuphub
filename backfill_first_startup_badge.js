import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local
const envPath = path.resolve(__dirname, '.env.local');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
  console.error('Could not read .env.local file', e);
  process.exit(1);
}

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

if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

async function runBackfill() {
  console.log('Starting First Startup Badge backfill migration...');
  
  // 1. Fetch all products
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, user_id, name, created_at')
    .order('created_at', { ascending: true });
    
  if (prodError) {
    console.error('Error fetching products:', prodError);
    return;
  }
  
  // Group products by user_id, saving only the earliest one since they are ordered ascending
  const earliestProducts = {};
  for (const product of products) {
    if (!earliestProducts[product.user_id]) {
      earliestProducts[product.user_id] = product;
    }
  }
  
  const userIds = Object.keys(earliestProducts);
  console.log(`Found ${userIds.length} users with at least one product.`);
  
  let awardedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const userId of userIds) {
    const firstProduct = earliestProducts[userId];
    
    // Fetch user profile
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('achievements')
      .eq('id', userId)
      .single();
      
    if (profError) {
      console.error(`Error fetching profile for user ${userId}:`, profError);
      errorCount++;
      continue;
    }
    
    const achievements = profile.achievements || [];
    
    // Check if badge already exists (idempotency)
    const hasBadge = achievements.some(a => {
      try {
        const parsed = JSON.parse(a);
        return parsed.id === 'first_startup';
      } catch {
        return a === 'First Startup Launched';
      }
    });
    
    if (hasBadge) {
      skippedCount++;
      continue;
    }
    
    // Award badge
    const badgeData = JSON.stringify({
      id: 'first_startup',
      startupName: firstProduct.name,
      earnedDate: firstProduct.created_at
    });
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ achievements: [...achievements, badgeData] })
      .eq('id', userId);
      
    if (updateError) {
      console.error(`Error updating achievements for user ${userId}:`, updateError);
      errorCount++;
    } else {
      console.log(`Awarded badge to user ${userId} for startup "${firstProduct.name}"`);
      awardedCount++;
    }
  }
  
  console.log('--- Migration Complete ---');
  console.log(`Total Evaluated: ${userIds.length}`);
  console.log(`Successfully Awarded: ${awardedCount}`);
  console.log(`Skipped (Already Had Badge): ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
}

runBackfill();
