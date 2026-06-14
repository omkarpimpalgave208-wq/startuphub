import { useState, useEffect } from 'react';
import { toast } from '../store/toastStore';
import { isStandalone } from '../utils/pwa';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    console.log('[PWA Debug] usePWAInstall hook mounted');

    if (isStandalone()) {
      console.log('[PWA Debug] App is running in standalone mode (already installed)');
      setInstalled(true);
      return;
    }

    // Check service worker state (Requirement 4)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        console.log('[PWA Debug] Service Worker active & ready. State:', registration.active?.state);
      }).catch(err => {
        console.warn('[PWA Debug] Service Worker ready promise rejected:', err);
      });
    } else {
      console.log('[PWA Debug] Service Workers are not supported in this browser');
    }

    // Verify manifest presence in DOM (Requirement 4)
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      console.log('[PWA Debug] Manifest link found in document:', manifestLink.getAttribute('href'));
    } else {
      console.warn('[PWA Debug] Manifest link is missing in document!');
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA Debug] beforeinstallprompt event fired! App is eligible for install.');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      console.log('[PWA Debug] appinstalled event fired! PWA successfully added.');
      setDeferredPrompt(null);
      setIsInstallable(false);
      setInstalled(true);
      toast.success('StartupHub installed successfully', 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Recover prompt if captured earlier in index.html (Requirement 2)
    if ((window as any).deferredPrompt) {
      console.log('[PWA Debug] Recovered pre-captured deferredPrompt from window object');
      setDeferredPrompt((window as any).deferredPrompt);
      setIsInstallable(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.warn('[PWA Debug] Install requested but prompt event is not available.');
      return false;
    }

    console.log('[PWA Debug] Presenting native browser install prompt...');
    deferredPrompt.prompt();

    try {
      const { outcome } = await deferredPrompt.userChoice;
      console.info(`[PWA Debug] User choice outcome: ${outcome}`);
      
      setDeferredPrompt(null);
      setIsInstallable(false);
      
      if (outcome === 'accepted') {
        return true;
      }
    } catch (err) {
      console.error('[PWA Debug] Error executing install prompt:', err);
    }
    
    return false;
  };

  return {
    isInstallable,
    isStandalone: installed,
    install
  };
}
