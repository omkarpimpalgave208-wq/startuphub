import React, { useEffect, useRef, useState } from 'react';
import { Download, Linkedin, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { generateBadgeImage } from '../lib/badgeGenerator';

interface FirstStartupBadgeProps {
  startupName: string;
  founderName: string;
  earnedDate: string;
  imageUrl?: string;
}

export function FirstStartupBadge({ startupName, founderName, earnedDate, imageUrl }: FirstStartupBadgeProps) {
  const badgeRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [testImageUrl, setTestImageUrl] = useState<string | null>(imageUrl || null);

  useEffect(() => {
    if (!testImageUrl) {
      generateBadgeImage(startupName, founderName, earnedDate).then(file => {
        setTestImageUrl(URL.createObjectURL(file));
      }).catch(console.error);
    }
  }, [startupName, founderName, earnedDate, testImageUrl]);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      
      if (testImageUrl) {
        // Fetch and download the generated image directly
        const response = await fetch(testImageUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `first-startup-badge-${startupName}.png`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // Fallback for old badges
        if (!badgeRef.current) return;
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
      }
    } catch (error) {
      console.error('Error downloading badge image:', error);
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
      {testImageUrl ? (
        <img 
          src={testImageUrl} 
          alt="First Startup Badge" 
          className="w-full aspect-video rounded-xl shadow-[0_10px_40px_rgba(245,158,11,0.15)] object-contain bg-[#050505]"
        />
      ) : (
        <div 
          ref={badgeRef} 
          className="relative w-full aspect-video rounded-xl overflow-hidden shadow-[0_10px_40px_rgba(245,158,11,0.15)] font-sans bg-[#050505]"
        >
          {/* Approved Badge Image Template */}
          <img 
            src="/badge-template.png" 
            alt="First Startup Badge Template" 
            className="absolute inset-y-0 left-0 h-full object-contain object-left pointer-events-none"
            crossOrigin="anonymous"
          />

          {/* Dynamic Text Overlay */}
          <div className="absolute inset-0">
            {/* Startup Value: Y = 138 to 148 (62.4% to 67.0% of height), X = 152 (38.7% of width) */}
            <div 
              className="absolute left-[38.7%] flex items-center text-left" 
              style={{ top: '62.4%', height: '4.8%', width: '56.1%' }}
            >
              <p className="text-[11px] sm:text-[13px] text-yellow-400 font-extrabold line-clamp-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] break-words leading-none">{startupName}</p>
            </div>
            {/* Founder Value: Y = 160 to 184 (72.4% to 83.3% of height), X = 152 (38.7% of width) */}
            <div 
              className="absolute left-[38.7%] flex items-center text-left" 
              style={{ top: '72.4%', height: '11.0%', width: '56.1%' }}
            >
              <p className="text-[11px] sm:text-[13px] text-yellow-400 font-extrabold line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] break-words leading-tight">{founderName}</p>
            </div>
            {/* Date Value: Y = 195 to 215 (88.2% to 97.3% of height), X = 180 (45.8% of width) */}
            <div 
              className="absolute left-[45.8%] flex items-center text-left" 
              style={{ top: '88.2%', height: '9.0%', width: '49.0%' }}
            >
              <p className="text-[10px] text-zinc-300 font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none">{earnedDate}</p>
            </div>
          </div>
        </div>
      )}

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
