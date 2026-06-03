import { useEffect, useState } from 'react';
import { Coffee, Loader2, MessageSquare, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { DiscussionCard } from '../components/DiscussionCard';
import type { Discussion } from '../types';
import { api } from '../lib/api';

export function LoungePage() {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDiscussions();
  }, []);

  const fetchDiscussions = async () => {
    setLoading(true);
    try {
      // Fetch general discussions for casual lounge hanging
      const data = await api.getDiscussions({ category: 'General', limit: 20 });
      setDiscussions(data);
    } catch (err) {
      console.error('Error fetching lounge discussions:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-none min-w-0 md:max-w-6xl md:mx-auto px-4 md:px-0">
      {/* Lounge Hero Banner */}
      <div className="w-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Coffee className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            The Lounge
          </h1>
        </div>
        <p className="text-white/90 text-sm sm:text-base max-w-2xl">
          A casual space for founders to hang out, share stories, ask questions, 
          and connect with the community. Grab a virtual coffee and join the conversation!
        </p>
      </div>

      {/* Casual Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <MessageSquare className="w-5 h-5 text-purple-500 mb-2" />
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">{discussions.length}</p>
          <p className="text-sm text-zinc-500">Conversations</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <Heart className="w-5 h-5 text-pink-500 mb-2" />
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {discussions.reduce((acc, d) => acc + (d.upvote_count || 0), 0)}
          </p>
          <p className="text-sm text-zinc-500">Total Upvotes</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 col-span-2 sm:col-span-1">
          <Coffee className="w-5 h-5 text-orange-500 mb-2" />
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">24/7</p>
          <p className="text-sm text-zinc-500">Open Hours</p>
        </div>
      </div>

      {/* Casual Conversations Section */}
      <div className="mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-white mb-4">
          Recent Conversations
        </h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
          </div>
        ) : discussions.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3 sm:space-y-4"
          >
            {discussions.map((discussion, index) => (
              <motion.div
                key={discussion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <DiscussionCard discussion={discussion} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          /* Casual Conversations Onboarding Empty State - NO fake data */
          <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <Coffee className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <p className="text-zinc-500 font-medium">The lounge is quiet right now...</p>
            <p className="text-sm text-zinc-400 mt-1">
              Be the one to break the ice! Post a causal thread to hang out.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}