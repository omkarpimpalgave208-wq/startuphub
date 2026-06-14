import { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { isIOS, shouldShowBanner, dismissBanner } from '../utils/pwa';
import { IOSInstallModal } from './IOSInstallModal';
import { Download, X } from 'lucide-react';

export function InstallBanner() {
  const { isInstallable, install } = usePWAInstall();
  const [visible, setVisible] = useState(false);
  const [iosModalOpen, setIosModalOpen] = useState(false);

  useEffect(() => {
    // Only show if banner dismissal period has expired (7 days)
    if (!shouldShowBanner()) return;

    // Show if standard PWA install is supported OR if it is iOS Safari (which doesn't fire beforeinstallprompt)
    if (isInstallable || isIOS()) {
      setVisible(true);
    }
  }, [isInstallable]);

  const handleInstall = async () => {
    if (isIOS()) {
      setIosModalOpen(true);
    } else {
      const success = await install();
      if (success) {
        setVisible(false);
      }
    }
  };

  const handleDismiss = () => {
    // Remember dismissal for 7 days (Requirement 8)
    dismissBanner();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <div className="w-full bg-orange-500 text-white py-2.5 px-4 flex items-center justify-between text-xs sm:text-sm animate-fade-in shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-4">
          <Download className="w-4 h-4 flex-shrink-0 animate-bounce" />
          <span className="font-medium truncate">
            Install StartupHub for faster access
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white font-medium hover:underline transition-colors px-2 py-1 cursor-pointer"
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            className="bg-white text-orange-600 font-bold px-3 py-1 rounded-lg hover:bg-orange-50 active:scale-95 transition-all shadow-sm flex items-center gap-1 cursor-pointer"
          >
            <span>Install</span>
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors ml-1 cursor-pointer"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <IOSInstallModal 
        isOpen={iosModalOpen}
        onClose={() => setIosModalOpen(false)}
      />
    </>
  );
}
