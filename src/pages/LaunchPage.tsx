import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Plus, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

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

export function LaunchPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    category: '',
    website_url: '',
    github_url: '',
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  
  // Real files references for direct Supabase uploads
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [screenshotsPreviews, setScreenshotsPreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadStage, setUploadStage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500 mb-4">Please sign in to launch a product</p>
        <Button onClick={() => navigate('/login')}>Sign In</Button>
      </div>
    );
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        setErrors({ logo: 'Upload a PNG, JPG, WebP, GIF, or SVG logo.' });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ logo: 'Logo exceeds 10MB size limit.' });
        return;
      }
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
      setErrors(prev => ({ ...prev, logo: '' }));
    }
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, screenshots: 'Only PNG, JPG, WebP, GIF, or SVG screenshots are allowed.' }));
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, screenshots: 'One or more screenshots exceed 10MB.' }));
        continue;
      }
      setScreenshotFiles(prev => [...prev, file]);
      setScreenshotsPreviews(prev => [...prev, URL.createObjectURL(file)]);
      setErrors(prev => ({ ...prev, screenshots: '' }));
    }
  };

  const removeScreenshot = (index: number) => {
    setScreenshotFiles(prev => prev.filter((_, i) => i !== index));
    setScreenshotsPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.tagline.trim()) newErrors.tagline = 'Tagline is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!logo) newErrors.logo = 'Product logo is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    const { data: authUserData, error: authUserError } = await supabase.auth.getUser();
    if (authUserError) {
      console.error('Supabase auth.getUser error:', authUserError);
    }

    if (!authUserData?.user) {
      setErrors({ submit: 'Please login first' });
      return;
    }

    setLoading(true);
    setUploadStage('Uploading logo...');
    setSuccessMessage('');
    setErrors(prev => ({ ...prev, submit: '' }));

    let logoUrl = '';
    if (logo) {
      try {
        logoUrl = await api.uploadFile(logo, 'logos');
      } catch (err: any) {
        console.error('Logo upload failed:', err);
        setErrors(prev => ({
          ...prev,
          logo: 'Logo upload failed. Product will be created without it.'
        }));
        logoUrl = '';
      }
    }

    const screenshotUrls: string[] = [];
    if (screenshotFiles.length > 0) {
      setUploadStage('Uploading screenshots...');
      for (const screenshot of screenshotFiles) {
        try {
          const url = await api.uploadFile(screenshot, 'screenshots');
          screenshotUrls.push(url);
        } catch (err: any) {
          console.error('Screenshot upload failed:', err);
          setErrors(prev => ({
            ...prev,
            screenshots: 'Some screenshots failed to upload. Product will be created without them.'
          }));
        }
      }
    }

    setUploadStage('Finalizing product...');
    try {
      const product = await api.createProduct({
        user_id: authUserData.user.id,
        name: formData.name,
        tagline: formData.tagline,
        description: formData.description,
        category: formData.category,
        website_url: formData.website_url,
        github_url: formData.github_url,
        logo_url: logoUrl || undefined,
        screenshots: screenshotUrls.length > 0 ? screenshotUrls : []
      });

      setSuccessMessage('Product published successfully! Redirecting...');
      navigate(`/product/${product.id}`);
    } catch (err: any) {
      const message = err?.message || 'Failed to save product. Please try again.';
      console.error('Product creation error:', err);
      setErrors({ submit: message });
    } finally {
      setLoading(false);
      setUploadStage('');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8"
      >
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
            Launch your product
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Share your startup with the world and get feedback from the community.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Product Logo *
            </label>
            <div className="flex items-center gap-4">
              <div className={`
                w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center
                ${logoPreview 
                  ? 'border-zinc-300 dark:border-zinc-700' 
                  : 'border-zinc-300 dark:border-zinc-700 hover:border-orange-500'
                }
                ${errors.logo ? 'border-red-300' : ''}
              `}>
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
                  Upload logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-zinc-500 mt-1">
                  Recommended: Max 5MB, PNG or JPG
                </p>
              </div>
            </div>
            {errors.logo && <p className="text-sm text-red-600 mt-1">{errors.logo}</p>}
          </div>

          {/* Product Name */}
          <Input
            label="Product Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="What are you building?"
            error={errors.name}
          />

          {/* Tagline */}
          <Input
            label="Tagline *"
            value={formData.tagline}
            onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
            placeholder="One-liner describing your product"
            helperText="Max 80 characters"
            maxLength={80}
            error={errors.tagline}
          />

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={`
                w-full px-3 py-2 rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white
                ${errors.category ? 'border-red-300' : 'border-zinc-300 dark:border-zinc-700'}
                focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
              `}
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat.toLowerCase()}>{cat}</option>
              ))}
            </select>
            {errors.category && <p className="text-sm text-red-600 mt-1">{errors.category}</p>}
          </div>

          {/* Description */}
          <Textarea
            label="Description *"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Tell us about your product, what problem it solves, and who it's for..."
            rows={5}
            error={errors.description}
          />

          {/* Links */}
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

          {/* Screenshots uploads */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Screenshots (Optional)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {screenshotsPreviews.map((screenshot, index) => (
                <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <img
                    src={screenshot}
                    alt={`Screenshot ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeScreenshot(index)}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <label className="aspect-video rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition-colors">
                <Plus className="w-6 h-6 text-zinc-400" />
                <span className="text-xs text-zinc-500 mt-1">Add screenshot</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleScreenshotUpload}
                  className="hidden"
                />
              </label>
            </div>
            {errors.screenshots && <p className="text-sm text-red-600 mt-1">{errors.screenshots}</p>}
          </div>

          {errors.submit && (
            <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50 p-3 text-sm text-red-700">
              {errors.submit}
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50 p-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}

          {uploadStage && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{uploadStage}</p>
          )}

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
            >
              Launch Product
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}