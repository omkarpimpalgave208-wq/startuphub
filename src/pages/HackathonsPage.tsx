import { useState, useEffect } from 'react';
import {
  Trophy,
  Search,
  Users,
  Code,
  Award,
  Sparkles,
  Calendar,
  Globe,
  DollarSign,
  Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface Hackathon {
  id: string;
  name: string;
  organizer: string;
  description: string;
  website_url: string;
  registration_url: string;
  start_date: string;
  end_date: string;
  deadline: string;
  prize_pool: string;
  team_size: string;
  category: string;
  banner_url: string;
}

export function HackathonsPage() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<
    'All' | 'Live' | 'Upcoming' | 'AI/ML' | 'Web3' | 'SaaS' | 'Mobile' | 'Open Source'
  >('All');
  const [leaderboardTab, setLeaderboardTab] = useState<'points' | 'wins' | 'joined'>('points');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('hackathons')
          .select('*')
          .order('start_date', { ascending: true });

        if (error) {
          const local = localStorage.getItem('startuphub_hackathons');
          setHackathons(local ? JSON.parse(local) : []);
        } else {
          setHackathons(data ?? []);
        }
      } catch {
        const local = localStorage.getItem('startuphub_hackathons');
        setHackathons(local ? JSON.parse(local) : []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const isLive = (h: Hackathon) => {
    if (!h.start_date || !h.end_date) return false;
    const now = Date.now();
    return now >= new Date(h.start_date).getTime() && now <= new Date(h.end_date).getTime();
  };

  const isUpcoming = (h: Hackathon) => {
    if (!h.start_date) return false;
    return Date.now() < new Date(h.start_date).getTime();
  };

  const filteredHackathons = hackathons.filter((h) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      h.name.toLowerCase().includes(q) ||
      h.organizer.toLowerCase().includes(q) ||
      h.description.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Live') return isLive(h);
    if (activeFilter === 'Upcoming') return isUpcoming(h);
    return h.category === activeFilter;
  });

  return (
    <div className="w-full max-w-none min-w-0 px-4 md:px-0 space-y-12 pb-16">

      {/* HERO SECTION */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
          <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-orange-500" />
          Discover Hackathons
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2 max-w-2xl">
          Find real hackathons, build projects, and connect with teammates. Only authentic
          challenges posted by platform administrators are listed here.
        </p>
      </div>

      {/* SEARCH BAR */}
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

      {/* CATEGORY & STATUS FILTERS */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar flex-nowrap md:flex-wrap w-full py-1">
        {(['All', 'Live', 'Upcoming', 'AI/ML', 'Web3', 'SaaS', 'Mobile', 'Open Source'] as const).map(
          (filter) => (
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
          )
        )}
      </div>

      {/* FEATURED HACKATHONS */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-orange-500" />
            Featured Challenges
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Open sprint boards currently accepting submissions and registrations.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
          </div>
        ) : filteredHackathons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
            {filteredHackathons.map((hack) => (
              <motion.div
                key={hack.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 hover:border-orange-500/20 dark:hover:border-orange-500/20 hover:shadow-md transition-all duration-200"
              >
                <div className="flex-1">
                  {hack.banner_url && (
                    <div className="w-full h-32 sm:h-40 rounded-lg overflow-hidden mb-4 border border-zinc-100 dark:border-zinc-800">
                      <img
                        src={hack.banner_url}
                        alt={hack.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      {hack.organizer}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isLive(hack)
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {isLive(hack) ? 'Live' : isUpcoming(hack) ? 'Upcoming' : 'Closed'}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-zinc-900 dark:text-white leading-tight mb-2">
                    {hack.name}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3 mb-4">
                    {hack.description}
                  </p>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-4 mb-4 text-xs">
                    {hack.prize_pool && (
                      <div className="space-y-1">
                        <span className="text-zinc-400 dark:text-zinc-500 font-medium block">
                          Prize Pool
                        </span>
                        <span className="font-bold text-orange-500 flex items-center text-sm">
                          <DollarSign className="w-3.5 h-3.5" />
                          {hack.prize_pool}
                        </span>
                      </div>
                    )}
                    {hack.start_date && (
                      <div className="space-y-1">
                        <span className="text-zinc-400 dark:text-zinc-500 font-medium block">
                          Start Date
                        </span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                          {new Date(hack.start_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {hack.deadline && (
                      <div className="space-y-1">
                        <span className="text-zinc-400 dark:text-zinc-500 font-medium block">
                          Deadline
                        </span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                          {new Date(hack.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {hack.team_size && (
                      <div className="space-y-1">
                        <span className="text-zinc-400 dark:text-zinc-500 font-medium block">
                          Team Size
                        </span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                          {hack.team_size}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-5">
                    <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                      {hack.category}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-auto">
                  {hack.registration_url && (
                    <a
                      href={hack.registration_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-colors"
                    >
                      Register Now
                    </a>
                  )}
                  {hack.website_url && (
                    <a
                      href={hack.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/20 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
              No hackathons available yet
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto">
              Check back later for upcoming development and design challenges.
            </p>
          </div>
        )}
      </section>

      {/* TEAM FORMATION BOARD */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            Team Formation Board
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Connect with hackathon teams looking for complementary skills.
          </p>
        </div>
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/20 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
            No teams are recruiting yet
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto">
            Recruiting cards will appear here when builders start forming teams.
          </p>
        </div>
      </section>

      {/* HACKATHON PROJECTS SHOWCASE */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            Hackathon Showcase
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Previous projects built and deployed during sprint challenges.
          </p>
        </div>
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/20 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
            <Code className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
            No hackathon projects have been submitted yet
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto">
            Submissions will be displayed once the challenges conclude.
          </p>
        </div>
      </section>

      {/* LEADERBOARD */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-orange-500" />
              Leaderboard
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Top-performing makers ranked by hackathon points and activity metrics.
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl w-fit">
            {(['points', 'wins', 'joined'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setLeaderboardTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  leaderboardTab === tab
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {tab === 'points' ? 'Most Active' : tab === 'wins' ? 'Most Wins' : 'Most Joined'}
              </button>
            ))}
          </div>
        </div>
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/20 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
            No leaderboard entries yet
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto">
            Rankings will update as participants earn points in hackathons.
          </p>
        </div>
      </section>
    </div>
  );
}

export default HackathonsPage;
