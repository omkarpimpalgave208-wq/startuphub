import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { id, trending, limit = 20, offset = 0 } = req.query;
      
      if (id) {
        const { data, error } = await supabase
          .from('discussions')
          .select(`
            *,
            profiles:user_id (id, username, full_name, avatar_url),
            comments:discussion_comments (count),
            upvotes:discussion_upvotes (count)
          `)
          .eq('id', id)
          .single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      let query = supabase
        .from('discussions')
        .select(`
          *,
          profiles:user_id (id, username, full_name, avatar_url),
          comments:discussion_comments (count),
          upvotes:discussion_upvotes (count)
        `);

      if (trending === 'true') {
        query = query.order('upvote_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
      
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { user_id, title, content, category } = req.body;
      
      const { data, error } = await supabase
        .from('discussions')
        .insert({ user_id, title, content, category })
        .select()
        .single();
      
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      
      const { data, error } = await supabase
        .from('discussions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      
      const { error } = await supabase
        .from('discussions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Discussions API error:', err);
    res.status(500).json({ error: err.message });
  }
}