import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Github,
  Twitter,
  Linkedin,
  Globe,
  Loader2,
  ArrowLeft,
  Briefcase,
  Bookmark,
  Sparkles,
  Layers
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Profile, Product, Bookmark as SavedBookmark } from '../types';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { ProductCard } from '../components/ProductCard';
import { api } from '../lib/api';

const PROFILE_COVER_KEY = (id: string) => `startuphub_cover_${id}`;
const PROFILE_COVER_STYLE_KEY = (id: string) => `startuphub_cover_style_${id}`;

const tabItems = [
  { id: 'products', label: 'Products' },
  { id: 'discussions', label: 'Discussions' },
  { id: 'activity', label: 'Activity' },
  { id: 'saved', label: 'Saved' },
  { id: 'about', label: 'About' }
] as const;

const bannerStyles: Record<string, string> = {
  'gradient-1': 'bg-gradient-to-r from-slate-950 via-indigo-700 to-violet-500',
  'gradient-2': 'bg-gradient-to-r from-sky-500 via-cyan-500 to-violet-500',
  'gradient-3': 'bg-gradient-to-r from-orange-500 via-fuchsia-500 to-blue-500'
};

type TabId = (typeof tabItems)[number]['id'];

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [bookmarks, setBookmarks] = useState<SavedBookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedLoading, setSavedLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');
  const [coverStyle, setCoverStyle] = useState('gradient-1');
  const [activeTab, setActiveTab] = useState<TabId>('products');

  useEffect(() => {
    fetchProfile();
  }, [username, user]);

  useEffect(() => {
    if (!profile) return;
    try {
      const storedCover = localStorage.getItem(PROFILE_COVER_KEY(profile.id));
      const storedStyle = localStorage.getItem(PROFILE_COVER_STYLE_KEY(profile.id));
      setCoverUrl(storedCover || '');
      setCoverStyle(storedStyle || 'gradient-1');
    } catch (err) {
      console.warn('Unable to load profile cover from local storage', err);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile || user?.id !== profile.id) return;
    fetchBookmarks();
  }, [profile, user]);

  const fetchProfile = async () => {
    if (!username) return;

    setLoading(true);
    try {
      const profileData = await api.getProfileByUsername(username);
      if (profileData) {
        setProfile(profileData);

        const productsData = await api.getProducts({ userId: profileData.id });
        setProducts(productsData);

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

  const fetchBookmarks = async () => {
    if (!profile) return;

    setSavedLoading(true);
    try {
      const savedItems = await api.getBookmarks(profile.id);
      setBookmarks(savedItems);
    } catch (err) {
      console.error('Error fetching saved items:', err);
    } finally {
      setSavedLoading(false);
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

  const summaryItems = [
    { label: 'Products', value: profile.products || 0 },
    { label: 'Followers', value: profile.followers || 0 },
    { label: 'Following', value: profile.following || 0 }
  ];

  const profileLinks = [
    { url: profile.website, icon: Globe, label: 'Website' },
    { url: profile.github_url, icon: Github, label: 'GitHub' },
    { url: profile.twitter_url, icon: Twitter, label: 'Twitter' },
    { url: profile.linkedin_url, icon: Linkedin, label: 'LinkedIn' }
  ].filter((item) => Boolean(item.url));

  const renderTabContent = () => {
    switch (activeTab) {
      case 'products':
        return (
          <div className="space-y-4">
            {products.length > 0 ? (
              products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-10 text-center">
                <p className="text-zinc-500">
                  {isOwnProfile
                    ? "You haven't launched any products yet. Create one from the launch page to showcase it here."
                    : "This founder has not launched products yet."
                  }
                </p>
              </div>
            )}
          </div>
        );
      case 'saved':
        if (!isOwnProfile) {
          return (
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-10 text-center">
              <p className="text-zinc-500">Saved content is private.</p>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            {savedLoading ? (
              <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-10 text-center">
                <Loader2 className="w-6 h-6 mx-auto text-zinc-400 animate-spin" />
              </div>
            ) : bookmarks.length > 0 ? (
              bookmarks.map((bookmark) => (
                bookmark.products ? (
                  <ProductCard key={bookmark.id} product={bookmark.products} />
                ) : null
              ))
            ) : (
              <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-10 text-center">
                <p className="text-zinc-500">No saved startups yet. Save products from the feed to build your collection.</p>
              </div>
            )}
          </div>
        );
      case 'about':
        return (
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm">
                <div className="flex items-center gap-3 text-zinc-900 dark:text-white mb-4">
                  <Briefcase className="w-5 h-5 text-orange-500" />
                  <h3 className="text-lg font-semibold">Professional Summary</h3>
                </div>
                {profile.headline ? (
                  <p className="text-zinc-600 dark:text-zinc-400 mb-4">{profile.headline}</p>
                ) : (
                  <p className="text-zinc-500">Add your headline in settings to highlight your founder role.</p>
                )}
                <div className="space-y-3">
                  <p className="text-sm uppercase tracking-[0.24em] text-zinc-400">About</p>
                  {profile.bio ? (
                    <p className="text-zinc-600 dark:text-zinc-400 leading-7">{profile.bio}</p>
                  ) : (
                    <p className="text-zinc-500">Use your bio to share your mission, strengths, and what you are building.</p>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm">
                <div className="flex items-center gap-3 text-zinc-900 dark:text-white mb-4">
                  <Layers className="w-5 h-5 text-sky-500" />
                  <h3 className="text-lg font-semibold">Contact & Links</h3>
                </div>
                <div className="grid gap-3">
                  {profileLinks.length > 0 ? (
                    profileLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <a
                          key={item.label}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-zinc-700 dark:text-zinc-200 hover:border-orange-400 hover:text-orange-600 transition-colors"
                        >
                          <Icon className="w-5 h-5" />
                          {item.label}
                        </a>
                      );
                    })
                  ) : (
                    <p className="text-zinc-500">No social links yet. Add links in settings to make it easier for people to connect.</p>
                  )}
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm">
                <p className="text-sm uppercase tracking-[0.24em] text-zinc-400 mb-4">Key metrics</p>
                <div className="space-y-3">
                  {summaryItems.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-4">
                      <p className="text-zinc-500">{item.label}</p>
                      <p className="text-lg font-semibold text-zinc-900 dark:text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm">
                <div className="flex items-center gap-3 text-zinc-900 dark:text-white mb-4">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-lg font-semibold">Founder Focus</h3>
                </div>
                <p className="text-zinc-500">Share your core strengths and what you care about in your headline and bio.</p>
              </section>
            </aside>
          </div>
        );
      case 'activity':
        return (
          <div className="space-y-4">
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-8 text-center">
              <p className="text-zinc-500">Activity is built around launches, follows, and engagement. Keep sharing products and discussions to make this feed richer.</p>
            </div>
            {products.length > 0 && (
              <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Recent Launch Activity</h3>
                <div className="space-y-4">
                  {products.slice(0, 3).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 'discussions':
        return (
          <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-10 text-center">
            <p className="text-zinc-500">Discussion activity will appear here once the user starts posting comments or threads.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to feed
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl"
      >
        <div className="relative h-72 sm:h-80 lg:h-96">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt="Profile cover"
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className={`absolute inset-0 ${bannerStyles[coverStyle]}`} />
          )}
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.05),rgba(15,23,42,0.45))]" />
          <div className="absolute right-5 top-5 flex items-center gap-3">
            {isOwnProfile && (
              <Link to="/settings" className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur transition hover:bg-white/20">
                Change Cover Photo
              </Link>
            )}
          </div>
        </div>

        <div className="-mt-20 px-4 pb-8 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8 shadow-2xl">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="relative flex-shrink-0">
                <div className="overflow-hidden rounded-full border-4 border-white dark:border-zinc-950 shadow-2xl">
                  <Avatar src={profile.avatar_url} alt={profile.full_name || profile.username} size="xl" />
                </div>
                {isOwnProfile && (
                  <Link
                    to="/settings"
                    className="absolute -bottom-1 right-0 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                  >
                    Edit
                  </Link>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                        {profile.full_name || profile.username}
                      </h1>
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        Founder
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">@{profile.username}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {!isOwnProfile && user ? (
                      <Button variant={isFollowing ? 'outline' : 'primary'} onClick={handleFollow}>
                        {isFollowing ? 'Following' : 'Follow'}
                      </Button>
                    ) : isOwnProfile ? (
                      <Link to="/settings">
                        <Button variant="outline">Edit Profile</Button>
                      </Link>
                    ) : null}
                  </div>
                </div>

                {profile.headline && (
                  <p className="mt-4 text-lg text-zinc-700 dark:text-zinc-300 leading-8">{profile.headline}</p>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {summaryItems.map((item) => (
                    <div key={item.label} className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3">
                      <p className="text-sm text-zinc-500">{item.label}</p>
                      <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                {profileLinks.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-3">
                    {profileLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <a
                          key={item.label}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm text-zinc-700 hover:border-orange-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition"
                        >
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </a>
                      );
                    })}
                  </div>
                )}

                {profile.bio && (
                  <div className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 p-5">
                    <p className="text-sm uppercase tracking-[0.22em] text-zinc-400">About</p>
                    <p className="mt-3 text-zinc-600 dark:text-zinc-300 leading-7">{profile.bio}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl">
        <div className="flex flex-wrap gap-3 border-b border-zinc-200 dark:border-zinc-800 px-4 py-4 sm:px-6">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 sm:p-8">{renderTabContent()}</div>
      </div>
    </div>
  );
}
