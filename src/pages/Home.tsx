import { useEffect, useState } from 'react';
import { TrendingUp, Clock, Star, ChevronRight, Rocket, MessageSquarePlus } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { DiscussionCard } from '../components/DiscussionCard';
import type { Product, Discussion } from '../types';
import { api } from '../lib/api';

export function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trending' | 'recent'>('trending');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [productsData, discussionsData] = await Promise.all([
        api.getProducts({ trending: activeTab === 'trending', limit: 10 }),
        api.getDiscussions({ trending: true, limit: 5 })
      ]);

      setProducts(productsData);
      setDiscussions(discussionsData);
    } catch (err) {
      console.error('Error fetching homepage data:', err);
      setError('Unable to load homepage data. Check your Supabase connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-full overflow-hidden min-w-0 space-y-6 sm:space-y-8">
      {/* Hero Banner */}
      <div className="w-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white">
        <div className="w-full max-w-2xl">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
            Discover tomorrow's startups, today
          </h1>
          <p className="text-orange-100 text-sm sm:text-base mb-4 sm:mb-6">
            The community platform where founders launch products, share ideas, and grow together.
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <a
              href="/launch"
              className="inline-flex items-center px-3 sm:px-4 py-2 bg-white text-orange-600 rounded-lg font-medium hover:bg-orange-50 transition-colors text-sm sm:text-base"
            >
              Launch your product
            </a>
            <a
              href="/discussions"
              className="inline-flex items-center px-3 sm:px-4 py-2 bg-orange-600 text-white border border-orange-400 rounded-lg font-medium hover:bg-orange-700 transition-colors text-sm sm:text-base"
            >
              Join discussions
            </a>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="w-full max-w-full grid grid-cols-1 lg:[grid-template-columns:minmax(0,1fr)_minmax(240px,320px)] gap-4 sm:gap-6 lg:gap-8">
        {/* Products feed */}
        <div className="w-full min-w-0 space-y-4 sm:space-y-6">
          {error && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-200">
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('trending')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'trending'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Trending
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'recent'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              Recent
            </button>
          </div>

          {/* Products list */}
          {loading ? (
            <div className="w-full space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-full h-28 sm:h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="w-full space-y-3 sm:space-y-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            /* Elegant MVP Onboarding Empty State - NO fake data */
            <div className="w-full text-center py-12 sm:py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950/40 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600">
                <Rocket className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">No startups launched today</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto mb-6">
                Be the pioneer! Share your startup with the community, gather reviews, and acquire early users.
              </p>
              <a
                href="/launch"
                className="inline-flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Launch your startup now
              </a>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-full min-w-0 space-y-4 sm:space-y-6">
          {/* Featured discussions */}
          <div className="w-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                <Star className="w-4 h-4 text-orange-500" />
                Hot Discussions
              </h3>
              <a
                href="/discussions"
                className="text-xs sm:text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1 flex-shrink-0"
              >
                View all
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
              </a>
            </div>
            
            {loading ? (
              <div className="w-full space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-full h-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : discussions.length > 0 ? (
              <div className="w-full space-y-3 sm:space-y-4">
                {discussions.slice(0, 3).map((discussion) => (
                  <DiscussionCard key={discussion.id} discussion={discussion} />
                ))}
              </div>
            ) : (
              /* Casual Discussions Onboarding Empty State - NO fake data */
              <div className="w-full text-center py-6">
                <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-2 text-zinc-400">
                  <MessageSquarePlus className="w-4 h-4" />
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 text-center mb-3">
                  No discussions started yet.
                </p>
                <a
                  href="/discussions/new"
                  className="text-xs font-semibold text-orange-500 hover:underline"
                >
                  Start a thread &rarr;
                </a>
              </div>
            )}
          </div>

          {/* Real Stats */}
          <div className="w-full bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl p-3 sm:p-4 text-white">
            <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Community Stats</h3>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-xl sm:text-2xl font-bold">{products.length}</p>
                <p className="text-xs sm:text-sm text-zinc-400">Products</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{discussions.length}</p>
                <p className="text-xs sm:text-sm text-zinc-400">Discussions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}