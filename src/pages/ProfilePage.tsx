import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Github,
  Twitter,
  Linkedin,
  Globe,
  Loader2,
  ArrowLeft,
  Briefcase,
  Sparkles,
  Layers,
  UserPlus,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Profile, Product, Bookmark as SavedBookmark, ConnectionRequest } from '../types';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { ProductCard } from '../components/ProductCard';
import { api } from '../lib/api';

const PROFILE_COVER_KEY = (id: string) => `startuphub_cover_${id}`;
const PROFILE_COVER_STYLE_KEY = (id: string) => `startuphub_cover_style_${id}`;

const tabItems = [
  { id: 'products', label: 'My Startups' },
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
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [bookmarks, setBookmarks] = useState<SavedBookmark[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedLoading, setSavedLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [connectionState, setConnectionState] = useState<'none' | 'request_sent' | 'request_received' | 'connected'>('none');
  const [connectionRequestId, setConnectionRequestId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
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

  useEffect(() => {
    if (!profile || !user) return;

    const subscriptions = [
      api.subscribeToChanges(
        `profile-connections-user-one-${profile.id}`,
        'connections',
        '*',
        () => fetchProfile(),
        `user_one_id=eq.${profile.id}`
      ),
      api.subscribeToChanges(
        `profile-connections-user-two-${profile.id}`,
        'connections',
        '*',
        () => fetchProfile(),
        `user_two_id=eq.${profile.id}`
      ),
      api.subscribeToChanges(
        `profile-requests-sender-${profile.id}`,
        'connection_requests',
        '*',
        () => fetchProfile(),
        `sender_id=eq.${profile.id}`
      ),
      api.subscribeToChanges(
        `profile-requests-receiver-${profile.id}`,
        'connection_requests',
        '*',
        () => fetchProfile(),
        `receiver_id=eq.${profile.id}`
      )
    ];

    return () => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
    };
  }, [profile, user]);

  const fetchIncomingRequests = async (userId: string) => {
    try {
      const requests = await api.getIncomingConnectionRequests(userId);
      setIncomingRequests(requests);
    } catch (err) {
      console.error('Error fetching incoming connection requests:', err);
    }
  };

  const fetchProfile = async () => {
    if (!username) return;

    setLoading(true);
    setActionMessage(null);

    try {
      const profileData = await api.getProfileByUsername(username);
      if (!profileData) {
        setProfile(null);
        return;
      }

      const productPromise = api.getProducts({ userId: profileData.id });
      const connectionPromise = api.getConnectionCount(profileData.id);
      const followPromise = user ? api.checkFollow(user.id, profileData.id) : Promise.resolve(false);
      const statusPromise = user ? api.getConnectionStatus(user.id, profileData.id) : Promise.resolve({ state: 'none' as const });

      const [productsData, connectionsCount, followState, connectionStatus] = await Promise.all([
        productPromise,
        connectionPromise,
        followPromise,
        statusPromise
      ]);

      setProfile({ ...profileData, connections: connectionsCount });
      setProducts(productsData);
      setIsFollowing(followState);
      setConnectionState(connectionStatus.state);
      setConnectionRequestId(connectionStatus.requestId ?? null);

      if (user?.id === profileData.id) {
        await fetchIncomingRequests(user.id);
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
    if (!user || !profile) {
      setActionMessage('Sign in to follow founders.');
      return;
    }
    if (user.id === profile.id) {
      setActionMessage('You cannot follow yourself.');
      return;
    }

    setFollowLoading(true);
    setActionMessage(null);
    const previousFollowingState = isFollowing;
    setIsFollowing(!previousFollowingState);
    setProfile(prev =>
      prev
        ? {
            ...prev,
            followers: (prev.followers || 0) + (previousFollowingState ? -1 : 1)
          }
        : null
    );

    try {
      if (previousFollowingState) {
        await api.removeFollow(user.id, profile.id);
      } else {
        await api.addFollow(user.id, profile.id);
      }
    } catch (err: any) {
      console.error('Follow error:', err);
      if (err.code === 'PGRST205' || err.message?.includes('Could not find') || err.message?.includes('relation') || err.message?.includes('does not exist')) {
        setActionMessage('Database table "follows" is missing. Please execute the "profiles_and_connections_migration.sql" script in your Supabase SQL Editor to enable follows!');
      } else {
        setActionMessage('Unable to update follow status. Please try again.');
      }
      setIsFollowing(previousFollowingState);
      setProfile(prev =>
        prev
          ? {
              ...prev,
              followers: (prev.followers || 0) + (previousFollowingState ? 1 : -1)
            }
          : null
      );
    } finally {
      setFollowLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!user || !profile) {
      setActionMessage('Sign in to send connection requests.');
      return;
    }
    if (user.id === profile.id) {
      setActionMessage('You cannot connect with yourself.');
      return;
    }
    if (connectionState !== 'none') return;

    setConnectLoading(true);
    setActionMessage(null);

    try {
      await api.sendConnectionRequest(user.id, profile.id);
      setConnectionState('request_sent');
      setConnectionRequestId(null);
      setActionMessage('Connection request sent.');
    } catch (err: any) {
      console.error('Connection request error:', err);
      if (err.code === 'PGRST205' || err.message?.includes('Could not find') || err.message?.includes('relation') || err.message?.includes('does not exist')) {
        setActionMessage('Database table "connection_requests" is missing. Please execute the "profiles_and_connections_migration.sql" script in your Supabase SQL Editor to enable connections!');
      } else {
        setActionMessage(err.message || 'Unable to send connection request.');
      }
    } finally {
      setConnectLoading(false);
    }
  };

  const handleOpenConversation = async () => {
    if (!user || !profile) {
      setActionMessage('Sign in to message this member.');
      return;
    }

    setMessageLoading(true);
    setActionMessage(null);

    try {
      const conversation = await api.openConversation(user.id, profile.id);
      navigate(`/messages/${conversation.id}`);
    } catch (err: any) {
      console.error('Open conversation error:', err);
      if (err.code === 'PGRST205' || err.message?.includes('Could not find') || err.message?.includes('relation') || err.message?.includes('does not exist')) {
        setActionMessage('Database chat tables are missing. Please execute the "profiles_and_connections_migration.sql" script in your Supabase SQL Editor to enable direct messaging!');
      } else {
        setActionMessage(err.message || 'Unable to open a conversation.');
      }
    } finally {
      setMessageLoading(false);
    }
  };

  const handleAcceptConnectionRequest = async () => {
    if (!user || !connectionRequestId) return;

    setConnectLoading(true);
    setActionMessage(null);

    try {
      await api.acceptConnectionRequest(connectionRequestId, user.id);
      setConnectionState('connected');
      setProfile(prev =>
        prev
          ? {
              ...prev,
              connections: (prev.connections || 0) + 1
            }
          : prev
      );
      setIncomingRequests(prev => prev.filter((item) => item.id !== connectionRequestId));
      setConnectionRequestId(null);
      setActionMessage('Connection accepted. You are now connected.');
    } catch (err) {
      console.error('Accept connection error:', err);
      setActionMessage((err as Error).message || 'Unable to accept connection request.');
    } finally {
      setConnectLoading(false);
    }
  };

  const handleRejectConnectionRequest = async () => {
    if (!user || !connectionRequestId) return;

    setConnectLoading(true);
    setActionMessage(null);

    try {
      await api.rejectConnectionRequest(connectionRequestId, user.id);
      setConnectionState('none');
      setIncomingRequests(prev => prev.filter((item) => item.id !== connectionRequestId));
      setConnectionRequestId(null);
      setActionMessage('Connection request rejected.');
    } catch (err) {
      console.error('Reject connection error:', err);
      setActionMessage((err as Error).message || 'Unable to reject connection request.');
    } finally {
      setConnectLoading(false);
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
    { label: 'Following', value: profile.following || 0 },
    { label: 'Connections', value: profile.connections || 0 }
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
              products.map((product) => <ProductCard key={product.id} product={product} />)
            ) : (
              <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-10 text-center">
                <p className="text-zinc-500">
                  {isOwnProfile
                    ? "You haven't launched any products yet. Create one from the launch page to showcase it here."
                    : 'This founder has not launched products yet.'}
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
              bookmarks.map((bookmark) =>
                bookmark.products ? <ProductCard key={bookmark.id} product={bookmark.products} /> : null
              )
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
                <div className="flex flex-col gap-4">
                  {/* Name and Username Section */}
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

                  {/* Headline (Visible on Desktop & Mobile stacked cleanly) */}
                  {profile.headline && (
                    <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed max-w-3xl">{profile.headline}</p>
                  )}

                  {/* Buttons Section - stacked cleanly under the headline/username and always 100% visible on all screen sizes */}
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    {!isOwnProfile && user ? (
                        <>
                          <Button
                            variant={isFollowing ? 'outline' : 'primary'}
                            size="sm"
                            loading={followLoading}
                            onClick={handleFollow}
                          >
                            {isFollowing ? 'Following' : 'Follow'}
                          </Button>

                          {connectionState === 'request_received' ? (
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" loading={connectLoading} onClick={handleAcceptConnectionRequest}>
                                Accept
                              </Button>
                              <Button size="sm" variant="outline" loading={connectLoading} onClick={handleRejectConnectionRequest}>
                                Reject
                              </Button>
                            </div>
                          ) : connectionState === 'connected' ? (
                            <Button size="sm" variant="outline" disabled>
                              Connected
                            </Button>
                          ) : connectionState === 'request_sent' ? (
                            <Button size="sm" variant="outline" disabled>
                              Request Sent
                            </Button>
                          ) : (
                            <Button size="sm" variant="secondary" loading={connectLoading} onClick={handleConnect}>
                              Connect
                            </Button>
                          )}

                          <Button size="sm" variant="secondary" loading={messageLoading} onClick={handleOpenConversation} className="ml-2">
                            Message
                          </Button>
                        </>
                      ) : isOwnProfile ? (
                      <Link to="/settings">
                        <Button variant="outline" size="sm">
                          Edit Profile
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </div>

                {actionMessage && (
                  <div className="mt-4 rounded-3xl border border-orange-300/40 bg-orange-50/80 px-4 py-3 text-sm text-orange-700 dark:bg-orange-950/30 dark:text-orange-300">
                    {actionMessage}
                  </div>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      {isOwnProfile && incomingRequests.length > 0 && (
        <div className="mt-8 rounded-[2rem] border border-orange-200/70 bg-orange-50/60 dark:border-orange-950/50 dark:bg-orange-950/10 shadow-2xl">
          <div className="px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-500">Connection requests</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">Respond to founders who want to connect with you.</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-orange-500 px-3 py-1 text-sm font-semibold text-white">
                {incomingRequests.length} pending
              </span>
            </div>
          </div>
          <div className="divide-y divide-orange-200/80 dark:divide-orange-900/60">
            {incomingRequests.map((request) => (
              <div key={request.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar src={request.sender?.avatar_url || ''} alt={request.sender?.full_name || request.sender?.username} size="sm" />
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-white">{request.sender?.full_name || request.sender?.username}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">@{request.sender?.username}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" loading={connectLoading} onClick={() => {
                    setConnectionRequestId(request.id);
                    handleAcceptConnectionRequest();
                  }}>
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" loading={connectLoading} onClick={() => {
                    setConnectionRequestId(request.id);
                    handleRejectConnectionRequest();
                  }}>
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
