import { useState, useMemo } from 'react';
import { Swords, Trophy, ThumbsUp, MessageSquare, Users, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '../components/ui/Avatar';

interface StartupBattleProps {
  startups: any[];
}

export function StartupBattle({ startups }: StartupBattleProps) {
  const [selectedAId, setSelectedAId] = useState<string>('');
  const [selectedBId, setSelectedBId] = useState<string>('');

  const startupA = useMemo(() => startups.find(s => s.id === selectedAId), [startups, selectedAId]);
  const startupB = useMemo(() => startups.find(s => s.id === selectedBId), [startups, selectedBId]);

  // Combined score calculations
  const totalScore = (startupA?.score || 0) + (startupB?.score || 0);
  const pctA = totalScore > 0 ? Math.round(((startupA?.score || 0) / totalScore) * 100) : 50;
  const pctB = totalScore > 0 ? 100 - pctA : 50;

  const winner = useMemo(() => {
    if (!startupA || !startupB) return null;
    if (startupA.score > startupB.score) return 'A';
    if (startupB.score > startupA.score) return 'B';
    return 'TIE';
  }, [startupA, startupB]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-8 relative overflow-hidden shadow-xl">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 translate-x-1/2 w-48 h-48 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center space-y-2 relative z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5 text-xs font-bold text-orange-500 uppercase tracking-widest">
          <Swords className="w-3.5 h-3.5 animate-pulse" />
          Battle Arena
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
          Compare Startups Head-to-Head
        </h2>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          Select two startups to compare their metrics and see who dominates the leaderboard in real time.
        </p>
      </div>

      {/* Selectors & Display */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center relative z-10">
        
        {/* Startup A */}
        <div className={`p-5 rounded-2xl border transition-all ${winner === 'A' ? 'border-amber-400 bg-amber-500/[0.02] dark:bg-amber-500/[0.01] shadow-lg shadow-amber-500/5' : 'border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/20'}`}>
          <div className="space-y-4">
            <select
              value={selectedAId}
              onChange={(e) => setSelectedAId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select Startup A</option>
              {startups.map((s) => (
                <option key={s.id} value={s.id} disabled={s.id === selectedBId}>
                  {s.name} (Rank #{s.rank})
                </option>
              ))}
            </select>

            <AnimatePresence mode="wait">
              {startupA ? (
                <motion.div
                  key={startupA.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4 text-center sm:text-left"
                >
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm flex-shrink-0">
                      {startupA.logo_url ? (
                        <img src={startupA.logo_url} alt={startupA.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-base">
                          {startupA.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                        <h4 className="font-extrabold text-zinc-900 dark:text-white truncate text-base">{startupA.name}</h4>
                        {winner === 'A' && <Sparkles className="w-4 h-4 text-amber-500" />}
                      </div>
                      <p className="text-xs text-zinc-500 capitalize">{startupA.category}</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <BattleStatItem icon={ThumbsUp} label="Upvotes" value={startupA.upvote_count} iconColor="text-orange-500" />
                    <BattleStatItem icon={MessageSquare} label="Comments" value={startupA.comment_count} iconColor="text-sky-500" />
                    <BattleStatItem icon={Users} label="Followers" value={startupA.follower_count} iconColor="text-emerald-500" />
                    <div className="border-t border-zinc-200/60 dark:border-zinc-800/60 pt-2 flex justify-between items-center text-sm">
                      <span className="font-bold text-zinc-500">Leaderboard Score</span>
                      <span className="font-black text-orange-500 text-lg">{startupA.score}</span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <EmptySelectionSide side="A" />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* VS Separator */}
        <div className="flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-500 flex items-center justify-center font-black italic text-lg shadow-md animate-pulse">
            VS
          </div>
          {totalScore > 0 && (
            <div className="hidden md:block w-px h-24 bg-gradient-to-b from-zinc-200 dark:from-zinc-800 to-transparent mt-3" />
          )}
        </div>

        {/* Startup B */}
        <div className={`p-5 rounded-2xl border transition-all ${winner === 'B' ? 'border-amber-400 bg-amber-500/[0.02] dark:bg-amber-500/[0.01] shadow-lg shadow-amber-500/5' : 'border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/20'}`}>
          <div className="space-y-4">
            <select
              value={selectedBId}
              onChange={(e) => setSelectedBId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select Startup B</option>
              {startups.map((s) => (
                <option key={s.id} value={s.id} disabled={s.id === selectedAId}>
                  {s.name} (Rank #{s.rank})
                </option>
              ))}
            </select>

            <AnimatePresence mode="wait">
              {startupB ? (
                <motion.div
                  key={startupB.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4 text-center sm:text-left"
                >
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm flex-shrink-0">
                      {startupB.logo_url ? (
                        <img src={startupB.logo_url} alt={startupB.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-base">
                          {startupB.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                        <h4 className="font-extrabold text-zinc-900 dark:text-white truncate text-base">{startupB.name}</h4>
                        {winner === 'B' && <Sparkles className="w-4 h-4 text-amber-500" />}
                      </div>
                      <p className="text-xs text-zinc-500 capitalize">{startupB.category}</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <BattleStatItem icon={ThumbsUp} label="Upvotes" value={startupB.upvote_count} iconColor="text-orange-500" />
                    <BattleStatItem icon={MessageSquare} label="Comments" value={startupB.comment_count} iconColor="text-sky-500" />
                    <BattleStatItem icon={Users} label="Followers" value={startupB.follower_count} iconColor="text-emerald-500" />
                    <div className="border-t border-zinc-200/60 dark:border-zinc-800/60 pt-2 flex justify-between items-center text-sm">
                      <span className="font-bold text-zinc-500">Leaderboard Score</span>
                      <span className="font-black text-orange-500 text-lg">{startupB.score}</span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <EmptySelectionSide side="B" />
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* Dominance Progress Bar */}
      {startupA && startupB && totalScore > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800/60"
        >
          <div className="flex justify-between text-xs font-black uppercase tracking-wider text-zinc-500">
            <span>{startupA.name} ({pctA}%)</span>
            <span>Dominance Bar</span>
            <span>({pctB}%) {startupB.name}</span>
          </div>

          <div className="w-full h-4 rounded-full bg-zinc-100 dark:bg-zinc-850 overflow-hidden flex relative shadow-inner">
            <motion.div
              animate={{ width: `${pctA}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 15 }}
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-end pr-2 text-[10px] font-black text-white"
            />
            <motion.div
              animate={{ width: `${pctB}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 15 }}
              className="h-full bg-gradient-to-l from-sky-500 to-indigo-500 flex items-center justify-start pl-2 text-[10px] font-black text-white"
            />
          </div>

          {winner !== 'TIE' && (
            <p className="text-center text-xs font-bold text-amber-500 flex items-center justify-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 animate-bounce" />
              {winner === 'A' ? startupA.name : startupB.name} is dominating the battle!
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Stat Item Helper ────────────────────────────────────────────────────────

interface BattleStatItemProps {
  icon: React.ElementType;
  label: string;
  value: number;
  iconColor: string;
}

function BattleStatItem({ icon: Icon, label, value, iconColor }: BattleStatItemProps) {
  return (
    <div className="flex justify-between items-center text-xs py-1">
      <span className="flex items-center gap-1.5 text-zinc-500 font-semibold">
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        {label}
      </span>
      <span className="font-extrabold text-zinc-800 dark:text-zinc-200">{value}</span>
    </div>
  );
}

// ─── Empty Side Helper ────────────────────────────────────────────────────────

function EmptySelectionSide({ side }: { side: 'A' | 'B' }) {
  return (
    <div className="h-44 border border-dashed border-zinc-200 dark:border-zinc-850 rounded-xl flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 p-4 bg-zinc-50/30 dark:bg-zinc-950/10">
      <AlertCircle className="w-8 h-8 mb-2 opacity-55" />
      <span className="text-xs font-semibold">Waiting for Startup {side}...</span>
    </div>
  );
}
