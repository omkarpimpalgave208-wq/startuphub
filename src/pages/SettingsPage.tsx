/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { Loader2, Camera } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { VerificationSection } from '../components/VerificationSection';
import { Avatar } from '../components/ui/Avatar';
import { api } from '../lib/api';
import { optimizeImageFile, needsCompression, formatFileSize } from '../lib/imageCompression';
import { CoverEditorModal } from '../components/CoverEditorModal';
import { BannerImage } from '../components/BannerImage';

const PROFILE_COVER_KEY = (id: string) => `startuphub_cover_${id}`;
const PROFILE_COVER_STYLE_KEY = (id: string) => `startuphub_cover_style_${id}`;
const PROFILE_COVER_ZOOM_KEY = (id: string) => `startuphub_cover_zoom_${id}`;
const PROFILE_COVER_FOCUS_KEY = (id: string) => `startuphub_cover_focus_${id}`;

const coverStyles = [
  { id: 'gradient-1', label: 'Evening Glow', className: 'from-slate-950 via-indigo-700 to-violet-500' },
  { id: 'gradient-2', label: 'Aqua Spark', className: 'from-sky-500 via-cyan-500 to-violet-500' },
  { id: 'gradient-3', label: 'Sunset Burst', className: 'from-orange-500 via-fuchsia-500 to-blue-500' }
] as const;

const SHOW_VERIFICATION_FEATURE = false;

