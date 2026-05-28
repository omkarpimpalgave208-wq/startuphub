import { createClient } from '@supabase/supabase-js';
import { triggerRestore } from './_wake.js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    global: {
      fetch: async (url, options) => {
        const res = await fetch(url, options);
        if (!res.ok && res.status >= 500) triggerRestore();
        return res;
      },
    },
  }
);

export default supabase;
