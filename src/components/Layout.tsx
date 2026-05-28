import { useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';

export function Layout() {
  const { darkMode, sidebarOpen, setSidebarOpen } = useUIStore();
  const { initialize } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

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

  const handleOverlayClick = useCallback(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 w-full max-w-[100vw] overflow-x-hidden">
      {/* Fixed Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar />
      </div>

      {/* Desktop Sidebar - always visible on lg+ */}
      <aside className="fixed left-0 top-16 bottom-0 z-30 hidden lg:block w-[260px]">
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
          <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white dark:bg-zinc-950 shadow-2xl pt-16 animate-slide-in">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="relative min-h-screen pt-16 w-full min-w-0 overflow-x-hidden lg:pl-[260px]">
        <div className="w-full max-w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}