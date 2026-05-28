import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'POST') {
      const { file, fileName, contentType, folder = 'general' } = req.body;
      const bucket = process.env.VITE_SUPABASE_STORAGE_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || 'products';

      if (!file || !fileName) {
        return res.status(400).json({ error: 'File and fileName required' });
      }

      const buffer = Buffer.from(file, 'base64');
      const path = `${folder}/${Date.now()}_${fileName}`;

      const uploadAttempt = async () => {
        return await supabase.storage
          .from(bucket)
          .upload(path, buffer, {
            contentType: contentType || 'image/png',
            upsert: true
          });
      };

      let { data, error } = await uploadAttempt();
      if (error && error.status === 404) {
        const { error: bucketError } = await supabase.storage.createBucket(bucket, { public: true });
        if (bucketError && bucketError.status !== 409) {
          return res.status(500).json({ error: bucketError.message || 'Unable to create storage bucket' });
        }
        const retry = await uploadAttempt();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return res.status(201).json({ 
        url: urlData.publicUrl,
        path: data.path
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Upload API error:', err);
    res.status(500).json({ error: err.message });
  }
}