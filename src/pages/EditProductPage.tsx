import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Upload, X, Image as ImageIcon, Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product } from '../types';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { optimizeImageFile, needsCompression, getCompressionMessage, cropAndCompressBannerImage, formatFileSize } from '../lib/imageCompression';

const categories = [
  'SaaS',
  'Mobile App',
  'AI Tool',
  'Developer Tool',
  'Productivity',
  'Design Tool',
  'Marketing',
  'E-commerce',
  'Education',
  'Finance',
  'Health',
  'Other'
];

export function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    category: '',
    website_url: '',
    github_url: ''
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [banner, setBanner] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [bannerRemoved, setBannerRemoved] = useState(false);
  const [bannerZoom, setBannerZoom] = useState(1);
  const [bannerFocus, setBannerFocus] = useState({ x: 50, y: 50 });
  const [draggingBanner, setDraggingBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveMessage, setSaveMessage] = useState<string>('');

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const productData = await api.getProduct(id);
        setProduct(productData);
        if (productData) {
          setFormData({
            name: productData.name,
            tagline: productData.tagline,
            description: productData.description,
            category: productData.category,
            website_url: productData.website_url || '',
            github_url: productData.github_url || ''
          });
          setLogoPreview(productData.logo_url || '');
          setBannerPreview(productData.banner_image_url || '');
        }
      } catch (err) {
        console.error('Error loading product for edit:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, logo: 'Upload a PNG, JPG, WebP, GIF, or SVG logo.' }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, logo: 'Logo exceeds 10MB size limit.' }));
      return;
    }

    setLogo(file);
    setLogoPreview(URL.createObjectURL(file));
    setErrors(prev => ({ ...prev, logo: '' }));
  };

  const resetBannerAdjustments = () => {
    setBannerZoom(1);
    setBannerFocus({ x: 50, y: 50 });
  };

  const handleBannerFile = (file: File) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, banner: 'Upload a JPG, PNG, or WEBP banner image.' }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, banner: 'Banner image exceeds 10MB size limit.' }));
      return;
    }

    setBanner(file);
    setBannerPreview(URL.createObjectURL(file));
    setBannerRemoved(false);
    resetBannerAdjustments();
    setErrors(prev => ({ ...prev, banner: '' }));
    setBannerMessage('Banner ready. Adjust focus and zoom before saving.');
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleBannerFile(file);
  };

  const handleBannerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDraggingBanner(true);
  };

  const handleBannerDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDraggingBanner(false);
  };

  const handleBannerDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDraggingBanner(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleBannerFile(file);
  };

  const removeBanner = () => {
    setBanner(null);
    setBannerPreview('');
    setBannerRemoved(true);
    setErrors(prev => ({ ...prev, banner: '' }));
    resetBannerAdjustments();
    setBannerMessage('Banner removed. Upload a new banner if needed.');
  };

  const fetchImageAsFile = async (url: string, filename: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Unable to fetch existing banner image for update.');
    }
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || 'image/jpeg' });
  };

  const prepareBannerUpload = async (file: File) => {
    let fileToUpload = file;

    if (needsCompression(fileToUpload, 4)) {
      setSaveMessage(getCompressionMessage(fileToUpload.size, 4));
      const compressed = await optimizeImageFile(fileToUpload, {
        maxWidth: 1600,
        maxHeight: 900,
        maxSizeMB: 1.5,
        quality: 0.85
      });
      fileToUpload = compressed.file;
      setSaveMessage(`Compressed banner to ${formatFileSize(fileToUpload.size)}.`);
    }

    if (fileToUpload && (bannerZoom !== 1 || bannerFocus.x !== 50 || bannerFocus.y !== 50)) {
      const cropped = await cropAndCompressBannerImage(fileToUpload, {
        x: bannerFocus.x,
        y: bannerFocus.y,
        zoom: bannerZoom
      }, 16 / 6, 1600, 600, {
        maxWidth: 1600,
        maxHeight: 900,
        maxSizeMB: 1.5,
        quality: 0.85
      });
      fileToUpload = cropped.file;
      setSaveMessage(`Banner adjusted and compressed to ${formatFileSize(fileToUpload.size)}.`);
    }

    return api.uploadFile(fileToUpload, 'banners');
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.tagline.trim()) newErrors.tagline = 'Tagline is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!logo && !product?.logo_url) newErrors.logo = 'Product logo is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!validate()) return;

    const { data: authUserData, error: authUserError } = await supabase.auth.getUser();
    if (authUserError) {
      console.error('Supabase auth.getUser error:', authUserError);
    }

    if (!authUserData?.user) {
      setErrors({ submit: 'Please login first' });
      return;
    }

    if (user?.id !== product.user_id) {
      setErrors({ submit: 'You do not have permission to edit this product.' });
      return;
    }

    setSaving(true);
    setSaveMessage('');
    setErrors(prev => ({ ...prev, submit: '' }));

    let logoUrl = '';
    if (logo) {
      try {
        logoUrl = await api.uploadFile(logo, 'logos');
      } catch (err: any) {
        console.error('Logo upload failed:', err);
        setErrors(prev => ({ ...prev, logo: 'Logo upload failed. Please try again.' }));
      }
    }

    let bannerUrl = '';
    let bannerSource: File | null = banner;
    if (!bannerSource && !bannerRemoved && product.banner_image_url && (bannerZoom !== 1 || bannerFocus.x !== 50 || bannerFocus.y !== 50)) {
      try {
        bannerSource = await fetchImageAsFile(product.banner_image_url, `${product.id}-banner`);
      } catch (err: any) {
        console.error('Fetching existing banner failed:', err);
        setErrors(prev => ({ ...prev, banner: 'Unable to prepare current banner for editing.' }));
      }
    }

    if (bannerSource) {
      try {
        bannerUrl = await prepareBannerUpload(bannerSource);
      } catch (err: any) {
        console.error('Banner upload failed:', err);
        setErrors(prev => ({ ...prev, banner: 'Banner upload failed. Please try again.' }));
      }
    }

    try {
      const updates: Partial<Product> = {
        name: formData.name.trim(),
        tagline: formData.tagline.trim(),
        description: formData.description.trim(),
        category: formData.category.trim().toLowerCase(),
        website_url: formData.website_url.trim() || null,
        github_url: formData.github_url.trim() || null
      };

      if (logoUrl) updates.logo_url = logoUrl;
      if (bannerUrl) updates.banner_image_url = bannerUrl;
      if (bannerRemoved && product.banner_image_url) updates.banner_image_url = null;

      await api.updateProduct(product.id, updates);
      setSaveMessage('Product updated successfully. Redirecting...');
      navigate(`/product/${product.id}`);
    } catch (err: any) {
      console.error('Update failed:', err);
      setErrors({ submit: err?.message || 'Unable to save changes. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500 mb-4">Please sign in to edit this product.</p>
        <Button onClick={() => navigate('/login')}>Sign In</Button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">Product not found</p>
        <Link to="/" className="text-orange-500 hover:underline mt-2 inline-block">Go home</Link>
      </div>
    );
  }

  if (user.id !== product.user_id) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">You do not have permission to edit this product.</p>
        <Link to={`/product/${product.id}`} className="text-orange-500 hover:underline mt-2 inline-block">Back to product</Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none min-w-0 md:max-w-3xl md:mx-auto px-4 md:px-0">
      <Link
        to={`/product/${product.id}`}
        className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to product
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8"
      >
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
            Edit product
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Update your product logo, banner, and launch details.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Product Logo
            </label>
            <div className="flex items-center gap-4">
              <div className={
                `w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center
                ${logoPreview ? 'border-zinc-300 dark:border-zinc-700' : 'border-zinc-300 dark:border-zinc-700 hover:border-orange-500'}
                ${errors.logo ? 'border-red-300' : ''}`
              }>
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-zinc-400" />
                )}
              </div>
              <div>
                <label className="inline-flex items-center px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                  <Upload className="w-4 h-4 mr-2" />
                  Replace logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-zinc-500 mt-1">Recommended: Max 10MB, PNG or JPG</p>
              </div>
            </div>
            {errors.logo && <p className="text-sm text-red-600 mt-1">{errors.logo}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Product Banner Image
            </label>
            <div className="flex flex-col gap-4">
              <div
                onDragOver={handleBannerDragOver}
                onDragLeave={handleBannerDragLeave}
                onDrop={handleBannerDrop}
                className={
                  `rounded-3xl border-2 border-dashed overflow-hidden bg-zinc-100 dark:bg-zinc-800 transition-colors
                  ${draggingBanner ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : 'border-zinc-300 dark:border-zinc-700'}
                  ${errors.banner ? 'border-red-300' : ''}`
                }
                style={{ minHeight: 160 }}
              >
                {bannerPreview ? (
                  <div className="relative h-full w-full overflow-hidden bg-black/5">
                    <img
                      src={bannerPreview}
                      alt="Banner preview"
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{
                        objectPosition: `${bannerFocus.x}% ${bannerFocus.y}%`,
                        transform: `scale(${bannerZoom})`
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    <button
                      type="button"
                      onClick={removeBanner}
                      className="absolute right-3 top-3 rounded-full bg-black/60 text-white p-2 hover:bg-black/80 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center text-zinc-500">
                    <ImageIcon className="w-8 h-8" />
                    <p className="text-sm font-medium">Drag & drop a banner or click to upload</p>
                    <p className="text-xs">JPG, PNG, or WEBP up to 10MB</p>
                  </div>
                )}
              </div>

              {bannerPreview && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Zoom</label>
                    <input
                      type="range"
                      min={1}
                      max={2}
                      step={0.05}
                      value={bannerZoom}
                      onChange={(e) => setBannerZoom(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-zinc-500">Adjust focus zoom</p>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Horizontal focus</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={bannerFocus.x}
                      onChange={(e) => setBannerFocus(prev => ({ ...prev, x: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Vertical focus</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={bannerFocus.y}
                      onChange={(e) => setBannerFocus(prev => ({ ...prev, y: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 flex-wrap">
                <label className="inline-flex items-center px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                  <Upload className="w-4 h-4 mr-2" />
                  {bannerPreview ? 'Replace banner' : 'Upload banner'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleBannerChange}
                    className="hidden"
                  />
                </label>
                {bannerPreview && (
                  <button
                    type="button"
                    onClick={removeBanner}
                    className="text-sm font-semibold text-red-600 hover:text-red-700"
                  >
                    Remove banner
                  </button>
                )}
              </div>
            </div>
            {(errors.banner || bannerMessage) && (
              <p className={
                `mt-2 text-sm ${errors.banner ? 'text-red-600' : 'text-zinc-500 dark:text-zinc-400'}`
              }>{errors.banner || bannerMessage}</p>
            )}
          </div>

          <Input
            label="Product Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Product name"
            error={errors.name}
          />

          <Input
            label="Tagline *"
            value={formData.tagline}
            onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
            placeholder="One-liner describing your product"
            error={errors.tagline}
          />

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={
                `w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white
                ${errors.category ? 'border-red-300' : 'border-zinc-300 dark:border-zinc-700'}
                focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500`
            }
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat.toLowerCase()}>{cat}</option>
              ))}
            </select>
            {errors.category && <p className="text-sm text-red-600 mt-1">{errors.category}</p>}
          </div>

          <Textarea
            label="Description *"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Tell us about your product, what problem it solves, and who it's for..."
            rows={5}
            error={errors.description}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Website URL"
              type="url"
              value={formData.website_url}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              placeholder="https://..."
            />
            <Input
              label="GitHub URL"
              type="url"
              value={formData.github_url}
              onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
              placeholder="https://github.com/..."
            />
          </div>

          {errors.submit && (
            <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 p-3 text-sm text-red-700">
              {errors.submit}
            </div>
          )}

          {saveMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50 p-3 text-sm text-emerald-700">
              {saveMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button type="button" variant="ghost" onClick={() => navigate(`/product/${product.id}`)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
