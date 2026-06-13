import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Minus,
  Medal,
  Star,
  Zap,
  Rocket,
  RefreshCw,
  ChevronRight,
  MessageSquare,
  ThumbsUp,
  Users,
  Crown,
  Flame,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Avatar } from '../components/ui/Avatar';

// ─── Types ─────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  id: string;
  name: string;
  tagline: string;
  category: string;
  logo_url: string | null;
  upvote_count: number;
  comment_count: number;
  follower_count: number;
  created_at: string;
  score: number;
  rank: number;
  prev_rank?: number;
  founder_name: string | null;
  founder_username: string | null;
  founder_avatar: string | null;
  student_verified?: boolean;
  badges: BadgeId[];
}

type BadgeId = 'top1' | 'top10' | 'top50' | 'trending' | 'fast_growing' | 'new_launch';

type TabId =
  | 'overall'
  | 'trending_week'
  | 'new_launches'
  | 'ai'
  | 'saas'
  | 'mobile'
  | 'web3'
  | 'student';

// ─── Constants ─────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overall', label: 'Overall', icon: Trophy },
  { id: 'trending_week', label: 'Trending This Week', icon: Flame },
  { id: 'new_launches', label: 'New Launches', icon: Rocket },
  { id: 'ai', label: 'AI Startups', icon: Sparkles },
  { id: 'saas', label: 'SaaS', icon: Zap },
  { id: 'mobile', label: 'Mobile Apps', icon: Star },
  { id: 'web3', label: 'Web3', icon: TrendingUp },
  { id: 'student', label: 'Student Startups', icon: Medal },
];

