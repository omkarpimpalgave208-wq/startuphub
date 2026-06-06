import React from 'react';

interface BannerImageProps {
  src: string;
  zoom?: number | null;
  positionX?: number | null;
  positionY?: number | null;
  alt?: string;
  className?: string;
}

export function BannerImage({
  src,
  zoom = 1.0,
  positionX = 0.5,
  positionY = 0.35,
  alt = 'Banner',
  className = ''
}: BannerImageProps) {
  const currentZoom = typeof zoom === 'number' && zoom >= 1.0 ? zoom : 1.0;
  const currentPosX = typeof positionX === 'number' ? positionX : 0.5;
  const currentPosY = typeof positionY === 'number' ? positionY : 0.35;

  const imgStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    height: '100%',
    minWidth: '100%',
    minHeight: '100%',
    maxWidth: 'none',
    maxHeight: 'none',
    objectFit: 'cover',
    objectPosition: `${currentPosX * 100}% ${currentPosY * 100}%`,
    transform: currentZoom > 1.0 ? `scale(${currentZoom})` : undefined,
    transformOrigin: `${currentPosX * 100}% ${currentPosY * 100}%`,
  };

  return (
    <div className={`relative overflow-hidden w-full h-full ${className}`}>
      <img
        src={src}
        alt={alt}
        style={imgStyle}
        className="select-none pointer-events-none"
      />
    </div>
  );
}
