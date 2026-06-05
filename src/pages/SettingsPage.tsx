import { useState, useEffect } from 'react';
import { Loader2, Camera } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Avatar } from '../components/ui/Avatar';
import { api } from '../lib/api';
import { optimizeImageFile, needsCompression, formatFileSize, cropAndCompressBannerImage } from '../lib/imageCompression';

const PROFILE_COVER_KEY = (id: string) => `startuphub_cover_${id}`;
const PROFILE_COVER_STYLE_KEY = (id: string) => `startuphub_cover_style_${id}`;
const PROFILE_COVER_ZOOM_KEY = (id: string) => `startuphub_cover_zoom_${id}`;
const PROFILE_COVER_FOCUS_KEY = (id: string) => `startuphub_cover_focus_${id}`;

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

  // Banner Crop States
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState<string>('');
  const [cropZoom, setCropZoom] = useState(1);
  const [zoomMinLimit, setZoomMinLimit] = useState(1);
  const [cropFocus, setCropFocus] = useState({ x: 50, y: 50 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [focusStart, setFocusStart] = useState({ x: 50, y: 50 });

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

  const saveCoverState = (coverUrl: string | null, styleId: string, zoom = 1, focus = { x: 50, y: 50 }) => {
    if (!user) return;
    if (coverUrl) {
      localStorage.setItem(PROFILE_COVER_KEY(user.id), coverUrl);
      localStorage.setItem(PROFILE_COVER_ZOOM_KEY(user.id), String(zoom));
      localStorage.setItem(PROFILE_COVER_FOCUS_KEY(user.id), JSON.stringify(focus));
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

    // Instead of immediately uploading, open the crop editor modal with computed scale
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = objectUrl;
    img.onload = () => {
      const imgWidth = img.naturalWidth || img.width;
      const imgHeight = img.naturalHeight || img.height;
      const imgAspect = imgWidth / imgHeight;
      const containerAspect = 4; // 4:1

      let initialZoom = 1;
      if (imgAspect > containerAspect) {
        // Image is wider than container: fit to width
        initialZoom = containerAspect / imgAspect;
      } else {
        // Image is taller than container: fit to height
        initialZoom = imgAspect / containerAspect;
      }

      setSelectedBannerFile(file);
      setCropPreviewUrl(objectUrl);
      setCropZoom(initialZoom);
      setZoomMinLimit(initialZoom);
      setCropFocus({ x: 50, y: 50 });
      setCropModalOpen(true);
    };
    img.onerror = () => {
      setBannerMessage('Failed to load image for cropping.');
      URL.revokeObjectURL(objectUrl);
    };
  };

  const fetchImageAsFile = async (url: string, filename: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Unable to fetch existing banner image for update.');
    }
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || 'image/jpeg' });
  };

  const handleEditPlacement = async () => {
    if (!user || !bannerPreview) return;
    setLoading(true);
    setBannerMessage('Preparing cover photo for repositioning...');
    try {
      const file = await fetchImageAsFile(bannerPreview, 'current-banner.jpg');
      const objectUrl = bannerPreview;
      
      const img = new Image();
      img.src = objectUrl;
      img.onload = () => {
        const imgWidth = img.naturalWidth || img.width;
        const imgHeight = img.naturalHeight || img.height;
        const imgAspect = imgWidth / imgHeight;
        const containerAspect = 4; // 4:1

        let initialZoom = 1;
        if (imgAspect > containerAspect) {
          initialZoom = containerAspect / imgAspect;
        } else {
          initialZoom = imgAspect / containerAspect;
        }

        setSelectedBannerFile(file);
        setCropPreviewUrl(objectUrl);
        setZoomMinLimit(initialZoom);

        const storedZoom = localStorage.getItem(PROFILE_COVER_ZOOM_KEY(user.id));
        const storedFocus = localStorage.getItem(PROFILE_COVER_FOCUS_KEY(user.id));

        setCropZoom(storedZoom ? Number(storedZoom) : initialZoom);
        setCropFocus(storedFocus ? JSON.parse(storedFocus) : { x: 50, y: 50 });
        setCropModalOpen(true);
        setBannerMessage('');
        setLoading(false);
      };
      img.onerror = () => {
        throw new Error('Failed to load image dimensions.');
      };
    } catch (err: any) {
      console.error('Failed to prepare banner for repositioning:', err);
      setBannerMessage('Unable to prepare current banner. Please try uploading the image file again.');
      setLoading(false);
    }
  };

  const handleCropSave = async () => {
    if (!user || !selectedBannerFile) return;
    setLoading(true);
    setCropModalOpen(false);
    setBannerMessage('Cropping, compressing, and uploading banner...');

    try {
      // Crop and compress using focus coordinates (aspect ratio 4:1)
      const cropped = await cropAndCompressBannerImage(
        selectedBannerFile,
        {
          x: cropFocus.x,
          y: cropFocus.y,
          zoom: cropZoom
        },
        4 / 1, // Aspect ratio 4:1
        1600, // outputWidth
        400, // outputHeight
        {
          maxWidth: 1600,
          maxHeight: 400,
          maxSizeMB: 1.5,
          quality: 0.85
        }
      );

      const publicUrl = await api.uploadFile(cropped.file, 'covers');
      setBannerPreview(publicUrl);
      saveCoverState(publicUrl, bannerStyle, cropZoom, cropFocus);
      setBannerMessage('✓ Cover photo updated successfully.');
    } catch (err: any) {
      console.error('Crop and upload failed:', err);
      const message = err?.message || 'Crop or upload failed. Please try again.';
      setBannerMessage(`✗ Error: ${message}`);
    } finally {
      setLoading(false);
      if (cropPreviewUrl && cropPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(cropPreviewUrl);
      }
      setCropPreviewUrl('');
      setSelectedBannerFile(null);
    }
  };

  const handleCropCancel = () => {
    setCropModalOpen(false);
    if (cropPreviewUrl && cropPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(cropPreviewUrl);
    }
    setCropPreviewUrl('');
    setSelectedBannerFile(null);
    setBannerMessage('Banner upload cancelled.');
  };

  // Click-to-drag mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDraggingImage(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setFocusStart({ x: cropFocus.x, y: cropFocus.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingImage) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    const container = e.currentTarget;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Scale delta based on zoom factor
    const sensitivity = 100 / cropZoom;
    
    const newX = focusStart.x - (deltaX / width) * sensitivity;
    const newY = focusStart.y - (deltaY / height) * sensitivity;
    
    setCropFocus({
      x: Math.max(0, Math.min(100, newX)),
      y: Math.max(0, Math.min(100, newY))
    });
  };

  const handleMouseUp = () => {
    setIsDraggingImage(false);
  };

  // Touch-drag handlers for mobile screens
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    setIsDraggingImage(true);
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setFocusStart({ x: cropFocus.x, y: cropFocus.y });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingImage || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - dragStart.x;
    const deltaY = e.touches[0].clientY - dragStart.y;
    
    const container = e.currentTarget;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    const sensitivity = 100 / cropZoom;
    
    const newX = focusStart.x - (deltaX / width) * sensitivity;
    const newY = focusStart.y - (deltaY / height) * sensitivity;
    
    setCropFocus({
      x: Math.max(0, Math.min(100, newX)),
      y: Math.max(0, Math.min(100, newY))
    });
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
             <div className="flex gap-2">
              {bannerPreview && !bannerPreview.startsWith('data:image') && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleEditPlacement}
                  loading={loading}
                >
                  Reposition Cover
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => { setBannerPreview(''); saveCoverState(null, bannerStyle); }}>
                Reset Cover
              </Button>
            </div>
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
              <div className="mx-auto h-48 w-full rounded-3xl overflow-hidden bg-zinc-950 relative">
                {/* Cover preview showing cropped result cover-fit */}
                <img
                  src={bannerPreview}
                  alt="Cover preview"
                  className="absolute inset-0 w-full h-full object-cover object-center"
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

      {/* Crop Modal */}
      {cropModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 max-w-4xl w-full shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Crop & Reposition Banner</h3>
              <p className="text-sm text-zinc-500">Drag the image to adjust its crop position or use the zoom slider below.</p>
            </div>

            {/* Simulation Wrapper (Allows avatar to overflow banner preview) */}
            <div className="relative pb-10 md:pb-12">
              <div 
                className="w-full aspect-[4/1] rounded-2xl overflow-hidden relative bg-zinc-955 cursor-grab active:cursor-grabbing select-none touch-none border border-zinc-200 dark:border-zinc-800 shadow-inner"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
              >
                {/* Sharp high-quality foreground image */}
                <img
                  src={cropPreviewUrl}
                  alt="Reposition banner preview"
                  className="absolute inset-0 h-full w-full object-cover origin-center pointer-events-none select-none"
                  style={{
                    objectPosition: `${cropFocus.x}% ${cropFocus.y}%`,
                    transform: `scale(${cropZoom})`
                  }}
                />
                
                {/* Guidelines grid overlay */}
                <div className="absolute inset-0 border border-white/20 pointer-events-none flex flex-col justify-between">
                  <div className="border-b border-dashed border-white/10 h-1/3 w-full" />
                  <div className="border-b border-dashed border-white/10 h-1/3 w-full" />
                </div>

                {/* Instruction Badge */}
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur text-white px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  Drag to reposition cover photo
                </div>
              </div>

              {/* Profile Avatar simulation overlay (LinkedIn style) */}
              <div className="absolute left-6 md:left-10 bottom-2 md:bottom-0 z-20 pointer-events-none">
                <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-4 border-white dark:border-zinc-900 shadow-2xl bg-zinc-100 overflow-hidden">
                  <Avatar src={avatarPreview} alt={formData.full_name || formData.username} className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            {/* Crop Controls */}
            <div className="space-y-4">
              {/* Zoom Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-semibold text-zinc-650 dark:text-zinc-400">
                  <span>Zoom level</span>
                  <span>{Math.round((cropZoom / zoomMinLimit) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={zoomMinLimit}
                  max={Math.max(3, zoomMinLimit * 3)}
                  step={0.01}
                  value={cropZoom}
                  onChange={(e) => setCropZoom(Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-orange-500 dark:bg-zinc-800"
                />
              </div>

              {/* Offset Fine Tuning Controls */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-zinc-650 dark:text-zinc-400">
                    <span>Horizontal Position</span>
                    <span>{Math.round(cropFocus.x)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(cropFocus.x)}
                    onChange={(e) => setCropFocus(prev => ({ ...prev, x: Number(e.target.value) }))}
                    className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-orange-500 dark:bg-zinc-800"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-zinc-650 dark:text-zinc-400">
                    <span>Vertical Position</span>
                    <span>{Math.round(cropFocus.y)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(cropFocus.y)}
                    onChange={(e) => setCropFocus(prev => ({ ...prev, y: Number(e.target.value) }))}
                    className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-orange-500 dark:bg-zinc-800"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <Button type="button" variant="ghost" onClick={handleCropCancel} className="text-xs py-2 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                Cancel
              </Button>
              <Button type="button" variant="primary" onClick={handleCropSave} className="text-xs py-2 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold">
                Apply Crop & Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}