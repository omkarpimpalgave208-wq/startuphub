import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Initiates Google OAuth sign-in redirect flow using Supabase Auth.
 * Initiates Google OAuth redirect using the configured app URL in production,
 * or the current browser origin in development.
 */
export async function signInWithGoogle(_appName?: string) {
  if (!isSupabaseConfigured) {
    console.warn('[google-auth] Supabase is not configured. Google login is unavailable.');
    return;
  }

  try {
    const redirectTo =
      import.meta.env.VITE_APP_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo
      }
    });

    if (error) {
      console.error('[google-auth] OAuth redirect error:', error.message);
    }
  } catch (err) {
    console.error('[google-auth] Failed to initiate Google login:', err);
  }
}

export async function handleGoogleRedirect() {
  return;
}