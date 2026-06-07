import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronUp, 
  MessageCircle, 
  ExternalLink, 
  Github, 
  Share2, 
  Bookmark,
  Loader2,
  ArrowLeft,
  Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product, Comment } from '../types';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Textarea } from '../components/ui/Textarea';
import { api } from '../lib/api';

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id, user]);

  useEffect(() => {
    if (!id) return;

    // REAL-TIME COMMENTS LISTENER
    const unsubscribe = api.subscribeToChanges(
      `product-comments-${id}`,
      'comments',
      '*',
      (payload) => {
        if (
          payload.new && 
          (payload.new.product_id === id || payload.old?.product_id === id)
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
      const productData = await api.getProduct(id);
      setProduct(productData);

      if (productData) {
        await fetchComments();

        if (user) {
          // Check upvote state
          const upvotes = await api.getUpvotes({ 
            user_id: user.id, 
            product_id: id 
          });
          setHasUpvoted(upvotes.length > 0);

          // Check bookmark state
          const bookmarked = await api.checkBookmark(user.id, id);
          setIsBookmarked(bookmarked);
        }
      }
    } catch (err) {
      console.error('Error fetching product detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!id) return;
    try {
      const commentsData = await api.getComments({ productId: id });
      setComments(commentsData);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const handleUpvote = async () => {
    if (!user || !product) {
      navigate('/login');
      return;
    }

    // Optimistic UI updates
    const previousUpvoted = hasUpvoted;
    setHasUpvoted(!previousUpvoted);
    setProduct(prev => prev ? { 
      ...prev, 
      upvote_count: prev.upvote_count + (previousUpvoted ? -1 : 1) 
    } : null);

    try {
      if (previousUpvoted) {
        await api.removeUpvote(user.id, product.id);
      } else {
        await api.addUpvote(user.id, product.id);
      }
    } catch (err) {
      console.error('Failed to upvote product:', err);
      // Rollback on failure
      setHasUpvoted(previousUpvoted);
      setProduct(prev => prev ? { 
        ...prev, 
        upvote_count: prev.upvote_count + (previousUpvoted ? 1 : -1) 
      } : null);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !product || !commentText.trim()) return;

    setSubmitting(true);
    try {
      const newComment = await api.createComment({
        user_id: user.id,
        product_id: product.id,
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

  const handleBookmark = async () => {
    if (!user || !product) {
      navigate('/login');
      return;
    }

    // Snappy UI state updates
    const previousBookmark = isBookmarked;
    setIsBookmarked(!previousBookmark);

    try {
      if (previousBookmark) {
        await api.removeBookmark(user.id, product.id);
      } else {
        await api.addBookmark(user.id, product.id);
      }
    } catch (err) {
      console.error('Failed to update bookmark status:', err);
      setIsBookmarked(previousBookmark);
    }
  };

  const handleDelete = async () => {
    if (!user || !product) {
      navigate('/login');
      return;
    }

    if (user.id !== product.user_id) {
      console.warn('[ProductPage.handleDelete] User does not own this product');
      alert('You can only delete your own products');
      return;
    }

    setDeleting(true);
    try {
      console.log('[ProductPage.handleDelete] Deleting product:', product.id);
      await api.deleteProductSecure(product.id, user.id);
      console.log('[ProductPage.handleDelete] Product deleted successfully');
      navigate('/');
    } catch (err: any) {
      console.error('[ProductPage.handleDelete] Delete error:', err);
      alert(err?.message || 'Failed to delete product. Please try again.');
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">Product not found</p>
        <Link to="/" className="text-orange-500 hover:underline mt-2 inline-block">
          Go home
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none min-w-0 md:max-w-5xl md:mx-auto px-4 md:px-0">
      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to feed
      </Link>

      {/* Hero section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
      >
        {/* Banner */}
        {product.banner_image_url ? (
          <div className="relative w-full overflow-hidden rounded-t-3xl" style={{ height: 288 }}>
            <img
              src={product.banner_image_url}
              alt={product.name}
              loading="lazy"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: '50% 50%',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>
        ) : (
          <div className="h-56 sm:h-72 w-full bg-gradient-to-r from-slate-950 via-indigo-700 to-violet-500" />
        )}

        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Logo */}
            <div className="flex-shrink-0 -mt-16 sm:-mt-20">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-white dark:bg-zinc-900 p-2 shadow-lg flex items-center justify-center">
                {product.logo_url ? (
                  <img
                    src={product.logo_url}
                    alt={product.name}
                    className="w-full h-full object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center">
                    <span className="text-4xl font-bold text-zinc-400">
                      {product.name[0]}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
                    {product.name}
                  </h1>
                  <p className="text-lg text-zinc-600 dark:text-zinc-400 mt-1">
                    {product.tagline}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleUpvote}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                      ${hasUpvoted
                        ? 'bg-orange-500 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }
                    `}
                  >
                    <ChevronUp className="w-5 h-5" />
                    <span>{product.upvote_count}</span>
                  </button>

                  <Button variant="outline" size="sm" onClick={handleBookmark}>
                    <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current text-orange-500' : ''}`} />
                  </Button>

                  <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4" />
                  </Button>

                  {user && product && user.id === product.user_id && (
                    <Link to={`/product/${product.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                  )}

                  {user && product && user.id === product.user_id && (
                    <>
                      {deleteConfirm ? (
                        <div className="flex items-center gap-2 ml-2 p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                          <span className="text-sm text-red-700 dark:text-red-200">Delete?</span>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={handleDelete}
                            loading={deleting}
                            className="!bg-red-600 hover:!bg-red-700"
                          >
                            Yes
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteConfirm(false)}
                            disabled={deleting}
                          >
                            No
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirm(true)}
                          className="text-red-600 hover:text-red-700 hover:border-red-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Badge>{product.category}</Badge>

                {product.website_url && (
                  <a
                    href={product.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-orange-500 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Website
                  </a>
                )}

                {product.github_url && (
                  <a
                    href={product.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-orange-500 transition-colors"
                  >
                    <Github className="w-4 h-4" />
                    GitHub
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Maker details */}
          {product.profiles && (
            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <Avatar
                src={product.profiles.avatar_url}
                alt={product.profiles.full_name || product.profiles.username}
                size="md"
              />
              <div>
                <Link
                  to={`/profile/${product.profiles.username}`}
                  className="font-medium text-zinc-900 dark:text-white hover:text-orange-500 transition-colors"
                >
                  {product.profiles.full_name || product.profiles.username}
                </Link>
                <p className="text-sm text-zinc-500">Maker</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Content Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
          >
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              About
            </h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                {product.description}
              </p>
            </div>
          </motion.div>

          {/* Screenshots gallery */}
          {product.screenshots && product.screenshots.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
            >
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                Screenshots
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {product.screenshots.map((screenshot, i) => (
                  <img
                    key={i}
                    src={screenshot}
                    alt={`Screenshot ${i + 1}`}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800 w-full object-cover"
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Comments List Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
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
                  placeholder="What do you think about this product?"
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

        {/* Info Sidebar panel */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">
              Launch Info
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Launched</span>
                <span className="text-zinc-900 dark:text-white">
                  {new Date(product.created_at).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Upvotes</span>
                <span className="text-zinc-900 dark:text-white font-medium">
                  {product.upvote_count}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Comments</span>
                <span className="text-zinc-900 dark:text-white font-medium">
                  {comments.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}