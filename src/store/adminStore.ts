import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AdminState {
  isAdmin: boolean;
  adminChecked: boolean;
  checkAdmin: (user: any | null) => Promise<void>;
  resetAdmin: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  isAdmin: false,
  adminChecked: false,

  resetAdmin: () => set({ isAdmin: false, adminChecked: false }),

  checkAdmin: async (user: any | null) => {
    if (!user) {
      set({ isAdmin: false, adminChecked: true });
      return;
    }

    // ── Priority 1: Supabase app_metadata.role (server-signed, tamper-proof) ──
    // Set this in: Supabase Dashboard → Auth → Users → Edit → app_metadata: {"role":"admin"}
    const appRole: string = user.app_metadata?.role ?? user.app_metadata?.userrole ?? '';
    if (['admin', 'superadmin', 'service_role'].includes(appRole)) {
      set({ isAdmin: true, adminChecked: true });
      return;
    }

    // ── Priority 2: user_metadata.role (less secure, but usable for dev setups) ──
    const metaRole: string = user.user_metadata?.role ?? '';
    if (['admin', 'superadmin'].includes(metaRole)) {
      set({ isAdmin: true, adminChecked: true });
      return;
    }

    // ── Priority 3: VITE_ADMIN_EMAILS env variable ──
    // Set in .env: VITE_ADMIN_EMAILS=admin@example.com,owner@example.com
    const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
      .split(',')
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean);

    if (user.email && adminEmails.includes(user.email.toLowerCase())) {
      set({ isAdmin: true, adminChecked: true });
      return;
    }

    // ── Priority 4: admin_allowlist table (existing compatibility fallback) ──
    if (user.email) {
      try {
        const { data, error } = await supabase
          .from('admin_allowlist')
          .select('email')
          .eq('email', user.email)
          .maybeSingle();

        if (!error && data) {
          set({ isAdmin: true, adminChecked: true });
          return;
        }
      } catch {
        // Table doesn't exist — skip silently
      }
    }

    set({ isAdmin: false, adminChecked: true });
  },
}));
