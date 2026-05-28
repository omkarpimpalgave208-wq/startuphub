import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  Menu, 
  X, 
  Plus, 
  Sun, 
  Moon,
  User,
  Settings,
  LogOut,
  Bookmark
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { Dropdown, DropdownItem, DropdownDivider } from './ui/Dropdown';
import { SearchModal } from './SearchModal';
import { NotificationsPanel } from './NotificationsPanel';

export function Navbar() {
  const { user, profile, signOut } = useAuthStore();
  const { darkMode, toggleDarkMode, sidebarOpen, setSidebarOpen, setSearchOpen, searchOpen, notificationsOpen, setNotificationsOpen } = useUIStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 w-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
        <div className="w-full px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 w-full">
            {/* Left side */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Hamburger - visible on mobile, toggle sidebar on desktop */}
              <button
                onClick={handleToggleSidebar}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex-shrink-0 -ml-1"
                aria-label="Toggle navigation"
              >
                <Menu className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </button>
              
              <Link to="/" className="flex items-center gap-2 flex-shrink-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs sm:text-sm">S</span>
                </div>
                <span className="font-semibold text-base sm:text-lg text-zinc-900 dark:text-white hidden sm:block truncate">
                  StartupHub
                </span>
              </Link>
            </div>

            {/* Center - Search (hidden on mobile) */}
            <div className="flex-1 min-w-0 max-w-xl mx-2 sm:mx-4 hidden md:block">
              <button
                onClick={() => setSearchOpen(true)}
                className="w-full flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                <Search className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm truncate">Search products, makers...</span>
                <kbd className="ml-auto text-xs bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded flex-shrink-0">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Mobile search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 md:hidden flex-shrink-0"
                aria-label="Search"
              >
                <Search className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </button>

              {/* Dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 hidden sm:flex flex-shrink-0"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                ) : (
                  <Moon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                )}
              </button>

              {user ? (
                <>
                  {/* Submit button */}
                  <Button
                    variant="primary"
                    size="sm"
                    className="hidden sm:flex flex-shrink-0"
                    onClick={() => navigate('/launch')}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    <span className="hidden md:inline">Launch</span>
                  </Button>

                  {/* Notifications */}
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="relative p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex-shrink-0"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />
                  </button>

                  {/* User menu */}
                  <div className="flex-shrink-0">
                    <Dropdown
                      trigger={
                        <Avatar 
                          src={profile?.avatar_url} 
                          alt={profile?.full_name || profile?.username}
                          size="sm"
                          className="cursor-pointer ring-2 ring-transparent hover:ring-orange-500/30 transition-all"
                        />
                      }
                    >
                      <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800">
                        <p className="font-medium text-zinc-900 dark:text-white truncate">
                          {profile?.full_name || profile?.username}
                        </p>
                        <p className="text-sm text-zinc-500 truncate">@{profile?.username}</p>
                      </div>
                      <DropdownItem 
                        icon={<User className="w-4 h-4" />}
                        onClick={() => navigate(`/@${profile?.username}`)}
                      >
                        Profile
                      </DropdownItem>
                      <DropdownItem 
                        icon={<Bookmark className="w-4 h-4" />}
                        onClick={() => navigate('/bookmarks')}
                      >
                        Bookmarks
                      </DropdownItem>
                      <DropdownItem 
                        icon={<Settings className="w-4 h-4" />}
                        onClick={() => navigate('/settings')}
                      >
                        Settings
                      </DropdownItem>
                      <DropdownDivider />
                      <DropdownItem 
                        icon={<LogOut className="w-4 h-4" />}
                        onClick={handleSignOut}
                        danger
                      >
                        Sign out
                      </DropdownItem>
                    </Dropdown>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/login')}
                    className="hidden sm:flex"
                  >
                    Sign in
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate('/signup')}
                  >
                    <span className="hidden sm:inline">Get started</span>
                    <span className="sm:hidden">Sign up</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Search Modal */}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}

      {/* Notifications Panel */}
      {notificationsOpen && (
        <NotificationsPanel onClose={() => setNotificationsOpen(false)} />
      )}
    </>
  );
}