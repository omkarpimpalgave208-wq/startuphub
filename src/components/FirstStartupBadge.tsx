import React from 'react';
import { Award, Rocket, Sparkles } from 'lucide-react';

interface FirstStartupBadgeProps {
  startupName: string;
  founderName: string;
  earnedDate: string;
}

export function FirstStartupBadge({ startupName, founderName, earnedDate }: FirstStartupBadgeProps) {
  return (
    <div className="flex flex-col items-center p-6 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black rounded-3xl border border-amber-500/30 relative overflow-hidden group shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(245,158,11,0.2)] transition-all duration-500 w-full max-w-sm mx-auto">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03] mix-blend-overlay"></div>
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/20 blur-[50px] rounded-full pointer-events-none group-hover:bg-amber-500/30 transition-colors duration-500"></div>
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-700/20 blur-[50px] rounded-full pointer-events-none group-hover:bg-amber-600/30 transition-colors duration-500"></div>
      
      {/* StartupHub Branding Header */}
      <div className="flex items-center gap-2 mb-6 relative z-10 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
        <div className="bg-amber-400 p-1 rounded-md">
          <Rocket className="w-3.5 h-3.5 text-black" />
        </div>
        <span className="text-amber-400 font-bold tracking-[0.2em] text-[10px] uppercase">StartupHub</span>
      </div>

      {/* Center Achievement Icon */}
      <div className="relative mb-5 z-10 transform group-hover:scale-105 transition-transform duration-500">
        <div className="absolute inset-0 bg-amber-400 blur-xl opacity-20 rounded-full animate-pulse"></div>
        <div className="w-20 h-20 bg-gradient-to-tr from-amber-700 via-amber-400 to-yellow-200 rounded-full flex items-center justify-center p-[2px] shadow-lg shadow-amber-500/20">
          <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black rounded-full flex items-center justify-center border border-black/50">
            <Award className="w-10 h-10 text-amber-400" />
          </div>
        </div>
        <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-300 animate-pulse drop-shadow-[0_0_8px_rgba(253,224,71,0.8)]" />
      </div>
      
      {/* Title Text */}
      <div className="text-center relative z-10 space-y-0.5 mb-6">
        <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-500 uppercase tracking-widest drop-shadow-sm">First Startup</h3>
        <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-amber-600 uppercase tracking-widest drop-shadow-sm">Launched</h3>
      </div>

      {/* Decorative Divider */}
      <div className="w-full flex items-center justify-center gap-2 mb-5 relative z-10 opacity-70">
        <div className="h-px bg-gradient-to-r from-transparent to-amber-500/50 flex-1"></div>
        <div className="w-1.5 h-1.5 rotate-45 bg-amber-500"></div>
        <div className="h-px bg-gradient-to-l from-transparent to-amber-500/50 flex-1"></div>
      </div>

      {/* Dynamic Fields Grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 w-full text-center relative z-10 px-2">
        <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 backdrop-blur-sm">
          <p className="text-[9px] text-amber-500/80 font-bold uppercase tracking-widest mb-1">Founder</p>
          <p className="text-sm text-amber-50 font-bold truncate">{founderName}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 backdrop-blur-sm">
          <p className="text-[9px] text-amber-500/80 font-bold uppercase tracking-widest mb-1">Startup</p>
          <p className="text-sm text-amber-50 font-bold truncate">{startupName}</p>
        </div>
        <div className="col-span-2 flex justify-center mt-1">
          <div className="bg-amber-950/40 border border-amber-500/30 px-5 py-2 rounded-full inline-flex items-center gap-2.5 shadow-inner">
            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Earned</span>
            <div className="w-1 h-1 rounded-full bg-amber-500/50"></div>
            <span className="text-xs text-amber-200 font-bold">{earnedDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
