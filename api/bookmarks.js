import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { user_id } = req.query;
      
      if (!user_id) {
        return res.status(400).json({ error: 'user_id required' });
      }

      const { data, error } = await supabase
        .from('bookmarks')
        .select(`
          *,
          products:product_id (*, profiles:user_id (id, username, full_name, avatar_url))
        `)
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { user_id, product_id, discussion_id } = req.body;
      
      const { data, error } = await supabase
        .from('bookmarks')
        .insert({ user_id, product_id, discussion_id })
        .select()
        .single();
      
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'DELETE') {
      const { id, user_id, product_id } = req.body;
      
      let query = supabase.from('bookmarks').delete();
      
      if (id) {
        query = query.eq('id', id);
      } else if (user_id && product_id) {
        query = query.eq('user_id', user_id).eq('product_id', product_id);
      }
      
      const { error } = await query;
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Bookmarks API error:', err);
    res.status(500).json({ error: err.message });
  }
}