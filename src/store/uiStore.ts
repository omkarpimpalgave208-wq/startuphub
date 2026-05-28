import { create } from 'zustand';

interface UIState {
  darkMode: boolean;
  sidebarOpen: boolean;
  searchOpen: boolean;
  notificationsOpen: boolean;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  darkMode: localStorage.getItem('darkMode') === 'true' || 
    (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches),
  sidebarOpen: false,
  searchOpen: false,
  notificationsOpen: false,
  
  toggleDarkMode: () => set((state) => {
    const newMode = !state.darkMode;
    localStorage.setItem('darkMode', String(newMode));
    document.documentElement.classList.toggle('dark', newMode);
    return { darkMode: newMode };
  }),
  
  toggleSidebar: () => set((state) => {
    const newOpen = !state.sidebarOpen;
    if (newOpen && window.innerWidth < 1024) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return { sidebarOpen: newOpen };
  }),
  setSidebarOpen: (open) => {
    if (!open) {
      document.body.classList.remove('sidebar-open');
    } else if (window.innerWidth < 1024) {
      document.body.classList.add('sidebar-open');
    }
    set({ sidebarOpen: open });
  },
  setSearchOpen: (open) => set({ searchOpen: open }),
  setNotificationsOpen: (open) => set({ notificationsOpen: open }),
}));