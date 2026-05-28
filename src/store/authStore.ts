import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { handleGoogleRedirect } from '../lib/googleAuth';
import { api } from '../lib/api';
import type { Profile } from '../types';

interface AuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  setUser: (user: any) => void;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  
  fetchProfile: async (userId: string) => {
    try {
      const profile = await api.getProfile(userId);
      set({ profile });
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  },
  
  signOut: async () => {
    if (!isSupabaseConfigured) {
      set({ user: null, profile: null });
      return;
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const projectRef = supabaseUrl ? supabaseUrl.split('.')[0].split('//').pop() : '';
      if (projectRef) {
        localStorage.removeItem(`sb-${projectRef}-auth-token`);
      }
      
      await supabase.auth.signOut();
    } catch (err) {
      console.error('SignOut error:', err);
    } finally {
      set({ user: null, profile: null });
    }
  },
  
  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({ loading: false });
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const projectRef = supabaseUrl ? supabaseUrl.split('.')[0].split('//').pop() : '';
    const storageKey = projectRef ? `sb-${projectRef}-auth-token` : '';

    try {
      handleGoogleRedirect();
      
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      
      if (sessionErr) {
        console.warn('[auth] Session retrieval error, executing clean reset.');
        if (storageKey) localStorage.removeItem(storageKey);
        await supabase.auth.signOut();
        set({ user: null, profile: null });
      }

      if (session?.user) {
        // ENFORCE ISOLATION: Confirm the user exists in this project's database
        try {
          const profile = await api.getProfile(session.user.id);
          if (!profile) {
            // Profile is missing, which could indicate a cross-project token leak!
            throw new Error('User identity profile missing in current database schema.');
          }
          set({ user: session.user, profile });
        } catch (profileErr) {
          console.warn('[auth] Identity mismatch or cross-project token leakage detected. Forcing clean re-auth.', profileErr);
          if (storageKey) localStorage.removeItem(storageKey);
          await supabase.auth.signOut();
          set({ user: null, profile: null });
        }
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
    } finally {
      set({ loading: false });
    }
    
    // TAB SYNCHRONIZATION AND LEAKAGE LISTENER
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const currentUser = get().user;
        if (!currentUser || currentUser.id !== session.user.id) {
          // Double check database identity to prevent unauthorized cross-project transitions
          try {
            const profile = await api.getProfile(session.user.id);
            if (!profile) throw new Error('Missing profile record.');
            set({ user: session.user, profile });
          } catch (err) {
            console.warn('[auth] Mismatched auth state transition blocked.', err);
            if (storageKey) localStorage.removeItem(storageKey);
            await supabase.auth.signOut();
            set({ user: null, profile: null });
          }
        }
      } else {
        set({ user: null, profile: null });
      }
      set({ loading: false });
    });
  }
}));