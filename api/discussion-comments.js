import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { discussion_id } = req.query;
      
      let query = supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (id, username, full_name, avatar_url),
          upvotes:comment_upvotes (count)
        `)
        .eq('discussion_id', discussion_id)
        .order('created_at', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Discussion Comments API error:', err);
    res.status(500).json({ error: err.message });
  }
}