import { useState } from 'react';
import { 
  Trophy, 
  Search, 
  Users, 
  Code, 
  Award, 
  Sparkles, 
  Calendar,
  Layers,
  Inbox
} from 'lucide-react';
import { motion } from 'framer-motion';

export function HackathonsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Live' | 'Upcoming' | 'AI/ML' | 'Web3' | 'SaaS' | 'Mobile'>('All');
  const [leaderboardTab, setLeaderboardTab] = useState<'points' | 'wins' | 'joined'>('points');

  return (
    <div className="w-full max-w-none min-w-0 px-4 md:px-0 space-y-12">
      
      {/* SECTION 1: HERO SECTION */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
          <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-orange-500" />
          Discover Hackathons
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2 max-w-2xl">
          Build prototype products, join hack sprints, find builders for your dream team, and showcase your achievements in global design and coding challenges.
        </p>
      </div>

      {/* SECTION 2: SEARCH BAR */}
      <div className="relative w-full max-w-2xl mx-auto">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
        </div>
        <input
          type="text"
          placeholder="Search hackathons..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 transition-all duration-200 shadow-sm text-sm"
        />
      </div>

      {/* SECTION 3: CATEGORY & STATUS FILTERS */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar flex-nowrap md:flex-wrap w-full py-1">
        {(['All', 'Live', 'Upcoming', 'AI/ML', 'Web3', 'SaaS', 'Mobile'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeFilter === filter
                ? 'bg-orange-500 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* SECTION 4: FEATURED HACKATHONS */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-orange-500" />
            Featured Challenges
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">Open sprint boards currently accepting submissions and registrations.</p>
        </div>

        {/* Clean Empty State */}
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/20 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">No hackathons available yet</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto">
            Check back later for upcoming development and design challenges.
          </p>
        </div>
      </section>

      {/* SECTION 5: TEAM FORMATION BOARD */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            Team Formation Board
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">Connect with hackathon teams looking for complementary skills.</p>
        </div>

        {/* Clean Empty State */}
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/20 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">No teams are recruiting yet</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto">
            Recruiting cards will appear here when builders start forming teams.
          </p>
        </div>
      </section>

      {/* SECTION 6: HACKATHON PROJECTS SHOWCASE */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            Hackathon Showcase
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">Previous projects built and deployed during sprint challenges.</p>
        </div>

        {/* Clean Empty State */}
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/20 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
            <Code className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">No hackathon projects have been submitted yet</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto">
            Submissions will be displayed once the challenges conclude.
          </p>
        </div>
      </section>

      {/* SECTION 7: LEADERBOARD */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-orange-500" />
              Leaderboard
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">Top-performing makers ranked by hackathon points and activity metrics.</p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl w-fit">
            <button
              onClick={() => setLeaderboardTab('points')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                leaderboardTab === 'points'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Most Active
            </button>
            <button
              onClick={() => setLeaderboardTab('wins')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                leaderboardTab === 'wins'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Most Wins
            </button>
            <button
              onClick={() => setLeaderboardTab('joined')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                leaderboardTab === 'joined'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Most Joined
            </button>
          </div>
        </div>

        {/* Clean Empty State */}
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/20 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">No leaderboard entries yet</h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto">
            Rankings will update as participants earn points in hackathons.
          </p>
        </div>
      </section>

    </div>
  );
}
