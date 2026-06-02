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

    const decodeJwtPayload = (token?: string) => {
      if (!token || typeof window === 'undefined') return null;
      try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(decodeURIComponent(escape(window.atob(base64))));
        return payload;
      } catch (decodeError) {
        console.warn('[auth] JWT payload decode failed:', decodeError);
        return null;
      }
    };

    const isSessionFromCurrentProject = (accessToken?: string) => {
      if (!accessToken || !supabaseUrl) return true;
      const payload = decodeJwtPayload(accessToken);
      if (!payload) return false;
      const issuer = typeof payload.iss === 'string' ? payload.iss : '';
      return issuer.includes(projectRef || '') || issuer.includes(supabaseUrl);
    };

    const clearStaleSession = async (reason: string) => {
      console.warn('[auth] Clearing stale or invalid session:', reason);
      if (storageKey) localStorage.removeItem(storageKey);
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('[auth] Sign out failed during stale session cleanup:', signOutError);
      }
      set({ user: null, profile: null });
    };

    const createFallbackProfile = async (user: any): Promise<Profile | null> => {
      try {
        const profile = await api.getProfile(user.id);
        if (profile) return profile;
      } catch (err) {
        console.warn('[auth] Failed to fetch existing profile during initialization:', err);
      }

      console.warn('[auth] Missing profile detected for authenticated user, attempting to create one.', {
        userId: user.id,
        email: user.email
      });

      try {
        const profile = await api.createProfileFromAuthUser(user);
        console.info('[auth] Created missing profile for user:', user.id);
        return profile;
      } catch (profileCreationError) {
        console.error('[auth] Failed to create fallback profile:', profileCreationError);
        return {
          id: user.id,
          username: user.user_metadata?.username || user.email?.split('@')[0] || user.id,
          full_name: user.user_metadata?.full_name || null,
          avatar_url: null,
          banner_url: null,
          banner_style: null,
          location: null,
          headline: null,
          bio: null,
          website: null,
          website_url: null,
          github_url: null,
          twitter_url: null,
          linkedin_url: null,
          skills: [],
          achievements: [],
          experience: [],
          products: 0,
          followers: 0,
          following: 0,
          connections: 0
        } as Profile;
      }
    };

    try {
      await handleGoogleRedirect();

      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      console.debug('[auth] Session retrieval:', { session, sessionErr });

      if (sessionErr) {
        console.warn('[auth] Session retrieval error, executing clean reset.', sessionErr.message || sessionErr);
        await clearStaleSession('session retrieval error');
      }

      if (session?.access_token && !isSessionFromCurrentProject(session.access_token)) {
        await clearStaleSession('cross-project token detected');
        set({ loading: false });
        return;
      }

      if (!session?.user) {
        console.log('[auth] No active session found during auth initialization.');
        set({ user: null, profile: null });
        return;
      }

      const profile = await createFallbackProfile(session.user);
      set({ user: session.user, profile });
    } catch (err) {
      console.error('[auth] Auth initialization error:', err);
      // Avoid clearStaleSession on generic/temporary runtime errors to prevent force-logging out valid sessions
    } finally {
      set({ loading: false });
    }

    // TAB SYNCHRONIZATION AND LEAKAGE LISTENER
    supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = get().user;
      const currentProfile = get().profile;

      if (session?.user) {
        if (!currentUser || currentUser.id !== session.user.id || !currentProfile) {
          try {
            const profile = await createFallbackProfile(session.user);
            set({ user: session.user, profile });
          } catch (err) {
            console.warn('[auth] Mismatched auth state transition blocked.', err);
            await clearStaleSession('auth state transition mismatch');
          }
        }
      } else {
        set({ user: null, profile: null });
      }
      set({ loading: false });
    });
  }
}));