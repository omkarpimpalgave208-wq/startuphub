import { useEffect, useCallback, useState, Suspense } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Home, Search, Plus, MessageSquare, User, Loader2 } from 'lucide-react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { useLastSeen } from '../hooks/useLastSeen';
import { api } from '../lib/api';
import { requestNotificationPermission, registerPushNotificationsServiceWorker, showLocalNotification } from '../utils/notifications';
import { ToastContainer } from './ui/Toast';

export function Layout() {
  const { darkMode, sidebarOpen, setSidebarOpen, setSearchOpen } = useUIStore();
  const { initialize, user, profile } = useAuthStore();
  const location = useLocation();
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Keep active authenticated user's presence heartbeat alive
  useLastSeen(user?.id);

  const refreshUnreadMessagesCount = useCallback(async () => {
    if (!user) {
      setUnreadMessagesCount(0);
      return;
    }
    try {
      const count = await api.getUnreadMessagesCount(user.id);
      setUnreadMessagesCount(count);
    } catch (err) {
      console.error('Error fetching unread message count in Layout:', err);
    }
  }, [user]);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Sync with system theme changes if user hasn't set an override
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('darkMode')) {
        document.documentElement.classList.toggle('dark', e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Close sidebar on resize if going from desktop to mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.classList.toggle('sidebar-open', sidebarOpen && window.innerWidth < 1024);
    return () => {
      document.body.classList.remove('sidebar-open');
    };
  }, [sidebarOpen]);

  useEffect(() => {
    refreshUnreadMessagesCount();
    if (user) {
      requestNotificationPermission();
      registerPushNotificationsServiceWorker();
    }
  }, [user, refreshUnreadMessagesCount]);

  useEffect(() => {
    if (!user) return;

    const unsubscribeParticipants = api.subscribeToChanges(
      `layout-messages-participants-${user.id}`,
      'conversation_participants',
      '*',
      () => {
        refreshUnreadMessagesCount();
      },
      `user_id=eq.${user.id}`
    );

    const unsubscribeMessages = api.subscribeToChanges(
      `layout-messages-realtime-${user.id}`,
      'messages',
      '*',
      (payload) => {
        const newMessage = payload?.new as any;
        if (newMessage && newMessage.sender_id !== user.id) {
          refreshUnreadMessagesCount();
          if (payload.eventType === 'INSERT' && newMessage.content) {
            showLocalNotification('New message received', newMessage.content);
          }
        }
      }
    );

    return () => {
      unsubscribeParticipants();
      unsubscribeMessages();
    };
  }, [user, refreshUnreadMessagesCount]);

  const handleOverlayClick = useCallback(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  return (
    <div className="min-h-dvh bg-background text-foreground w-full max-w-[100vw] overflow-x-hidden">
      <ToastContainer />
      {/* Fixed Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar />
      </div>

      {/* Desktop Sidebar - always visible on lg+ */}
      <aside className="fixed left-0 top-14 bottom-0 z-30 hidden lg:block w-[260px]">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={handleOverlayClick}
          />
          {/* Drawer */}
          <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white dark:bg-zinc-950 shadow-2xl pt-12 sm:pt-14 animate-slide-in">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main Content Area - padded at bottom on mobile to prevent bottom nav bar overlap */}
      <main className={`relative min-h-dvh pt-12 sm:pt-14 pb-16 lg:pb-0 w-full min-w-0 overflow-x-hidden ${
        location.pathname.startsWith('/profile/') ? 'lg:pl-0' : 'lg:pl-[260px]'
      }`}>
        {location.pathname.startsWith('/profile/') ? (
          <Suspense fallback={
            <div className="flex items-center justify-center py-20 w-full min-h-[50vh]">
              <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
            </div>
          }>
            <Outlet />
          </Suspense>
        ) : (
          <div className="w-full max-w-none min-w-0 md:max-w-6xl md:mx-auto px-0 md:px-6 py-0 md:py-6">
            <Suspense fallback={
              <div className="flex items-center justify-center py-20 w-full min-h-[50vh]">
                <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
              </div>
            }>
              <Outlet />
            </Suspense>
          </div>
        )}
      </main>

      {/* Instagram-Style mobile bottom navigation bar */}
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] h-14 flex items-center justify-around"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) * 0.8)' }}
      >
        <Link
          to="/"
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition ${
            location.pathname === '/' ? 'text-orange-500' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
          aria-label="Home"
        >
          <Home className="w-5.5 h-5.5" />
        </Link>

        <button
          onClick={() => setSearchOpen(true)}
          className="flex flex-col items-center justify-center p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
          aria-label="Search"
        >
          <Search className="w-5.5 h-5.5" />
        </button>

        <Link
          to="/launch"
          className="flex flex-col items-center justify-center p-2 rounded-xl transition"
          aria-label="Create Post"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center shadow-md active:scale-90 transition-transform">
            <Plus className="w-5 h-5 stroke-[3]" />
          </div>
        </Link>

        <Link
          to="/messages"
          className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition ${
            location.pathname.startsWith('/messages') ? 'text-orange-500' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
          aria-label="Messages"
        >
          <MessageSquare className="w-5.5 h-5.5" />
          {unreadMessagesCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[1rem] h-4 rounded-full bg-sky-500 text-[9px] text-white font-bold flex items-center justify-center px-1">
              {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
            </span>
          )}
        </Link>

        {user ? (
          <Link
            to={`/profile/${profile?.username}`}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition ${
              location.pathname.startsWith('/profile') ? 'text-orange-500' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
            aria-label="Profile"
          >
            <User className="w-5.5 h-5.5" />
          </Link>
        ) : (
          <Link
            to="/login"
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition ${
              location.pathname === '/login' ? 'text-orange-500' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
            aria-label="Login"
          >
            <User className="w-5.5 h-5.5" />
          </Link>
        )}
      </nav>
    </div>
  );
}