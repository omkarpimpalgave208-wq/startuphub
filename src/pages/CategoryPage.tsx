import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, FolderOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProductCard } from '../components/ProductCard';
import type { Product } from '../types';
import { api } from '../lib/api';

const categoryLabels: Record<string, string> = {
  saas: 'SaaS Products',
  mobile: 'Mobile Apps',
  ai: 'AI Tools',
  productivity: 'Productivity',
  developer: 'Developer Tools',
  design: 'Design Tools',
};

const categoryIcons: Record<string, string> = {
  saas: '⚡',
  mobile: '📱',
  ai: '🤖',
  productivity: '✅',
  developer: '💻',
  design: '🎨',
};

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const getCategoryFromPath = (): string => {
    if (slug) return slug;
    
    const path = location.pathname.toLowerCase();
    if (path.includes('saas')) return 'saas';
    if (path.includes('mobile')) return 'mobile';
    if (path.includes('ai')) return 'ai';
    
    return 'saas'; // default fallback
  };

  const categorySlug = getCategoryFromPath();

  useEffect(() => {
    fetchProducts();
  }, [categorySlug]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts({ category: categorySlug, limit: 50 });
      setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const categoryLabel = categoryLabels[categorySlug] || `${categorySlug?.charAt(0).toUpperCase()}${categorySlug?.slice(1)} Products`;
  const categoryIcon = categoryIcons[categorySlug] || '📦';

  return (
    <div className="w-full max-w-none min-w-0 px-4 md:px-0">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-4 sm:mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>

      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
          <span className="text-3xl sm:text-4xl">{categoryIcon}</span>
          {categoryLabel}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          Discover the best {categoryLabel.toLowerCase()} built by the community
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
        </div>
      ) : products.length > 0 ? (
        <div className="space-y-3 sm:space-y-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        /* Category Onboarding Empty State - NO fake data */
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <FolderOpen className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">No startups in this category yet</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto mb-6">
            Building something in this space? Launch it now and get featured.
          </p>
          <Link
            to="/launch"
            className="inline-flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors text-sm"
          >
            Launch your product
          </Link>
        </div>
      )}
    </div>
  );
}