import { useState, useEffect } from 'react';
import { Rss, ThumbsUp, Send, Image, MessageSquare, Heart, Clock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';

export interface FeedPost {
  id: string;
  userName: string;
  userAvatar: string | null;
  content: string;
  imageUrl?: string;
  timestamp: string;
  likes: number;
}

const DEFAULT_POSTS: FeedPost[] = [
  {
    id: 'post-1',
    userName: 'Omkar Pimpalgave',
    userAvatar: null,
    content: 'Just launched StartupHub! Check out the leaderboard and let me know your feedback. 🚀',
    imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    likes: 12,
  },
  {
    id: 'post-2',
    userName: 'Jane Doe',
    userAvatar: null,
    content: 'Building in public is the best way to get early validation. What features are you shipping today?',
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    likes: 8,
  }
];

export function FounderFeedPage() {
  const { user, profile } = useAuthStore();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImageUrl, setNewPostImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);

  // Load posts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sh_founder_feed_posts');
      if (stored) {
        setPosts(JSON.parse(stored));
      } else {
        setPosts(DEFAULT_POSTS);
        localStorage.setItem('sh_founder_feed_posts', JSON.stringify(DEFAULT_POSTS));
      }
    } catch {
      setPosts(DEFAULT_POSTS);
    }
  }, []);

  // Save posts to localStorage helper
  const savePosts = (updatedPosts: FeedPost[]) => {
    setPosts(updatedPosts);
    try {
      localStorage.setItem('sh_founder_feed_posts', JSON.stringify(updatedPosts));
    } catch (err) {
      console.error('Error saving posts to local storage:', err);
    }
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    const displayName = profile?.full_name || profile?.username || user?.email?.split('@')[0] || 'Anonymous Founder';
    const avatarUrl = profile?.avatar_url || null;

    const newPost: FeedPost = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      userName: displayName,
      userAvatar: avatarUrl,
      content: newPostContent.trim(),
      imageUrl: newPostImageUrl.trim() || undefined,
      timestamp: new Date().toISOString(),
      likes: 0,
    };

    const updated = [newPost, ...posts];
    savePosts(updated);

    // Reset inputs
    setNewPostContent('');
    setNewPostImageUrl('');
    setShowImageInput(false);
  };

  const handleLikePost = (postId: string) => {
    const updated = posts.map(post => {
      if (post.id === postId) {
        return { ...post, likes: post.likes + 1 };
      }
      return post;
    });
    savePosts(updated);
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
          A dedicated space for builders to share progress, milestones, and quick thoughts with the community.
        </p>
      </div>

      {/* Creation form */}
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
              />
            </div>
          </div>

          {showImageInput && (
            <div className="flex gap-2 items-center pl-11">
              <Image className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <input
                type="url"
                value={newPostImageUrl}
                onChange={(e) => setNewPostImageUrl(e.target.value)}
                placeholder="Optional image URL (e.g. https://example.com/screenshot.jpg)"
                className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          )}

          <div className="flex items-center justify-between pl-11 pt-2 border-t border-zinc-150 dark:border-zinc-850">
            <button
              type="button"
              onClick={() => setShowImageInput(!showImageInput)}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              <Image className="w-4 h-4" />
              {showImageInput ? 'Hide image link' : 'Add image link'}
            </button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!newPostContent.trim()}
              className="flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Post
            </Button>
          </div>
        </form>
      </div>

      {/* Feed list */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <Rss className="w-12 h-12 text-zinc-300 mx-auto mb-3 opacity-40 animate-pulse" />
            <p className="text-zinc-500 font-medium">No posts in the feed yet...</p>
            <p className="text-xs text-zinc-400 mt-1">Be the first to share an update!</p>
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
                      // Hide image if URL fails to load
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
