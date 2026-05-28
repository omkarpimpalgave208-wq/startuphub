import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { id, username, user_id } = req.query;
      
      if (id || user_id) {
        const lookupId = id || user_id;
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            *,
            products:products (count),
            followers:follows!followed_id (count),
            following:follows!follower_id (count)
          `)
          .eq('id', lookupId)
          .single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      if (username) {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            *,
            products:products (count),
            followers:follows!followed_id (count),
            following:follows!follower_id (count)
          `)
          .eq('username', username)
          .single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(50);
      
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const profile = req.body;
      const { data, error } = await supabase
        .from('profiles')
        .insert(profile)
        .select()
        .single();
      
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Profiles API error:', err);
    res.status(500).json({ error: err.message });
  }
}