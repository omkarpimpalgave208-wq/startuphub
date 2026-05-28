import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Initiates Google OAuth sign-in redirect flow using Supabase Auth.
 * Uses the current browser origin so localhost and deployed environments stay on the active platform.
 */
export async function signInWithGoogle(_appName?: string) {
  if (!isSupabaseConfigured) {
    console.warn('[google-auth] Supabase is not configured. Google login is unavailable.');
    return;
  }

  try {
    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : '';

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
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