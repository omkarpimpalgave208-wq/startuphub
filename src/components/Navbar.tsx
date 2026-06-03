import { useEffect, useState } from 'react';
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
  Bookmark,
  MessageSquare,
  UserPlus
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { api } from '../lib/api';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { Dropdown, DropdownItem, DropdownDivider } from './ui/Dropdown';
import { SearchModal } from './SearchModal';
import { NotificationsPanel } from './NotificationsPanel';import { Logo } from './Logo';
export function Navbar() {
  const { user, profile, signOut } = useAuthStore();
  const { darkMode, toggleDarkMode, sidebarOpen, setSidebarOpen, setSearchOpen, searchOpen, notificationsOpen, setNotificationsOpen } = useUIStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const navigate = useNavigate();

  const refreshUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const notifications = await api.getNotifications(user.id, true);
      setUnreadCount(notifications.length);
    } catch (err) {
      console.error('Error fetching unread notifications:', err);
    }
  };

  const refreshUnreadMessagesCount = async () => {
    if (!user) {
      setUnreadMessagesCount(0);
      return;
    }

    try {
      const count = await api.getUnreadMessagesCount(user.id);
      setUnreadMessagesCount(count);
    } catch (err) {
      console.error('Error fetching unread message count:', err);
    }
  };

  useEffect(() => {
    refreshUnreadCount();
    refreshUnreadMessagesCount();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = api.subscribeToChanges(
      `notifications-unread-${user.id}`,
      'notifications',
      '*',
      (payload) => {
        console.info('[Navbar] Real-time notification event:', payload);
        refreshUnreadCount();
      },
      `user_id=eq.${user.id}`
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const unsubscribeParticipants = api.subscribeToChanges(
      `messages-participants-${user.id}`,
      'conversation_participants',
      '*',
      () => {
        refreshUnreadMessagesCount();
      },
      `user_id=eq.${user.id}`
    );

    const unsubscribeMessages = api.subscribeToChanges(
      `messages-realtime-${user.id}`,
      'messages',
      '*',
      () => {
        refreshUnreadMessagesCount();
      },
      `sender_id=neq.${user.id}`
    );

    return () => {
      unsubscribeParticipants();
      unsubscribeMessages();
    };
  }, [user]);

  useEffect(() => {
    if (!notificationsOpen) return;
    refreshUnreadCount();
  }, [notificationsOpen]);

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
              {/* Hamburger - visible only on desktop */}
              <button
                onClick={handleToggleSidebar}
                className="hidden lg:flex p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex-shrink-0 -ml-1"
                aria-label="Toggle navigation"
              >
                <Menu className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </button>
              
              <Link to="/" className="flex items-center gap-2 flex-shrink-0">
                <Logo />
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
                    onClick={() => navigate('/messages')}
                    className="relative p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex-shrink-0"
                    aria-label="Messages"
                  >
                    <MessageSquare className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    {unreadMessagesCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[1rem] h-4 rounded-full bg-sky-500 text-[10px] text-white font-semibold flex items-center justify-center px-1.5">
                        {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="relative p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex-shrink-0"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[1rem] h-4 rounded-full bg-orange-500 text-[10px] text-white font-semibold flex items-center justify-center px-1.5">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
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
                        onClick={() => navigate(`/profile/${profile?.username}`)}
                      >
                        Profile
                      </DropdownItem>
                      <DropdownItem 
                        icon={<MessageSquare className="w-4 h-4" />}
                        onClick={() => navigate('/messages')}
                      >
                        Messages
                      </DropdownItem>
                      <DropdownItem 
                        icon={<UserPlus className="w-4 h-4" />}
                        onClick={() => navigate('/connections')}
                      >
                        Connections
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
              {/* Mobile Hamburger - far right on mobile, hidden on desktop */}
              <button
                onClick={handleToggleSidebar}
                className="lg:hidden p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex-shrink-0 ml-1"
                aria-label="Toggle navigation"
              >
                <Menu className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Search Modal */}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}

      {/* Notifications Panel */}
      {notificationsOpen && (
        <NotificationsPanel onClose={() => setNotificationsOpen(false)} onUnreadCountChange={setUnreadCount} />
      )}
    </>
  );
}