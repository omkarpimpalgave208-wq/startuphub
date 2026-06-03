import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { ProductCard } from '../components/ProductCard';
import type { Bookmark as BookmarkType } from '../types';
import { api } from '../lib/api';

export function BookmarksPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBookmarks();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchBookmarks = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = await api.getBookmarks(user.id);
      setBookmarks(data);
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">Please sign in to view your bookmarks</p>
        <button 
          onClick={() => navigate('/login')} 
          className="text-orange-500 hover:underline font-semibold mt-2 inline-block bg-transparent border-0 cursor-pointer"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none min-w-0 md:max-w-6xl md:mx-auto px-4 md:px-0">
      <Link
        to="/"
        className="hidden md:inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to feed
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <Bookmark className="w-6 h-6 text-orange-500" />
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Your Bookmarks
        </h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
        </div>
      ) : bookmarks.length > 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {bookmarks.map((bookmark) => (
            bookmark.products && (
              <ProductCard key={bookmark.id} product={bookmark.products} />
            )
          ))}
        </motion.div>
      ) : (
        /* Bookmarks Onboarding Empty State - NO fake data */
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <Bookmark className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <p className="text-zinc-500 font-medium">No bookmarks yet</p>
          <p className="text-sm text-zinc-400 mt-1">
            Products you bookmark will appear here
          </p>
          <Link
            to="/"
            className="inline-block mt-4 text-orange-500 hover:text-orange-600 font-medium"
          >
            Explore startups
          </Link>
        </div>
      )}
    </div>
  );
}