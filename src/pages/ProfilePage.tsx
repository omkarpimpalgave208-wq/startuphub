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
  XCircle,
  GraduationCap
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Profile, Product, Bookmark as SavedBookmark, ConnectionRequest, Discussion } from '../types';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { ProductCard } from '../components/ProductCard';
import { api } from '../lib/api';
import { isUserOnline, formatLastSeen } from '../utils/presence';

const PROFILE_COVER_KEY = (id: string) => `startuphub_cover_${id}`;
const PROFILE_COVER_STYLE_KEY = (id: string) => `startuphub_cover_style_${id}`;

const tabItems = [
  { id: 'about', label: 'Overview & Skills' },
  { id: 'products', label: 'My Startups' },
  { id: 'activity', label: 'Activity Timeline' },
  { id: 'saved', label: 'Saved Startups' }
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
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('about');

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
      const discussionsPromise = api.getDiscussions({ userId: profileData.id });

      const [productsData, connectionsCount, followState, connectionStatus, discussionsData] = await Promise.all([
        productPromise,
        connectionPromise,
        followPromise,
        statusPromise,
        discussionsPromise
      ]);

      setProfile({ ...profileData, connections: connectionsCount });
      setProducts(productsData);
      setIsFollowing(followState);
      setConnectionState(connectionStatus.state);
      setConnectionRequestId(connectionStatus.requestId ?? null);
      setDiscussions(discussionsData);

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
      if (err.code === 'PGRST205' || err.code === '42P01' || err.message?.includes('does not exist')) {
        setActionMessage('Database table "follows" is missing. Please execute follows migration.');
      } else {
        setActionMessage(err.message || 'Unable to update follow status. Please try again.');
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
      if (err.code === 'PGRST205' || err.code === '42P01' || err.message?.includes('does not exist')) {
        setActionMessage('Database table "connection_requests" is missing.');
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
      if (err.code === 'PGRST205' || err.code === '42P01' || err.message?.includes('does not exist')) {
        setActionMessage('Database chat tables are missing.');
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
              <div className="rounded-xl md:rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 p-6 md:p-10 text-center shadow-none">
                <p className="text-sm text-zinc-500">
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
            <div className="rounded-xl md:rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 p-6 md:p-10 text-center shadow-none">
              <p className="text-sm text-zinc-500">Saved content is private.</p>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            {savedLoading ? (
              <div className="rounded-xl md:rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 p-6 md:p-10 text-center shadow-none">
                <Loader2 className="w-6 h-6 mx-auto text-zinc-400 animate-spin" />
              </div>
            ) : bookmarks.length > 0 ? (
              bookmarks.map((bookmark) =>
                bookmark.products ? <ProductCard key={bookmark.id} product={bookmark.products} /> : null
              )
            ) : (
              <div className="rounded-xl md:rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 p-6 md:p-10 text-center shadow-none">
                <p className="text-sm text-zinc-500">No saved startups yet. Save products from the feed to build your collection.</p>
              </div>
            )}
          </div>
        );
      case 'about':
        return (
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] w-full">
            <div className="space-y-6 w-full">
              {/* Professional Bio */}
              <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
                <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white mb-4">
                  <Briefcase className="w-4.5 h-4.5 text-orange-500 flex-shrink-0" />
                  <h3 className="text-sm font-bold">About the Founder</h3>
                </div>
                {profile.headline && (
                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-350 mb-3 border-l-2 border-orange-500 pl-3 leading-relaxed italic">{profile.headline}</p>
                )}
                {profile.bio ? (
                  <p className="text-xs md:text-sm text-zinc-650 dark:text-zinc-350 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                ) : (
                  <p className="text-xs text-zinc-500">No biography details added yet. Add details in Settings to highlight your founder journey.</p>
                )}
              </section>

              {/* Education Card */}
              {profile.college_name && (
                <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
                  <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white mb-4">
                    <GraduationCap className="w-4.5 h-4.5 text-sky-500 flex-shrink-0" />
                    <h3 className="text-sm font-bold">Education</h3>
                  </div>
                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-zinc-805 dark:text-zinc-200">
                      {profile.college_name}
                    </h4>
                    {profile.studying_year && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        Year of study: {profile.studying_year}
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* Contact Links */}
              <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
                <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white mb-4">
                  <Globe className="w-4.5 h-4.5 text-sky-500 flex-shrink-0" />
                  <h3 className="text-sm font-bold">Founder Contact & Socials</h3>
                </div>
                <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2">
                  {profileLinks.length > 0 ? (
                    profileLinks.map((item) => {
                      const Icon = item.icon;
                      return (
                        <a
                          key={item.label}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 px-3.5 py-2.5 text-xs text-zinc-700 dark:text-zinc-200 hover:border-orange-500/50 hover:text-orange-500 transition-all hover:bg-white dark:hover:bg-zinc-900 shadow-sm"
                        >
                          <Icon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                          <span className="font-semibold">{item.label}</span>
                        </a>
                      );
                    })
                  ) : (
                    <p className="text-xs text-zinc-500 col-span-full">No social links added yet. Add links in settings to help builders reach you.</p>
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-6 w-full">
              {/* Skills Card */}
              <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
                <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white mb-4">
                  <Sparkles className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0" />
                  <h3 className="text-sm font-bold">Founder Skills & Expertise</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.skills && profile.skills.length > 0 ? (
                    profile.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-350 hover:border-orange-500/30 hover:text-orange-500 transition-colors"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-500">Not added yet</p>
                  )}
                </div>
              </section>

              {/* Achievements Focus Card */}
              <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
                <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white mb-3">
                  <Layers className="w-4.5 h-4.5 text-violet-500 flex-shrink-0" />
                  <h3 className="text-sm font-bold">Focus & Achievements</h3>
                </div>
                {profile.achievements && profile.achievements.length > 0 ? (
                  <ul className="space-y-2 text-xs text-zinc-650 dark:text-zinc-350 list-disc list-inside">
                    {profile.achievements.map((ach) => (
                      <li key={ach}>{ach}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-zinc-500 leading-relaxed">Not added yet</p>
                )}
              </section>
            </div>
          </div>
        );
      case 'activity':
        const timelineEvents = [
          ...products.map(p => ({
            id: p.id,
            type: 'product' as const,
            title: `Launched startup: ${p.name}`,
            subtitle: p.tagline,
            category: p.category,
            upvotes: p.upvote_count || 0,
            date: p.created_at,
            link: `/product/${p.id}`
          })),
          ...discussions.map(d => ({
            id: d.id,
            type: 'discussion' as const,
            title: `Started discussion: ${d.title}`,
            subtitle: d.content,
            category: d.category,
            upvotes: d.upvote_count || 0,
            date: d.created_at,
            link: `/discussion/${d.id}`
          }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4.5 h-4.5 text-orange-500" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Founder Milestone Timeline</h3>
              </div>
              <p className="text-xs text-zinc-500">Chronological history of startup launches and discussion contributions on StartupHub.</p>
            </div>

            {timelineEvents.length > 0 ? (
              <div className="relative border-l border-zinc-200 dark:border-zinc-800 ml-4.5 pl-6 space-y-6 pt-2">
                {timelineEvents.map((event) => {
                  const isProduct = event.type === 'product';
                  return (
                    <div key={event.id} className="relative">
                      {/* Timeline dot */}
                      <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-950 flex items-center justify-center ${
                        isProduct ? 'bg-orange-500' : 'bg-sky-500'
                      }`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>

                      {/* Event card */}
                      <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-orange-500/20 transition-all shadow-sm">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                              {new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-white mt-1 hover:text-orange-500 transition-colors">
                              <Link to={event.link}>{event.title}</Link>
                            </h4>
                            <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">{event.subtitle}</p>
                            <div className="flex gap-2 items-center mt-3">
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                {event.category}
                              </span>
                              <span className="text-[10px] text-zinc-400">&bull;</span>
                              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                                {event.upvotes} upvotes
                              </span>
                            </div>
                          </div>
                          
                          <Link
                            to={event.link}
                            className="text-xs font-bold text-orange-500 hover:text-orange-600 flex-shrink-0 border border-orange-500/10 hover:border-orange-500/30 rounded-lg px-2.5 py-1"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 p-8 text-center">
                <Sparkles className="w-5.5 h-5.5 text-zinc-400 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">No activity milestones recorded yet. Start a discussion or launch a startup to begin your timeline!</p>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full min-h-screen bg-zinc-50 dark:bg-zinc-900 pb-12">
      {/* Cover Banner (Full width breakout) */}
      <div 
        className="relative h-[180px] md:h-80 lg:h-96 overflow-hidden"
        style={{
          width: '100vw',
          position: 'relative',
          left: '50%',
          right: '50%',
          marginLeft: '-50vw',
          marginRight: '-50vw'
        }}
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt="Profile cover"
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
          />
        ) : (
          <div className={`absolute inset-0 ${bannerStyles[coverStyle]}`} />
        )}
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0.3))]" />
        
        {/* Overlaid Controls aligned to page layout container */}
        <div className="absolute inset-x-0 top-4 z-20 pointer-events-none">
          <div className="max-w-6xl mx-auto px-4 md:px-6 w-full flex items-center justify-between pointer-events-auto">
            {/* Back Arrow link */}
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-black/40 border border-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-black/60 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to feed
            </Link>

            {/* Change Cover button */}
            {isOwnProfile && (
              <Link to="/settings" className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-sm font-semibold text-white shadow-md backdrop-blur transition hover:bg-white/20">
                Change Cover
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Content (Centered layout) */}
      <div className="w-full max-w-none md:max-w-6xl md:mx-auto px-0 md:px-6 py-0 relative z-10">
        <div className="w-full bg-white dark:bg-zinc-950 rounded-none md:rounded-[2rem] border-0 md:border border-zinc-200 dark:border-zinc-800 shadow-none md:shadow-2xl overflow-hidden pb-8 -mt-10 md:-mt-16">
          {/* Profile Content Area */}
          <div className="px-2 md:px-8 mt-4">
          
          {/* Avatar & Edit Button Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end -mt-16 md:-mt-24 mb-4 gap-4 relative z-10">
            <div className="relative">
              <div className="w-24 h-24 md:w-32 md:h-32 overflow-hidden rounded-full border-4 border-white dark:border-zinc-950 shadow-md flex-shrink-0 bg-zinc-100 dark:bg-zinc-800">
                <Avatar src={profile.avatar_url} alt={profile.full_name || profile.username} className="w-full h-full object-cover" />
              </div>
            </div>
            {isOwnProfile ? (
              <Link to="/settings" className="w-full sm:w-auto">
                <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs md:text-sm py-1.5 px-4 h-9">
                  Edit Profile
                </Button>
              </Link>
            ) : user ? (
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Button
                  variant={isFollowing ? 'outline' : 'primary'}
                  size="sm"
                  className="flex-1 sm:flex-initial text-xs md:text-sm py-1.5 px-4 h-9"
                  loading={followLoading}
                  onClick={handleFollow}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
                {connectionState === 'request_received' ? (
                  <div className="flex gap-2 flex-1 sm:flex-initial">
                    <Button size="sm" className="flex-1 sm:flex-initial text-xs py-1.5 px-3 h-9" loading={connectLoading} onClick={handleAcceptConnectionRequest}>Accept</Button>
                    <Button size="sm" variant="outline" className="flex-1 sm:flex-initial text-xs py-1.5 px-3 h-9" loading={connectLoading} onClick={handleRejectConnectionRequest}>Reject</Button>
                  </div>
                ) : connectionState === 'connected' ? (
                  <Button size="sm" variant="outline" className="flex-1 sm:flex-initial text-xs py-1.5 px-3 h-9" disabled>Connected</Button>
                ) : connectionState === 'request_sent' ? (
                  <span className="inline-flex items-center justify-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-semibold text-orange-600 dark:border-orange-950/40 dark:bg-orange-950/20 flex-1 sm:flex-initial">Pending</span>
                ) : (
                  <Button size="sm" variant="secondary" className="flex-1 sm:flex-initial text-xs py-1.5 px-3 h-9" loading={connectLoading} onClick={handleConnect}>Connect</Button>
                )}
                <Button size="sm" variant="secondary" className="flex-1 sm:flex-initial text-xs py-1.5 px-3 h-9" loading={messageLoading} onClick={handleOpenConversation}>Message</Button>
              </div>
            ) : null}
          </div>

          {/* Info Details */}
          <div className="text-left space-y-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white leading-tight">
                  {profile.full_name || profile.username}
                </h1>
                <span className="rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Founder
                </span>
                <div className="flex items-center gap-1 rounded-full border border-zinc-200/60 bg-zinc-100/80 px-2 py-0.5 text-[9px] dark:border-zinc-800/80 dark:bg-zinc-900/50">
                  <span className="relative flex h-1.5 w-1.5">
                    {isUserOnline(profile.last_seen) && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    )}
                    <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${isUserOnline(profile.last_seen) ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                  </span>
                  <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                    {isUserOnline(profile.last_seen) ? 'Active now' : formatLastSeen(profile.last_seen)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">@{profile.username}</p>
              {profile.college_name && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-650 dark:text-zinc-400 mt-1.5">
                  <GraduationCap className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
                  <span>
                    Studying at <span className="font-semibold text-zinc-800 dark:text-zinc-200">{profile.college_name}</span>
                    {profile.studying_year ? ` (${profile.studying_year})` : ''}
                  </span>
                </div>
              )}
            </div>

            {profile.headline && (
              <p className="text-sm text-zinc-700 dark:text-zinc-350 leading-relaxed">{profile.headline}</p>
            )}

            {/* Stats row - elegant Threads/X borderless horizontal row */}
            <div className="flex flex-row items-center flex-wrap gap-x-3 gap-y-1.5 pt-3 pb-1 text-sm font-medium text-zinc-500 dark:text-zinc-400 justify-start">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-zinc-950 dark:text-white">{products.length || profile.products || 0}</span>
                <span className="text-zinc-500">Products</span>
              </div>
              <span className="text-zinc-300 dark:text-zinc-800">|</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-zinc-950 dark:text-white">{profile.followers || 0}</span>
                <span className="text-zinc-500">Followers</span>
              </div>
              <span className="text-zinc-300 dark:text-zinc-800">|</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-zinc-950 dark:text-white">{profile.following || 0}</span>
                <span className="text-zinc-500">Following</span>
              </div>
              <span className="text-zinc-300 dark:text-zinc-800">|</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-zinc-950 dark:text-white">{profile.connections || 0}</span>
                <span className="text-zinc-500">Connections</span>
              </div>
            </div>

            {profileLinks.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {profileLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.label}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-orange-500 transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </a>
                  );
                })}
              </div>
            )}

            {profile.bio && (
              <div className="pt-2">
                <p className="text-sm text-zinc-650 dark:text-zinc-350 leading-relaxed">{profile.bio}</p>
              </div>
            )}
          </div>

          {actionMessage && (
            <div className="mt-4 rounded-xl border border-orange-300/40 bg-orange-50/80 px-4 py-3 text-sm text-orange-700 dark:bg-orange-950/30 dark:text-orange-300">
              {actionMessage}
            </div>
          )}

          {isOwnProfile && incomingRequests.length > 0 && (
            <div className="mt-6 rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/10 dark:bg-orange-950/10 overflow-hidden">
              <div className="px-4 py-3 border-b border-orange-200 dark:border-orange-900/50 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">Connection requests</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Respond to founders who want to connect with you.</p>
                </div>
                <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs text-white font-semibold">{incomingRequests.length}</span>
              </div>
              <div className="divide-y divide-orange-100 dark:divide-orange-900/40">
                {incomingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 gap-3">
                    <div className="flex items-center gap-2">
                      <Avatar src={request.sender?.avatar_url || ''} alt={request.sender?.full_name || request.sender?.username} size="xs" />
                      <div>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-white">{request.sender?.full_name || request.sender?.username}</p>
                        <p className="text-[10px] text-zinc-500">@{request.sender?.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" className="text-xs py-1 px-2.5 h-7" loading={connectLoading} onClick={() => { setConnectionRequestId(request.id); handleAcceptConnectionRequest(); }}>Accept</Button>
                      <Button size="sm" variant="outline" className="text-xs py-1 px-2.5 h-7" loading={connectLoading} onClick={() => { setConnectionRequestId(request.id); handleRejectConnectionRequest(); }}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Startup Spotlight Card */}
          {products.length > 0 ? (
            <div className="mt-6 p-4 border border-orange-500/20 bg-gradient-to-br from-orange-50/40 via-white to-zinc-50/30 dark:from-orange-950/15 dark:via-zinc-950 dark:to-zinc-950/50 rounded-2xl shadow-sm text-left">
              <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] uppercase text-orange-500 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Startup Spotlight
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
                <div className="flex gap-3.5 items-start">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex-shrink-0 flex items-center justify-center">
                    {products[0].logo_url ? (
                      <img src={products[0].logo_url} alt={products[0].name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-zinc-400">{products[0].name[0]}</span>
                    )}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">{products[0].name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-orange-200 bg-orange-50 font-semibold text-orange-600 dark:border-orange-950/40 dark:bg-orange-950/20 uppercase tracking-wider">{products[0].category}</span>
                    </div>
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-350">{products[0].tagline}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">{products[0].description}</p>
                  </div>
                </div>
                
                <div className="flex flex-row sm:flex-col gap-2 items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t border-zinc-100 dark:border-zinc-900 sm:border-0">
                  <div className="flex items-center gap-2">
                    {products[0].website_url && (
                      <a
                        href={products[0].website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-semibold text-zinc-650 dark:text-zinc-350 hover:border-orange-500 hover:text-orange-500 transition-colors"
                      >
                        <span>Visit Site</span>
                        <Globe className="w-3 h-3" />
                      </a>
                    )}
                    <Link
                      to={`/product/${products[0].id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-950 dark:bg-zinc-105 text-xs font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : isOwnProfile ? (
            <div className="mt-6 p-5 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/30 text-center">
              <Sparkles className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Feature Your Startup Spotlight</h4>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-sm mx-auto">Launch a product on StartupHub to prominently feature your startup at the top of your portfolio!</p>
              <Link to="/launch" className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-orange-500 hover:text-orange-600">
                Launch Startup now &rarr;
              </Link>
            </div>
          ) : null}

          {/* Sticky Scrollable Tabs */}
          <div className="mt-6 border-b border-zinc-200 dark:border-zinc-800 sticky top-14 sm:top-16 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md -mx-2 md:-mx-8 px-2 md:px-8 flex gap-2 overflow-x-auto hide-scrollbar flex-nowrap py-1">
            {tabItems
              .filter((tab) => tab.id !== 'saved' || isOwnProfile)
              .map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 text-xs md:text-sm font-semibold border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-500'
                      : 'border-transparent text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
          </div>

          {/* Tab Content Panels */}
          <div className="py-4">{renderTabContent()}</div>

        </div>
      </div>
    </div>
  </div>
  );
}
