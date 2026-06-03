import { useEffect, useState } from 'react';
import { TrendingUp, Loader2, Rocket } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProductCard } from '../components/ProductCard';
import type { Product } from '../types';
import { api } from '../lib/api';

export function TrendingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts({ trending: true, limit: 20 });
      setProducts(data);
    } catch (err) {
      console.error('Error fetching trending products:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-none min-w-0 px-4 md:px-0">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
          <TrendingUp className="w-7 h-7 sm:w-8 sm:h-8 text-orange-500" />
          Trending Products
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          The most upvoted products this week
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
        </div>
      ) : products.length > 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3 sm:space-y-4"
        >
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        /* Trending Launches Onboarding Empty State - NO fake data */
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950/40 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600">
            <Rocket className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">No products trending yet</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto">
            Explore the recent feed, upvote products you love, or launch your own to set the trend!
          </p>
        </div>
      )}
    </div>
  );
}