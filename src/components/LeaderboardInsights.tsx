import { useMemo } from 'react';
import { ThumbsUp, MessageSquare, Users, Sparkles, HelpCircle, Trophy } from 'lucide-react';

interface Startup {
  id: string;
  name: string;
  category: string;
  upvote_count: number;
  comment_count: number;
  follower_count: number;
  score: number;
  rank: number;
}

interface LeaderboardInsightsProps {
  entry: Startup;
  allEntries: Startup[];
}

export function LeaderboardInsights({ entry, allEntries }: LeaderboardInsightsProps) {
  
  // 1. Calculate Score Contributions
  const contributions = useMemo(() => {
    const upvotesW = entry.upvote_count * 5;
    const commentsW = entry.comment_count * 2;
    const followersW = entry.follower_count * 3;
    const totalW = upvotesW + commentsW + followersW;
    
    if (totalW === 0) {
      return { upvotePct: 33, commentPct: 33, followerPct: 34 };
    }
    
    return {
      upvotePct: Math.round((upvotesW / totalW) * 100),
      commentPct: Math.round((commentsW / totalW) * 100),
      followerPct: Math.round((followersW / totalW) * 100),
    };
  }, [entry]);

  // 2. Calculate Derived Founder XP & Level Info
  const xpInfo = useMemo(() => {
    const rawUpvotes = entry.upvote_count || 0;
    const rawComments = entry.comment_count || 0;
    const rawFollowers = entry.follower_count || 0;
    
    let rankBonus = 0;
    if (entry.rank === 1) rankBonus = 500;
    else if (entry.rank <= 10) rankBonus = 200;
    else if (entry.rank <= 50) rankBonus = 100;
    
    const xp = (rawUpvotes * 10) + (rawComments * 20) + (rawFollowers * 15) + rankBonus;
    const level = Math.floor(xp / 100) + 1;
    const currentLevelXP = xp % 100;
    const xpNeeded = 100;

    let title = 'Founder';
    if (level >= 50) title = 'Unicorn Builder';
    else if (level >= 25) title = 'Growth Hacker';
    else if (level >= 10) title = 'Builder';

    return { xp, level, currentLevelXP, xpNeeded, title };
  }, [entry]);

  // 3. Category Comparative Analysis
  const comparativePercentile = useMemo(() => {
    const categoryEntries = allEntries.filter(
      (e) => e.category?.toLowerCase() === entry.category?.toLowerCase()
    );

    if (categoryEntries.length <= 1) return 100;

    // Engagement rate = comments / (upvotes || 1)
    const getEngagementRate = (s: Startup) => s.comment_count / (s.upvote_count || 1);
    
    const entryRate = getEngagementRate(entry);
    let countLower = 0;

    categoryEntries.forEach((e) => {
      if (e.id !== entry.id && getEngagementRate(e) <= entryRate) {
        countLower++;
      }
    });

    const totalOthers = categoryEntries.length - 1;
    return Math.round((countLower / totalOthers) * 100);
  }, [entry, allEntries]);

  // 4. Actionable Growth Tips
  const growthTips = useMemo(() => {
    const tips = [];
    
    if (entry.comment_count === 0 || contributions.commentPct < 25) {
      tips.push('Increase engagement rate: Try replying to every user comment and asking follow-up questions in your description.');
    }
    if (entry.upvote_count < 10 || contributions.upvotePct < 40) {
      tips.push('Leverage social circles: Share your profile on Twitter, LinkedIn, or founder groups to secure early validation upvotes.');
    }
    if (entry.follower_count < 5 || contributions.followerPct < 20) {
      tips.push('Build updates velocity: Write a status update in discussions to bring readers to follow your launch profile.');
    }

    if (tips.length === 0) {
      tips.push('Excellent balance! Promote your startup in Battle Mode to win extra score weight points.');
    }

    return tips;
  }, [entry, contributions]);

  return (
    <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-left border-t border-zinc-100 dark:border-zinc-800">
      
      {/* COLUMN 1: Score Share breakdown */}
      <div className="space-y-3">
        <h5 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-orange-500" /> Score Breakdown
        </h5>
        
        <div className="space-y-2.5">
          {/* Upvotes share */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
              <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3 text-orange-400" /> Upvotes share</span>
              <span>{contributions.upvotePct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${contributions.upvotePct}%` }} />
            </div>
          </div>

          {/* Comments share */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
              <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-sky-400" /> Comments share</span>
              <span>{contributions.commentPct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full" style={{ width: `${contributions.commentPct}%` }} />
            </div>
          </div>

          {/* Followers share */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
              <span className="flex items-center gap-1"><Users className="w-3 h-3 text-emerald-400" /> Followers share</span>
              <span>{contributions.followerPct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${contributions.followerPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* COLUMN 2: Gamification XP Progress */}
      <div className="space-y-3">
        <h5 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1">
          <Trophy className="w-3.5 h-3.5 text-amber-500" /> Founder Progression
        </h5>
        
        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-850 flex flex-col justify-between h-[110px]">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider block">
                {xpInfo.title}
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-550 block mt-0.5">
                Total XP: {xpInfo.xp} pts
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-extrabold border border-indigo-500/20">
              Lv. {xpInfo.level}
            </span>
          </div>

          <div className="space-y-1 mt-auto">
            <div className="flex justify-between text-[9px] font-extrabold text-zinc-500 uppercase">
              <span>XP progress</span>
              <span>{xpInfo.currentLevelXP} / {xpInfo.xpNeeded} XP</span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-150 dark:bg-zinc-800 overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(xpInfo.currentLevelXP / xpInfo.xpNeeded) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* COLUMN 3: Comparative Percentile + Action Tips */}
      <div className="space-y-3">
        <h5 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-sky-500" /> AI Growth Coaching
        </h5>

        <div className="space-y-2.5">
          {comparativePercentile > 0 ? (
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
              🏆 Your comments-to-upvotes ratio is higher than <strong className="text-zinc-900 dark:text-white font-extrabold">{comparativePercentile}%</strong> of active <span className="capitalize">{entry.category || 'all'}</span> startups.
            </p>
          ) : (
            <p className="text-xs text-zinc-650 dark:text-zinc-550 leading-normal">
              Analyzing category data...
            </p>
          )}

          <div className="space-y-1.5 pt-1.5 border-t border-zinc-100 dark:border-zinc-850/80">
            {growthTips.map((tip, idx) => (
              <div key={idx} className="flex gap-1.5 items-start text-[11px] text-zinc-500 dark:text-zinc-450 leading-normal">
                <span className="text-amber-500 select-none">💡</span>
                <p>{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
