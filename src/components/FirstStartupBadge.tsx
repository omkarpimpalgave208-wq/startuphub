import React, { useRef, useState } from 'react';
import { Rocket, Download, Linkedin, Loader2, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas';

interface FirstStartupBadgeProps {
  startupName: string;
  founderName: string;
  earnedDate: string;
}

export function FirstStartupBadge({ startupName, founderName, earnedDate }: FirstStartupBadgeProps) {
  const badgeRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!badgeRef.current) return;
    
    try {
      setIsDownloading(true);
      const canvas = await html2canvas(badgeRef.current, {
        scale: 3, 
        useCORS: true,
        backgroundColor: null,
      });
      
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = 'first-startup-badge.png';
      link.click();
    } catch (error) {
      console.error('Error generating badge image:', error);
      alert('Failed to download the badge. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareLinkedIn = () => {
    const text = `I just launched my first startup, ${startupName}, on StartupHub! 🚀\n\nCheck it out and join the community: https://startuphub.com`;
    const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
    
    alert('A pre-filled LinkedIn post will now open.\n\nIMPORTANT: LinkedIn does not support automatic image uploads. Please ensure you click "Download Badge" first, and manually attach the image to your LinkedIn post to show off your achievement!');
    
    navigator.clipboard.writeText(text).catch(err => console.error('Clipboard copy failed', err));
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto gap-4">
      {/* THE BADGE */}
      <div 
        ref={badgeRef} 
        className="flex flex-col items-center p-8 bg-gradient-to-b from-zinc-900 to-black rounded-xl border-2 border-amber-500/50 relative overflow-hidden group shadow-[0_10px_40px_rgba(245,158,11,0.15)] w-full font-sans"
      >
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-amber-500/10 blur-[60px] pointer-events-none"></div>
        
        {/* StartupHub Logo (Top Right) */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-80">
          <Rocket className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-amber-500 font-bold tracking-widest text-[8px] uppercase">StartupHub</span>
        </div>

        {/* Achievement Unlocked Header */}
        <div className="relative z-10 mb-8 mt-2">
          <span className="bg-amber-950/50 border border-amber-500/30 text-amber-400 font-bold tracking-[0.25em] text-[10px] uppercase px-4 py-1.5 rounded-full shadow-inner shadow-amber-500/10">
            Achievement Unlocked
          </span>
        </div>

        {/* Center Rocket Logo inside Gold Hexagon */}
        <div className="relative mb-8 z-10">
          <div className="absolute inset-0 bg-amber-400 blur-2xl opacity-20 rounded-full animate-pulse"></div>
          {/* Hexagon shape using clip-path */}
          <div 
            className="w-24 h-24 bg-gradient-to-br from-yellow-200 via-amber-500 to-amber-700 flex items-center justify-center p-1 shadow-[0_0_30px_rgba(245,158,11,0.4)]"
            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
          >
            <div 
              className="w-full h-full bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center relative"
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            >
              <Rocket className="w-10 h-10 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
              <Sparkles className="absolute top-2 right-2 w-4 h-4 text-yellow-200" />
            </div>
          </div>
        </div>
        
        {/* First Startup Ribbon */}
        <div className="relative z-10 w-[110%] -mx-4 mb-8 flex justify-center drop-shadow-xl">
          <div className="bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 text-black font-black uppercase tracking-widest py-2 px-12 shadow-lg transform -rotate-1 relative">
            <span className="text-lg">First Startup</span>
            {/* Ribbon tails (simulated with border tricks) */}
            <div className="absolute top-0 -left-3 w-3 h-full bg-amber-700" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 50%)' }}></div>
            <div className="absolute top-0 -right-3 w-3 h-full bg-amber-700" style={{ clipPath: 'polygon(0 0, 0 100%, 100% 50%)' }}></div>
          </div>
        </div>

        {/* Dynamic Fields Grid */}
        <div className="w-full text-center relative z-10 space-y-4">
          <div>
            <p className="text-[10px] text-amber-500/70 font-bold uppercase tracking-[0.2em] mb-1">Startup</p>
            <p className="text-xl text-white font-black truncate drop-shadow-md">{startupName}</p>
          </div>
          <div>
            <p className="text-[10px] text-amber-500/70 font-bold uppercase tracking-[0.2em] mb-1">Founder</p>
            <p className="text-base text-zinc-300 font-bold truncate">{founderName}</p>
          </div>
          
          {/* Decorative Divider */}
          <div className="w-1/2 mx-auto h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent my-4"></div>

          <div>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-1">Earned Date</p>
            <p className="text-xs text-amber-400/90 font-bold">{earnedDate}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 w-full mt-2">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700/50 rounded-xl py-3 px-4 text-sm font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
          ) : (
            <Download className="w-4 h-4 text-zinc-400" />
          )}
          Download
        </button>
        <button
          onClick={handleShareLinkedIn}
          className="flex-1 flex items-center justify-center gap-2 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-xl py-3 px-4 text-sm font-semibold transition-colors"
        >
          <Linkedin className="w-4 h-4" />
          Share
        </button>
      </div>
    </div>
  );
}
