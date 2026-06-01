import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Package, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product, Profile, Discussion } from '../types';
import { api } from '../lib/api';

interface SearchModalProps {
  onClose: () => void;
}

export function SearchModal({ onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ products: Product[]; profiles: Profile[]; discussions: Discussion[] }>({ products: [], profiles: [], discussions: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const search = async () => {
      if (query.trim().length < 2) {
        setResults({ products: [], profiles: [], discussions: [] });
        return;
      }

      setLoading(true);
      try {
        const searchResults = await api.searchAll(query);
        setResults(searchResults);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(search, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const hasResults = results.products.length > 0 || results.profiles.length > 0 || results.discussions.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden max-h-[80vh]">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <Search className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, makers, discussions..."
            className="flex-1 min-w-0 bg-transparent text-base sm:text-lg text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none"
          />
          {loading && <Loader2 className="w-5 h-5 text-zinc-400 animate-spin flex-shrink-0" />}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex-shrink-0"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Search Results list */}
        <div className="overflow-y-auto max-h-[50vh] sm:max-h-[60vh]">
          {query.trim().length >= 2 && !hasResults && !loading && (
            <div className="px-4 py-8 text-center text-zinc-500">
              No results found for &quot;{query}&quot;
            </div>
          )}

          {results.products.length > 0 && (
            <div className="py-2">
              <h3 className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Products
              </h3>
              {results.products.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    {product.logo_url ? (
                      <img src={product.logo_url} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Package className="w-5 h-5 text-zinc-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-white truncate">
                      {product.name}
                    </p>
                    <p className="text-sm text-zinc-500 truncate">{product.tagline}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {results.profiles.length > 0 && (
            <div className="py-2 border-t border-zinc-200 dark:border-zinc-800">
              <h3 className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Makers
              </h3>
              {results.profiles.map((profile) => (
                <Link
                  key={profile.id}
                  to={`/profile/${profile.username}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                    {(profile.full_name || profile.username)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-white truncate">
                      {profile.full_name || profile.username}
                    </p>
                    <p className="text-sm text-zinc-500 truncate">@{profile.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {results.discussions.length > 0 && (
            <div className="py-2 border-t border-zinc-200 dark:border-zinc-800">
              <h3 className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Discussions
              </h3>
              {results.discussions.map((discussion) => (
                <Link
                  key={discussion.id}
                  to={`/discussion/${discussion.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-white truncate">
                      {discussion.title}
                    </p>
                    <p className="text-sm text-zinc-500 truncate">{discussion.category}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer controls guide */}
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}