import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { user_id, unread_only } = req.query;
      
      if (!user_id) {
        return res.status(400).json({ error: 'user_id required' });
      }

      let query = supabase
        .from('notifications')
        .select(`
          *,
          actor:actor_id (id, username, full_name, avatar_url),
          product:product_id (id, name, logo_url)
        `)
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      if (unread_only === 'true') {
        query = query.eq('read', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const { id, user_id, mark_all_read } = req.body;
      
      if (mark_all_read && user_id) {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user_id);
        
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }

      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Notifications API error:', err);
    res.status(500).json({ error: err.message });
  }
}