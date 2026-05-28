import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { q, type } = req.query;
      
      if (!q || q.length < 2) {
        return res.status(200).json({ products: [], profiles: [], discussions: [] });
      }

      const searchTerm = `%${q}%`;
      let results = { products: [], profiles: [], discussions: [] };

      // Search products
      if (!type || type === 'products') {
        const { data: products } = await supabase
          .from('products')
          .select(`
            *,
            profiles:user_id (id, username, full_name, avatar_url),
            upvotes:upvotes (count)
          `)
          .or(`name.ilike.${searchTerm},tagline.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(10);
        results.products = products || [];
      }

      // Search profiles
      if (!type || type === 'profiles') {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.${searchTerm},full_name.ilike.${searchTerm},headline.ilike.${searchTerm}`)
          .limit(10);
        results.profiles = profiles || [];
      }

      // Search discussions
      if (!type || type === 'discussions') {
        const { data: discussions } = await supabase
          .from('discussions')
          .select(`
            *,
            profiles:user_id (id, username, full_name, avatar_url),
            upvotes:discussion_upvotes (count)
          `)
          .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
          .limit(10);
        results.discussions = discussions || [];
      }

      return res.status(200).json(results);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Search API error:', err);
    res.status(500).json({ error: err.message });
  }
}