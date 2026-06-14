import { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { isIOS, isStandalone } from '../utils/pwa';
import { IOSInstallModal } from './IOSInstallModal';
import { Download } from 'lucide-react';

export function PWAInstallButton() {
  const { isInstallable, install } = usePWAInstall();
  const [visible, setVisible] = useState(false);
  const [iosModalOpen, setIosModalOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setVisible(false);
      return;
    }

    if (isInstallable || isIOS()) {
      setVisible(true);
    }
  }, [isInstallable]);

  const handleInstallClick = async () => {
    if (isIOS()) {
      setIosModalOpen(true);
    } else {
      const success = await install();
      if (success) {
        setVisible(false);
      }
    }
  };

  if (!visible) return null;

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="fixed z-40 bottom-20 left-1/2 -translate-x-1/2 lg:bottom-6 lg:right-6 lg:left-auto lg:translate-x-0 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3 px-6 rounded-full shadow-[0_8px_30px_rgba(249,115,22,0.25)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2.5 text-sm cursor-pointer whitespace-nowrap"
      >
        <Download className="w-4 h-4" />
        <span>Install StartupHub</span>
      </button>

      <IOSInstallModal 
        isOpen={iosModalOpen}
        onClose={() => setIosModalOpen(false)}
      />
    </>
  );
}
