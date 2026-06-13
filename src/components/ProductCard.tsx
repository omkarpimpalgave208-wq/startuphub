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
      setHasUpvoted(previousUpvoted);
      setUpvotes(prev => prev + (previousUpvoted ? 1 : -1));
    } finally {
      setIsLoading(false);
    }
  };

  // Helper: Dynamically infer startup stage based on upvotes
  const getStartupStage = (upvoteCount: number) => {
    if (upvoteCount <= 5) return 'Idea';
    if (upvoteCount <= 15) return 'MVP';
    if (upvoteCount <= 30) return 'Beta';
    return 'Revenue';
  };

  // Helper: Generate stable looking-for tags based on startup name
  const getLookingForTags = (name: string) => {
    const rolesList = [
      ['Co-Founder', 'Developer'],
      ['Designer', 'Developer'],
      ['Marketer', 'Co-Founder'],
      ['Developer', 'Designer'],
      ['Marketer', 'Developer']
    ];
    const index = name.charCodeAt(0) % rolesList.length;
    return rolesList[index];
  };

  const stage = getStartupStage(upvotes);
  const lookingFor = getLookingForTags(product.name);
  const founderName = product.profiles?.full_name || product.profiles?.username || 'Founder';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="group w-full h-full"
    >
      <Link to={`/product/${product.id}`} className="block w-full h-full">
        <div className={`
          w-full h-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80
          hover:border-orange-500/30 dark:hover:border-orange-500/30
          shadow-sm hover:shadow-xl dark:shadow-none hover:shadow-orange-500/5
          transition-all duration-200
          flex flex-col
          ${featured ? 'p-6 sm:p-8' : 'p-5 sm:p-6'}
        `}>
          <div className="flex gap-4 sm:gap-5 w-full min-w-0 items-stretch flex-1">
            
            {/* Logo */}
            <div className={`
              flex-shrink-0 self-start rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200/40 dark:border-zinc-800
              ${featured ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-12 h-12 sm:w-16 sm:h-16'}
            `}>
              {product.logo_url ? (
                <img
                  src={product.logo_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl sm:text-2xl font-black text-zinc-400 dark:text-zinc-500">
                  {product.name[0]}
                </span>
              )}
            </div>

            {/* Content Info */}
            <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`
                        font-bold text-zinc-900 dark:text-white truncate group-hover:text-orange-500 transition-colors
                        ${featured ? 'text-lg sm:text-2xl' : 'text-base sm:text-lg'}
                      `}>
                        {product.name}
                      </h3>
                      
                      {/* Stage Badge */}
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${
                        stage === 'Idea' ? 'bg-orange-500/10 text-orange-500' :
                        stage === 'MVP' ? 'bg-blue-500/10 text-blue-500' :
                        stage === 'Beta' ? 'bg-purple-500/10 text-purple-500' :
                        'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {stage}
                      </span>
                    </div>
                    
                    <p className={`
                      text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed
                      ${featured ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'}
                    `}>
                      {product.tagline}
                    </p>
                  </div>

                  {/* Snappy upvote button */}
                  <button
                    onClick={handleUpvote}
                    className={`
                      flex-shrink-0 flex flex-col items-center gap-0.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 rounded-xl
                      border transition-all duration-200 cursor-pointer
                      ${hasUpvoted
                        ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-orange-500 hover:text-orange-500'
                      }
                    `}
                  >
                    <ChevronUp className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" />
                    <span className="text-xs sm:text-sm font-bold">{upvotes}</span>
                  </button>
                </div>

                {/* Looking For Tags */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {lookingFor.map((role) => (
                    <span key={role} className="px-2 py-0.5 rounded bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/40 dark:border-zinc-800 text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card Footer */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            {product.profiles && (
              <div className="flex items-center gap-2 min-w-0">
                <Avatar
                  src={product.profiles.avatar_url}
                  alt={founderName}
                  size="md"
                  className="lg:w-12 lg:h-12 lg:min-w-[48px] lg:min-h-[48px]"
                />
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                  {founderName}
                </span>
              </div>
            )}

            <Badge variant="outline" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-zinc-50/50 dark:bg-zinc-950/20 py-0.5 px-2 border-zinc-200/60 dark:border-zinc-800 text-zinc-500">
              {product.category}
            </Badge>

            <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 text-xs font-bold ml-auto flex-shrink-0">
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{product.comments?.[0]?.count || 0}</span>
            </div>

            {product.website_url && (
              <a
                href={product.website_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center w-7 h-7 rounded-lg border border-zinc-200/50 dark:border-zinc-800 hover:border-orange-500 text-zinc-400 hover:text-orange-500 transition-colors flex-shrink-0 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}