export function SettingsPage() {
  const { user, profile, fetchProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [bannerStyle, setBannerStyle] = useState<string>('gradient-1');
  const [bannerZoom, setBannerZoom] = useState<number>(1.0);
  const [bannerPositionX, setBannerPositionX] = useState<number>(0.5);
  const [bannerPositionY, setBannerPositionY] = useState<number>(0.35);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
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
      
      const dbCover = profile.banner_url || storedCover || '';
      const dbStyle = profile.banner_style || storedCoverStyle || 'gradient-1';
      
      setBannerPreview(dbCover);
      setBannerStyle(dbStyle);

      // Load zoom and position metadata (database takes precedence)
      const zoomVal = profile.banner_zoom !== null && profile.banner_zoom !== undefined
        ? profile.banner_zoom
        : parseFloat(localStorage.getItem(PROFILE_COVER_ZOOM_KEY(profile.id)) || '1.0');

      const posXVal = profile.banner_position_x !== null && profile.banner_position_x !== undefined
        ? profile.banner_position_x
        : parseFloat(localStorage.getItem(PROFILE_COVER_FOCUS_KEY(profile.id))?.split(',')[0] || '0.5');

      const posYVal = profile.banner_position_y !== null && profile.banner_position_y !== undefined
        ? profile.banner_position_y
        : parseFloat(localStorage.getItem(PROFILE_COVER_FOCUS_KEY(profile.id))?.split(',')[1] || '0.35');

      setBannerZoom(zoomVal);
      setBannerPositionX(posXVal);
      setBannerPositionY(posYVal);
    }
  }, [profile]);

  const saveCoverState = (
    coverUrl: string | null,
    styleId: string,
    zoom: number = 1.0,
    posX: number = 0.5,
    posY: number = 0.35
  ) => {
    if (!user) return;
    if (coverUrl) {
      localStorage.setItem(PROFILE_COVER_KEY(user.id), coverUrl);
      localStorage.setItem(PROFILE_COVER_ZOOM_KEY(user.id), zoom.toString());
      localStorage.setItem(PROFILE_COVER_FOCUS_KEY(user.id), `${posX},${posY}`);
    } else {
      localStorage.removeItem(PROFILE_COVER_KEY(user.id));
      localStorage.removeItem(PROFILE_COVER_ZOOM_KEY(user.id));
      localStorage.removeItem(PROFILE_COVER_FOCUS_KEY(user.id));
    }
    localStorage.setItem(PROFILE_COVER_STYLE_KEY(user.id), styleId);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setLoading(true);
    setUploadMessage('');
    
    try {
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        setUploadMessage('Unsupported file type. Please upload a PNG, JPG, WebP, GIF, or SVG image.');
        setLoading(false);
        return;
      }

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
        } catch (compressionErr: any) {
          console.error('[SettingsPage] Compression failed:', compressionErr);
          setUploadMessage(`Compression failed: ${compressionErr?.message || 'Please try again.'}`);
          setLoading(false);
          return;
        }
      }

      const publicUrl = await api.uploadFile(fileToUpload, 'avatars');
      setAvatarPreview(publicUrl);
      await api.updateProfile(user.id, { avatar_url: publicUrl });
      await fetchProfile(user.id);
      setUploadMessage('✓ Avatar updated successfully.');
    } catch (err: any) {
      const message = err?.message || 'Avatar upload failed. Please try again.';
      setUploadMessage(`✗ Error: ${message}`);
      console.error('[SettingsPage] Avatar upload error:', message);
    } finally {
      setLoading(false);
    }
  };

  const checkImageResolution = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
          reject(new Error('Failed to load image file.'));
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file.'));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleBannerChange = async (file: File) => {
    if (!user) return;
    setBannerMessage('');

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setBannerMessage('Unsupported banner type. Use PNG, JPG, or WebP.');
      return;
    }

    setLoading(true);
    try {
      setBannerMessage('Checking image resolution...');
      const dimensions = await checkImageResolution(file).catch(() => ({ width: 1500, height: 500 }));


      let fileToUpload = file;
      const maxSizeMB = 4; // Banners are larger for high quality

      if (needsCompression(file, maxSizeMB)) {
        setBannerMessage(`File is ${formatFileSize(file.size)}. Compressing...`);
        try {
          const { file: compressedFile, originalSize, compressedSize } = await optimizeImageFile(file, {
            maxWidth: 2400,
            maxHeight: 1600,
            maxSizeMB: 3.5,
            quality: 0.90
          });
          fileToUpload = compressedFile;
          console.log(`[SettingsPage] Banner compressed: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)}`);
        } catch (compressionErr: any) {
          console.error('[SettingsPage] Banner compression failed:', compressionErr);
        }
      }

      setBannerMessage('Uploading cover photo...');
      const publicUrl = await api.uploadFile(fileToUpload, 'banners');
      setBannerPreview(publicUrl);

      // Smart default focal point (50% horizontal, 35% vertical)
      const defaultZoom = 1.0;
      const defaultPosX = 0.5;
      const defaultPosY = 0.35;

      saveCoverState(publicUrl, bannerStyle, defaultZoom, defaultPosX, defaultPosY);
      
      setBannerZoom(defaultZoom);
      setBannerPositionX(defaultPosX);
      setBannerPositionY(defaultPosY);

      await api.updateProfile(user.id, {
        banner_url: publicUrl,
        banner_zoom: defaultZoom,
        banner_position_x: defaultPosX,
        banner_position_y: defaultPosY,
        original_image_width: dimensions.width,
        original_image_height: dimensions.height
      });

      await fetchProfile(user.id);
      setBannerMessage('✓ Cover photo uploaded successfully. Adjust position below.');
      setIsEditorOpen(true);
    } catch (err: any) {
      console.error('Banner upload failed:', err);
      const message = err?.message || 'Banner upload failed. Please try again.';
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

  const handleStyleChange = async (styleId: string) => {
    setBannerStyle(styleId);
    saveCoverState(bannerPreview || null, styleId, bannerZoom, bannerPositionX, bannerPositionY);
    if (user) {
      try {
        await api.updateProfile(user.id, { banner_style: styleId });
      } catch (err) {
        console.error('[SettingsPage] Failed to update banner style in DB:', err);
      }
    }
  };

  const handleSaveCoverPosition = async (newZoom: number, newPosX: number, newPosY: number) => {
    if (!user) return;
    saveCoverState(bannerPreview || null, bannerStyle, newZoom, newPosX, newPosY);
    setBannerZoom(newZoom);
    setBannerPositionX(newPosX);
    setBannerPositionY(newPosY);

    try {
      await api.updateProfile(user.id, {
        banner_zoom: newZoom,
        banner_position_x: newPosX,
        banner_position_y: newPosY
      });
      await fetchProfile(user.id);
    } catch (err) {
      console.error('[SettingsPage] Save cover position failed:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
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
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Save settings error:', err);
      setSaveError(err?.message || 'Failed to save changes. Please try again.');
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
    <div className="max-w-3xl mx-auto space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">Profile Details</h2>
          
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
        {SHOW_VERIFICATION_FEATURE && <VerificationSection />}

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
            {saveError && (
              <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-400">
                ✗ {saveError}
              </div>
            )}
            {saveSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 p-3 text-sm text-emerald-700 dark:text-emerald-400">
                ✓ Profile saved successfully!
              </div>
            )}
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                loading={saving}
              >
                Save Changes
              </Button>
            </div>
            </div>
          </div>
        </form>
        {/* Cover Position Editor Modal */}
        {bannerPreview && (
          <CoverEditorModal
            isOpen={isEditorOpen}
            onClose={() => setIsEditorOpen(false)}
            imageUrl={bannerPreview}
            initialZoom={bannerZoom}
            initialPositionX={bannerPositionX}
            initialPositionY={bannerPositionY}
            onSave={handleSaveCoverPosition}
          />
        )}
      </div>
    );
}