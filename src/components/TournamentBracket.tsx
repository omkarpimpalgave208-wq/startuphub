import { useMemo, useState } from 'react';
import { Trophy, Swords, Zap, Flame, Crown, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Startup {
  id: string;
  name: string;
  logo_url: string | null;
  score: number;
  rank: number;
  category: string;
  upvote_count: number;
  comment_count: number;
  follower_count: number;
}

interface TournamentBracketProps {
  startups: Startup[];
  onSelectMatch: (startupAId: string, startupBId: string) => void;
}

export function TournamentBracket({ startups, onSelectMatch }: TournamentBracketProps) {
  const [hoveredMatchId, setHoveredMatchId] = useState<number | null>(null);

  // Compute seeds based on the "frozen snapshot" (which is their score ranking)
  const seededStartups = useMemo(() => {
    // Take the top 16 startups as qualified seeds
    return [...startups]
      .sort((a, b) => b.score - a.score)
      .slice(0, 16);
  }, [startups]);

  // Seeding order for bracket matches
  const bracketSeeds = [0, 15, 7, 8, 4, 11, 3, 12, 2, 13, 5, 10, 6, 9, 1, 14];

  // Match calculator (uses score + current week velocity)
  const getMatchOutcome = (startupA: Startup | undefined, startupB: Startup | undefined, matchNum: number) => {
    if (!startupA && !startupB) return { winner: undefined, scoreA: 0, scoreB: 0 };
    if (startupA && !startupB) return { winner: startupA, scoreA: startupA.score, scoreB: 0 };
    if (!startupA && startupB) return { winner: startupB, scoreA: 0, scoreB: startupB.score };

    const sA = startupA!;
    const sB = startupB!;

    // Compute velocity growth rate: based on upvotes/comments relative to category/rank
    const velocityA = (sA.upvote_count * 8) + (sA.comment_count * 12);
    const velocityB = (sB.upvote_count * 8) + (sB.comment_count * 12);

    const scoreA = sA.score + velocityA;
    const scoreB = sB.score + velocityB;

    let winner = sA;
    if (scoreB > scoreA) {
      winner = sB;
    } else if (scoreA === scoreB) {
      // Tie breaker: higher overall rank (lower rank number)
      winner = sA.rank < sB.rank ? sA : sB;
    }

    return { winner, scoreA: Math.round(scoreA), scoreB: Math.round(scoreB) };
  };

  // Compile bracket rounds dynamically from qualified seeds
  const bracketData = useMemo(() => {
    if (seededStartups.length < 2) return null;

    // --- Round 1: Round of 16 (8 matches) ---
    const r1Matches = [];
    for (let i = 0; i < 8; i++) {
      const startupA = seededStartups[bracketSeeds[i * 2]];
      const startupB = seededStartups[bracketSeeds[i * 2 + 1]];
      const outcome = getMatchOutcome(startupA, startupB, i + 1);
      r1Matches.push({
        id: i + 1,
        startupA,
        startupB,
        winner: outcome.winner,
        scoreA: outcome.scoreA,
        scoreB: outcome.scoreB,
      });
    }

    // --- Round 2: Quarterfinals (4 matches) ---
    const r2Matches = [];
    for (let i = 0; i < 4; i++) {
      const matchA = r1Matches[i * 2];
      const matchB = r1Matches[i * 2 + 1];
      const startupA = matchA.winner;
      const startupB = matchB.winner;
      const outcome = getMatchOutcome(startupA, startupB, 9 + i);
      r2Matches.push({
        id: 9 + i,
        startupA,
        startupB,
        winner: outcome.winner,
        scoreA: outcome.scoreA,
        scoreB: outcome.scoreB,
      });
    }

    // --- Round 3: Semifinals (2 matches) ---
    const r3Matches = [];
    for (let i = 0; i < 2; i++) {
      const matchA = r2Matches[i * 2];
      const matchB = r2Matches[i * 2 + 1];
      const startupA = matchA.winner;
      const startupB = matchB.winner;
      const outcome = getMatchOutcome(startupA, startupB, 13 + i);
      r3Matches.push({
        id: 13 + i,
        startupA,
        startupB,
        winner: outcome.winner,
        scoreA: outcome.scoreA,
        scoreB: outcome.scoreB,
      });
    }

    // --- Round 4: Finals (1 match) ---
    const matchA = r3Matches[0];
    const matchB = r3Matches[1];
    const startupA = matchA.winner;
    const startupB = matchB.winner;
    const outcome = getMatchOutcome(startupA, startupB, 15);
    const r4Match = {
      id: 15,
      startupA,
      startupB,
      winner: outcome.winner,
      scoreA: outcome.scoreA,
      scoreB: outcome.scoreB,
    };

    return {
      r1: r1Matches,
      r2: r2Matches,
      r3: r3Matches,
      r4: r4Match,
    };
  }, [seededStartups]);

  if (seededStartups.length < 4) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-10 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-zinc-400 mx-auto" />
        <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">Tournament Lock Active</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
          Weekly tournament qualifications require at least 4 active startups on the weekly leaderboard. Launch more startups to kick off the bracket!
        </p>
      </div>
    );
  }

  const r = bracketData!;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-8 shadow-xl relative overflow-x-auto min-w-0">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-xs font-bold text-amber-500 uppercase tracking-widest">
          <Trophy className="w-3.5 h-3.5" />
          Weekly Tournament
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
          Qualified Top 16 Championship Bracket
        </h2>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          Startups compete head-to-head. Advancing is determined by baseline seed score combined with current week's engagement velocity. Click any match to enter Battle Mode comparison!
        </p>
      </div>

      {/* Bracket Columns Container */}
      <div className="grid grid-cols-4 gap-6 items-center min-w-[980px] pt-4">
        
        {/* ROUND 1: Round of 16 */}
        <div className="space-y-4">
          <h4 className="text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Round of 16</h4>
          {r.r1.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              onSelect={onSelectMatch}
              isHovered={hoveredMatchId === m.id}
              onHover={(val) => setHoveredMatchId(val ? m.id : null)}
            />
          ))}
        </div>

        {/* ROUND 2: Quarterfinals */}
        <div className="space-y-16 py-6">
          <h4 className="text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Quarterfinals</h4>
          {r.r2.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              onSelect={onSelectMatch}
              isHovered={hoveredMatchId === m.id}
              onHover={(val) => setHoveredMatchId(val ? m.id : null)}
            />
          ))}
        </div>

        {/* ROUND 3: Semifinals */}
        <div className="space-y-44 py-16">
          <h4 className="text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Semifinals</h4>
          {r.r3.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              onSelect={onSelectMatch}
              isHovered={hoveredMatchId === m.id}
              onHover={(val) => setHoveredMatchId(val ? m.id : null)}
            />
          ))}
        </div>

        {/* ROUND 4: Finals */}
        <div className="space-y-4 flex flex-col items-center">
          <h4 className="text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Championship</h4>
          <MatchCard
            match={r.r4}
            onSelect={onSelectMatch}
            isHovered={hoveredMatchId === r.r4.id}
            onHover={(val) => setHoveredMatchId(val ? r.r4.id : null)}
          />

          {/* Champion Display */}
          {r.r4.winner && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="mt-8 p-5 bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl text-center w-full max-w-[200px] shadow-lg shadow-amber-500/5"
            >
              <Crown className="w-8 h-8 text-amber-500 mx-auto animate-bounce mb-2" />
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">CHAMPION</span>
              <h5 className="font-black text-zinc-950 dark:text-white text-sm truncate mt-1">
                {r.r4.winner.name}
              </h5>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 capitalize">
                {r.r4.winner.category}
              </p>
            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Match Card Sub-Component ──────────────────────────────────────────────

interface MatchCardProps {
  match: {
    id: number;
    startupA: Startup | undefined;
    startupB: Startup | undefined;
    winner: Startup | undefined;
    scoreA: number;
    scoreB: number;
  };
  onSelect: (idA: string, idB: string) => void;
  isHovered: boolean;
  onHover: (val: boolean) => void;
}

function MatchCard({ match, onSelect, isHovered, onHover }: MatchCardProps) {
  const { startupA, startupB, winner, scoreA, scoreB } = match;

  const handleClick = () => {
    if (startupA && startupB) {
      onSelect(startupA.id, startupB.id);
    }
  };

  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={handleClick}
      className={`p-3 rounded-2xl border transition-all duration-200 select-none ${
        startupA && startupB ? 'cursor-pointer' : 'cursor-default'
      } ${
        isHovered
          ? 'border-orange-500 bg-orange-500/[0.02] dark:bg-orange-500/[0.01] shadow-lg shadow-orange-500/5'
          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-850/50'
      }`}
    >
      <div className="flex justify-between items-center text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider pb-1.5 border-b border-zinc-150 dark:border-zinc-800 flex-shrink-0">
        <span>MATCH #{match.id}</span>
        {startupA && startupB && (
          <span className="flex items-center gap-0.5 text-orange-500 text-[8px] animate-pulse">
            <Swords className="w-2.5 h-2.5" /> COMPARE
          </span>
        )}
      </div>

      <div className="mt-2 space-y-1.5">
        {/* Startup A */}
        <StartupRow
          startup={startupA}
          score={scoreA}
          isWinner={winner?.id === startupA?.id}
          isTied={scoreA === scoreB && scoreA > 0}
        />
        
        {/* VS Divider */}
        <div className="text-[9px] text-zinc-400 font-extrabold text-center relative h-1">
          <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-zinc-50 dark:bg-zinc-900 px-1 border border-zinc-200 dark:border-zinc-800 rounded text-[7px]">
            VS
          </span>
        </div>

        {/* Startup B */}
        <StartupRow
          startup={startupB}
          score={scoreB}
          isWinner={winner?.id === startupB?.id}
          isTied={scoreA === scoreB && scoreA > 0}
        />
      </div>
    </div>
  );
}

