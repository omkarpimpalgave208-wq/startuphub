/* eslint-disable react-hooks/set-state-in-effect */
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
  CheckCircle,
  GraduationCap,
  Award,
  Activity,
  Calendar
} from 'lucide-react';
import type { Profile, Product, Bookmark as SavedBookmark, ConnectionRequest, Discussion } from '../types';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { ProductCard } from '../components/ProductCard';
import { api } from '../lib/api';
import { isUserOnline, formatLastSeen } from '../utils/presence';
import { BannerImage } from '../components/BannerImage';
import { VerificationBadge } from '../components/VerificationBadge';

const PROFILE_COVER_KEY = (id: string) => `startuphub_cover_${id}`;
const PROFILE_COVER_STYLE_KEY = (id: string) => `startuphub_cover_style_${id}`;

const bannerStyles: Record<string, string> = {
  'gradient-1': 'bg-gradient-to-r from-slate-950 via-indigo-700 to-violet-500',
  'gradient-2': 'bg-gradient-to-r from-sky-500 via-cyan-500 to-violet-500',
  'gradient-3': 'bg-gradient-to-r from-orange-500 via-fuchsia-500 to-blue-500'
};

const SHOW_VERIFICATION_FEATURE = false;

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
  const [coverZoom, setCoverZoom] = useState(1.0);
  const [coverPositionX, setCoverPositionX] = useState(0.5);
  const [coverPositionY, setCoverPositionY] = useState(0.35);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [shareCopied, setShareCopied] = useState(false);

  async function fetchProfile() {
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
  }

  useEffect(() => {
    fetchProfile();
  }, [username, user]);

  useEffect(() => {
    if (!profile) return;
    try {
      const storedCover = localStorage.getItem(PROFILE_COVER_KEY(profile.id));
      const storedStyle = localStorage.getItem(PROFILE_COVER_STYLE_KEY(profile.id));
      
      const dbCover = profile.banner_url || storedCover || '';
      const dbStyle = profile.banner_style || storedStyle || 'gradient-1';

      // Load zoom and position metadata (database takes precedence, fallback to localStorage, then defaults)
      const zoomVal = profile.banner_zoom !== null && profile.banner_zoom !== undefined
        ? profile.banner_zoom
        : parseFloat(localStorage.getItem(`startuphub_cover_zoom_${profile.id}`) || '1.0');

      const posXVal = profile.banner_position_x !== null && profile.banner_position_x !== undefined
        ? profile.banner_position_x
        : parseFloat(localStorage.getItem(`startuphub_cover_focus_${profile.id}`)?.split(',')[0] || '0.5');

      const posYVal = profile.banner_position_y !== null && profile.banner_position_y !== undefined
        ? profile.banner_position_y
        : parseFloat(localStorage.getItem(`startuphub_cover_focus_${profile.id}`)?.split(',')[1] || '0.35');

      setCoverUrl(dbCover);
      setCoverStyle(dbStyle);
      setCoverZoom(zoomVal);
      setCoverPositionX(posXVal);
      setCoverPositionY(posYVal);
    } catch (err) {
      console.warn('Unable to load profile cover state from local storage or database', err);
    }
  }, [profile]);

  async function fetchBookmarks() {
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
  }

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

  const handleShareProfile = () => {
    const shareUrl = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }).catch((err) => {
        console.error('Failed to copy text: ', err);
      });
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
      document.body.removeChild(textArea);
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

  const profileLinks = [
    { url: profile.website, icon: Globe, label: 'Website' },
    { url: profile.github_url, icon: Github, label: 'GitHub' },
    { url: profile.twitter_url, icon: Twitter, label: 'Twitter' },
    { url: profile.linkedin_url, icon: Linkedin, label: 'LinkedIn' }
  ].filter((item) => Boolean(item.url));

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

  const renderActionButtons = (isMobile: boolean) => {
    const containerClasses = isMobile
      ? 'flex flex-wrap items-center gap-2 w-full pt-1 pb-2'
      : 'hidden sm:flex flex-wrap items-center justify-end gap-2 w-auto';

    return (
      <div className={containerClasses}>
        {isOwnProfile ? (
          <div className={`flex gap-2 w-full ${isMobile ? '' : 'sm:w-auto'}`}>
            <Link to="/settings" className="flex-1 sm:flex-initial">
              <Button variant="outline" className="w-full text-xs font-bold py-2 px-4 h-9 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl transition-all shadow-sm">
                Edit Profile
              </Button>
            </Link>
            <Button
              variant="secondary"
              onClick={handleShareProfile}
              className="flex-1 sm:flex-initial text-xs font-bold py-2 px-4 h-9 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl transition-all shadow-sm"
            >
              {shareCopied ? 'Copied!' : 'Share Profile'}
            </Button>
          </div>
        ) : (
          <div className={`flex flex-wrap items-center gap-2 w-full ${isMobile ? '' : 'sm:w-auto justify-end'}`}>
            <Button
              variant={isFollowing ? 'outline' : 'primary'}
              className={`flex-1 sm:flex-initial text-xs font-bold py-2 px-4 h-9 rounded-xl transition-all shadow-sm ${
                isFollowing ? 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300' : 'bg-orange-500 hover:bg-orange-600 text-white border-0'
              }`}
              loading={followLoading}
              onClick={handleFollow}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
            
            {connectionState === 'request_received' ? (
              <div className="flex gap-2 flex-1 sm:flex-initial">
                <Button className="flex-1 sm:flex-initial text-xs font-bold py-2 px-3 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm" loading={connectLoading} onClick={handleAcceptConnectionRequest}>
                  Accept
                </Button>
                <Button variant="outline" className="flex-1 sm:flex-initial text-xs font-bold py-2 px-3 h-9 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm" loading={connectLoading} onClick={handleRejectConnectionRequest}>
                  Reject
                </Button>
              </div>
            ) : connectionState === 'connected' ? (
              <Button variant="outline" className="flex-1 sm:flex-initial text-xs font-bold py-2 px-4 h-9 border-zinc-200 dark:border-zinc-800 text-zinc-500 rounded-xl shadow-sm cursor-not-allowed" disabled>
                Connected
              </Button>
            ) : connectionState === 'request_sent' ? (
              <span className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-600 dark:border-orange-950/40 dark:bg-orange-950/20 flex-1 sm:flex-initial h-9">
                Pending
              </span>
            ) : (
              <Button variant="secondary" className="flex-1 sm:flex-initial text-xs font-bold py-2 px-4 h-9 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl transition-all shadow-sm" loading={connectLoading} onClick={handleConnect}>
                Connect
              </Button>
            )}
            
            <Button variant="secondary" className="flex-1 sm:flex-initial text-xs font-bold py-2 px-4 h-9 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl transition-all shadow-sm" loading={messageLoading} onClick={handleOpenConversation}>
              Message
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full min-h-dvh bg-zinc-50 dark:bg-zinc-900 pb-12">

      {/* ─── Cover + Avatar wrapper ─────────────────────────────────────────── */}
      {/* Avatar is a sibling of the cover, positioned absolutely so it can
          overlap the bottom edge by 50% without any overflow-hidden clipping.  */}
      <div className="relative w-full" style={{ marginBottom: 0 }}>

        {/* Cover Banner */}
        <div
          className="relative w-full overflow-hidden bg-zinc-950"
          style={{ height: 'clamp(220px, 35vh, 320px)' }}
        >
          {coverUrl ? (
            <BannerImage
              src={coverUrl}
              zoom={coverZoom}
              positionX={coverPositionX}
              positionY={coverPositionY}
              alt="Profile cover"
            />
          ) : (
            <div className={`absolute inset-0 ${bannerStyles[coverStyle]}`} />
          )}

          {/* Gradient overlay — bottom fade so avatar area reads cleanly */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 z-10 pointer-events-none" />

          {/* Floating controls */}
          <div className="absolute inset-x-0 top-4 z-20">
            <div className="max-w-5xl mx-auto px-4 md:px-6 w-full flex items-center justify-between">
              <Link
                to="/"
                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/50 border border-white/15 text-white backdrop-blur-sm hover:bg-black/70 active:scale-95 transition-all shadow-md"
                aria-label="Back to feed"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>

              {isOwnProfile && (
                <Link
                  to="/settings"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm hover:bg-black/70 active:scale-95 transition-all shadow-md"
                >
                  <span>Edit Cover</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Avatar — anchored to the bottom of the cover, overlapping 50% */}
        {/* z-20 keeps it above the cover; the wrapper has no overflow-hidden  */}
        <div className="absolute bottom-0 translate-y-1/2 left-0 right-0 z-20 pointer-events-none">
          <div className="w-full lg:pl-[260px]">
            <div className="w-full max-w-5xl mx-auto px-4 md:px-6">
              <div
                className="w-[88px] h-[88px] sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-4 border-white dark:border-zinc-950 shadow-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden pointer-events-auto flex-shrink-0"
              >
                <Avatar
                  src={profile.avatar_url}
                  alt={profile.full_name || profile.username}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* End cover+avatar wrapper */}

      {/* ─── Main Content ───────────────────────────────────────────────────── */}
      <div className="w-full lg:pl-[260px] relative z-10">
        <div className="w-full max-w-5xl mx-auto px-0 md:px-6">
          <div className="w-full bg-white dark:bg-zinc-950 rounded-none md:rounded-3xl border-0 md:border border-zinc-200 dark:border-zinc-800 shadow-none md:shadow-xl overflow-visible pb-8">

            {/* Spacer equal to the half-avatar height so content starts below avatar */}
            <div className="h-[44px] sm:h-[56px] md:h-[64px]" aria-hidden="true" />

            {/* Profile Content Area */}
            <div className="px-4 md:px-8">

              {/* Name + Action Buttons row */}
              <div className="flex items-start justify-between gap-3 mb-3">
                {/* Name block — sits flush after the spacer */}
                <div className="space-y-1 flex flex-col items-start min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight leading-tight truncate max-w-[260px] sm:max-w-none flex items-center gap-2">
                    {profile.full_name || profile.username}
                    {SHOW_VERIFICATION_FEATURE && profile.student_verified && <VerificationBadge type="student" />}
                    {SHOW_VERIFICATION_FEATURE && profile.founder_verified && <VerificationBadge type="founder" />}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                      Founder
                    </span>

                    {/* Online Status Badge */}
                    <div className="flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 px-2.5 py-0.5 text-[10px] dark:bg-zinc-900/50">
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
                  <p className="text-xs sm:text-sm font-semibold text-zinc-400 dark:text-zinc-500">@{profile.username}</p>
                </div>

                {/* Desktop Action Buttons */}
                {renderActionButtons(false)}
              </div>

              {/* Bio / Tagline */}
              {(profile.headline || profile.bio) && (
                <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal max-w-2xl text-left mb-4">
                  {profile.headline || (profile.bio ? (profile.bio.length > 160 ? profile.bio.slice(0, 160) + '...' : profile.bio) : '')}
                </p>
              )}

              {/* Founder Credibility Strip */}
              {(() => {
                const showJoinDate = profile.created_at;
                const showProductCount = products.length > 0;
                const showActive = profile.last_seen;

                if (!showJoinDate && !showProductCount && !showActive) return null;

                return (
                  <div className="flex flex-wrap items-center justify-start gap-x-4 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-900/60 pt-3 mb-4 w-full">
                    {showJoinDate && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-sm">🚀</span>
                        <span>Founder since <strong className="text-zinc-700 dark:text-zinc-300 font-semibold">{new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}</strong></span>
                      </span>
                    )}
                    {showJoinDate && showProductCount && <span className="text-zinc-300 dark:text-zinc-800 hidden sm:inline">&bull;</span>}
                    {showProductCount && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-sm">📦</span>
                        <span><strong className="text-zinc-700 dark:text-zinc-300 font-semibold">{products.length}</strong> {products.length === 1 ? 'Product' : 'Products'} launched</span>
                      </span>
                    )}
                    {((showJoinDate || showProductCount) && showActive) && <span className="text-zinc-300 dark:text-zinc-800 hidden sm:inline">&bull;</span>}
                    {showActive && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-sm">🔥</span>
                        <span>Active recently</span>
                      </span>
                    )}
                    <span className="text-zinc-300 dark:text-zinc-800 hidden sm:inline">&bull;</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-sm">⭐</span>
                      <span>Early Community Member</span>
                    </span>
                  </div>
                );
              })()}

              {/* Mobile Action Buttons */}
              {renderActionButtons(true)}

              {/* Stats Cards */}
              {(() => {
                const totalUpvotes = products.reduce((acc, p) => acc + (p.upvote_count || 0), 0);
                let reputation = 'New';
                if (totalUpvotes >= 50) {
                  reputation = 'Elite';
                } else if (totalUpvotes >= 10 || products.length > 1) {
                  reputation = 'Rising Star';
                } else if (products.length > 0 || (profile.connections || 0) > 2) {
                  reputation = 'Active';
                }

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 w-full">
                    {[
                      { label: 'Products', value: products.length || 0, icon: '🚀', id: 'products-section' },
                      { label: 'Connections', value: profile.connections || 0, icon: '🤝', id: 'connection-requests-section' },
                      { label: 'Posts', value: discussions.length || 0, icon: '📝', id: 'timeline-section' },
                      { label: 'Reputation', value: reputation, icon: '⭐', id: 'about-section' }
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        onClick={() => {
                          const targetId = stat.label === 'Posts' ? 'timeline-section' : stat.id;
                          const targetElement = document.getElementById(targetId);
                          if (targetElement) {
                            targetElement.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        className="flex flex-col items-center justify-center text-center p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm hover:shadow-md hover:border-orange-500/30 dark:hover:border-orange-500/25 transition-all duration-200 cursor-pointer group w-full relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-br from-zinc-500/5 to-transparent rounded-bl-full pointer-events-none" />
                        <span className="text-lg mb-1">{stat.icon}</span>
                        <span className="text-[10px] sm:text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                          {stat.label}
                        </span>
                        <span className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white mt-0.5 group-hover:text-orange-500 transition-colors">
                          {stat.value}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Social Links */}
              {profileLinks.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-3 justify-start">
                  {profileLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <a
                        key={item.label}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-200 hover:border-orange-500 dark:hover:border-orange-400 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-500/5 transition-all shadow-sm"
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {actionMessage && (
              <div className="mx-4 md:mx-8 mt-4 rounded-xl border border-orange-300/40 bg-orange-50/80 px-4 py-3 text-sm text-orange-700 dark:bg-orange-950/30 dark:text-orange-300">
                {actionMessage}
              </div>
            )}

              {/* Connection requests section with clean empty states */}
              {isOwnProfile && (
                <div id="connection-requests-section" className="mx-4 md:mx-8 mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/10 dark:bg-zinc-950/10 overflow-hidden text-left shadow-sm">
                  <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Connection requests</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Respond to founders who want to connect with you.</p>
                    </div>
                    {incomingRequests.length > 0 && (
                      <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs text-white font-bold">{incomingRequests.length}</span>
                    )}
                  </div>
                  {incomingRequests.length > 0 ? (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                      {incomingRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-3.5 gap-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar src={request.sender?.avatar_url || ''} alt={request.sender?.full_name || request.sender?.username} size="xs" />
                            <div>
                              <p className="text-xs font-bold text-zinc-900 dark:text-white">{request.sender?.full_name || request.sender?.username}</p>
                              <p className="text-[10px] text-zinc-500">@{request.sender?.username}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="text-xs py-1 px-3 h-8 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition" loading={connectLoading} onClick={() => { setConnectionRequestId(request.id); handleAcceptConnectionRequest(); }}>Accept</Button>
                            <Button size="sm" variant="outline" className="text-xs py-1 px-3 h-8 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg transition" loading={connectLoading} onClick={() => { setConnectionRequestId(request.id); handleRejectConnectionRequest(); }}>Reject</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center flex flex-col items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-400 flex items-center justify-center mb-2">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <p className="text-xs text-zinc-500 font-medium">You're all caught up! No pending connection requests.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Currently Building Spotlight Section */}
              {products.length > 0 ? (
                <div className="mx-4 md:mx-8 mt-6 p-5 border border-orange-500/20 bg-gradient-to-br from-orange-50/40 via-white to-zinc-50/30 dark:from-orange-950/10 dark:via-zinc-950 dark:to-zinc-950/50 rounded-2xl shadow-sm text-left relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-bl-full blur-xl pointer-events-none" />
                  
                  <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] uppercase text-orange-500 mb-3.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                    </span>
                    Currently Building
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
                    <div className="flex gap-4.5 items-start flex-1 min-w-0">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex-shrink-0 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                        {products[0].logo_url ? (
                          <img src={products[0].logo_url} alt={products[0].name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl font-black text-zinc-400 dark:text-zinc-500">{products[0].name[0]}</span>
                        )}
                      </div>
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white leading-tight">{products[0].name}</h3>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-orange-200/50 bg-orange-50/50 font-bold text-orange-600 dark:border-orange-950/40 dark:bg-orange-950/20 uppercase tracking-wider">{products[0].category}</span>
                        </div>
                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 leading-snug">{products[0].tagline}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">{products[0].description}</p>
                        
                        {/* Spotlight Metadata Row */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-400 dark:text-zinc-400 pt-1.5 font-medium">
                          <span>Launched {new Date(products[0].created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          <span>&bull;</span>
                          <span className="font-semibold text-zinc-600 dark:text-zinc-400">{products[0].upvote_count || 0} Upvotes</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons Right */}
                    <div className="flex flex-row md:flex-col gap-2.5 items-center md:items-end justify-between w-full md:w-auto pt-4 md:pt-0 border-t border-zinc-100 dark:border-zinc-900 md:border-0">
                      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        {products[0].website_url && (
                          <a
                            href={products[0].website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:border-orange-500 dark:hover:border-orange-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors shadow-sm"
                          >
                            <span>Visit Site</span>
                            <Globe className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <Link
                          to={`/product/${products[0].id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-xs font-bold text-white dark:text-zinc-900 transition-colors shadow-sm"
                        >
                          <span>View Details</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ) : isOwnProfile ? (
                <div className="mx-4 md:mx-8 mt-6 p-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/30 dark:bg-zinc-950/20 text-center flex flex-col items-center justify-center shadow-sm">
                  <Sparkles className="w-6 h-6 text-orange-400 mb-2" />
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Feature Your Startup</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">Launch a product on StartupHub to feature it prominently here as currently building!</p>
                  <Link to="/launch" className="mt-3.5 inline-flex items-center gap-1 text-[11px] font-bold text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-xl shadow-sm transition">
                    Launch Startup &rarr;
                  </Link>
                </div>
              ) : null}

              {/* About Section */}
              <section id="about-section" className="px-4 md:px-8 pt-6 text-left border-t border-zinc-200 dark:border-zinc-900/60 mt-6">
                <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white mb-4">
                  <Briefcase className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  <h2 className="text-lg font-bold tracking-tight">About the Founder</h2>
                </div>
                <div className="prose dark:prose-invert max-w-none">
                  {profile.bio ? (
                    <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {profile.bio}
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-400 italic">No biography details added yet. Add details in Settings to highlight your founder journey.</p>
                  )}
                </div>
                
                {/* Education Sub-Section if present */}
                {profile.college_name && (
                  <div className="mt-6 flex items-start gap-3 rounded-2xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-950/20 p-4.5">
                    <GraduationCap className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Education</h4>
                      <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mt-1">{profile.college_name}</p>
                      {profile.studying_year && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Year of study: {profile.studying_year}</p>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* Skills & Achievements Section */}
              {((profile.skills && profile.skills.length > 0) || (profile.achievements && profile.achievements.length > 0)) && (
                <section className="px-4 md:px-8 pt-6 text-left border-t border-zinc-200 dark:border-zinc-900/60 mt-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Skills Column */}
                    {profile.skills && profile.skills.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white">
                          <Sparkles className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          <h3 className="text-base font-bold tracking-tight">Skills & Expertise</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {profile.skills.map((skill) => (
                            <span
                              key={skill}
                              className="text-xs font-bold px-3 py-1.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-100 hover:border-orange-500/30 hover:text-orange-500 transition-colors shadow-sm"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Achievements Column */}
                    {profile.achievements && profile.achievements.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white">
                          <Award className="w-5 h-5 text-violet-500 flex-shrink-0" />
                          <h3 className="text-base font-bold tracking-tight">Focus & Achievements</h3>
                        </div>
                        <div className="grid gap-3">
                          {profile.achievements.map((ach) => (
                            <div 
                              key={ach} 
                              className="flex items-start gap-2.5 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-950/20"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-2 flex-shrink-0" />
                              <span className="text-xs md:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-semibold">{ach}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Recent Products Grid with polished Empty State */}
              <section id="products-section" className="px-4 md:px-8 pt-6 text-left border-t border-zinc-200 dark:border-zinc-900/60 mt-6">
                <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white mb-4">
                  <Layers className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  <h2 className="text-lg font-bold tracking-tight">Recent Startups & Products</h2>
                </div>
                
                {products.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-950/20 p-8 text-center flex flex-col items-center justify-center shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-500 flex items-center justify-center mb-3">
                      <Layers className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">No Startups Launched</h4>
                    <p className="text-xs text-zinc-500 max-w-xs">
                      {isOwnProfile
                        ? "You haven't launched any products yet. Launch your first product on StartupHub to showcase it here."
                        : 'This founder has not launched any products yet.'}
                    </p>
                    {isOwnProfile && (
                      <Link to="/launch" className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white rounded-xl transition shadow-sm">
                        Launch Startup &rarr;
                      </Link>
                    )}
                  </div>
                )}
              </section>

              {/* Saved Startups Section (Private, only visible to profile owner) with polished Empty State */}
              {isOwnProfile && (
                <section className="px-4 md:px-8 pt-6 text-left border-t border-zinc-200 dark:border-zinc-900/60 mt-6">
                  <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white mb-4">
                    <CheckCircle className="w-5 h-5 text-sky-500 flex-shrink-0" />
                    <h2 className="text-lg font-bold tracking-tight">Saved Startups</h2>
                  </div>
                  
                  {savedLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
                    </div>
                  ) : bookmarks.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {bookmarks.map((bookmark) =>
                        bookmark.products ? <ProductCard key={bookmark.id} product={bookmark.products} /> : null
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-950/20 p-8 text-center flex flex-col items-center justify-center shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-955/40 text-sky-500 flex items-center justify-center mb-3">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">No Saved Startups</h4>
                      <p className="text-xs text-zinc-500 max-w-xs">No saved startups yet. Save products from the feed to build your collection.</p>
                    </div>
                  )}
                </section>
              )}

              {/* Recent Activity Timeline Section with polished Empty State */}
              <section id="timeline-section" className="px-4 md:px-8 pt-6 text-left border-t border-zinc-200 dark:border-zinc-900/60 mt-6">
                <div className="flex items-center gap-2.5 text-zinc-900 dark:text-white mb-4">
                  <Activity className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  <h2 className="text-lg font-bold tracking-tight">Recent Activity</h2>
                </div>
                
                {timelineEvents.length > 0 ? (
                  <div className="relative border-l border-zinc-200 dark:border-zinc-800 ml-4 pl-6 space-y-6 pt-2 text-left">
                    {timelineEvents.map((event) => {
                      const isProduct = event.type === 'product';
                      return (
                        <div key={event.id} className="relative">
                          {/* Timeline dot */}
                          <div className={`absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full border-2 border-white dark:border-zinc-950 flex items-center justify-center ${
                            isProduct ? 'bg-orange-500' : 'bg-sky-500'
                          }`}>
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>

                          {/* Event card */}
                          <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-orange-500/20 hover:shadow-md transition-all shadow-sm">
                            <div className="flex justify-between items-start gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                </div>
                                <h4 className="text-sm font-bold text-zinc-900 dark:text-white mt-1 hover:text-orange-500 transition-colors">
                                  <Link to={event.link}>{event.title}</Link>
                                </h4>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{event.subtitle}</p>
                                <div className="flex gap-2 items-center mt-3 flex-wrap font-medium">
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 uppercase tracking-wide border border-zinc-100 dark:border-zinc-900">
                                    {event.category}
                                  </span>
                                  <span className="text-zinc-300 dark:text-zinc-800 font-bold">&bull;</span>
                                  <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                                    {event.upvotes} upvotes
                                  </span>
                                </div>
                              </div>
                              
                              <Link
                                to={event.link}
                                className="text-xs font-bold text-orange-500 hover:text-orange-600 flex-shrink-0 border border-orange-500/15 hover:border-orange-500/35 rounded-xl px-3 py-1.5 bg-orange-500/5 hover:bg-orange-500/10 transition-colors h-8 flex items-center justify-center"
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
                  <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-950/20 p-8 text-center flex flex-col items-center justify-center shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-950/40 text-sky-500 flex items-center justify-center mb-3">
                      <Activity className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">No Activity</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">No activity milestones or discussions recorded yet.</p>
                  </div>
                )}
              </section>

            </div>
          </div>
        </div>
      </div>
  );
}
