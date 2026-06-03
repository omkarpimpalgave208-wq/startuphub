import { useEffect, useState } from 'react';
import { Plus, Loader2, MessageSquarePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DiscussionCard } from '../components/DiscussionCard';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';
import type { Discussion } from '../types';
import { api } from '../lib/api';

const categories = ['All', 'General', 'Showcase', 'Ask', 'Feedback', 'Ideas', 'News'];

export function DiscussionsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    fetchDiscussions();
  }, [activeCategory]);

  const fetchDiscussions = async () => {
    setLoading(true);
    try {
      const data = await api.getDiscussions({
        category: activeCategory === 'All' ? undefined : activeCategory,
        limit: 20
      });
      setDiscussions(data);
    } catch (err) {
      console.error('Error fetching discussions:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-none min-w-0 md:max-w-6xl md:mx-auto px-4 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Discussions
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Join the conversation with fellow founders
          </p>
        </div>
        
        {user ? (
          <Button onClick={() => navigate('/discussions/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New Discussion
          </Button>
        ) : (
          <Button variant="outline" onClick={() => navigate('/login')}>
            Sign In to post
          </Button>
        )}
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar flex-nowrap md:flex-wrap w-full py-1">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === category
                ? 'bg-orange-500 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Discussions list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
        </div>
      ) : discussions.length > 0 ? (
        <div className="space-y-4">
          {discussions.map((discussion) => (
            <DiscussionCard key={discussion.id} discussion={discussion} />
          ))}
        </div>
      ) : (
        /* Discussion Onboarding Empty State - NO fake data */
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400">
            <MessageSquarePlus className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">No discussions here yet</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto mb-6">
            Have a question, feedback, or custom showcase thread to share with other builders? Create the first post.
          </p>
          {user ? (
            <Button onClick={() => navigate('/discussions/new')}>
              Start a discussion
            </Button>
          ) : (
            <Button onClick={() => navigate('/login')}>
              Sign in to discuss
            </Button>
          )}
        </div>
      )}
    </div>
  );
}