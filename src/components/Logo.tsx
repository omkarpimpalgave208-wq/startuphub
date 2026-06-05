import logo from '../assets/startuphub-logo.png';

export function Logo({ className, showTextOnMobile = true }: { className?: string; showTextOnMobile?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <img
        src={logo}
        alt="StartupHub Logo"
        className="w-[34px] h-[34px] sm:w-[42px] sm:h-[42px] flex-shrink-0 object-contain transition-transform hover:scale-105 duration-200"
      />

      <span
        className={`${
          showTextOnMobile ? 'inline' : 'hidden sm:inline'
        } font-black text-base sm:text-lg tracking-tight bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent`}
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
