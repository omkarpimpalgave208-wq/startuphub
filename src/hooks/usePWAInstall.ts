import { useState, useEffect } from 'react';
import { toast } from '../store/toastStore';
import { isStandalone } from '../utils/pwa';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser's default install banner/dialog
      e.preventDefault();
      // Save the event to be triggered on button click
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      // Clear prompt
      setDeferredPrompt(null);
      setIsInstallable(false);
      setInstalled(true);
      
      // Toast notification for successful installation (Requirement 4)
      toast.success('StartupHub installed successfully', 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.warn('[usePWAInstall] Install prompt event is not available.');
      return false;
    }

    // Trigger PWA install dialogue
    deferredPrompt.prompt();

    try {
      // Wait for user choice (Requirement 2)
      const { outcome } = await deferredPrompt.userChoice;
      console.info(`[usePWAInstall] User choice outcome: ${outcome}`);
      
      setDeferredPrompt(null);
      setIsInstallable(false);
      
      if (outcome === 'accepted') {
        return true;
      }
    } catch (err) {
      console.error('[usePWAInstall] Error executing install prompt:', err);
    }
    
    return false;
  };

  return {
    isInstallable,
    isStandalone: installed,
    install
  };
}
