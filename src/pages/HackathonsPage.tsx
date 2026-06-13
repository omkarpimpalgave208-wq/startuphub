import { useState } from 'react';
import { 
  Trophy, 
  Search, 
  Calendar, 
  DollarSign, 
  Users, 
  ArrowRight, 
  ExternalLink, 
  Github, 
  Code, 
  Palette, 
  Brain, 
  Check, 
  Award, 
  Sparkles, 
  ChevronRight,
  TrendingUp,
  Clock,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';

// ----------------- MOCK DATA -----------------

interface Hackathon {
  id: string;
  name: string;
  organizer: string;
  prizePool: string;
  startDate: string;
  deadline: string;
  teamSize: string;
  status: 'live' | 'upcoming';
  categories: string[];
  description: string;
}

const MOCK_HACKATHONS: Hackathon[] = [
  {
    id: 'hack-1',
    name: 'Generative AI Sprint',
    organizer: 'Google Cloud',
    prizePool: '$50,000',
    startDate: 'July 10, 2026',
    deadline: 'July 5, 2026',
    teamSize: '1-4 builders',
    status: 'live',
    categories: ['AI/ML', 'SaaS'],
    description: 'Build innovative solutions leveraging LLMs, vector search, and agentic workflows to automate real-world business tasks.'
  },
  {
    id: 'hack-2',
    name: 'NextGen Web3 DevCon Hack',
    organizer: 'Ethereum Foundation',
    prizePool: '$100,000',
    startDate: 'September 1, 2026',
    deadline: 'August 25, 2026',
    teamSize: '2-5 builders',
    status: 'upcoming',
    categories: ['Web3'],
    description: 'Design decentralised applications, smart contracts, and ZK-proof tools to power the next generation of social finance.'
  },
  {
    id: 'hack-3',
    name: 'Micro-SaaS Builders Cup',
    organizer: 'Vercel & Supabase',
    prizePool: '$25,000',
    startDate: 'June 25, 2026',
    deadline: 'June 20, 2026',
    teamSize: '1-3 builders',
    status: 'live',
    categories: ['SaaS', 'AI/ML'],
    description: 'A 72-hour build sprint dedicated to launching hyper-focused, profitable SaaS MVPs with zero infrastructure hassle.'
  },
  {
    id: 'hack-4',
    name: 'iOS & Android Innovation Challenge',
    organizer: 'Swift & Kotlin Labs',
    prizePool: '$15,000',
    startDate: 'October 12, 2026',
    deadline: 'October 8, 2026',
    teamSize: '1-4 builders',
    status: 'upcoming',
    categories: ['Mobile', 'SaaS'],
    description: 'Craft high-performance, native or cross-platform mobile apps targeting productivity, offline-first access, or accessibility.'
  },
  {
    id: 'hack-5',
    name: 'Open Source AI Hackathon',
    organizer: 'Hugging Face',
    prizePool: '$40,000',
    startDate: 'November 15, 2026',
    deadline: 'November 10, 2026',
    teamSize: '1-5 builders',
    status: 'upcoming',
    categories: ['AI/ML', 'Web3'],
    description: 'Fine-tune open-weights models and share them on the hub. Bonus points for building integrations with open AI agents.'
  },
  {
    id: 'hack-6',
    name: 'No-Code SaaS Build Challenge',
    organizer: 'FlutterFlow',
    prizePool: '$10,000',
    startDate: 'June 20, 2026',
    deadline: 'June 17, 2026',
    teamSize: '1-2 builders',
    status: 'live',
    categories: ['SaaS', 'Mobile'],
    description: 'Create functional, beautiful applications under record speed using visual tools, customs APIs, and seamless database syncs.'
  }
];

interface TeamListing {
  id: string;
  role: 'Developer' | 'Designer' | 'AI Engineer';
  hackathon: string;
  teamName: string;
  description: string;
  skills: string[];
  createdBy: string;
  username: string;
}

const MOCK_TEAM_LISTINGS: TeamListing[] = [
  {
    id: 'team-1',
    role: 'Developer',
    hackathon: 'Generative AI Sprint',
    teamName: 'LegalAI Drafts',
    description: 'Building an AI assistant to analyze legal document compliance. Need a frontend specialist who can write React/Tailwind clean interfaces.',
    skills: ['React', 'Tailwind CSS', 'Vite'],
    createdBy: 'Alex Rivers',
    username: 'alex_rivers'
  },
  {
    id: 'team-2',
    role: 'Designer',
    hackathon: 'NextGen Web3 DevCon Hack',
    teamName: 'DAOify Vote',
    description: 'Developing a new UX model for multi-sig votes. Looking for a talented UI/UX designer to translate wireframes into gorgeous, interactive mockups.',
    skills: ['Figma', 'UI/UX Design', 'Design Systems'],
    createdBy: 'Puja Shah',
    username: 'puja_shah'
  },
  {
    id: 'team-3',
    role: 'AI Engineer',
    hackathon: 'Open Source AI Hackathon',
    teamName: 'MediMatch Systems',
    description: 'Fine-tuning small language models on medical research records. Need someone with solid PyTorch and tokenization experience.',
    skills: ['PyTorch', 'Transformers', 'Fine-Tuning'],
    createdBy: 'Dr. Ryan Patel',
    username: 'ryan_patel'
  }
];

interface ProjectShowcase {
  id: string;
  name: string;
  description: string;
  hackathon: string;
  teamMembers: string[];
  demoUrl: string;
  githubUrl: string;
  badge?: string;
}

const MOCK_PROJECTS: ProjectShowcase[] = [
  {
    id: 'proj-1',
    name: 'QuizScribe AI',
    description: 'An AI tool that transcribes podcasts and extracts interactive flashcards and quizzes automatically.',
    hackathon: 'Generative AI Sprint',
    teamMembers: ['Jane Doe', 'Bob Chen'],
    demoUrl: 'https://quizscribe.demo',
    githubUrl: 'https://github.com/makers/quizscribe',
    badge: '🏆 1st Place'
  },
  {
    id: 'proj-2',
    name: 'DePay Protocol',
    description: 'Sleek checkout buttons for decentralized, split-royalty subscription payments with sub-second finality.',
    hackathon: 'NextGen Web3 DevCon Hack',
    teamMembers: ['Sam Wilson', 'Elena Rostova'],
    demoUrl: 'https://depay.demo',
    githubUrl: 'https://github.com/makers/depay',
    badge: '💡 Most Innovative'
  },
  {
    id: 'proj-3',
    name: 'FitTrack Local',
    description: 'An offline-first, syncable workout scheduler designed exclusively for e-ink devices and low power tablets.',
    hackathon: 'iOS & Android Innovation Challenge',
    teamMembers: ['Marc Woods', 'Sara Lee'],
    demoUrl: 'https://fittrack.demo',
    githubUrl: 'https://github.com/makers/fittrack',
    badge: '📱 Best UI'
  }
];

interface LeaderboardUser {
  rank: number;
  fullName: string;
  username: string;
  points: number;
  joinedCount: number;
  winsCount: number;
}

const LEADERBOARD_DATA: LeaderboardUser[] = [
  { rank: 1, fullName: 'Omkar Pimpalgave', username: 'omkar_208', points: 1420, joinedCount: 12, winsCount: 4 },
  { rank: 2, fullName: 'Puja Shah', username: 'puja_shah', points: 1180, joinedCount: 9, winsCount: 3 },
  { rank: 3, fullName: 'Alex Rivers', username: 'alex_rivers', points: 950, joinedCount: 8, winsCount: 2 },
  { rank: 4, fullName: 'Sam Wilson', username: 'sam_w', points: 860, joinedCount: 6, winsCount: 2 },
  { rank: 5, fullName: 'Sara Lee', username: 'sara_l', points: 820, joinedCount: 7, winsCount: 1 },
  { rank: 6, fullName: 'Elena Rostova', username: 'elena_r', points: 740, joinedCount: 7, winsCount: 0 },
  { rank: 7, fullName: 'Bob Chen', username: 'bob_c', points: 710, joinedCount: 6, winsCount: 1 }
];

export function HackathonsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Live' | 'Upcoming' | 'AI/ML' | 'Web3' | 'SaaS' | 'Mobile'>('All');
  
  // Interactive mock states
  const [registeredHackathons, setRegisteredHackathons] = useState<string[]>([]);
  const [appliedTeams, setAppliedTeams] = useState<string[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState<'points' | 'wins' | 'joined'>('points');

  // Filter hackathons
  const filteredHackathons = MOCK_HACKATHONS.filter((hack) => {
    const matchesSearch = 
      hack.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hack.organizer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      hack.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'All') return true;
    if (activeFilter === 'Live') return hack.status === 'live';
    if (activeFilter === 'Upcoming') return hack.status === 'upcoming';
    
    // Skill/Category matching
    return hack.categories.includes(activeFilter);
  });

  const handleRegister = (hackId: string) => {
    if (registeredHackathons.includes(hackId)) {
      setRegisteredHackathons(prev => prev.filter(id => id !== hackId));
    } else {
      setRegisteredHackathons(prev => [...prev, hackId]);
    }
  };

  const handleApplyTeam = (teamId: string) => {
    if (appliedTeams.includes(teamId)) {
      setAppliedTeams(prev => prev.filter(id => id !== teamId));
    } else {
      setAppliedTeams(prev => [...prev, teamId]);
    }
  };

  // Sort Leaderboard depending on tab choice
  const sortedLeaderboard = [...LEADERBOARD_DATA].sort((a, b) => {
    if (leaderboardTab === 'wins') {
      return b.winsCount - a.winsCount || b.points - a.points;
    }
    if (leaderboardTab === 'joined') {
      return b.joinedCount - a.joinedCount || b.points - a.points;
    }
    return b.points - a.points;
  });

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
          placeholder="Search hackathons by name, host, or keyword..."
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

        {filteredHackathons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
            {filteredHackathons.map((hack) => {
              const isRegistered = registeredHackathons.includes(hack.id);
              return (
                <motion.div
                  key={hack.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 hover:border-orange-500/20 dark:hover:border-orange-500/20 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{hack.organizer}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        hack.status === 'live'
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}>
                        {hack.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-lg text-zinc-900 dark:text-white leading-tight mb-2 hover:text-orange-500 dark:hover:text-orange-500 transition-colors">
                      {hack.name}
                    </h3>
                    
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3 mb-4">
                      {hack.description}
                    </p>

                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-4 mb-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-zinc-400 dark:text-zinc-500 font-medium block">Prize Pool</span>
                        <span className="font-bold text-zinc-900 dark:text-white flex items-center text-sm text-orange-500">
                          <DollarSign className="w-3.5 h-3.5" />
                          {hack.prizePool}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-zinc-400 dark:text-zinc-500 font-medium block">Start Date</span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                          {hack.startDate}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-zinc-400 dark:text-zinc-500 font-medium block">Reg. Deadline</span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                          {hack.deadline}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-zinc-400 dark:text-zinc-500 font-medium block">Team Size</span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                          {hack.teamSize}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {hack.categories.map(cat => (
                        <span key={cat} className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleRegister(hack.id)}
                    variant={isRegistered ? 'outline' : 'primary'}
                    fullWidth
                    className="mt-auto flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                  >
                    {isRegistered ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        Registered
                      </>
                    ) : (
                      'Register Now'
                    )}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <Trophy className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">No hackathons match the filters</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-sm mx-auto">
              Try typing something else or select a different category filter.
            </p>
          </div>
        )}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          {MOCK_TEAM_LISTINGS.map((team) => {
            const hasApplied = appliedTeams.includes(team.id);
            const RoleIcon = team.role === 'AI Engineer' ? Brain : team.role === 'Designer' ? Palette : Code;
            
            return (
              <div 
                key={team.id}
                className="flex flex-col justify-between bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-all duration-200 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 px-2 py-0.5 rounded-full">
                      <RoleIcon className="w-3.5 h-3.5" />
                      {team.role}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[120px]">{team.teamName}</span>
                  </div>

                  <h3 className="font-bold text-sm text-zinc-400 uppercase tracking-wider mb-2 truncate">
                    {team.hackathon}
                  </h3>

                  <p className="text-zinc-700 dark:text-zinc-300 text-xs leading-relaxed mb-4 line-clamp-4">
                    {team.description}
                  </p>

                  <div className="space-y-1.5 mb-4">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold block uppercase">Required Skills</span>
                    <div className="flex flex-wrap gap-1">
                      {team.skills.map((skill) => (
                        <span key={skill} className="px-1.5 py-0.5 rounded bg-zinc-50 dark:bg-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-800/80">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-4 mt-auto">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar 
                        alt={team.createdBy}
                        size="xs"
                        className="w-6 h-6 text-[10px] font-bold"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{team.createdBy}</p>
                        <p className="text-[10px] text-zinc-400 truncate">@{team.username}</p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleApplyTeam(team.id)}
                    variant={hasApplied ? 'ghost' : 'outline'}
                    size="sm"
                    fullWidth
                    className="text-xs font-semibold uppercase tracking-wider"
                  >
                    {hasApplied ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        Apply Request Sent
                      </span>
                    ) : (
                      'Request to Join'
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-stretch">
          {MOCK_PROJECTS.map((project) => (
            <div 
              key={project.id}
              className="flex flex-col justify-between bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-all duration-200 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-semibold text-zinc-400 truncate max-w-[180px]">
                    {project.hackathon}
                  </span>
                  {project.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-400/20 whitespace-nowrap">
                      {project.badge}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base text-zinc-900 dark:text-white mb-2 truncate">
                  {project.name}
                </h3>

                <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed mb-4 line-clamp-3">
                  {project.description}
                </p>

                <div className="space-y-1 mb-4">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase block">Team Makers</span>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                    {project.teamMembers.join(', ')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-4 mt-auto">
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Live Demo
                </a>
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Github className="w-3.5 h-3.5" />
                  GitHub
                </a>
              </div>
            </div>
          ))}
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

        <div className="w-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase bg-zinc-50/50 dark:bg-zinc-900/50">
                  <th className="py-3 px-4 w-12 text-center">Rank</th>
                  <th className="py-3 px-4">Maker</th>
                  <th className="py-3 px-4 text-center">Joined</th>
                  <th className="py-3 px-4 text-center">Wins</th>
                  <th className="py-3 px-4 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs sm:text-sm">
                {sortedLeaderboard.map((user, idx) => (
                  <tr key={user.username} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-4 text-center font-bold text-zinc-400 dark:text-zinc-500">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        <Avatar 
                          alt={user.fullName}
                          size="xs"
                          className="w-7 h-7 text-xs font-bold"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{user.fullName}</p>
                          <p className="text-[10px] text-zinc-400 truncate">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center text-zinc-600 dark:text-zinc-400">
                      {user.joinedCount}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-zinc-900 dark:text-white">
                      {user.winsCount}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-orange-500">
                      {user.points.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </div>
  );
}
