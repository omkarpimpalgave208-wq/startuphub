import { X } from 'lucide-react';
import { isIOS } from '../utils/pwa';

interface IOSInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IOSInstallModal({ isOpen, onClose }: IOSInstallModalProps) {
  if (!isOpen) return null;

  const ios = isIOS();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-6 shadow-2xl animate-fade-in text-zinc-900 dark:text-zinc-100">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-655 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4 pt-2">
          {/* Logo Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-0.5 shadow-md flex items-center justify-center">
            <img src="/favicon.png" alt="Logo" className="w-full h-full object-contain rounded-2xl" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold tracking-tight">Install StartupHub</h2>
          
          {/* Description */}
          <p className="text-sm text-zinc-500 dark:text-zinc-450 leading-relaxed max-w-[280px]">
            Install StartupHub on your device to access it directly from your home screen.
          </p>

          <div className="w-full border-t border-zinc-150 dark:border-zinc-800 my-2" />

          {/* Instructions */}
          {ios ? (
            <div className="space-y-4 w-full text-left">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold text-xs">
                  1
                </span>
                <p className="text-xs text-zinc-650 dark:text-zinc-300 pt-0.5">
                  Tap the <span className="font-bold">Share</span> button in Safari's bottom toolbar.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold text-xs">
                  2
                </span>
                <p className="text-xs text-zinc-650 dark:text-zinc-300 pt-0.5">
                  Scroll down the share sheet and select <span className="font-bold">"Add to Home Screen"</span>.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 w-full text-left">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold text-xs">
                  1
                </span>
                <p className="text-xs text-zinc-650 dark:text-zinc-300 pt-0.5">
                  Tap the browser <span className="font-bold">Menu</span> button (three dots) in the top-right corner.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold text-xs">
                  2
                </span>
                <p className="text-xs text-zinc-650 dark:text-zinc-300 pt-0.5">
                  Select <span className="font-bold">"Install App"</span> or <span className="font-bold">"Add to Home Screen"</span> from the options list.
                </p>
              </div>
            </div>
          )}

          <div className="w-full border-t border-zinc-150 dark:border-zinc-800 my-2" />

          {/* Indicator Visual */}
          {ios ? (
            <div className="flex items-center gap-2 text-xs text-orange-500 font-medium bg-orange-50 dark:bg-orange-950/10 px-3 py-2 rounded-xl">
              <span className="flex items-center justify-center w-6 h-6 border border-current rounded-md relative flex-shrink-0">
                <span className="w-0.5 h-3.5 bg-current absolute -top-1.5" />
                <span className="w-2.5 h-2.5 border-t border-r border-current rotate-[45deg] absolute -top-2" />
              </span>
              <span>iOS Safari Share Indicator</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-orange-500 font-medium bg-orange-50 dark:bg-orange-950/10 px-3 py-2 rounded-xl">
              <span className="flex flex-col gap-0.5 items-center justify-center w-6 h-6 border border-current rounded-md relative flex-shrink-0">
                <span className="w-1 h-1 bg-current rounded-full" />
                <span className="w-1 h-1 bg-current rounded-full" />
                <span className="w-1 h-1 bg-current rounded-full" />
              </span>
              <span>Browser Menu Indicator</span>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl font-semibold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm cursor-pointer"
          >
            Ok, got it
          </button>
        </div>
      </div>
    </div>
  );
}
