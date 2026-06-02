import { useUIStore } from '../store/uiStore';
import logo from '../assets/startuphub-logo.png';

export function Logo({ className, showTextOnMobile = false }: { className?: string; showTextOnMobile?: boolean }) {
  const { darkMode } = useUIStore();

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <img
        src={logo}
        alt="StartupHub"
        className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 object-contain"
      />

      <span
        className={`${
          showTextOnMobile ? 'inline' : 'hidden sm:inline'
        } font-bold text-base sm:text-lg tracking-tight ${
          darkMode ? 'text-white' : 'text-zinc-900'
        }`}
      >
        StartupHub
      </span>
    </div>
  );
}
