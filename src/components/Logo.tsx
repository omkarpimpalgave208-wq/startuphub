import logo from '../assets/startuphub-logo.png';

export function Logo({ className, showTextOnMobile = true }: { className?: string; showTextOnMobile?: boolean }) {
  return (
    <div className={`flex items-center gap-1 ${className ?? ''}`}>
      <img
        src={logo}
        alt="StartupHub Logo"
        className="w-[44px] h-[44px] sm:w-[54px] sm:h-[54px] -ml-1.5 -mr-1 flex-shrink-0 object-contain transition-transform hover:scale-105 duration-200"
      />

      <span
        className={`${
          showTextOnMobile ? 'inline' : 'hidden sm:inline'
        } font-black text-[17px] sm:text-[20px] tracking-tight bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent`}
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