const BADGE_CONFIG: Record<BadgeId, { label: string; color: string; icon: React.ElementType }> = {
  top1: { label: 'Top 1 Startup', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300 dark:border-amber-700', icon: Crown },
  top10: { label: 'Top 10 Startup', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 dark:border-orange-700', icon: Trophy },
  top50: { label: 'Top 50 Startup', color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-300 dark:border-zinc-600', icon: Medal },
  trending: { label: 'Trending Startup', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-300 dark:border-rose-700', icon: Flame },
  fast_growing: { label: 'Fast Growing Startup', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700', icon: TrendingUp },
  new_launch: { label: 'New Launch', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-300 dark:border-sky-700', icon: Rocket },
};

// ─── Score Formula ──────────────────────────────────────────────────────────
// score = (upvotes × 5) + (comments × 2) + (followers × 3) + (profile_views × 0.1)

function computeScore(upvotes: number, comments: number, followers: number, profileViews: number = 0): number {
  return upvotes * 5 + comments * 2 + followers * 3 + profileViews * 0.1;
}

function assignBadges(entry: Omit<LeaderboardEntry, 'badges'>, rank: number, createdAt: string): BadgeId[] {
  const badges: BadgeId[] = [];
  if (rank === 1) badges.push('top1');
  else if (rank <= 10) badges.push('top10');
  else if (rank <= 50) badges.push('top50');

  const daysSinceLaunch = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLaunch <= 7) badges.push('new_launch');

  // Fast-growing: high comment ratio relative to upvotes (engagement)
  if (entry.comment_count > 0 && entry.upvote_count > 0) {
    const engagementRatio = entry.comment_count / entry.upvote_count;
    if (engagementRatio > 0.3 && entry.upvote_count >= 5) badges.push('fast_growing');
  }

  // Trending: launched recently and has good upvote velocity
  if (daysSinceLaunch <= 14 && entry.upvote_count >= 3) badges.push('trending');

  return badges;
}

// ─── Rank Medal ─────────────────────────────────────────────────────────────

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-md shadow-amber-500/30">
        <Crown className="w-4 h-4 text-white" />
      </span>
    );
  if (rank === 2)
    return (
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-400 shadow-md">
        <span className="text-white font-black text-xs">2</span>
      </span>
    );
  if (rank === 3)
    return (
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 shadow-md">
        <span className="text-white font-black text-xs">3</span>
      </span>
    );
  return (
    <span className="flex items-center justify-center w-8 h-8 text-sm font-black text-zinc-400 dark:text-zinc-500">
      {rank}
    </span>
  );
}

// ─── Movement Indicator ─────────────────────────────────────────────────────

function MovementIndicator({ current, prev }: { current: number; prev?: number }) {
  if (prev === undefined || prev === current)
    return <Minus className="w-3.5 h-3.5 text-zinc-400" />;
  if (current < prev)
    return (
      <span className="flex items-center gap-0.5 text-emerald-500">
        <ArrowUp className="w-3.5 h-3.5" />
        <span className="text-[10px] font-bold">{prev - current}</span>
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-red-500">
      <ArrowDown className="w-3.5 h-3.5" />
      <span className="text-[10px] font-bold">{current - prev}</span>
    </span>
  );
}

// ─── Badge Chips ─────────────────────────────────────────────────────────────

function BadgeChips({ badges }: { badges: BadgeId[] }) {
  if (!badges.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {badges.slice(0, 2).map((id) => {
        const cfg = BADGE_CONFIG[id];
        const Icon = cfg.icon;
        return (
          <span
            key={id}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-bold ${cfg.color}`}
          >
            <Icon className="w-2.5 h-2.5" />
            {cfg.label}
          </span>
        );
      })}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overall');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchLeaderboard = useCallback(async (tab: TabId) => {
    setLoading(true);
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // Build the base query — join comments and upvotes count, both total and historical (before 24h ago)
      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          tagline,
          category,
          logo_url,
          upvote_count,
          created_at,
          profiles:user_id (
            full_name,
            username,
            avatar_url,
            student_verified,
            followers_all:follows!follows_followed_id_fkey(count),
            followers_historical:follows!follows_followed_id_fkey(count)
          ),
          comments_all:comments(count),
          comments_historical:comments(count),
          upvotes_all:upvotes(count),
          upvotes_historical:upvotes(count)
        `)
        .filter('upvotes_historical.created_at', 'lt', oneDayAgo)
        .filter('comments_historical.created_at', 'lt', oneDayAgo)
        .filter('profiles.followers_historical.created_at', 'lt', oneDayAgo);

      // Apply tab filters
      const now = new Date();
      if (tab === 'trending_week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', weekAgo);
      } else if (tab === 'new_launches') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', monthAgo);
      } else if (tab === 'ai') {
        query = query.ilike('category', '%ai%');
      } else if (tab === 'saas') {
        query = query.ilike('category', '%saas%');
      } else if (tab === 'mobile') {
        query = query.ilike('category', '%mobile%');
      } else if (tab === 'web3') {
        query = query.ilike('category', '%web3%');
      } else if (tab === 'student') {
        query = query.not('user_id', 'is', null);
      }

      query = query.limit(100);

      const { data, error } = await query;
      if (error) throw error;

      let rows = (data ?? []) as any[];

      // Client-side student filter
      if (tab === 'student') {
        rows = rows.filter((r: any) => r.profiles?.student_verified === true);
      }

      // Map rows with current and historical scores
      const mapped = rows.map((r: any) => {
        const upvotesAll = Array.isArray(r.upvotes_all) ? (r.upvotes_all[0]?.count ?? 0) : (r.upvotes_all?.count ?? 0);
        const upvotesHist = Array.isArray(r.upvotes_historical) ? (r.upvotes_historical[0]?.count ?? 0) : (r.upvotes_historical?.count ?? 0);

        const commentsAll = Array.isArray(r.comments_all) ? (r.comments_all[0]?.count ?? 0) : (r.comments_all?.count ?? 0);
        const commentsHist = Array.isArray(r.comments_historical) ? (r.comments_historical[0]?.count ?? 0) : (r.comments_historical?.count ?? 0);

        const profileFollowersAll = r.profiles
          ? (Array.isArray(r.profiles.followers_all) ? (r.profiles.followers_all[0]?.count ?? 0) : (r.profiles.followers_all?.count ?? 0))
          : 0;
        const profileFollowersHist = r.profiles
          ? (Array.isArray(r.profiles.followers_historical) ? (r.profiles.followers_historical[0]?.count ?? 0) : (r.profiles.followers_historical?.count ?? 0))
          : 0;

        // score formula: (upvotes * 5) + (comments * 2) + (followers * 3) + (profile_views * 0.1)
        // profile_views is currently not in DB, so we treat it as 0
        const score = computeScore(upvotesAll, commentsAll, profileFollowersAll, 0);
        const scoreHist = computeScore(upvotesHist, commentsHist, profileFollowersHist, 0);

        return {
          id: r.id,
          name: r.name,
          tagline: r.tagline ?? '',
          category: r.category ?? '',
          logo_url: r.logo_url ?? null,
          upvote_count: upvotesAll,
          comment_count: commentsAll,
          follower_count: profileFollowersAll,
          created_at: r.created_at,
          score,
          scoreHist,
          founder_name: r.profiles?.full_name ?? r.profiles?.username ?? null,
          founder_username: r.profiles?.username ?? null,
          founder_avatar: r.profiles?.avatar_url ?? null,
          student_verified: r.profiles?.student_verified ?? false,
        };
      });

      // Compute rank movement
      // 1. Sort by historical score to get previous ranks
      const prevSorted = [...mapped].sort((a, b) => b.scoreHist - a.scoreHist);
      const prevRanksMap: Record<string, number> = {};
      prevSorted.forEach((item, idx) => {
        prevRanksMap[item.id] = idx + 1;
      });

      // 2. Sort by current score to get current ranks
      const currentSorted = [...mapped].sort((a, b) => b.score - a.score);
      const ranked: LeaderboardEntry[] = currentSorted.map((entry, idx) => {
        const rank = idx + 1;
        return {
          ...entry,
          rank,
          prev_rank: prevRanksMap[entry.id],
          badges: assignBadges(entry as any, rank, entry.created_at),
        };
      });

      setEntries(ranked);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('[Leaderboard] Fetch failed:', err);
      // Try simplified fallback without followers or nested count filter
      try {
        let fallback = supabase
          .from('products')
          .select(`
            id, name, tagline, category, logo_url, upvote_count, created_at,
            profiles:user_id(full_name, username, avatar_url, student_verified),
            comments:comments(count)
          `)
          .limit(100);

        if (activeTab === 'ai') fallback = fallback.ilike('category', '%ai%');
        else if (activeTab === 'saas') fallback = fallback.ilike('category', '%saas%');
        else if (activeTab === 'mobile') fallback = fallback.ilike('category', '%mobile%');
        else if (activeTab === 'web3') fallback = fallback.ilike('category', '%web3%');

        const { data: fb } = await fallback;
        let fbRows = (fb ?? []) as any[];

        if (activeTab === 'student') {
          fbRows = fbRows.filter((r: any) => r.profiles?.student_verified === true);
        }

        const fbMapped = fbRows.map((r: any) => {
          const commentCnt = Array.isArray(r.comments)
            ? (r.comments[0]?.count ?? 0)
            : (r.comments?.count ?? 0);
          return {
            id: r.id,
            name: r.name,
            tagline: r.tagline ?? '',
            category: r.category ?? '',
            logo_url: r.logo_url ?? null,
            upvote_count: r.upvote_count ?? 0,
            comment_count: commentCnt,
            follower_count: 0,
            created_at: r.created_at,
            score: computeScore(r.upvote_count ?? 0, commentCnt, 0, 0),
            founder_name: r.profiles?.full_name ?? r.profiles?.username ?? null,
            founder_username: r.profiles?.username ?? null,
            founder_avatar: r.profiles?.avatar_url ?? null,
            student_verified: r.profiles?.student_verified ?? false,
          };
        });

        fbMapped.sort((a, b) => b.score - a.score);
        setEntries(
          fbMapped.map((e, i) => ({
            ...e,
            rank: i + 1,
            badges: assignBadges(e as any, i + 1, e.created_at),
          }))
        );
      } catch {
        setEntries([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLeaderboard(activeTab);
  }, [activeTab, fetchLeaderboard]);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="w-full max-w-none min-w-0 pb-16 space-y-8">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-3 tracking-tight">
              <Trophy className="w-7 h-7 text-orange-500 flex-shrink-0" />
              Startup Leaderboard
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1.5 text-sm max-w-xl">
              Real-time rankings based on community upvotes, engagement, and growth. Updated live from the database.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>Updated {lastRefresh.toLocaleTimeString()}</span>
            <button
              onClick={() => void fetchLeaderboard(activeTab)}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Score formula callout */}
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
          <span className="font-bold text-zinc-700 dark:text-zinc-300">Score formula:</span>
          <code className="font-mono text-orange-500">(upvotes × 5) + (comments × 2) + (followers × 3)</code>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                active
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {loading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 animate-pulse"
                />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <Trophy className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
              <p className="font-bold text-zinc-600 dark:text-zinc-400 text-sm mb-1">
                No startups in this category yet
              </p>
              <p className="text-zinc-400 text-xs">
                Be the first to launch a startup here!
              </p>
              <Link
                to="/launch"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-colors"
              >
                Launch Now <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-6">

              {/* ── Podium (Top 3) ──── */}
              {top3.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* 2nd place */}
                  {top3[1] && (
                    <PodiumCard entry={top3[1]} podiumPos={2} />
                  )}
                  {/* 1st place — center and elevated */}
                  <PodiumCard entry={top3[0]} podiumPos={1} />
                  {/* 3rd place */}
                  {top3[2] && (
                    <PodiumCard entry={top3[2]} podiumPos={3} />
                  )}
                </div>
              )}

              {/* ── Full Table ──────── */}
              {rest.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                  {/* Table header */}
                  <div className="grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2.5rem_1fr_6rem_6rem_6rem_6rem_7rem] gap-3 px-5 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    <span className="text-center">#</span>
                    <span>Startup</span>
                    <span className="hidden sm:block text-center">Upvotes</span>
                    <span className="hidden sm:block text-center">Comments</span>
                    <span className="hidden sm:block text-center">Followers</span>
                    <span className="hidden sm:block text-right">Score</span>
                    <span className="text-right">Move</span>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                    {rest.map((entry) => (
                      <LeaderboardRow key={entry.id} entry={entry} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Podium Card ─────────────────────────────────────────────────────────────

function PodiumCard({ entry, podiumPos }: { entry: LeaderboardEntry; podiumPos: 1 | 2 | 3 }) {
  const isFirst = podiumPos === 1;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: podiumPos * 0.05 }}
      className={`relative flex flex-col items-center text-center p-5 rounded-2xl border transition-all ${
        isFirst
          ? 'bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/20 dark:to-zinc-900 border-amber-300 dark:border-amber-700 shadow-lg shadow-amber-500/10 sm:-mt-4'
          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
      }`}
    >
      {isFirst && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow">
          <Crown className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      <RankMedal rank={entry.rank} />

      <Link to={`/product/${entry.id}`} className="mt-3 group">
        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 mx-auto shadow-sm group-hover:ring-2 group-hover:ring-orange-500/30 transition-all">
          {entry.logo_url ? (
            <img src={entry.logo_url} alt={entry.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-lg">
              {entry.name[0]}
            </div>
          )}
        </div>
        <p className="mt-2 font-black text-zinc-900 dark:text-white text-sm group-hover:text-orange-500 transition-colors line-clamp-1">
          {entry.name}
        </p>
      </Link>

      {entry.founder_username && (
        <Link
          to={`/profile/${entry.founder_username}`}
          className="flex items-center gap-1.5 mt-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          <Avatar src={entry.founder_avatar} alt={entry.founder_name ?? ''} size="xs" />
          <span className="truncate max-w-[100px]">{entry.founder_name}</span>
        </Link>
      )}

      <BadgeChips badges={entry.badges} />

      <div className="mt-3 w-full pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-sm font-black text-orange-500">{entry.upvote_count}</p>
          <p className="text-[10px] text-zinc-500">Upvotes</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-zinc-700 dark:text-zinc-300">{entry.comment_count}</p>
          <p className="text-[10px] text-zinc-500">Comments</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-zinc-700 dark:text-zinc-300">{entry.score}</p>
          <p className="text-[10px] text-zinc-500">Score</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Leaderboard Table Row ───────────────────────────────────────────────────

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2.5rem_1fr_6rem_6rem_6rem_6rem_7rem] gap-3 px-5 py-4 items-center hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20 transition-colors"
    >
      {/* Rank */}
      <div className="flex justify-center">
        <RankMedal rank={entry.rank} />
      </div>

      {/* Startup info */}
      <div className="flex items-center gap-3 min-w-0">
        <Link to={`/product/${entry.id}`} className="flex-shrink-0">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 hover:ring-2 hover:ring-orange-500/30 transition-all">
            {entry.logo_url ? (
              <img src={entry.logo_url} alt={entry.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-sm">
                {entry.name[0]}
              </div>
            )}
          </div>
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/product/${entry.id}`}
              className="font-bold text-sm text-zinc-900 dark:text-white hover:text-orange-500 transition-colors truncate"
            >
              {entry.name}
            </Link>
            <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 capitalize hidden sm:inline-block">
              {entry.category}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {entry.founder_username && (
              <Link
                to={`/profile/${entry.founder_username}`}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                <Avatar src={entry.founder_avatar} alt={entry.founder_name ?? ''} size="xs" />
                <span className="truncate max-w-[120px]">{entry.founder_name}</span>
              </Link>
            )}
            <BadgeChips badges={entry.badges.slice(0, 1)} />
          </div>
        </div>
      </div>

      {/* Stats — hidden on mobile */}
      <div className="hidden sm:flex justify-center items-center gap-1 text-sm font-bold text-zinc-700 dark:text-zinc-300">
        <ThumbsUp className="w-3.5 h-3.5 text-orange-400" />
        {entry.upvote_count}
      </div>
      <div className="hidden sm:flex justify-center items-center gap-1 text-sm font-bold text-zinc-700 dark:text-zinc-300">
        <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
        {entry.comment_count}
      </div>
      <div className="hidden sm:flex justify-center items-center gap-1 text-sm font-bold text-zinc-700 dark:text-zinc-300">
        <Users className="w-3.5 h-3.5 text-emerald-400" />
        {entry.follower_count}
      </div>

      {/* Score */}
      <div className="hidden sm:flex justify-end">
        <span className="text-sm font-black text-orange-500">{entry.score}</span>
      </div>

      {/* Movement */}
      <div className="flex justify-end">
        <MovementIndicator current={entry.rank} prev={entry.prev_rank} />
      </div>
    </motion.div>
  );
}

export default LeaderboardPage;
