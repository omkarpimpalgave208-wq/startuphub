import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { user_id, product_id } = req.query;
      
      let query = supabase.from('upvotes').select('*');
      
      if (user_id) query = query.eq('user_id', user_id);
      if (product_id) query = query.eq('product_id', product_id);

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { user_id, product_id } = req.body;
      
      // Check if already upvoted
      const { data: existing } = await supabase
        .from('upvotes')
        .select('*')
        .eq('user_id', user_id)
        .eq('product_id', product_id)
        .single();

      if (existing) {
        return res.status(200).json({ already_upvoted: true, data: existing });
      }

      const { data, error } = await supabase
        .from('upvotes')
        .insert({ user_id, product_id })
        .select()
        .single();
      
      if (error) throw error;

      // Update product upvote count
      await supabase.rpc('increment_upvote_count', { product_id });

      // Create notification
      const { data: product } = await supabase
        .from('products')
        .select('user_id, name')
        .eq('id', product_id)
        .single();
      
      if (product && product.user_id !== user_id) {
        await supabase.from('notifications').insert({
          user_id: product.user_id,
          type: 'upvote',
          actor_id: user_id,
          product_id,
          message: `upvoted your product "${product.name}"`
        });
      }

      return res.status(201).json(data);
    }

    if (req.method === 'DELETE') {
      const { user_id, product_id } = req.body;
      
      const { error } = await supabase
        .from('upvotes')
        .delete()
        .eq('user_id', user_id)
        .eq('product_id', product_id);
      
      if (error) throw error;

      // Update product upvote count
      await supabase.rpc('decrement_upvote_count', { product_id });

      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Upvotes API error:', err);
    res.status(500).json({ error: err.message });
  }
}