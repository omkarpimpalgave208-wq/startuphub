import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Github, 
  Twitter, 
  Linkedin, 
  Globe, 
  Loader2, 
  ArrowLeft 
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Profile, Product } from '../types';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { ProductCard } from '../components/ProductCard';
import { api } from '../lib/api';

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [username, user]);

  const fetchProfile = async () => {
    if (!username) return;
    
    setLoading(true);
    try {
      const profileData = await api.getProfileByUsername(username);
      if (profileData) {
        setProfile(profileData);

        // Fetch user's launched startups directly from public database
        const productsData = await api.getProducts({ userId: profileData.id });
        setProducts(productsData);

        // Check follower state cleanly
        if (user) {
          const followState = await api.checkFollow(user.id, profileData.id);
          setIsFollowing(followState);
        }
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Error fetching profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user || !profile) return;

    const previousFollowingState = isFollowing;
    setIsFollowing(!previousFollowingState);
    setProfile(prev => prev ? {
      ...prev,
      followers: (prev.followers || 0) + (previousFollowingState ? -1 : 1)
    } : null);

    try {
      if (previousFollowingState) {
        await api.removeFollow(user.id, profile.id);
      } else {
        await api.addFollow(user.id, profile.id);
      }
    } catch (err) {
      console.error('Follow error:', err);
      // Rollback on failure
      setIsFollowing(previousFollowingState);
      setProfile(prev => prev ? {
        ...prev,
        followers: (prev.followers || 0) + (previousFollowingState ? 1 : -1)
      } : null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">User not found</p>
        <Link to="/" className="text-orange-500 hover:underline mt-2 inline-block">
          Go home
        </Link>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile.id;

  return (
    <div className="max-w-5xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to feed
      </Link>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8"
      >
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <Avatar
            src={profile.avatar_url}
            alt={profile.full_name || profile.username}
            size="xl"
          />

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
                  {profile.full_name || profile.username}
                </h1>
                <p className="text-zinc-500">@{profile.username}</p>
              </div>

              {!isOwnProfile && user && (
                <Button
                  variant={isFollowing ? 'outline' : 'primary'}
                  onClick={handleFollow}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
              )}

              {isOwnProfile && (
                <Link to="/settings">
                  <Button variant="outline">Edit Profile</Button>
                </Link>
              )}
            </div>

            {profile.headline && (
              <p className="text-zinc-600 dark:text-zinc-400 mt-2">
                {profile.headline}
              </p>
            )}

            {/* Stats count indicators */}
            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {profile.products || 0}
                </span>
                <span className="text-zinc-500">Products</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {profile.followers || 0}
                </span>
                <span className="text-zinc-500">Followers</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {profile.following || 0}
                </span>
                <span className="text-zinc-500">Following</span>
              </div>
            </div>

            {/* Bio details */}
            {profile.bio && (
              <p className="text-zinc-600 dark:text-zinc-400 mt-4">
                {profile.bio}
              </p>
            )}

            {/* Social links */}
            <div className="flex flex-wrap items-center gap-4 mt-4">
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-orange-500 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Website
                </a>
              )}
              {profile.github_url && (
                <a
                  href={profile.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-orange-500 transition-colors"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </a>
              )}
              {profile.twitter_url && (
                <a
                  href={profile.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-orange-500 transition-colors"
                >
                  <Twitter className="w-4 h-4" />
                  Twitter
                </a>
              )}
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-orange-500 transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Startups section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-4">
          Launched Products
        </h2>

        {products.length > 0 ? (
          <div className="space-y-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          /* MVP Onboarding Empty State for profile launches */
          <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <p className="text-zinc-500">
              {isOwnProfile 
                ? "You haven't launched any products yet."
                : "This user hasn't launched any products yet."
              }
            </p>
            {isOwnProfile && (
              <Link to="/launch">
                <Button variant="primary" className="mt-4">
                  Launch your first product
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}