import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * PRODUCTION-READY: Sends user active heartbeat updates to Supabase every 30 seconds,
 * as well as immediately on mount and tab focus. Bypasses when the tab is hidden to conserve bandwidth.
 * 
 * @param userId The UUID of the authenticated logged-in user.
 */
export function useLastSeen(userId: string | undefined) {
  const lastUpdatedRef = useRef<number>(0);

  useEffect(() => {
    if (!userId) return;

    const updateLastSeen = async () => {
      const now = Date.now();
      // 30 seconds debouncing to conserve database write capacity
      if (now - lastUpdatedRef.current < 30000) return;
      lastUpdatedRef.current = now;

      try {
        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', userId);
      } catch (err) {
        console.warn('[useLastSeen] Failed to update last_seen:', err);
      }
    };

    // 1. Update immediately on mount
    updateLastSeen();

    // 2. Set up interval heartbeat every 30 seconds (only when tab is visible)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        updateLastSeen();
      }
    }, 30000);

    // 3. Update immediately on tab focus or visibility changes
    const handleVisibilityFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        updateLastSeen();
      }
    };

    // 4. Update on user activity (debounced at most once every 30 seconds via updateLastSeen)
    const handleActivity = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        updateLastSeen();
      }
    };

    window.addEventListener('focus', handleVisibilityFocus);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityFocus);
    }
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibilityFocus);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityFocus);
      }
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [userId]);
}
