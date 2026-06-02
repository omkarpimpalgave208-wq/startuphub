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
  if (!isSupabaseConfigured) return;

  try {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (code) {
        console.log('[google-auth] OAuth authorization code detected in URL. Exchanging for session...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.warn('[google-auth] Failed to exchange authorization code for session:', error.message);
        } else if (data?.session) {
          console.log('[google-auth] OAuth session successfully established via code exchange');
        }

        // Clean up the authorization code and other OAuth-related parameters from the URL
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('code');
          // Also clean up PKCE and state parameters if they exist
          url.searchParams.delete('state');
          url.searchParams.delete('error');
          url.searchParams.delete('error_description');
          url.searchParams.delete('error_code');
          
          window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
          console.debug('[google-auth] Cleaned up OAuth parameters from URL');
        } catch (cleanupErr) {
          console.warn('[google-auth] Failed to clean up URL parameters:', cleanupErr);
        }
        return;
      }
    }

    // Fallback/standard session recovery (getSession parses implicit hash fragment automatically)
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.warn('[google-auth] Failed to retrieve session during redirect check:', error.message);
      return;
    }

    if (data?.session) {
      console.log('[google-auth] Active OAuth/recovered session confirmed');
    }
  } catch (err) {
    console.error('[google-auth] Error processing OAuth redirect:', err);
  }
}