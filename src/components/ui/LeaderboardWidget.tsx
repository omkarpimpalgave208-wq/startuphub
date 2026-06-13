import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Crown, ChevronRight, ThumbsUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Avatar } from './Avatar';

interface TopEntry {
  id: string;
  name: string;
  tagline: string;
  logo_url: string | null;
  upvote_count: number;
  comment_count: number;
  score: number;
  rank: number;
  founder_name: string | null;
  founder_username: string | null;
  founder_avatar: string | null;
}

function computeScore(upvotes: number, comments: number, followers: number, profileViews: number = 0): number {
  return upvotes * 5 + comments * 2 + followers * 3 + profileViews * 0.1;
}

export function LeaderboardWidget() {
  const [entries, setEntries] = useState<TopEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            id,
            name,
            tagline,
            logo_url,
            upvote_count,
            created_at,
            profiles:user_id (
              full_name,
              username,
              avatar_url,
              followers:follows!follows_followed_id_fkey(count)
            ),
            comments:comments(count)
          `)
          .order('upvote_count', { ascending: false })
          .limit(20);

        if (error) throw error;

        const rows = (data ?? []) as any[];
        const mapped = rows.map((r) => {
          const commentCnt = Array.isArray(r.comments)
            ? (r.comments[0]?.count ?? 0)
            : (r.comments?.count ?? 0);
          
          const followersCnt = r.profiles
            ? (Array.isArray(r.profiles.followers) ? (r.profiles.followers[0]?.count ?? 0) : (r.profiles.followers?.count ?? 0))
            : 0;

          return {
            id: r.id,
            name: r.name,
            tagline: r.tagline ?? '',
            logo_url: r.logo_url ?? null,
            upvote_count: r.upvote_count ?? 0,
            comment_count: commentCnt,
            score: computeScore(r.upvote_count ?? 0, commentCnt, followersCnt, 0),
            founder_name: r.profiles?.full_name ?? r.profiles?.username ?? null,
            founder_username: r.profiles?.username ?? null,
            founder_avatar: r.profiles?.avatar_url ?? null,
          };
        });

        mapped.sort((a, b) => b.score - a.score);
        setEntries(
          mapped.slice(0, 5).map((e, i) => ({ ...e, rank: i + 1 }))
        );
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (!loading && entries.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-orange-500" />
          Top Startups
        </h2>
        <Link
          to="/leaderboard"
          className="flex items-center gap-1 text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors"
        >
          Full Leaderboard <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex-shrink-0" />
                <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-2.5 w-16 bg-zinc-100 dark:bg-zinc-700 rounded" />
                </div>
                <div className="h-4 w-10 bg-zinc-100 dark:bg-zinc-800 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group"
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-6 text-center">
                  {entry.rank === 1 ? (
                    <Crown className="w-4 h-4 text-amber-500 mx-auto" />
                  ) : (
                    <span className="text-xs font-black text-zinc-400">{entry.rank}</span>
                  )}
                </div>

                {/* Logo */}
                <Link to={`/product/${entry.id}`} className="flex-shrink-0">
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 group-hover:ring-1 group-hover:ring-orange-500/30 transition-all">
                    {entry.logo_url ? (
                      <img src={entry.logo_url} alt={entry.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-sm">
                        {entry.name[0]}
                      </div>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${entry.id}`}
                    className="text-sm font-bold text-zinc-900 dark:text-white hover:text-orange-500 transition-colors line-clamp-1"
                  >
                    {entry.name}
                  </Link>
                  {entry.founder_username && (
                    <Link
                      to={`/profile/${entry.founder_username}`}
                      className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors mt-0.5"
                    >
                      <Avatar src={entry.founder_avatar} alt={entry.founder_name ?? ''} size="xs" />
                      <span className="truncate">{entry.founder_name}</span>
                    </Link>
                  )}
                </div>

                {/* Score */}
                <div className="flex-shrink-0 flex items-center gap-1 text-xs font-bold text-orange-500">
                  <ThumbsUp className="w-3 h-3" />
                  {entry.upvote_count}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
          <Link
            to="/leaderboard"
            className="flex items-center justify-center gap-1.5 text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors"
          >
            View Full Leaderboard <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
