import { useState, useEffect } from 'react';
import { Loader2, Camera } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Avatar } from '../components/ui/Avatar';
import { api } from '../lib/api';
import { optimizeImageFile, needsCompression, formatFileSize } from '../lib/imageCompression';

export function SettingsPage() {
  const { user, profile, fetchProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    headline: '',
    bio: '',
    website: '',
    github_url: '',
    twitter_url: '',
    linkedin_url: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        full_name: profile.full_name || '',
        headline: profile.headline || '',
        bio: profile.bio || '',
        website: profile.website || '',
        github_url: profile.github_url || '',
        twitter_url: profile.twitter_url || '',
        linkedin_url: profile.linkedin_url || ''
      });
      if (profile.avatar_url) {
        setAvatarPreview(profile.avatar_url);
      }
    }
  }, [profile]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setLoading(true);
    setUploadMessage('');
    
    try {
      // Check file type first
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        setUploadMessage('Unsupported file type. Please upload a PNG, JPG, WebP, GIF, or SVG image.');
        setLoading(false);
        return;
      }

      // Check if file needs compression (> 2MB for avatars)
      let fileToUpload = file;
      const maxSizeMB = 2;
      
      if (needsCompression(file, maxSizeMB)) {
        setUploadMessage(`File is ${formatFileSize(file.size)}. Compressing to max 1MB...`);
        
        try {
          const { file: compressedFile, originalSize, compressedSize } = await optimizeImageFile(file, {
            maxWidth: 800,
            maxHeight: 800,
            maxSizeMB: 1,
            quality: 0.8
          });
          
          fileToUpload = compressedFile;
          setUploadMessage(
            `Image compressed from ${formatFileSize(originalSize)} to ${formatFileSize(compressedSize)}. Uploading...`
          );
          console.log(`[SettingsPage] Avatar compressed: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)}`);
        } catch (compressionErr: any) {
          console.error('[SettingsPage] Compression failed:', compressionErr);
          setUploadMessage(`Compression failed: ${compressionErr?.message || 'Please try again.'}`);
          setLoading(false);
          return;
        }
      }

      // Upload the file (original or compressed)
      const publicUrl = await api.uploadFile(fileToUpload, 'avatars');
      setAvatarPreview(publicUrl);
      await api.updateProfile(user.id, { avatar_url: publicUrl });
      await fetchProfile(user.id);
      setUploadMessage('✓ Avatar updated successfully.');
      console.log('[SettingsPage] Avatar upload completed successfully');
    } catch (err: any) {
      const message = err?.message || 'Avatar upload failed. Please try again.';
      setUploadMessage(`✗ Error: ${message}`);
      console.error('[SettingsPage] Avatar upload error:', message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      await api.updateProfile(user.id, formData);
      await fetchProfile(user.id);
    } catch (err) {
      console.error('Save settings error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">Please sign in to access settings</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
        Settings
      </h1>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8">
        {/* Avatar panel */}
        <div className="flex items-center gap-6 mb-8">
          <div className="relative">
            <Avatar
              src={avatarPreview}
              alt={formData.full_name || formData.username}
              size="xl"
            />
            {loading ? (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
            ) : (
              <label className="absolute -bottom-1 -right-1 p-2 bg-orange-500 text-white rounded-full cursor-pointer hover:bg-orange-600 transition-colors">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
          <div>
            <h3 className="font-medium text-zinc-900 dark:text-white">Profile Photo</h3>
            <p className="text-sm text-zinc-500">JPG, PNG, WebP, GIF, or SVG. Auto-compresses large files to 1MB.</p>
          </div>
        </div>

        {uploadMessage && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/40 p-3 text-sm text-zinc-700 dark:text-zinc-200 mb-6">
            {uploadMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
            <Input
              label="Full Name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          <Input
            label="Headline"
            value={formData.headline}
            onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
            placeholder="e.g., Founder at Startup Inc."
          />

          <Textarea
            label="Bio"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Tell us about yourself..."
            rows={4}
          />

          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
            <h3 className="font-medium text-zinc-900 dark:text-white mb-4">
              Social Links
            </h3>
            <div className="space-y-4">
              <Input
                label="Website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://..."
              />
              <Input
                label="GitHub"
                type="url"
                value={formData.github_url}
                onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                placeholder="https://github.com/..."
              />
              <Input
                label="Twitter"
                type="url"
                value={formData.twitter_url}
                onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                placeholder="https://twitter.com/..."
              />
              <Input
                label="LinkedIn"
                type="url"
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="submit"
              variant="primary"
              loading={saving}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}