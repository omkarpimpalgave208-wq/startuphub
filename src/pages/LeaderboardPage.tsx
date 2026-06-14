import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RawProduct {
  id: string;
  name: string | null;
  upvote_count: number | null;
  created_at: string | null;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  rank: number;
}

// ─── Score formula ───────────────────────────────────────────────────────────
// Uses only the denormalised upvote_count column that is always present.
// Comments and followers are fetched separately in a lightweight follow-up
// query; if they fail we safely fall back to 0.

function computeScore(upvotes: number, comments: number, followers: number): number {
  return (upvotes * 5) + (comments * 2) + (followers * 3);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLeaderboard() {
      setLoading(true);
      setError(null);

      try {
        // ── Step 1: Fetch products with upvote_count ─────────────────────
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, name, upvote_count, created_at')
          .limit(100);

        if (productsError) throw productsError;
        if (cancelled) return;

        const safeProducts: RawProduct[] = Array.isArray(products) ? products : [];

        // ── Step 2: Fetch comment counts per product ──────────────────────
        let commentMap: Record<string, number> = {};
        try {
          const { data: comments } = await supabase
            .from('comments')
            .select('product_id');
          if (!cancelled && Array.isArray(comments)) {
            comments.forEach((c: any) => {
              if (c?.product_id) {
                commentMap[c.product_id] = (commentMap[c.product_id] ?? 0) + 1;
              }
            });
          }
        } catch {
          // Non-fatal: fall back to 0 comments
        }

        if (cancelled) return;

        // ── Step 3: Fetch follower counts per product owner ───────────────
        let followerMap: Record<string, number> = {};
        try {
          const { data: follows } = await supabase
            .from('follows')
            .select('followed_id');
          // follows.followed_id is a profile id; we need to map via products.user_id.
          // We fetch that in a second products query for user_id.
          const { data: productOwners } = await supabase
            .from('products')
            .select('id, user_id')
            .limit(100);

          if (!cancelled && Array.isArray(follows) && Array.isArray(productOwners)) {
            const ownerMap: Record<string, string> = {};
            productOwners.forEach((p: any) => {
              if (p?.id && p?.user_id) ownerMap[p.id] = p.user_id;
            });
            follows.forEach((f: any) => {
              if (!f?.followed_id) return;
              Object.entries(ownerMap).forEach(([productId, userId]) => {
                if (userId === f.followed_id) {
                  followerMap[productId] = (followerMap[productId] ?? 0) + 1;
                }
              });
            });
          }
        } catch {
          // Non-fatal: fall back to 0 followers
        }

        if (cancelled) return;

        // ── Step 4: Compute scores, sort, assign ranks ────────────────────
        const ranked: LeaderboardEntry[] = safeProducts
          .filter((p) => p && p.id)
          .map((p) => {
            const upvotes  = p.upvote_count  ?? 0;
            const comments = commentMap[p.id]  ?? 0;
            const followers = followerMap[p.id] ?? 0;
            return {
              id:    p.id,
              name:  p.name ?? 'Unnamed Startup',
              score: computeScore(upvotes, comments, followers),
            };
          })
          .sort((a, b) => b.score - a.score)
          .map((entry, index) => ({ ...entry, rank: index + 1 }));

        setEntries(ranked);
      } catch (err: any) {
        if (!cancelled) {
          console.error('[LeaderboardPage] fetch error:', err);
          setError('Failed to load leaderboard. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchLeaderboard();
    return () => { cancelled = true; };
  }, []); // mount-only — no realtime subscriptions

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem' }}>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
        Leaderboard
      </h1>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Score = (upvotes × 5) + (comments × 2) + (followers × 3)
      </p>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#9ca3af' }}>
          Loading leaderboard…
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div style={{
          padding: '1rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          color: '#dc2626',
          fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#9ca3af' }}>
          No startups found yet.
        </div>
      )}

      {/* Ranked list */}
      {!loading && !error && entries.length > 0 && (
        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {entries.map((entry) => (
            <li
              key={entry.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.875rem 1rem',
                marginBottom: '0.5rem',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                boxShadow: entry.rank <= 3 ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {/* Rank badge */}
              <span style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: '50%',
                fontWeight: 800,
                fontSize: '0.8rem',
                flexShrink: 0,
                background:
                  entry.rank === 1 ? '#f59e0b' :
                  entry.rank === 2 ? '#9ca3af' :
                  entry.rank === 3 ? '#b45309' :
                  '#f3f4f6',
                color:
                  entry.rank <= 3 ? '#ffffff' : '#374151',
              }}>
                {entry.rank}
              </span>

              {/* Name */}
              <span style={{
                flex: 1,
                fontWeight: 600,
                fontSize: '0.9375rem',
                color: '#111827',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {entry.name}
              </span>

              {/* Score */}
              <span style={{
                fontWeight: 700,
                fontSize: '0.875rem',
                color: entry.rank <= 3 ? '#f59e0b' : '#6b7280',
                flexShrink: 0,
              }}>
                {entry.score} pts
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default LeaderboardPage;
