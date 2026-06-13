import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  TrendingUp, 
  MessageSquare, 
  Users, 
  Bookmark,
  Zap,
  Award,
  Clock,
  Sparkles,
  Coffee,
  Trophy,
  BarChart2
} from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { cn } from '../lib/utils';

const navItems = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: TrendingUp, label: 'Trending', href: '/trending' },
  { icon: Clock, label: 'Recent', href: '/recent' },
  { icon: MessageSquare, label: 'Discussions', href: '/discussions' },
  { icon: Users, label: 'Makers', href: '/makers' },
  { icon: Coffee, label: 'Lounge', href: '/lounge' },
  { icon: Trophy, label: 'Hackathons', href: '/hackathons' },
  { icon: BarChart2, label: 'Leaderboard', href: '/leaderboard' },
];

const categories = [
  { icon: Zap, label: 'SaaS', href: '/category/saas' },
  { icon: Award, label: 'Mobile Apps', href: '/category/mobile' },
  { icon: Sparkles, label: 'AI Tools', href: '/category/ai' },
];

export function Sidebar() {
  const { setSidebarOpen } = useUIStore();
  const location = useLocation();

  const isActiveRoute = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  const handleLinkClick = () => {
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="h-full w-full bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto overflow-x-hidden">
      <div className="h-full py-4 w-full">
        {/* Main Navigation */}
        <nav className="px-3 space-y-1 w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.href);
            
            return (
              <Link
                key={item.label}
                to={item.href}
                onClick={handleLinkClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                  'transition-colors duration-200 w-full',
                  'hover:no-underline',
                  isActive
                    ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Categories Section */}
        <div className="mt-8 px-3 w-full">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-3">
            Categories
          </h3>
          <nav className="space-y-1 w-full">
            {categories.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.href);
              
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                    'transition-colors duration-200 w-full',
                    'hover:no-underline',
                    isActive
                      ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Launch CTA */}
        <div className="mt-8 px-4 w-full">
          <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <p className="font-semibold text-sm mb-1">Launch your startup</p>
            <p className="text-xs text-orange-100 mb-3">
              Share your product with thousands of founders
            </p>
            <Link
              to="/launch"
              onClick={handleLinkClick}
              className="block w-full py-2 text-center text-sm font-medium bg-white text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
            >
              Launch now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}