import { useUIStore } from '../store/uiStore';
import logo from '../assets/startuphub-logo.png';

export function Logo({ className, showTextOnMobile = true }: { className?: string; showTextOnMobile?: boolean }) {
  const { darkMode } = useUIStore();

  return (
    <div className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <img
        src={logo}
        alt="StartupHub Logo"
        className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 object-contain transition-transform hover:scale-105 duration-200"
      />

      <span
        className={`${
          showTextOnMobile ? 'inline' : 'hidden sm:inline'
        } font-black text-lg sm:text-xl tracking-tight bg-gradient-to-r from-orange-555 to-red-500 bg-clip-text text-transparent`}
        style={{
          backgroundImage: 'linear-gradient(135deg, rgb(249, 115, 22) 0%, rgb(239, 68, 68) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}
      >
        StartupHub
      </span>
    </div>
  );
}
