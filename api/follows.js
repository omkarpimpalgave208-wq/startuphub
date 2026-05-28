import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { follower_id, followed_id, check } = req.query;
      
      if (check && follower_id && followed_id) {
        const { data, error } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', follower_id)
          .eq('followed_id', followed_id)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return res.status(200).json({ isFollowing: !!data });
      }

      let query = supabase.from('follows').select(`
        *,
        follower:follower_id (id, username, full_name, avatar_url),
        followed:followed_id (id, username, full_name, avatar_url)
      `);

      if (follower_id) query = query.eq('follower_id', follower_id);
      if (followed_id) query = query.eq('followed_id', followed_id);

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { follower_id, followed_id } = req.body;
      
      const { data, error } = await supabase
        .from('follows')
        .insert({ follower_id, followed_id })
        .select()
        .single();
      
      if (error) throw error;

      // Create notification
      await supabase.from('notifications').insert({
        user_id: followed_id,
        type: 'follow',
        actor_id: follower_id,
        message: 'started following you'
      });

      return res.status(201).json(data);
    }

    if (req.method === 'DELETE') {
      const { follower_id, followed_id } = req.body;
      
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', follower_id)
        .eq('followed_id', followed_id);
      
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Follows API error:', err);
    res.status(500).json({ error: err.message });
  }
}