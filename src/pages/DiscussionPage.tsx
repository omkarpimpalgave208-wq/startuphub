import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronUp, 
  MessageCircle, 
  ArrowLeft,
  Loader2,
  Share2
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Discussion, Comment } from '../types';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Textarea } from '../components/ui/Textarea';
import { api } from '../lib/api';

export function DiscussionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasUpvoted, setHasUpvoted] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id, user]);

  useEffect(() => {
    if (!id) return;

    // REAL-TIME COMMENTS SUBSCRIPTION WITH AUTOMATIC CLEANUP
    const unsubscribe = api.subscribeToChanges(
      `discussion-comments-${id}`,
      'comments',
      '*',
      (payload) => {
        if (
          payload.new && 
          (payload.new.discussion_id === id || payload.old?.discussion_id === id)
        ) {
          fetchComments();
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const discussionData = await api.getDiscussion(id);
      setDiscussion(discussionData);

      if (discussionData) {
        await fetchComments();

        if (user) {
          const upvotes = await api.getDiscussionUpvotes({ 
            user_id: user.id, 
            discussion_id: id 
          });
          setHasUpvoted(upvotes.length > 0);
        }
      }
    } catch (err) {
      console.error('Error loading discussion detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!id) return;
    try {
      const commentsData = await api.getComments({ discussionId: id });
      setComments(commentsData);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const handleUpvote = async () => {
    if (!user || !discussion) {
      navigate('/login');
      return;
    }

    // Optimistic UI updates
    const previousUpvoted = hasUpvoted;
    setHasUpvoted(!previousUpvoted);
    setDiscussion(prev => prev ? { 
      ...prev, 
      upvote_count: prev.upvote_count + (previousUpvoted ? -1 : 1) 
    } : null);

    try {
      if (previousUpvoted) {
        await api.removeDiscussionUpvote(user.id, discussion.id);
      } else {
        await api.addDiscussionUpvote(user.id, discussion.id);
      }
    } catch (err) {
      console.error('Failed to update discussion upvote:', err);
      // Rollback on failure
      setHasUpvoted(previousUpvoted);
      setDiscussion(prev => prev ? { 
        ...prev, 
        upvote_count: prev.upvote_count + (previousUpvoted ? 1 : -1) 
      } : null);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !discussion || !commentText.trim()) return;

    setSubmitting(true);
    try {
      const newComment = await api.createComment({
        user_id: user.id,
        discussion_id: discussion.id,
        content: commentText.trim()
      });

      // Optimistically append comment
      setComments(prev => [newComment, ...prev]);
      setCommentText('');
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">Discussion not found</p>
        <Link to="/discussions" className="text-orange-500 hover:underline mt-2 inline-block">
          Back to discussions
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none min-w-0 md:max-w-6xl md:mx-auto px-4 md:px-0">
      <Link
        to="/discussions"
        className="hidden md:inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to discussions
      </Link>

      {/* Discussion Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8"
      >
        <div className="flex gap-4">
          {/* Upvote button */}
          <div className="flex-shrink-0">
            <button
              onClick={handleUpvote}
              className={`
                flex flex-col items-center gap-1 px-3 py-2 rounded-lg border transition-all
                ${hasUpvoted
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-orange-500 hover:text-orange-500'
                }
              `}
            >
              <ChevronUp className="w-5 h-5" />
              <span className="text-sm font-semibold">{discussion.upvote_count}</span>
            </button>
          </div>

          {/* Core Info */}
          <div className="flex-1 min-w-0">
            <Badge className="mb-2">{discussion.category}</Badge>
            
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
              {discussion.title}
            </h1>

            <div className="prose dark:prose-invert max-w-none mb-6">
              <p className="text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                {discussion.content}
              </p>
            </div>

            {/* Author details */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                {discussion.profiles && (
                  <>
                    <Avatar
                      src={discussion.profiles.avatar_url}
                      alt={discussion.profiles.full_name || discussion.profiles.username}
                      size="sm"
                    />
                    <div>
                      <Link
                        to={`/profile/${discussion.profiles.username}`}
                        className="font-medium text-zinc-900 dark:text-white hover:text-orange-500"
                      >
                        {discussion.profiles.full_name || discussion.profiles.username}
                      </Link>
                      <p className="text-sm text-zinc-500">
                        {new Date(discussion.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Discussion Comments Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-8 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
      >
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          {comments.length} Comments
        </h2>

        {user ? (
          <form onSubmit={handleSubmitComment} className="mb-6">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
              className="mb-3"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                loading={submitting}
                disabled={!commentText.trim()}
              >
                Post comment
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 border border-dashed rounded-lg text-center mb-6 text-sm text-zinc-500">
            Please <Link to="/login" className="text-orange-500 font-semibold hover:underline">Sign In</Link> to post a comment
          </div>
        )}

        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-3 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
            >
              <Avatar
                src={comment.profiles?.avatar_url}
                alt={comment.profiles?.full_name || comment.profiles?.username}
                size="sm"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    to={`/profile/${comment.profiles?.username}`}
                    className="font-medium text-zinc-900 dark:text-white hover:text-orange-500"
                  >
                    {comment.profiles?.full_name || comment.profiles?.username}
                  </Link>
                  <span className="text-sm text-zinc-500">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}