// ─── Startup Row inside Match Card ─────────────────────────────────────────

function StartupRow({
  startup,
  score,
  isWinner,
  isTied,
}: {
  startup: Startup | undefined;
  score: number;
  isWinner: boolean;
  isTied: boolean;
}) {
  if (!startup) {
    return (
      <div className="flex items-center justify-between py-1 text-zinc-400 dark:text-zinc-600">
        <span className="text-xs font-semibold">TBD</span>
        <span className="text-[10px] font-bold">-</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between py-1 rounded-lg px-1.5 transition-colors ${isWinner ? 'bg-amber-500/10' : ''}`}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700 flex-shrink-0">
          {startup.logo_url ? (
            <img src={startup.logo_url} alt={startup.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-[9px]">
              {startup.name[0]}
            </div>
          )}
        </div>
        <span className={`text-xs truncate ${isWinner ? 'font-black text-zinc-950 dark:text-white' : 'font-bold text-zinc-600 dark:text-zinc-400'}`}>
          {startup.name}
        </span>
      </div>
      <div className="flex items-center gap-1.5 pl-1.5">
        <span className={`text-[10px] font-black ${isWinner ? 'text-amber-500' : 'text-zinc-400 dark:text-zinc-500'}`}>
          {score}
        </span>
        {isWinner && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />}
      </div>
    </div>
  );
}
