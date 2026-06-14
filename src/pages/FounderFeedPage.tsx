import { useState, useEffect, useCallback } from 'react';
import { Rss, ThumbsUp, Send, Image, Clock, Loader2, X, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

export interface FeedPost {
  id: string;
  user_id: string;
  userName: string;
  userAvatar: string | null;
  content: string;
  imageUrl?: string;
  timestamp: string;
  likes: number;
}

export function FounderFeedPage() {
  const { user, profile } = useAuthStore();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Revoke object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Fetch real posts from Supabase
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('discussions')
        .select(`
          id,
          user_id,
          title,
          content,
          category,
          upvote_count,
          created_at,
          profiles:user_id (
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('category', 'FounderFeed')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;

      const mapped = (data ?? []).map((item: any) => {
        let postText = '';
        let postImage = undefined;
        try {
          const parsed = JSON.parse(item.content);
          postText = parsed.text || item.content;
          postImage = parsed.imageUrl;
        } catch {
          postText = item.content;
        }

        return {
          id: item.id,
          user_id: item.user_id,
          userName: item.profiles?.full_name || item.profiles?.username || 'Anonymous Founder',
          userAvatar: item.profiles?.avatar_url || null,
          content: postText,
          imageUrl: postImage,
          timestamp: item.created_at,
          likes: item.upvote_count ?? 0,
        };
      });

      setPosts(mapped);
    } catch (err: any) {
      console.error('Error fetching founder feed:', err);
      setError('Failed to load feed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Unsupported file type. Please upload a PNG, JPG, WebP, GIF, or SVG image.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File is too large. Max allowed size is 5MB.');
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !user) return;

    setSubmitting(true);
    let imageUrl: string | undefined = undefined;

    if (selectedFile) {
      try {
        setUploading(true);
        // Upload image to Supabase Storage
        imageUrl = await api.uploadFile(selectedFile, 'feed');
      } catch (uploadErr) {
        console.warn('Supabase Storage upload failed, falling back to local base64 encoding:', uploadErr);
        // Base64 fallback if bucket is missing/unconfigured
        try {
          imageUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(selectedFile);
          });
        } catch (readErr) {
          console.error('Base64 encoding fallback failed:', readErr);
        }
      } finally {
        setUploading(false);
      }
    }

    try {
      const { error: insertErr } = await supabase
        .from('discussions')
        .insert({
          user_id: user.id,
          title: 'Founder Feed Post',
          content: JSON.stringify({
            text: newPostContent.trim(),
            imageUrl,
          }),
          category: 'FounderFeed',
        });

      if (insertErr) throw insertErr;

      // Reset form
      setNewPostContent('');
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);

      // Refetch latest posts
      await fetchPosts();
    } catch (err: any) {
      console.error('Error creating feed post:', err);
      alert('Failed to share update. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    // Optimistic UI updates
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return { ...post, likes: post.likes + 1 };
      }
      return post;
    }));

    try {
      await supabase.rpc('increment_discussion_upvote_count', { discussion_id: postId });
    } catch (err) {
      console.error('Error incrementing likes:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    // Instantly remove from UI
    setPosts(prev => prev.filter(p => p.id !== postId));

    try {
      const { error: deleteErr } = await supabase
        .from('discussions')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id);

      if (deleteErr) throw deleteErr;
    } catch (err: any) {
      console.error('Error deleting post:', err);
      alert('Failed to delete post. Please try again.');
      // Refetch posts to restore state if deletion failed
      await fetchPosts();
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const secs = Math.floor(diff / 1000);
      if (secs < 60) return 'Just now';
      const mins = Math.floor(secs / 60);
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full max-w-none min-w-0 md:max-w-3xl md:mx-auto px-4 md:px-0">
      {/* Hero Header */}
      <div className="w-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Rss className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Founder Feed
          </h1>
        </div>
        <p className="text-white/90 text-sm sm:text-base max-w-xl">
          Real updates from real builders. Share your progress, milestones, and questions with other founders.
        </p>
      </div>

      {/* Creation form */}
      {user ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 mb-6 shadow-sm">
          <form onSubmit={handleCreatePost} className="space-y-4">
            <div className="flex gap-3 items-start">
              <Avatar 
                src={profile?.avatar_url} 
                alt={profile?.full_name || profile?.username}
                size="sm"
              />
              <div className="flex-1">
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="What are you working on today?"
                  rows={3}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Selected Image Preview */}
            {previewUrl && (
              <div className="relative pl-11 max-w-xs">
                <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center relative aspect-video shadow-sm">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-zinc-900/80 text-white hover:bg-zinc-900 transition-colors shadow-sm"
                    title="Remove Image"
                    disabled={submitting}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {uploading && (
                    <div className="absolute inset-0 bg-white/70 dark:bg-zinc-900/70 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pl-11 pt-2 border-t border-zinc-150 dark:border-zinc-850">
              <label className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer">
                <Image className="w-4 h-4" />
                <span>Upload Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={submitting}
                />
              </label>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!newPostContent.trim() || submitting}
                className="flex items-center gap-1.5"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Post
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-250 dark:border-zinc-800 rounded-2xl p-5 mb-6 text-center">
          <p className="text-sm text-zinc-650 dark:text-zinc-400">
            Please <a href="/login" className="text-orange-500 hover:underline font-bold">sign in</a> to share your founder updates.
          </p>
        </div>
      )}

      {/* Feed list */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-rose-500 text-sm font-semibold">
            {error}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <Rss className="w-12 h-12 text-zinc-300 mx-auto mb-3 opacity-40" />
            <p className="text-zinc-500 font-medium">No posts yet.</p>
            <p className="text-xs text-zinc-400 mt-1">Be the first founder to share an update.</p>
          </div>
        ) : (
          posts.map((post) => (
            <div 
              key={post.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4"
            >
              {/* Post Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar src={post.userAvatar} alt={post.userName} size="sm" />
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white leading-none">
                      {post.userName}
                    </h3>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(post.timestamp)}
                    </span>
                  </div>
                </div>
                {user && post.user_id === user.id && (
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Delete post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Post Content */}
              <p className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                {post.content}
              </p>

              {/* Post Image */}
              {post.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800 max-h-96 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                  <img 
                    src={post.imageUrl} 
                    alt="Post attachment" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Post Action Footer */}
              <div className="flex items-center pt-3 border-t border-zinc-100 dark:border-zinc-850">
                <button
                  onClick={() => handleLikePost(post.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors text-xs font-bold"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>{post.likes}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
