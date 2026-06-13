import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Swords,
  Activity,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Avatar } from '../components/ui/Avatar';
import { StartupBattle } from '../components/StartupBattle';
import { TournamentBracket } from '../components/TournamentBracket';
import { BoostAuctionWidget } from '../components/BoostAuctionWidget';
import { LeaderboardInsights } from '../components/LeaderboardInsights';
import { useAuthStore } from '../store/authStore';

// ─── Types ─────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  id: string;
  user_id: string;
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
  isBoosted?: boolean;
  isMvp?: boolean;
}

type BadgeId = 'top1' | 'top10' | 'top50' | 'trending' | 'fast_growing' | 'new_launch' | 'mvp';

type TabId =
  | 'overall'
  | 'season_week'
  | 'season_month'
  | 'trending_week'
  | 'this_week'
  | 'new_launches'
  | 'ai'
  | 'saas'
  | 'mobile'
  | 'web3'
  | 'student'
  | 'battle'
  | 'tournament';

interface ActivityEvent {
  id: string;
  text: string;
  timestamp: Date;
  type: 'upvote' | 'comment' | 'follow' | 'rank_shift' | 'new_startup';
}

// ─── Constants ─────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overall', label: 'All Time', icon: Trophy },
  { id: 'season_week', label: 'Season Week', icon: Medal },
  { id: 'season_month', label: 'Season Month', icon: Star },
  { id: 'trending_week', label: 'Trending This Week', icon: Flame },
  { id: 'this_week', label: 'This Week', icon: Zap },
  { id: 'new_launches', label: 'New Launches', icon: Rocket },
  { id: 'ai', label: 'AI Startups', icon: Sparkles },
  { id: 'saas', label: 'SaaS', icon: Zap },
  { id: 'mobile', label: 'Mobile Apps', icon: Star },
  { id: 'web3', label: 'Web3', icon: TrendingUp },
  { id: 'student', label: 'Student Startups', icon: Medal },
  { id: 'battle', label: '⚔️ Battle Mode', icon: Swords },
  { id: 'tournament', label: '🏆 Tournament', icon: Trophy },
];

