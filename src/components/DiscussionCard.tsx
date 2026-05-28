import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Discussion } from '../types';
import { Avatar } from './ui/Avatar';
import { Badge } from './ui/Badge';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';

interface DiscussionCardProps {
  discussion: Discussion;
}

export function DiscussionCard({ discussion }: DiscussionCardProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [upvotes, setUpvotes] = useState(discussion.upvote_count || 0);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && discussion.id) {
      api.getDiscussionUpvotes({ user_id: user.id, discussion_id: discussion.id })
        .then(data => setHasUpvoted(data.length > 0))
        .catch(err => console.error('Error fetching discussion upvotes status:', err));
    } else {
      setHasUpvoted(false);
    }
  }, [user, discussion.id]);

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
        await api.removeDiscussionUpvote(user.id, discussion.id);
      } else {
        await api.addDiscussionUpvote(user.id, discussion.id);
      }
    } catch (err) {
      console.error('Failed to upvote discussion:', err);
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
      className="w-full"
    >
      <Link to={`/discussion/${discussion.id}`} className="block w-full">
        <div className="w-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 sm:p-4 hover:border-orange-500/30 dark:hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/5 transition-all duration-200">
          <div className="flex gap-3 sm:gap-4 w-full min-w-0">
            {/* Upvotes */}
            <button 
              onClick={handleUpvote}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-200 border
                ${hasUpvoted
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'bg-zinc-50 dark:bg-zinc-800 border-transparent text-zinc-700 dark:text-zinc-300 hover:border-orange-500'
                }
              `}
            >
              <ChevronUp className={`w-4 h-4 sm:w-5 sm:h-5 ${hasUpvoted ? 'text-white' : 'text-zinc-400'}`} />
              <span className="text-xs sm:text-sm font-semibold">
                {upvotes}
              </span>
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <h3 className="font-semibold text-zinc-900 dark:text-white text-sm sm:text-base line-clamp-2 group-hover:text-orange-600 transition-colors">
                {discussion.title}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm mt-1 line-clamp-2">
                {discussion.content}
              </p>

              {/* Footer info */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 sm:mt-3">
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {discussion.category}
                </Badge>

                {discussion.profiles && (
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <Avatar
                      src={discussion.profiles.avatar_url}
                      alt={discussion.profiles.full_name || discussion.profiles.username}
                      size="xs"
                    />
                    <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 truncate">
                      {discussion.profiles.full_name || discussion.profiles.username}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-500 text-xs sm:text-sm ml-auto flex-shrink-0">
                  <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{discussion.comments?.[0]?.count || 0} comments</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}