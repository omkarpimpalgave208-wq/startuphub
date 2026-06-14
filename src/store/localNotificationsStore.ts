import { create } from 'zustand';

export interface LocalNotification {
  id: string;
  message: string;
  timestamp: string; // ISO string
  read: boolean;
}

interface LocalNotificationsState {
  notifications: LocalNotification[];
  addNotification: (message: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export const useLocalNotificationsStore = create<LocalNotificationsState>((set) => ({
  notifications: (() => {
    try {
      return JSON.parse(localStorage.getItem('sh_local_notifications') || '[]');
    } catch {
      return [];
    }
  })(),
  addNotification: (message) => set((state) => {
    const newNotification: LocalNotification = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      message,
      timestamp: new Date().toISOString(),
      read: false,
    };
    const updated = [newNotification, ...state.notifications].slice(0, 50); // limit to 50
    localStorage.setItem('sh_local_notifications', JSON.stringify(updated));
    return { notifications: updated };
  }),
  markAllAsRead: () => set((state) => {
    const updated = state.notifications.map((n) => ({ ...n, read: true }));
    localStorage.setItem('sh_local_notifications', JSON.stringify(updated));
    return { notifications: updated };
  }),
  clearNotifications: () => set(() => {
    localStorage.removeItem('sh_local_notifications');
    return { notifications: [] };
  }),
}));