const BADGE_CONFIG: Record<BadgeId, { label: string; color: string; icon: React.ElementType }> = {
  top1: { label: 'Top 1 Startup', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300 dark:border-amber-700', icon: Crown },
  top10: { label: 'Top 10 Startup', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 dark:border-orange-700', icon: Trophy },
  top50: { label: 'Top 50 Startup', color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-300 dark:border-zinc-600', icon: Medal },
  trending: { label: 'Trending Startup', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-300 dark:border-rose-700', icon: Flame },
  fast_growing: { label: 'Fast Growing Startup', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700', icon: TrendingUp },
  new_launch: { label: 'New Launch', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-300 dark:border-sky-700', icon: Rocket },
  mvp: { label: '🔥 MVP Startup', color: 'bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-300 dark:border-red-700 font-extrabold', icon: Crown },
};

const SEASONAL_BADGE_LABELS: Record<BadgeId, string> = {
  top1: '🥇 Season Winner',
  top10: '🏅 Season Top 10',
  top50: 'Season Top 50',
  mvp: '🔥 Season MVP',
  trending: 'Trending',
  fast_growing: 'Fast Growing',
  new_launch: 'New Launch',
};

// ─── Score Formula ──────────────────────────────────────────────────────────
// score = (upvotes × 5) + (comments × 2) + (followers × 3) + (profile_views × 0.1)

function computeScore(upvotes: number, comments: number, followers: number, profileViews: number = 0): number {
  return upvotes * 5 + comments * 2 + followers * 3 + profileViews * 0.1;
}

function assignBadges(entry: Omit<LeaderboardEntry, 'badges'>, rank: number, createdAt: string, isMvp: boolean): BadgeId[] {
  const badges: BadgeId[] = [];
  if (rank === 1) badges.push('top1');
  else if (rank <= 10) badges.push('top10');
  else if (rank <= 50) badges.push('top50');

  if (isMvp) badges.push('mvp');

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

// ─── UTC Seasonal Helpers ───────────────────────────────────────────────────

function getUTCSeasonWeekStart(): Date {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const utcDate = now.getUTCDate();
  const seasonStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    utcDate - utcDay,
    0, 0, 0, 0
  ));
  return seasonStart;
}

function getUTCSeasonMonthStart(): Date {
  const now = new Date();
  const seasonStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    1,
    0, 0, 0, 0
  ));
  return seasonStart;
}

// ─── Gamified Levels Helper ─────────────────────────────────────────────────

function getFounderLevel(entry: { upvote_count: number; comment_count: number; follower_count: number; rank: number }) {
  const upvoteXP = (entry.upvote_count || 0) * 10;
  const commentXP = (entry.comment_count || 0) * 20;
  const followerXP = (entry.follower_count || 0) * 15;
  
  let rankBonus = 0;
  if (entry.rank === 1) rankBonus = 500;
  else if (entry.rank <= 10) rankBonus = 200;
  else if (entry.rank <= 50) rankBonus = 100;
  
  const xp = upvoteXP + commentXP + followerXP + rankBonus;
  const level = Math.floor(xp / 100) + 1;
  
  let title = 'Founder';
  if (level >= 50) title = 'Unicorn';
  else if (level >= 25) title = 'Growth Hacker';
  else if (level >= 10) title = 'Builder';
  
  return { xp, level, title };
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
      <motion.span
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: [1, 1.2, 1], opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex items-center gap-0.5 text-emerald-500 font-extrabold"
      >
        <ArrowUp className="w-3.5 h-3.5 animate-bounce" />
        <span className="text-[10px]">{prev - current}</span>
      </motion.span>
    );
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-0.5 text-red-500 font-extrabold"
    >
      <ArrowDown className="w-3.5 h-3.5" />
      <span className="text-[10px]">{current - prev}</span>
    </motion.span>
  );
}

// ─── Badge Chips ─────────────────────────────────────────────────────────────

function BadgeChips({ badges, isSeasonal }: { badges: BadgeId[]; isSeasonal?: boolean }) {
  if (!badges.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {badges.slice(0, 2).map((id) => {
        const cfg = BADGE_CONFIG[id];
        const Icon = cfg.icon;
        const label = isSeasonal && SEASONAL_BADGE_LABELS[id] ? SEASONAL_BADGE_LABELS[id] : cfg.label;
        return (
          <span
            key={id}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-bold ${cfg.color}`}
          >
            <Icon className="w-2.5 h-2.5" />
            {label}
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
  
  // Real-Time Bidding & expanded row states
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [activeBoost, setActiveBoost] = useState<any | null>(null);
  const [biddingLoading, setBiddingLoading] = useState(false);

  // Refs for tracking changes and lookup caching
  const nameCacheRef = useRef<Record<string, string>>({});
  const prevRankingsRef = useRef<Record<string, number>>({});
  const activeTabRef = useRef<TabId>('overall');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Maintain active tab in ref to avoid resubscribing to Postgres on tab changes
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Caching name resolver
  const getName = useCallback(async (id: string, type: 'product' | 'profile'): Promise<string> => {
    if (nameCacheRef.current[id]) {
      return nameCacheRef.current[id];
    }
    try {
      if (type === 'product') {
        const { data } = await supabase.from('products').select('name').eq('id', id).single();
        if (data?.name) {
          nameCacheRef.current[id] = data.name;
          return data.name;
        }
      } else {
        const { data } = await supabase.from('profiles').select('full_name, username').eq('id', id).single();
        const name = data?.full_name || data?.username || 'Someone';
        nameCacheRef.current[id] = name;
        return name;
      }
    } catch (err) {
      console.error('Error fetching name:', err);
    }
    return type === 'product' ? 'a startup' : 'Someone';
  }, []);

  // Fetch active boost slots from Discussions
  const fetchActiveBoost = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('discussions')
        .select('id, user_id, title, content, created_at')
        .eq('category', 'BoostBid');

      if (error) throw error;
      
      let highestBid = 0;
      let active: any = null;
      const now = Date.now();
      
      if (data) {
        for (const item of data) {
          try {
            const payload = JSON.parse(item.content);
            if (payload.expiresAt > now && payload.bidAmount > highestBid) {
              highestBid = payload.bidAmount;
              active = {
                productId: payload.productId,
                productName: '', 
                logoUrl: null,   
                bidAmount: payload.bidAmount,
                expiresAt: payload.expiresAt,
                user_id: item.user_id,
              };
            }
          } catch (e) {
            // ignore
          }
        }
      }
      setActiveBoost(active);
    } catch (err) {
      console.error('Error fetching active boost:', err);
    }
  }, []);

  const fetchLeaderboard = useCallback(async (tab: TabId) => {
    setLoading(true);
    try {
      const nowTime = Date.now();
      const oneDayAgo = nowTime - 24 * 60 * 60 * 1000;
      const sevenDaysAgo = nowTime - 7 * 24 * 60 * 60 * 1000;
      
      // UTC-based Seasonal start dates
      const seasonWeekStart = getUTCSeasonWeekStart().getTime();
      const seasonMonthStart = getUTCSeasonMonthStart().getTime();

      // Fetch active boost bids in parallel
      await fetchActiveBoost();

      // Build the base query — fetch detailed comments, upvotes, and follows for computing weighted score and weekly stats
      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          tagline,
          category,
          logo_url,
          created_at,
          user_id,
          profiles:user_id (
            id,
            full_name,
            username,
            avatar_url,
            student_verified,
            followers:follows!follows_followed_id_fkey (
              created_at,
              profiles:follower_id (
                created_at,
                student_verified,
                founder_verified
              )
            )
          ),
          comments (
            created_at,
            profiles:user_id (
              created_at,
              student_verified,
              founder_verified
            )
          ),
          upvotes (
            created_at,
            profiles:user_id (
              created_at,
              student_verified,
              founder_verified
            )
          )
        `);

      // Apply tab filters
      if (tab === 'trending_week') {
        const weekAgoStr = new Date(sevenDaysAgo).toISOString();
        query = query.gte('created_at', weekAgoStr);
      } else if (tab === 'season_week') {
        const weekAgoStr = new Date(seasonWeekStart).toISOString();
        query = query.gte('created_at', weekAgoStr);
      } else if (tab === 'season_month') {
        const monthAgoStr = new Date(seasonMonthStart).toISOString();
        query = query.gte('created_at', monthAgoStr);
      } else if (tab === 'new_launches') {
        const monthAgoStr = new Date(nowTime - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', monthAgoStr);
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

      // Helper function to calculate user weights for anti-spam scoring
      const getUserWeightFactor = (profile: any): number => {
        if (!profile) return 1.0;
        const profileCreatedAt = new Date(profile.created_at).getTime();
        const accountAgeInDays = (nowTime - profileCreatedAt) / (1000 * 60 * 60 * 24);
        if (accountAgeInDays < 7) return 0.5; // New users (<7 days)
        if (profile.student_verified === true || profile.founder_verified === true) return 1.2; // Verified users
        return 1.0; // Normal users
      };

      // Helper to compute weighted count over a time range
      const getWeightedCount = (
        items: any[],
        sinceTime?: number,
        beforeTime?: number
      ): number => {
        let sum = 0;
        for (const item of items) {
          const itemTime = new Date(item.created_at).getTime();
          if (sinceTime !== undefined && itemTime < sinceTime) continue;
          if (beforeTime !== undefined && itemTime >= beforeTime) continue;
          const weight = getUserWeightFactor(item.profiles);
          sum += weight;
        }
        return sum;
      };

      // Find the MVP startup ID (the one with the highest overall upvote count)
      let mvpStartupId = '';
      let maxUpvotes = -1;
      rows.forEach((r: any) => {
        const upvotesCount = (r.upvotes || []).length;
        if (upvotesCount > maxUpvotes) {
          maxUpvotes = upvotesCount;
          mvpStartupId = r.id;
        }
      });

      // Map rows with current, historical, and weekly scores
      const mapped = rows.map((r: any) => {
        const upvotesList = r.upvotes || [];
        const commentsList = r.comments || [];
        const followersList = r.profiles?.followers || [];

        // Raw counts for caching/displaying
        const rawUpvotes = upvotesList.length;
        const rawComments = commentsList.length;
        const rawFollowers = followersList.length;

        // Populate lookup cache for realtime feed optimization
        nameCacheRef.current[r.id] = r.name;
        if (r.profiles?.id) {
          nameCacheRef.current[r.profiles.id] = r.profiles.full_name || r.profiles.username || 'Founder';
        }

        // Active Boost multiplier logic (derived from Supabase Discussions BoostBid)
        const isBoosted = activeBoost && activeBoost.productId === r.id;
        // Bid-based boost factor from 1.2x to 1.5x
        const boostMultiplier = isBoosted ? (1.2 + Math.min(0.3, (activeBoost?.bidAmount || 0) / 10000)) : 1;

        // Current weighted counts
        const currentUpvotes = getWeightedCount(upvotesList);
        const currentComments = getWeightedCount(commentsList);
        const currentFollowers = getWeightedCount(followersList);

        // Historical weighted counts (before 24 hours ago)
        const histUpvotes = getWeightedCount(upvotesList, undefined, oneDayAgo);
        const histComments = getWeightedCount(commentsList, undefined, oneDayAgo);
        const histFollowers = getWeightedCount(followersList, undefined, oneDayAgo);

        // Weekly activity weighted counts (last 7 days)
        const weeklyUpvotes = getWeightedCount(upvotesList, sevenDaysAgo);
        const weeklyComments = getWeightedCount(commentsList, sevenDaysAgo);
        const weeklyFollowers = getWeightedCount(followersList, sevenDaysAgo);

        // Score calculations
        let score = 0;
        let scoreHist = 0;
        let displayUpvotes = rawUpvotes;
        let displayComments = rawComments;
        let displayFollowers = rawFollowers;

        if (tab === 'this_week') {
          score = computeScore(weeklyUpvotes, weeklyComments, weeklyFollowers, 0) * boostMultiplier;
          scoreHist = computeScore(
            getWeightedCount(upvotesList, sevenDaysAgo, oneDayAgo),
            getWeightedCount(commentsList, sevenDaysAgo, oneDayAgo),
            getWeightedCount(followersList, sevenDaysAgo, oneDayAgo),
            0
          ) * boostMultiplier;
          displayUpvotes = upvotesList.filter((x: any) => new Date(x.created_at).getTime() >= sevenDaysAgo).length;
          displayComments = commentsList.filter((x: any) => new Date(x.created_at).getTime() >= sevenDaysAgo).length;
          displayFollowers = followersList.filter((x: any) => new Date(x.created_at).getTime() >= sevenDaysAgo).length;
        } else if (tab === 'season_week') {
          const seasonUpvotes = getWeightedCount(upvotesList, seasonWeekStart);
          const seasonComments = getWeightedCount(commentsList, seasonWeekStart);
          const seasonFollowers = getWeightedCount(followersList, seasonWeekStart);
          score = computeScore(seasonUpvotes, seasonComments, seasonFollowers, 0) * boostMultiplier;
          
          const seasonUpvotesHist = getWeightedCount(upvotesList, seasonWeekStart, oneDayAgo);
          const seasonCommentsHist = getWeightedCount(commentsList, seasonWeekStart, oneDayAgo);
          const seasonFollowersHist = getWeightedCount(followersList, seasonWeekStart, oneDayAgo);
          scoreHist = computeScore(seasonUpvotesHist, seasonCommentsHist, seasonFollowersHist, 0) * boostMultiplier;

          displayUpvotes = upvotesList.filter((x: any) => new Date(x.created_at).getTime() >= seasonWeekStart).length;
          displayComments = commentsList.filter((x: any) => new Date(x.created_at).getTime() >= seasonWeekStart).length;
          displayFollowers = followersList.filter((x: any) => new Date(x.created_at).getTime() >= seasonWeekStart).length;
        } else if (tab === 'season_month') {
          const seasonUpvotes = getWeightedCount(upvotesList, seasonMonthStart);
          const seasonComments = getWeightedCount(commentsList, seasonMonthStart);
          const seasonFollowers = getWeightedCount(followersList, seasonMonthStart);
          score = computeScore(seasonUpvotes, seasonComments, seasonFollowers, 0) * boostMultiplier;
          
          const seasonUpvotesHist = getWeightedCount(upvotesList, seasonMonthStart, oneDayAgo);
          const seasonCommentsHist = getWeightedCount(commentsList, seasonMonthStart, oneDayAgo);
          const seasonFollowersHist = getWeightedCount(followersList, seasonMonthStart, oneDayAgo);
          scoreHist = computeScore(seasonUpvotesHist, seasonCommentsHist, seasonFollowersHist, 0) * boostMultiplier;

          displayUpvotes = upvotesList.filter((x: any) => new Date(x.created_at).getTime() >= seasonMonthStart).length;
          displayComments = commentsList.filter((x: any) => new Date(x.created_at).getTime() >= seasonMonthStart).length;
          displayFollowers = followersList.filter((x: any) => new Date(x.created_at).getTime() >= seasonMonthStart).length;
        } else {
          score = computeScore(currentUpvotes, currentComments, currentFollowers, 0) * boostMultiplier;
          scoreHist = computeScore(histUpvotes, histComments, histFollowers, 0) * boostMultiplier;
        }

        return {
          id: r.id,
          user_id: r.user_id,
          name: r.name,
          tagline: r.tagline ?? '',
          category: r.category ?? '',
          logo_url: r.logo_url ?? null,
          upvote_count: displayUpvotes,
          comment_count: displayComments,
          follower_count: displayFollowers,
          created_at: r.created_at,
          score: Math.round(score * 10) / 10,
          scoreHist: Math.round(scoreHist * 10) / 10,
          founder_name: r.profiles?.full_name ?? r.profiles?.username ?? null,
          founder_username: r.profiles?.username ?? null,
          founder_avatar: r.profiles?.avatar_url ?? null,
          student_verified: r.profiles?.student_verified ?? false,
          isBoosted,
          isMvp: r.id === mvpStartupId,
        };
      });

      // Compute rank movement
      const prevSorted = [...mapped].sort((a, b) => b.scoreHist - a.scoreHist);
      const prevRanksMap: Record<string, number> = {};
      prevSorted.forEach((item, idx) => {
        prevRanksMap[item.id] = idx + 1;
      });

      const currentSorted = [...mapped].sort((a, b) => b.score - a.score);
      const ranked: LeaderboardEntry[] = currentSorted.map((entry, idx) => {
        const rank = idx + 1;
        return {
          ...entry,
          rank,
          prev_rank: prevRanksMap[entry.id],
          badges: assignBadges(entry as any, rank, entry.created_at, entry.isMvp === true),
        };
      });

      // Rank Shift Notification logic (entering Top 10)
      const currentRanks: Record<string, number> = {};
      ranked.forEach(e => {
        currentRanks[e.id] = e.rank;
      });

      if (Object.keys(prevRankingsRef.current).length > 0) {
        ranked.forEach(e => {
          const oldRank = prevRankingsRef.current[e.id];
          const newRank = e.rank;
          if (newRank <= 10 && (oldRank === undefined || oldRank > 10)) {
            setActivityEvents(prev => [
              {
                id: `rank-${e.id}-${Date.now()}`,
                text: `🏆 ${e.name} entered the Top 10!`,
                timestamp: new Date(),
                type: 'rank_shift'
              },
              ...prev
            ].slice(0, 20));
          }
        });
      }

      prevRankingsRef.current = currentRanks;
      setEntries(ranked);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('[Leaderboard] Fetch failed:', err);
      // Fallback query logic
      try {
        let fallback = supabase
          .from('products')
          .select(`
            id, user_id, name, tagline, category, logo_url, upvote_count, created_at,
            profiles:user_id(full_name, username, avatar_url, student_verified),
            comments:comments(count)
          `)
          .limit(100);

        if (tab === 'ai') fallback = fallback.ilike('category', '%ai%');
        else if (tab === 'saas') fallback = fallback.ilike('category', '%saas%');
        else if (tab === 'mobile') fallback = fallback.ilike('category', '%mobile%');
        else if (tab === 'web3') fallback = fallback.ilike('category', '%web3%');

        const { data: fb } = await fallback;
        let fbRows = (fb ?? []) as any[];

        if (tab === 'student') {
          fbRows = fbRows.filter((r: any) => r.profiles?.student_verified === true);
        }

        const fbMapped = fbRows.map((r: any) => {
          const commentCnt = Array.isArray(r.comments)
            ? (r.comments[0]?.count ?? 0)
            : (r.comments?.count ?? 0);
          
          nameCacheRef.current[r.id] = r.name;
          if (r.profiles?.id) {
            nameCacheRef.current[r.profiles.id] = r.profiles.full_name || r.profiles.username || 'Founder';
          }

          return {
            id: r.id,
            user_id: r.user_id,
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
            isBoosted: false,
          };
        });

        fbMapped.sort((a, b) => b.score - a.score);
        setEntries(
          fbMapped.map((e, i) => ({
            ...e,
            rank: i + 1,
            badges: assignBadges(e as any, i + 1, e.created_at, false),
          }))
        );
      } catch {
        setEntries([]);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchActiveBoost]);

  // Debounce score recalculation to batch multiple updates and prevent heavy load
  const triggerDebouncedFetch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      void fetchLeaderboard(activeTabRef.current);
    }, 400);
  }, [fetchLeaderboard]);

  // Handle placing a boost bid on Supabase
  const handleBidPlacement = useCallback(async (amount: number) => {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error('You must be signed in!');
    
    // Find user's startup in entries
    const myStartup = entries.find(e => e.user_id === user.id);
    if (!myStartup) throw new Error('No launched startup found for your profile!');

    setBiddingLoading(true);
    try {
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24h boost
      const { error } = await supabase
        .from('discussions')
        .insert({
          user_id: user.id,
          title: `[BOOST_BID] ${myStartup.id}`,
          content: JSON.stringify({
            productId: myStartup.id,
            bidAmount: amount,
            expiresAt,
          }),
          category: 'BoostBid',
        });

      if (error) throw error;
      
      // Update local state instantly and refetch
      setActiveBoost({
        productId: myStartup.id,
        bidAmount: amount,
        expiresAt,
        user_id: user.id,
      });
      
      setActivityEvents(prev => [
        {
          id: `boost-${Date.now()}`,
          text: `⚡ ${myStartup.name} placed a bid of ${amount} XP for the Boost slot!`,
          timestamp: new Date(),
          type: 'rank_shift'
        },
        ...prev
      ].slice(0, 20));

      triggerDebouncedFetch();
    } catch (err: any) {
      console.error('Bid error:', err);
      throw err;
    } finally {
      setBiddingLoading(false);
    }
  }, [entries, triggerDebouncedFetch]);

  const handleRealtimeEvent = useCallback((type: 'upvote' | 'comment' | 'follow' | 'product' | 'discussion', payload: any) => {
    // 1. Post event to activity feed
    void (async () => {
      try {
        if (payload.eventType === 'INSERT') {
          let text = '';
          if (type === 'upvote') {
            const userId = payload.new.user_id;
            const productId = payload.new.product_id;
            const uName = await getName(userId, 'profile');
            const pName = await getName(productId, 'product');
            text = `${uName} upvoted ${pName}!`;
          } else if (type === 'comment') {
            const userId = payload.new.user_id;
            const productId = payload.new.product_id;
            if (productId) {
              const uName = await getName(userId, 'profile');
              const pName = await getName(productId, 'product');
              text = `${uName} commented on ${pName}`;
            }
          } else if (type === 'follow') {
            const followerId = payload.new.follower_id;
            const followedId = payload.new.followed_id;
            const followerName = await getName(followerId, 'profile');
            const followedName = await getName(followedId, 'profile');
            text = `${followerName} followed ${followedName}`;
          } else if (type === 'product') {
            const name = payload.new.name;
            text = `${name} just launched! 🚀`;
            nameCacheRef.current[payload.new.id] = name;
          } else if (type === 'discussion' && payload.new.category === 'BoostBid') {
            const bidder = await getName(payload.new.user_id, 'profile');
            const data = JSON.parse(payload.new.content);
            const prodName = await getName(data.productId, 'product');
            text = `⚡ ${bidder} bid ${data.bidAmount} XP to boost ${prodName}!`;
            void fetchActiveBoost();
          }

          if (text) {
            setActivityEvents(prev => [
              {
                id: `${type}-${Date.now()}-${Math.random()}`,
                text,
                timestamp: new Date(),
                type: type === 'product' ? 'new_startup' : type === 'discussion' ? 'rank_shift' : type
              },
              ...prev
            ].slice(0, 20));
          }
        }
      } catch (err) {
        console.error('Error handling realtime event:', err);
      }
    })();

    // 2. Refresh scores and ranking
    if (activeTabRef.current === 'battle') {
      // Battle Mode: limit full DB recalculation, directly update in-memory entry values
      if (type === 'upvote') {
        const productId = payload.new?.product_id || payload.old?.product_id;
        const isInsert = payload.eventType === 'INSERT';
        if (productId) {
          setEntries(prev => prev.map(entry => {
            if (entry.id === productId) {
              const diff = isInsert ? 1 : -1;
              const newUpvotes = Math.max(0, entry.upvote_count + diff);
              const newScore = computeScore(newUpvotes, entry.comment_count, entry.follower_count, 0);
              return { ...entry, upvote_count: newUpvotes, score: Math.round(newScore * 10) / 10 };
            }
            return entry;
          }));
        }
      } else if (type === 'comment') {
        const productId = payload.new?.product_id || payload.old?.product_id;
        const isInsert = payload.eventType === 'INSERT';
        if (productId) {
          setEntries(prev => prev.map(entry => {
            if (entry.id === productId) {
              const diff = isInsert ? 1 : -1;
              const newComments = Math.max(0, entry.comment_count + diff);
              const newScore = computeScore(entry.upvote_count, newComments, entry.follower_count, 0);
              return { ...entry, comment_count: newComments, score: Math.round(newScore * 10) / 10 };
            }
            return entry;
          }));
        }
      } else if (type === 'follow') {
        const followedId = payload.new?.followed_id || payload.old?.followed_id;
        const isInsert = payload.eventType === 'INSERT';
        if (followedId) {
          setEntries(prev => prev.map(entry => {
            if (entry.user_id === followedId) {
              const diff = isInsert ? 1 : -1;
              const newFollowers = Math.max(0, entry.follower_count + diff);
              const newScore = computeScore(entry.upvote_count, entry.comment_count, newFollowers, 0);
              return { ...entry, follower_count: newFollowers, score: Math.round(newScore * 10) / 10 };
            }
            return entry;
          }));
        }
      } else if (type === 'product' || type === 'discussion') {
        triggerDebouncedFetch();
      }
    } else {
      // Standard tabs: debounced recalculation
      triggerDebouncedFetch();
    }
  }, [getName, fetchActiveBoost, triggerDebouncedFetch]);

  // Pre-populate historical activities on load
  const fetchRecentActivities = useCallback(async () => {
    try {
      const [upvotesRes, commentsRes, productsRes] = await Promise.all([
        supabase
          .from('upvotes')
          .select('created_at, user_id, product_id')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('comments')
          .select('created_at, user_id, product_id')
          .not('product_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('products')
          .select('id, name, created_at')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const events: ActivityEvent[] = [];

      if (productsRes.data) {
        productsRes.data.forEach((p: any) => {
          events.push({
            id: `product-${p.id}`,
            text: `${p.name} just launched! 🚀`,
            timestamp: new Date(p.created_at),
            type: 'new_startup'
          });
          nameCacheRef.current[p.id] = p.name;
        });
      }

      const upvotesData = upvotesRes.data ?? [];
      const commentsData = commentsRes.data ?? [];

      const idsToFetch: { id: string; type: 'product' | 'profile' }[] = [];
      upvotesData.forEach((u: any) => {
        if (!nameCacheRef.current[u.product_id]) idsToFetch.push({ id: u.product_id, type: 'product' });
        if (!nameCacheRef.current[u.user_id]) idsToFetch.push({ id: u.user_id, type: 'profile' });
      });
      commentsData.forEach((c: any) => {
        if (!nameCacheRef.current[c.product_id]) idsToFetch.push({ id: c.product_id, type: 'product' });
        if (!nameCacheRef.current[c.user_id]) idsToFetch.push({ id: c.user_id, type: 'profile' });
      });

      await Promise.all(
        idsToFetch.map(item => getName(item.id, item.type))
      );

      upvotesData.forEach((u: any, idx: number) => {
        const uName = nameCacheRef.current[u.user_id] || 'Someone';
        const pName = nameCacheRef.current[u.product_id] || 'a startup';
        events.push({
          id: `upvote-${u.user_id}-${u.product_id}-${idx}`,
          text: `${uName} upvoted ${pName}!`,
          timestamp: new Date(u.created_at),
          type: 'upvote'
        });
      });

      commentsData.forEach((c: any, idx: number) => {
        const uName = nameCacheRef.current[c.user_id] || 'Someone';
        const pName = nameCacheRef.current[c.product_id] || 'a startup';
        events.push({
          id: `comment-${c.user_id}-${c.product_id}-${idx}`,
          text: `${uName} commented on ${pName}`,
          timestamp: new Date(c.created_at),
          type: 'comment'
        });
      });

      events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setActivityEvents(events.slice(0, 15));
    } catch (err) {
      console.error('Error fetching recent activities:', err);
    }
  }, [getName]);

  // Initial load
  useEffect(() => {
    void fetchLeaderboard(activeTab);
  }, [activeTab, fetchLeaderboard]);

  // Supabase WebSocket / Realtime setup
  useEffect(() => {
    void fetchRecentActivities();

    const channel = supabase.channel('leaderboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'upvotes' },
        (payload) => {
          handleRealtimeEvent('upvote', payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        (payload) => {
          handleRealtimeEvent('comment', payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows' },
        (payload) => {
          handleRealtimeEvent('follow', payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          handleRealtimeEvent('product', payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'discussions' },
        (payload) => {
          handleRealtimeEvent('discussion', payload);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [fetchRecentActivities, handleRealtimeEvent]);

  // Memoized lists to prevent excessive re-renders
  const top3 = useMemo(() => entries.slice(0, 3), [entries]);
  const rest = useMemo(() => entries.slice(3), [entries]);

  // Resolved active boost detailed mapping
  const resolvedActiveBoost = useMemo(() => {
    if (!activeBoost) return null;
    const match = entries.find(e => e.id === activeBoost.productId);
    return {
      ...activeBoost,
      productName: match ? match.name : 'a startup',
      logoUrl: match ? match.logo_url : null,
    };
  }, [activeBoost, entries]);

  // Logged-in user startup XP helper
  const userStartup = useMemo(() => {
    const { user } = useAuthStore();
    if (!user) return null;
    const match = entries.find(e => e.user_id === user.id);
    if (!match) return null;
    
    // Derive raw XP
    const { xp } = getFounderLevel(match);

    return {
      id: match.id,
      name: match.name,
      logoUrl: match.logo_url,
      xp,
    };
  }, [entries]);

  // Dynamically compute competitive alerts
  const competitiveAlerts = useMemo(() => {
    const alerts: string[] = [];
    const { user } = useAuthStore.getState();
    const myStartup = user ? entries.find(e => e.user_id === user.id) : null;

    if (myStartup) {
      // 1. Positions shifted alert
      const change = (myStartup.prev_rank || myStartup.rank) - myStartup.rank;
      if (Math.abs(change) >= 2) {
        if (change > 0) {
          alerts.push(`🔥 Competitive Alert: Your startup '${myStartup.name}' jumped +${change} positions today! Keep it up! 🚀`);
        } else {
          alerts.push(`⚠️ Rank Warning: Your startup '${myStartup.name}' dropped -${Math.abs(change)} positions. Drive more comments to reclaim your rank!`);
        }
      }

      // 2. Proximity to Top 10 alert
      if (myStartup.rank > 10 && myStartup.rank <= 13) {
        alerts.push(`🏆 Race to Top 10: Your startup '${myStartup.name}' is ranked #${myStartup.rank}, only ${myStartup.rank - 10} positions away from the Top 10!`);
      }

      // 3. Overtaken alert
      entries.forEach(other => {
        if (other.id !== myStartup.id && other.prev_rank !== undefined && myStartup.prev_rank !== undefined) {
          if (other.prev_rank > myStartup.prev_rank && other.rank < myStartup.rank) {
            alerts.push(`⚔️ Competitive Alert: '${other.name}' just overtook '${myStartup.name}' for Rank #${other.rank}! Get some upvotes to overtake them!`);
          }
        }
      });
    }

    // Default/fallback alerts calculated from top entries to ensure feed is filled
    if (entries.length > 3) {
      entries.slice(0, 10).forEach(startup => {
        const change = (startup.prev_rank || startup.rank) - startup.rank;
        if (change >= 3) {
          alerts.push(`📈 Trending: '${startup.name}' has accelerated, climbing +${change} spots on the leaderboard!`);
        }
      });

      const nearTop10 = entries.find(e => e.rank === 11 || e.rank === 12);
      if (nearTop10) {
        alerts.push(`🔥 Top 10 Race: '${nearTop10.name}' is ranked #${nearTop10.rank}, just ${nearTop10.rank - 10} position away from entering the Top 10!`);
      }

      for (let i = 0; i < Math.min(10, entries.length - 1); i++) {
        const sA = entries[i];
        const sB = entries[i + 1];
        if (sA.prev_rank !== undefined && sB.prev_rank !== undefined && sA.prev_rank > sB.prev_rank) {
          alerts.push(`⚔️ Rivalry: '${sA.name}' just overtook '${sB.name}' for Rank #${sA.rank}!`);
          break;
        }
      }
    }

    return alerts.slice(0, 5); 
  }, [entries]);

  // Rising Stars Section Logic
  const risingStars = useMemo(() => {
    return entries
      .map((entry) => {
        const previousRank = entry.prev_rank || entry.rank;
        const rankChange = previousRank - entry.rank;
        return { ...entry, rankChange };
      })
      .filter((entry) => entry.rankChange > 0 && (entry.upvote_count >= 5 || entry.comment_count >= 3))
      .sort((a, b) => b.rankChange - a.rankChange)
      .slice(0, 5);
  }, [entries]);

  const isSeasonalTab = activeTab === 'season_week' || activeTab === 'season_month';

  const handleSelectBracketMatch = (idA: string, idB: string) => {
    setActiveTab('battle');
    // Scroll or set values if needed, the battle component handles active ids
  };

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
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live Updating
            </div>
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

      {/* ── Competitive Alerts Center ────────────────────────────── */}
      <CompetitiveAlertsTray alerts={competitiveAlerts} />

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

      {/* ── 2-Column Responsive Layout ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Left column: Leaderboard content, Battle Arena, or Tournament Bracket */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'tournament' ? (
                <TournamentBracket startups={entries} onSelectMatch={handleSelectBracketMatch} />
              ) : activeTab === 'battle' ? (
                <StartupBattle startups={entries} />
              ) : loading ? (
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
                      {top3[1] && (
                        <PodiumCard entry={top3[1]} podiumPos={2} isSeasonal={isSeasonalTab} />
                      )}
                      <PodiumCard entry={top3[0]} podiumPos={1} isSeasonal={isSeasonalTab} />
                      {top3[2] && (
                        <PodiumCard entry={top3[2]} podiumPos={3} isSeasonal={isSeasonalTab} />
                      )}
                    </div>
                  )}

                  {/* ── Rising Stars Section ──── */}
                  {risingStars.length > 0 && (
                    <div className="bg-gradient-to-r from-orange-500/10 via-red-500/5 to-transparent border border-orange-500/20 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
                        <h3 className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-white uppercase tracking-wider">
                          🔥 Rising Stars
                        </h3>
                        <span className="text-xs text-zinc-500 font-medium">
                          Fastest growing startups in last 24h
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                        {risingStars.map((star) => (
                          <div
                            key={star.id}
                            className="bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800/80 p-3 rounded-xl flex items-center gap-3 hover:border-orange-500/30 transition-all duration-200"
                          >
                            <Link to={`/product/${star.id}`} className="flex-shrink-0">
                              <div className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                {star.logo_url ? (
                                  <img src={star.logo_url} alt={star.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-xs">
                                    {star.name[0]}
                                  </div>
                                )}
                              </div>
                            </Link>
                            <div className="min-w-0 flex-1">
                              <Link
                                  to={`/product/${star.id}`}
                                  className="font-bold text-xs text-zinc-900 dark:text-white truncate block hover:text-orange-500"
                              >
                                {star.name}
                              </Link>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-bold text-emerald-500 flex items-center">
                                  <ArrowUp className="w-2.5 h-2.5 mr-0.5" />
                                  +{star.rankChange}
                                </span>
                                <span className="text-[9px] text-zinc-400 font-medium">
                                  Score: {star.score}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
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
                          <div key={entry.id} className="flex flex-col w-full">
                            <LeaderboardRow
                              entry={entry}
                              isSeasonal={isSeasonalTab}
                              isExpanded={expandedEntryId === entry.id}
                              onToggleExpand={() => setExpandedEntryId(prev => prev === entry.id ? null : entry.id)}
                            />
                            {/* Lazy-loaded / Collapsible Insights drawer */}
                            <AnimatePresence>
                              {expandedEntryId === entry.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                                  className="px-5 pb-5 bg-zinc-50/40 dark:bg-zinc-950/20 border-t border-zinc-100 dark:border-zinc-800/60 overflow-hidden"
                                >
                                  <LeaderboardInsights entry={entry} allEntries={entries} />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right column: Sticky Sidebars (Boost Auction Widget + Live Feed) */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
          <BoostAuctionWidget
            currentBoost={resolvedActiveBoost}
            userStartup={userStartup}
            onBid={handleBidPlacement}
            loading={biddingLoading}
          />
          <ActivityFeedWidget events={activityEvents} />
        </div>
      </div>
    </div>
  );
}

// ─── Pinned Competitive Alerts Tray ────────────────────────────────────────

function CompetitiveAlertsTray({ alerts }: { alerts: string[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    if (alerts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % alerts.length);
    }, 6000); // cycle alerts every 6s
    return () => clearInterval(interval);
  }, [alerts]);

  if (alerts.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-orange-500/10 via-red-500/5 to-transparent border border-orange-500/20 rounded-2xl p-3 flex items-center gap-3">
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 text-[9px] font-black uppercase tracking-wider animate-pulse flex-shrink-0">
        Rivalry Alert
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={currentIdx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="text-xs font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1 leading-normal"
        >
          {alerts[currentIdx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// ─── Podium Card ─────────────────────────────────────────────────────────────

function PodiumCard({ entry, podiumPos, isSeasonal }: { entry: LeaderboardEntry; podiumPos: 1 | 2 | 3; isSeasonal?: boolean }) {
  const isFirst = podiumPos === 1;
  const { level } = getFounderLevel(entry);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: podiumPos * 0.05 }}
      className={`relative flex flex-col items-center text-center p-5 rounded-2xl border transition-all ${
        isFirst
          ? 'bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/20 dark:to-zinc-900 border-amber-300 dark:border-amber-700 shadow-lg shadow-amber-500/10 sm:-mt-4'
          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
      } ${
        entry.isBoosted
          ? 'ring-2 ring-amber-500 shadow-lg shadow-amber-500/10 border-amber-400'
          : ''
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
          <span className="truncate max-w-[80px]">{entry.founder_name}</span>
          <span className="inline-flex px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[8px] font-extrabold border border-indigo-500/20">
            Lv.{level}
          </span>
        </Link>
      )}

      <div className="mt-1.5">
        <BadgeChips badges={entry.badges} isSeasonal={isSeasonal} />
      </div>

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

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isSeasonal?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function LeaderboardRow({ entry, isSeasonal, isExpanded, onToggleExpand }: LeaderboardRowProps) {
  const rankImproved = entry.prev_rank !== undefined && entry.rank < entry.prev_rank;
  const { level } = getFounderLevel(entry);

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: 1,
        scale: rankImproved ? [1, 1.015, 1] : 1
      }}
      transition={{ 
        type: "spring",
        stiffness: 300,
        damping: 20
      }}
      className={`grid grid-cols-[2rem_1fr_auto] sm:grid-cols-[2.5rem_1fr_6rem_6rem_6rem_6rem_7rem] gap-3 px-5 py-4 items-center hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20 transition-all ${
        entry.isBoosted 
          ? 'border-l-4 border-l-amber-500 bg-amber-500/5 dark:bg-amber-500/5 ring-1 ring-amber-500/10 shadow-md shadow-amber-500/5' 
          : ''
      }`}
    >
      {/* Rank */}
      <div className="flex justify-center" onClick={onToggleExpand}>
        <RankMedal rank={entry.rank} />
      </div>

      {/* Startup info */}
      <div className="flex items-center gap-3 min-w-0" onClick={onToggleExpand}>
        <Link to={`/product/${entry.id}`} className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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
        <div className="min-w-0 flex-1 cursor-pointer">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-zinc-900 dark:text-white hover:text-orange-500 transition-colors truncate">
              {entry.name}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 capitalize hidden sm:inline-block">
              {entry.category}
            </span>
            {entry.isBoosted && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-[10px] font-extrabold text-amber-500 border border-amber-500/20 animate-pulse">
                ⚡ Boosted
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {entry.founder_username && (
              <Link
                to={`/profile/${entry.founder_username}`}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Avatar src={entry.founder_avatar} alt={entry.founder_name ?? ''} size="xs" />
                <span className="truncate max-w-[100px]">{entry.founder_name}</span>
              </Link>
            )}
            <span className="inline-flex px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[8px] font-extrabold border border-indigo-500/20">
              Lv.{level}
            </span>
            <BadgeChips badges={entry.badges.slice(0, 1)} isSeasonal={isSeasonal} />
          </div>
        </div>
      </div>

      {/* Stats — hidden on mobile */}
      <div className="hidden sm:flex justify-center items-center gap-1 text-sm font-bold text-zinc-700 dark:text-zinc-300" onClick={onToggleExpand}>
        <ThumbsUp className="w-3.5 h-3.5 text-orange-400" />
        {entry.upvote_count}
      </div>
      <div className="hidden sm:flex justify-center items-center gap-1 text-sm font-bold text-zinc-700 dark:text-zinc-300" onClick={onToggleExpand}>
        <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
        {entry.comment_count}
      </div>
      <div className="hidden sm:flex justify-center items-center gap-1 text-sm font-bold text-zinc-700 dark:text-zinc-300" onClick={onToggleExpand}>
        <Users className="w-3.5 h-3.5 text-emerald-400" />
        {entry.follower_count}
      </div>

      {/* Score */}
      <div className="hidden sm:flex justify-end" onClick={onToggleExpand}>
        <span className="text-sm font-black text-orange-500">{entry.score}</span>
      </div>

      {/* Movement & Expand button */}
      <div className="flex justify-end items-center gap-2">
        <MovementIndicator current={entry.rank} prev={entry.prev_rank} />
        <button
          onClick={onToggleExpand}
          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors text-zinc-400 hover:text-zinc-650"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Activity Feed Widget Sidebar ──────────────────────────────────────────

function ActivityFeedWidget({ events }: { events: ActivityEvent[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-lg relative overflow-hidden flex flex-col h-[500px] w-full">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-rose-500 to-indigo-500" />
      
      <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-orange-500 animate-pulse" />
          <h3 className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-white uppercase tracking-wider">
            Live Activity
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-500 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          LIVE
        </div>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1 hide-scrollbar scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {events.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-650 py-10">
              <Activity className="w-8 h-8 mb-2 opacity-40 animate-pulse" />
              <span className="text-xs">Listening for events...</span>
            </div>
          ) : (
            events.map((event) => {
              let Icon = Activity;
              let iconColor = 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400';
              let badgeBorder = 'border-zinc-250';
              
              if (event.type === 'upvote') {
                Icon = ThumbsUp;
                iconColor = 'bg-orange-500/10 text-orange-500';
                badgeBorder = 'border-orange-500/20';
              } else if (event.type === 'comment') {
                Icon = MessageSquare;
                iconColor = 'bg-sky-500/10 text-sky-500';
                badgeBorder = 'border-sky-500/20';
              } else if (event.type === 'follow') {
                Icon = Users;
                iconColor = 'bg-emerald-500/10 text-emerald-500';
                badgeBorder = 'border-emerald-500/20';
              } else if (event.type === 'rank_shift') {
                Icon = Trophy;
                iconColor = 'bg-amber-500/10 text-amber-500';
                badgeBorder = 'border-amber-500/20';
              } else if (event.type === 'new_startup') {
                Icon = Rocket;
                iconColor = 'bg-indigo-500/10 text-indigo-500';
                badgeBorder = 'border-indigo-500/20';
              }

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: 20, y: -10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="flex items-start gap-3 p-3 rounded-xl border bg-zinc-50/50 dark:bg-zinc-950/20 border-zinc-100 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-950/40 transition-colors"
                >
                  <div className={`p-1.5 rounded-lg border ${iconColor} ${badgeBorder} flex-shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-tight">
                      {event.text}
                    </p>
                    <span className="text-[9px] text-zinc-400 mt-1 block">
                      {formatTimeAgo(event.timestamp)}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'Just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

export default LeaderboardPage;
