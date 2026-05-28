import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, ExternalLink, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product } from '../types';
import { Avatar } from './ui/Avatar';
import { Badge } from './ui/Badge';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';

interface ProductCardProps {
  product: Product;
  featured?: boolean;
}

export function ProductCard({ product, featured = false }: ProductCardProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [upvotes, setUpvotes] = useState(product.upvote_count || 0);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && product.id) {
      api.getUpvotes({ user_id: user.id, product_id: product.id })
        .then(data => {
          setHasUpvoted(data.length > 0);
        })
        .catch(err => console.error('Error checking upvote status:', err));
    } else {
      setHasUpvoted(false);
    }
  }, [user, product.id]);

  const handleUpvote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      navigate('/login');
      return;
    }

    if (isLoading) return;
    setIsLoading(true);

    // Snappy optimistic upvote increment/decrement in the UI
    const previousUpvoted = hasUpvoted;
    setHasUpvoted(!previousUpvoted);
    setUpvotes(prev => prev + (previousUpvoted ? -1 : 1));
    
    try {
      if (previousUpvoted) {
        await api.removeUpvote(user.id, product.id);
      } else {
        await api.addUpvote(user.id, product.id);
      }
    } catch (err) {
      console.error('Failed to update upvote:', err);
      // Rollback UI to previous counts on failure
      setHasUpvoted(previousUpvoted);
      setUpvotes(prev => prev + (previousUpvoted ? 1 : -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="group w-full"
    >
      <Link to={`/product/${product.id}`} className="block w-full">
        <div className={`
          w-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800
          hover:border-orange-500/30 dark:hover:border-orange-500/30
          hover:shadow-lg hover:shadow-orange-500/5
          transition-all duration-200
          ${featured ? 'p-4 sm:p-6' : 'p-3 sm:p-4'}
        `}>
          <div className="flex gap-3 sm:gap-4 w-full min-w-0">
            {/* Logo */}
            <div className={`
              flex-shrink-0 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800
              ${featured ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-12 h-12 sm:w-16 sm:h-16'}
            `}>
              {product.logo_url ? (
                <img
                  src={product.logo_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xl sm:text-2xl font-bold text-zinc-400">
                    {product.name[0]}
                  </span>
                </div>
              )}
            </div>

            {/* Content info */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-start justify-between gap-2 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className={`
                    font-semibold text-zinc-900 dark:text-white truncate
                    ${featured ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'}
                  `}>
                    {product.name}
                  </h3>
                  <p className={`
                    text-zinc-600 dark:text-zinc-400 mt-0.5 line-clamp-2
                    ${featured ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'}
                  `}>
                    {product.tagline}
                  </p>
                </div>

                {/* Snappy upvote button */}
                <button
                  onClick={handleUpvote}
                  className={`
                    flex-shrink-0 flex flex-col items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg
                    border transition-all duration-200
                    ${hasUpvoted
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-orange-500 hover:text-orange-500'
                    }
                  `}
                >
                  <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm font-semibold">{upvotes}</span>
                </button>
              </div>

              {/* Footer parameters */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 sm:mt-3">
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {product.category}
                </Badge>

                {product.profiles && (
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <Avatar
                      src={product.profiles.avatar_url}
                      alt={product.profiles.full_name || product.profiles.username}
                      size="xs"
                    />
                    <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 truncate">
                      {product.profiles.full_name || product.profiles.username}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-500 text-xs sm:text-sm ml-auto flex-shrink-0">
                  <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{product.comments?.[0]?.count || 0}</span>
                </div>

                {product.website_url && (
                  <a
                    href={product.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-zinc-500 hover:text-orange-500 text-xs sm:text-sm transition-colors flex-shrink-0"
                  >
                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}