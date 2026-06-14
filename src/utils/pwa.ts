/**
 * PWA Utility helper functions
 */

export function isIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  
  const ua = navigator.userAgent.toLowerCase();
  const isIphone = ua.includes('iphone') || ua.includes('ipod');
  const isIpad = ua.includes('ipad') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  // Check if running in Safari/iOS browser
  return isIphone || isIpad;
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

const BANNER_DISMISS_KEY = 'startuphub_pwa_banner_dismissed';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function shouldShowBanner(): boolean {
  if (typeof window === 'undefined' || isStandalone()) return false;

  const dismissedAt = localStorage.getItem(BANNER_DISMISS_KEY);
  if (!dismissedAt) return true;

  const timestamp = parseInt(dismissedAt, 10);
  if (isNaN(timestamp)) return true;

  return Date.now() - timestamp > SEVEN_DAYS_MS;
}

export function dismissBanner(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BANNER_DISMISS_KEY, Date.now().toString());
}

export function isMobile(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return /mobile|android|iphone|ipad|phone/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
