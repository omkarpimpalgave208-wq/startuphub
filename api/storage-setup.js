import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { bucket } = req.body || {};
    const bucketName = bucket || process.env.VITE_SUPABASE_STORAGE_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || 'products';

    if (!bucketName) {
      return res.status(400).json({ error: 'Bucket name is required' });
    }

    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true
    });

    if (error) {
      // If the bucket already exists, treat it as success.
      if (error.status === 409) {
        return res.status(200).json({ bucket: bucketName, status: 'exists' });
      }
      return res.status(500).json({ error: error.message || 'Failed to ensure storage bucket exists' });
    }

    return res.status(201).json({ bucket: bucketName, status: 'created', data });
  } catch (err) {
    console.error('Storage setup error:', err);
    return res.status(500).json({ error: err?.message || 'Unexpected error creating storage bucket' });
  }
}
