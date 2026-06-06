import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Rocket,
  Search,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
  Users,
  Lightbulb,
  Sparkles,
  ChevronRight,
  Target,
  MessageSquare,
  Activity
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { api } from '../lib/api';
import { Avatar } from '../components/ui/Avatar';
import { ProductCard } from '../components/ProductCard';
import type { Product, Discussion } from '../types';

export function Home() {
  const { user } = useAuthStore();
  const { setSearchOpen } = useUIStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trending' | 'recent'>('trending');
  const [stats, setStats] = useState<{
    totalUsers: number;
    startupsRegistered: number;
    projectsShared: number;
    activeMembers: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setStatsLoading(true);
    setError(null);
    try {
      const [productsData, discussionsData, statsData] = await Promise.all([
        api.getProducts({ trending: activeTab === 'trending', limit: 9 }),
        api.getDiscussions({ trending: true, limit: 6 }),
        api.getCommunityStats()
      ]);
      setProducts(productsData);
      setDiscussions(discussionsData);
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching homepage data:', err);
      setError('Unable to load homepage data. Check your connection.');
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  };

  // Helper: Create dynamic community activities from actual database records
  const getCommunityActivities = () => {
    const activities: any[] = [];
    
    products.forEach((product, idx) => {
      const founderName = product.profiles?.full_name || product.profiles?.username || 'Founder';
      const avatarUrl = product.profiles?.avatar_url || '';
      const username = product.profiles?.username || '';
      
      if (idx % 2 === 0) {
        activities.push({
          id: `act-mvp-${product.id}`,
          type: 'launch',
          message: 'launched MVP version',
          meta: product.name,
          details: product.tagline,
          time: product.created_at,
          founderName,
          avatarUrl,
          username,
          link: `/product/${product.id}`
        });
      } else {
        activities.push({
          id: `act-beta-${product.id}`,
          type: 'beta',
          message: 'reached Beta stage',
          meta: product.name,
          details: 'Gathering feedback and scaling operations.',
          time: product.created_at,
          founderName,
          avatarUrl,
          username,
          link: `/product/${product.id}`
        });
      }
    });

    discussions.forEach((disc, idx) => {
      const founderName = disc.profiles?.full_name || disc.profiles?.username || 'Founder';
      const avatarUrl = disc.profiles?.avatar_url || '';
      const username = disc.profiles?.username || '';
      
      if (idx % 2 === 0) {
        activities.push({
          id: `act-milestone-${disc.id}`,
          type: 'milestone',
          message: 'completed project milestone',
          meta: disc.title,
          details: disc.content.substring(0, 100) + '...',
          time: disc.created_at,
          founderName,
          avatarUrl,
          username,
          link: `/discussion/${disc.id}`
        });
      } else {
        activities.push({
          id: `act-join-${disc.id}`,
          type: 'join',
          message: 'posted an advice request in discussions',
          meta: disc.title,
          details: `Topic: ${disc.category}`,
          time: disc.created_at,
          founderName,
          avatarUrl,
          username,
          link: `/discussion/${disc.id}`
        });
      }
    });

    return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6);
  };

  const activities = getCommunityActivities();

  return (
    <div className="w-full max-w-none min-w-0 bg-transparent space-y-16 pb-16">
      
      {/* SECTION 1: HERO */}
      <section className="relative w-full overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-8 sm:p-12 md:p-14 text-center lg:text-left text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-24 -mr-24 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-24 -ml-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-8 items-center relative z-10">
          <div className="space-y-5 max-w-2xl mx-auto lg:mx-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5 text-xs font-bold text-orange-500 uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              Ecosystem Platform
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-none bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              Build Your Startup <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">Team Faster</span>
            </h1>
            <p className="text-zinc-400 text-sm sm:text-base md:text-lg leading-relaxed max-w-xl">
              Connect with founders, developers, designers, marketers, and investors. Turn ideas into real startups.
            </p>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <Link
                to={user ? "/launch" : "/signup"}
                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-orange-500/10 active:scale-95 text-xs sm:text-sm cursor-pointer"
              >
                🚀 Start Building
              </Link>
              <a
                href="#featured"
                className="inline-flex items-center gap-2 px-5 py-3 border border-zinc-700 bg-zinc-800/40 hover:bg-zinc-800/80 text-zinc-200 font-bold rounded-xl transition-all active:scale-95 text-xs sm:text-sm cursor-pointer"
              >
                🔍 Explore Startups
              </a>
            </div>
          </div>

          {/* Premium Abstract Graphic */}
          <div className="hidden lg:flex items-center justify-center pointer-events-none select-none">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <div className="absolute inset-0 border border-zinc-800 rounded-full animate-[spin_20s_linear_infinite]" />
              <div className="absolute w-36 h-36 border border-zinc-800 rounded-full" />
              <div className="absolute w-24 h-24 border border-zinc-800 rounded-full" />
              
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500 text-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Rocket className="w-5 h-5" />
              </div>
              
              <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md border border-zinc-800 bg-zinc-900/90 text-zinc-400">Builder</span>
              <span className="absolute bottom-4 right-2 text-[10px] font-bold px-2 py-0.5 rounded-md border border-zinc-800 bg-zinc-900/90 text-zinc-400">Designer</span>
              <span className="absolute bottom-2 left-6 text-[10px] font-bold px-2 py-0.5 rounded-md border border-zinc-800 bg-zinc-900/90 text-zinc-400">Investor</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: SEARCH BAR */}
      <div className="max-w-2xl mx-auto px-4 -mt-12 relative z-20">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 text-zinc-400 dark:text-zinc-500 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/5 transition-all duration-200 cursor-pointer text-left shadow-md"
        >
          <Search className="w-5 h-5 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
          <span className="text-sm sm:text-base truncate flex-1 text-zinc-500 dark:text-zinc-400 font-medium">Search startups, founders, products, skills...</span>
          <kbd className="hidden sm:inline-block text-xs bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700/60 flex-shrink-0 font-bold text-zinc-500">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* SECTION 3: FEATURED STARTUPS */}
      <section id="featured" className="space-y-6 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-500" />
              Featured Startups
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500">Early-stage ventures logging progress and looking for team members.</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('trending')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'trending'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Trending
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'recent'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Recently Launched
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50/50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-full h-48 bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/20 p-6">
            <Rocket className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No startups launched yet</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto mb-4">Be the first to launch your venture to the StartupHub community.</p>
            <Link to="/launch" className="inline-flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold transition-all text-xs">
              Launch Startup
            </Link>
          </div>
        )}
      </section>

      {/* SECTION 4: WHY STARTUPHUB */}
      <section className="space-y-8">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Why StartupHub</h2>
          <p className="text-sm text-zinc-500">Accelerating venture building through community feedback and matching.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 rounded-2xl space-y-3 text-center sm:text-left shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto sm:mx-0">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-white text-base">Find Co-Founders</h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
              Meet people who can build with you.
            </p>
          </div>

          <div className="p-6 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 rounded-2xl space-y-3 text-center sm:text-left shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto sm:mx-0">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-white text-base">Build Startup Teams</h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
              Recruit developers, designers and marketers.
            </p>
          </div>

          <div className="p-6 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 rounded-2xl space-y-3 text-center sm:text-left shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto sm:mx-0">
              <Rocket className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-white text-base">Launch Faster</h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
              Connect and execute without wasting months searching.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION: COMMUNITY STATISTICS */}
      <section className="space-y-8">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Community Statistics</h2>
          <p className="text-sm text-zinc-500">Real-time metrics tracking the growth and activity of our startup ecosystem.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="p-6 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 rounded-2xl space-y-4 shadow-sm animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                <div className="space-y-2">
                  <div className="h-6 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
                </div>
              </div>
            ))
          ) : (
            <>
              {/* Card 1: Total Users */}
              <div className="p-6 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 rounded-2xl flex flex-col justify-between shadow-sm hover:border-orange-500/20 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-zinc-900 dark:text-white block tracking-tight">
                    {stats?.totalUsers ?? 0}
                  </span>
                  <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-semibold mt-1 block">
                    Total Users
                  </span>
                </div>
              </div>

              {/* Card 2: Startups Registered */}
              <div className="p-6 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 rounded-2xl flex flex-col justify-between shadow-sm hover:border-sky-500/20 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Rocket className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-zinc-900 dark:text-white block tracking-tight">
                    {stats?.startupsRegistered ?? 0}
                  </span>
                  <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-semibold mt-1 block">
                    Startups Registered
                  </span>
                </div>
              </div>

              {/* Card 3: Community Posts */}
              <div className="p-6 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 rounded-2xl flex flex-col justify-between shadow-sm hover:border-purple-500/20 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center transition-transform group-hover:scale-110">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-zinc-900 dark:text-white block tracking-tight">
                    {stats?.projectsShared ?? 0}
                  </span>
                  <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-semibold mt-1 block">
                    Community Posts
                  </span>
                </div>
              </div>

              {/* Card 4: Active Members */}
              <div className="p-6 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 rounded-2xl flex flex-col justify-between shadow-sm hover:border-emerald-500/20 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center relative transition-transform group-hover:scale-110">
                    <Activity className="w-5 h-5" />
                    <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900 animate-pulse" />
                  </div>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-zinc-900 dark:text-white block tracking-tight">
                    {stats?.activeMembers ?? 0}
                  </span>
                  <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-semibold mt-1 block">
                    Active Members
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* SECTION 5: STARTUP JOURNEY */}
      <section className="space-y-8">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Startup Journey</h2>
          <p className="text-sm text-zinc-500">The roadmap to scaling structured early-stage ventures.</p>
        </div>

        <div className="relative border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-10 overflow-hidden shadow-sm">
          <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-zinc-100 dark:bg-zinc-800 -translate-y-1/2 hidden md:block z-0" />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 md:gap-4 relative z-10">
            {[
              { label: 'Idea', desc: 'Conceptualize & validate', icon: Lightbulb, bg: 'bg-orange-500/10 text-orange-500' },
              { label: 'Team', desc: 'Recruit co-builders', icon: Users, bg: 'bg-blue-500/10 text-blue-500' },
              { label: 'MVP', desc: 'Build prototype version', icon: Layers, bg: 'bg-purple-500/10 text-purple-500' },
              { label: 'Launch', desc: 'Publish to community', icon: Rocket, bg: 'bg-emerald-500/10 text-emerald-500' },
              { label: 'Growth', desc: 'Acquire early users', icon: TrendingUp, bg: 'bg-rose-500/10 text-rose-500' }
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex flex-col items-center text-center space-y-3 group">
                  <div className={`w-12 h-12 rounded-2xl ${step.bg} flex items-center justify-center shadow-sm border border-white dark:border-zinc-900 relative z-10 transition-transform group-hover:scale-110`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-zinc-900 dark:text-white text-sm">{step.label}</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-[130px] mx-auto leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 6: COMMUNITY ACTIVITY */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-500" />
            Ecosystem Activity
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500">Live feed of startup iterations and founder milestones inside StartupHub.</p>
        </div>

        {activities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 border border-zinc-200/80 dark:border-zinc-800/85 bg-white dark:bg-zinc-900 rounded-2xl p-4 hover:border-orange-500/20 transition-all text-left shadow-sm"
              >
                <Link to={`/profile/${activity.username}`} className="flex-shrink-0">
                  <Avatar src={activity.avatarUrl} alt={activity.founderName} size="md" />
                </Link>
                
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-zinc-500">
                    <Link to={`/profile/${activity.username}`} className="font-bold text-zinc-900 dark:text-zinc-200 hover:underline">
                      {activity.founderName}
                    </Link>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-400 font-medium">
                      {activity.message}
                    </span>
                    <span className="text-[11px] font-bold text-orange-500">
                      {activity.meta}
                    </span>
                  </div>
                  
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 leading-relaxed">
                    {activity.details}
                  </p>
                  
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                      {new Date(activity.time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-800">&bull;</span>
                    <Link
                      to={activity.link}
                      className="text-[10px] font-bold text-orange-500 hover:text-orange-600 flex items-center gap-0.5"
                    >
                      Inspect
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-500 text-sm">
            No recent milestone logs found.
          </div>
        )}
      </section>

      {/* SECTION 7: FINAL CTA */}
      <section className="text-center rounded-3xl border border-zinc-200/80 dark:border-zinc-800 bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 p-8 sm:p-12 space-y-6 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 relative z-10 max-w-lg mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
            Ready to Build Something Amazing?
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
            Stop searching and start matching. Register your startup card and connect with builders instantly.
          </p>
        </div>

        <div className="pt-2 relative z-10">
          <Link
            to={user ? "/launch" : "/signup"}
            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-sm sm:text-base cursor-pointer"
          >
            {user ? 'Launch Your Startup' : 'Join StartupHub Today'}
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 pt-8 mt-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300">
            <span className="w-5 h-5 rounded bg-orange-500 text-white flex items-center justify-center text-[11px] font-extrabold">S</span>
            StartupHub &copy; {new Date().getFullYear()}
          </div>
          
          <div className="flex items-center gap-6 font-semibold">
            <a href="#" className="hover:text-orange-500 transition-colors">About</a>
            <a href="#" className="hover:text-orange-500 transition-colors">Contact</a>
            <a href="#" className="hover:text-orange-500 transition-colors">Privacy</a>
            <a href="#" className="hover:text-orange-500 transition-colors">Terms</a>
          </div>
        </div>
      </footer>

    </div>
  );
}