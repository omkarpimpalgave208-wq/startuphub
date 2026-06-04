import { useState, useEffect } from 'react';
import { Loader2, Camera } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Avatar } from '../components/ui/Avatar';
import { api } from '../lib/api';
import { optimizeImageFile, needsCompression, formatFileSize } from '../lib/imageCompression';

const PROFILE_COVER_KEY = (id: string) => `startuphub_cover_${id}`;
const PROFILE_COVER_STYLE_KEY = (id: string) => `startuphub_cover_style_${id}`;

const coverStyles = [
  { id: 'gradient-1', label: 'Evening Glow', className: 'from-slate-950 via-indigo-700 to-violet-500' },
  { id: 'gradient-2', label: 'Aqua Spark', className: 'from-sky-500 via-cyan-500 to-violet-500' },
  { id: 'gradient-3', label: 'Sunset Burst', className: 'from-orange-500 via-fuchsia-500 to-blue-500' }
] as const;

export function SettingsPage() {
  const { user, profile, fetchProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [bannerStyle, setBannerStyle] = useState<string>('gradient-1');
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [bannerMessage, setBannerMessage] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    headline: '',
    bio: '',
    website: '',
    github_url: '',
    twitter_url: '',
    linkedin_url: '',
    college_name: '',
    studying_year: '',
    skills: '',
    achievements: ''
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
        linkedin_url: profile.linkedin_url || '',
        college_name: profile.college_name || '',
        studying_year: profile.studying_year || '',
        skills: (profile.skills || []).join(', '),
        achievements: (profile.achievements || []).join('\n')
      });
      if (profile.avatar_url) {
        setAvatarPreview(profile.avatar_url);
      }
      const storedCover = localStorage.getItem(PROFILE_COVER_KEY(profile.id));
      const storedCoverStyle = localStorage.getItem(PROFILE_COVER_STYLE_KEY(profile.id));
      if (storedCover) {
        setBannerPreview(storedCover);
      }
      if (storedCoverStyle) {
        setBannerStyle(storedCoverStyle);
      }
    }
  }, [profile]);

  const saveCoverState = (coverUrl: string | null, styleId: string) => {
    if (!user) return;
    if (coverUrl) {
      localStorage.setItem(PROFILE_COVER_KEY(user.id), coverUrl);
    } else {
      localStorage.removeItem(PROFILE_COVER_KEY(user.id));
    }
    localStorage.setItem(PROFILE_COVER_STYLE_KEY(user.id), styleId);
  };

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

  const handleBannerChange = async (file: File) => {
    if (!user) return;
    setBannerMessage('');

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setBannerMessage('Unsupported banner type. Use PNG, JPG, or WebP.');
      return;
    }

    try {
      setLoading(true);
      let fileToUpload = file;
      const maxSizeMB = 4;
      if (needsCompression(file, maxSizeMB)) {
        const { file: compressedFile, originalSize, compressedSize } = await optimizeImageFile(file, {
          maxWidth: 2400,
          maxHeight: 800,
          maxSizeMB: 2,
          quality: 0.75
        });
        fileToUpload = compressedFile;
        setBannerMessage(`Compressed banner from ${formatFileSize(originalSize)} to ${formatFileSize(compressedSize)}.`);
      }

      const publicUrl = await api.uploadFile(fileToUpload, 'covers');
      setBannerPreview(publicUrl);
      saveCoverState(publicUrl, bannerStyle);
      setBannerMessage('✓ Cover photo updated successfully.');
    } catch (err: any) {
      const message = err?.message || 'Cover upload failed. Please try again.';
      setBannerMessage(`✗ Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const onBannerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleBannerChange(file);
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleBannerChange(file);
    }
  };

  const handleStyleChange = (styleId: string) => {
    setBannerStyle(styleId);
    saveCoverState(bannerPreview || null, styleId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const skillsArray = formData.skills
        ? formData.skills.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const achievementsArray = formData.achievements
        ? formData.achievements.split('\n').map((a) => a.trim()).filter(Boolean)
        : [];

      const payload = {
        username: formData.username,
        full_name: formData.full_name,
        headline: formData.headline,
        bio: formData.bio,
        website: formData.website,
        github_url: formData.github_url,
        twitter_url: formData.twitter_url,
        linkedin_url: formData.linkedin_url,
        college_name: formData.college_name,
        studying_year: formData.studying_year,
        skills: skillsArray,
        achievements: achievementsArray
      };

      await api.updateProfile(user.id, payload as any);
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
    <div className="w-full max-w-none min-w-0 md:max-w-3xl md:mx-auto px-4 md:px-0">
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

        <div className="rounded-3xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/40 p-5 mb-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-white">Cover Photo</h3>
              <p className="text-sm text-zinc-500">Upload a cover image or choose a premium gradient banner.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => { setBannerPreview(''); saveCoverState(null, bannerStyle); }}>
              Reset Cover
            </Button>
          </div>

          <div
            className={`group relative overflow-hidden rounded-3xl border-2 ${
              dragActive ? 'border-orange-400 bg-orange-50/80 dark:bg-orange-500/10' : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950'
            } p-6 text-center transition`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {bannerPreview ? (
              <div className="mx-auto h-48 w-full rounded-3xl overflow-hidden bg-zinc-950 flex items-center justify-center relative">
                {/* Blurred background image for full coverage */}
                <img
                  src={bannerPreview}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover blur-md opacity-40 scale-105"
                  aria-hidden="true"
                />
                {/* Contained full visibility preview image */}
                <img
                  src={bannerPreview}
                  alt="Cover preview"
                  className="relative z-10 max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className={`mx-auto h-48 w-full rounded-3xl bg-gradient-to-br ${coverStyles.find((style) => style.id === bannerStyle)?.className ?? coverStyles[0].className}`} />
            )}
            <div className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-sm opacity-90 ${
              bannerPreview
                ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                : 'text-zinc-700 dark:text-zinc-300'
            }`}>
              <p className="font-semibold">Drag & drop a cover image here</p>
              <p>or upload a JPG, PNG, WebP file up to 4MB.</p>
            </div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onBannerInputChange}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>

          {bannerMessage && (
            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/40 p-3 text-sm text-zinc-700 dark:text-zinc-200">
              {bannerMessage}
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {coverStyles.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => handleStyleChange(style.id)}
                className={`rounded-3xl border p-3 text-left transition ${
                  bannerStyle === style.id
                    ? 'border-orange-400 bg-orange-50 dark:border-orange-400 dark:bg-orange-500/10'
                    : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
                }`}
              >
                <div className={`h-20 rounded-2xl bg-gradient-to-br ${style.className}`} />
                <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-white">{style.label}</p>
              </button>
            ))}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="College Name"
              value={formData.college_name}
              onChange={(e) => setFormData({ ...formData, college_name: e.target.value })}
              placeholder="e.g. Stanford University"
            />
            <Input
              label="Year of Study"
              value={formData.studying_year}
              onChange={(e) => setFormData({ ...formData, studying_year: e.target.value })}
              placeholder="e.g. 3rd Year"
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

          <Input
            label="Skills & Expertise"
            value={formData.skills}
            onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
            placeholder="e.g. React, TypeScript, Product Design (comma separated)"
            helperText="Separate multiple skills with commas"
          />

          <Textarea
            label="Achievements & Focus"
            value={formData.achievements}
            onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
            placeholder="e.g. Winner of Startup Hackathon 2026&#10;Launched 2 apps on Play Store (new line separated)"
            rows={3}
            helperText="Separate multiple achievements with new lines"
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