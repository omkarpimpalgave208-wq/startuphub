import React, { useState, useEffect, useRef } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  // Measure container size on mount and on window resize
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    measure();
    window.addEventListener('resize', measure);

    // Also measure after a brief timeout to catch layout shifts
    const timer = setTimeout(measure, 150);

    return () => {
      window.removeEventListener('resize', measure);
      clearTimeout(timer);
    };
  }, []);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImageSize({ width: naturalWidth, height: naturalHeight });
  };

  // If we don't have sizes yet, fall back to simple object-cover
  const useFallback =
    !containerSize ||
    !imageSize ||
    containerSize.width === 0 ||
    containerSize.height === 0 ||
    imageSize.width === 0 ||
    imageSize.height === 0;

  const currentZoom = typeof zoom === 'number' && zoom >= 1.0 ? zoom : 1.0;
  const currentPosX = typeof positionX === 'number' ? positionX : 0.5;
  const currentPosY = typeof positionY === 'number' ? positionY : 0.35;

  let imgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: `${currentPosX * 100}% ${currentPosY * 100}%`,
  };

  if (!useFallback) {
    const W_c = containerSize.width;
    const H_c = containerSize.height;
    const W_n = imageSize.width;
    const H_n = imageSize.height;

    const R_i = W_n / H_n;
    const R_c = W_c / H_c;

    let W_d = 0;
    let H_d = 0;

    // Cover calculations
    if (R_i > R_c) {
      H_d = H_c;
      W_d = H_c * R_i;
    } else {
      W_d = W_c;
      H_d = W_c / R_i;
    }

    const W_z = W_d * currentZoom;
    const H_z = H_d * currentZoom;

    // Linear mapping from [0, 1] position coordinate to pixel offset
    const L = currentPosX * (W_c - W_z);
    const T = currentPosY * (H_c - H_z);

    imgStyle = {
      position: 'absolute',
      left: `${L}px`,
      top: `${T}px`,
      width: `${W_z}px`,
      height: `${H_z}px`,
      maxWidth: 'none',
      maxHeight: 'none',
    };
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden w-full h-full ${className}`}>
      <img
        src={src}
        alt={alt}
        onLoad={handleImageLoad}
        style={imgStyle}
        className="select-none pointer-events-none"
      />
    </div>
  );
}
