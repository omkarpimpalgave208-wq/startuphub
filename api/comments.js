import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { product_id, discussion_id, parent_id } = req.query;
      
      let query = supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (id, username, full_name, avatar_url),
          replies:comments!parent_id (count),
          upvotes:comment_upvotes (count)
        `)
        .order('created_at', { ascending: false });

      if (product_id) query = query.eq('product_id', product_id);
      if (discussion_id) query = query.eq('discussion_id', discussion_id);
      if (parent_id) query = query.eq('parent_id', parent_id);
      else query = query.is('parent_id', null);

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { user_id, product_id, discussion_id, parent_id, content } = req.body;
      
      const { data, error } = await supabase
        .from('comments')
        .insert({ user_id, product_id, discussion_id, parent_id, content })
        .select(`
          *,
          profiles:user_id (id, username, full_name, avatar_url)
        `)
        .single();
      
      if (error) throw error;

      // Create notification
      if (product_id) {
        const { data: product } = await supabase
          .from('products')
          .select('user_id, name')
          .eq('id', product_id)
          .single();
        
        if (product && product.user_id !== user_id) {
          await supabase.from('notifications').insert({
            user_id: product.user_id,
            type: 'comment',
            actor_id: user_id,
            product_id,
            message: `commented on your product "${product.name}"`
          });
        }
      }

      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, content } = req.body;
      
      const { data, error } = await supabase
        .from('comments')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Comments API error:', err);
    res.status(500).json({ error: err.message });
  }
}