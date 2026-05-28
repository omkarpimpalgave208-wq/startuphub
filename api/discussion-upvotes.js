import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { user_id, discussion_id } = req.query;
      
      let query = supabase.from('discussion_upvotes').select('*');
      
      if (user_id) query = query.eq('user_id', user_id);
      if (discussion_id) query = query.eq('discussion_id', discussion_id);

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { user_id, discussion_id } = req.body;
      
      const { data, error } = await supabase
        .from('discussion_upvotes')
        .insert({ user_id, discussion_id })
        .select()
        .single();
      
      if (error) throw error;

      // Update discussion upvote count
      await supabase.rpc('increment_discussion_upvote_count', { discussion_id });

      return res.status(201).json(data);
    }

    if (req.method === 'DELETE') {
      const { user_id, discussion_id } = req.body;
      
      const { error } = await supabase
        .from('discussion_upvotes')
        .delete()
        .eq('user_id', user_id)
        .eq('discussion_id', discussion_id);
      
      if (error) throw error;

      // Update discussion upvote count
      await supabase.rpc('decrement_discussion_upvote_count', { discussion_id });

      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Discussion Upvotes API error:', err);
    res.status(500).json({ error: err.message });
  }
}