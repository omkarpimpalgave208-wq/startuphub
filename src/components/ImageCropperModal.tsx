import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Loader2, Move, ShieldCheck } from 'lucide-react';
import { Button } from './ui/Button';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File | null;
  cropType: 'avatar' | 'banner';
  onSave: (croppedFile: File) => Promise<void>;
}

export function ImageCropperModal({
  isOpen,
  onClose,
  imageFile,
  cropType,
  onSave
}: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(1.0);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Sizing & measuring wrapper
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [wrapperSize, setWrapperSize] = useState({ width: 0, height: 0 });

  // Image and cropping dimensions state
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  // Touch pinch-to-zoom refs
  const touchStartDist = useRef<number>(0);
  const touchStartZoom = useRef<number>(1.0);
  const isPinching = useRef<boolean>(false);

  // Measure wrapper dimensions
  useEffect(() => {
    if (!isOpen) return;
    const element = wrapperRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setWrapperSize({ width, height });
    });

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [isOpen]);

  // Output config based on type
  const isAvatar = cropType === 'avatar';

  // Calculate cropbox dimensions responsively
  // Keep padding of 32px (16px on each side) to fit within container safely
  const cropBox = isAvatar
    ? (() => {
        const side = Math.min(280, Math.max(120, wrapperSize.width - 32));
        return { width: side, height: side };
      })()
    : (() => {
        const width = Math.min(480, Math.max(150, wrapperSize.width - 32));
        const height = width / 3;
        return { width, height };
      })();

  const outputSize = isAvatar ? { width: 512, height: 512 } : { width: 1500, height: 500 };

  // Read file into image source
  useEffect(() => {
    if (!imageFile) {
      setImageSrc('');
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImageSrc(url);
    setLoading(true);
    setError('');
    setZoom(1.0);
    setOffset({ x: 0, y: 0 });

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  // Center image inside cropbox after loading dimensions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setNaturalDimensions({ width: naturalWidth, height: naturalHeight });
    setLoading(false);

    // Initial scale calculation to fit the crop box entirely (contain)
    const minScale = Math.min(cropBox.width / naturalWidth, cropBox.height / naturalHeight);
    const initialWidth = naturalWidth * minScale;
    const initialHeight = naturalHeight * minScale;

    // Centered offset
    setOffset({
      x: (cropBox.width - initialWidth) / 2,
      y: (cropBox.height - initialHeight) / 2
    });
  };

  // Math helper to calculate current minScale and rendered dimensions
  const getRenderDetails = useCallback(() => {
    if (!naturalDimensions.width || !naturalDimensions.height || !cropBox.width) {
      return { minScale: 1, scale: 1, width: 0, height: 0, minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    const minScale = Math.min(cropBox.width / naturalDimensions.width, cropBox.height / naturalDimensions.height);
    const scale = minScale * zoom;
    const width = naturalDimensions.width * scale;
    const height = naturalDimensions.height * scale;

    // Offset boundaries (center if smaller than cropbox, clamp boundaries if larger)
    let minX = 0;
    let maxX = 0;
    if (width <= cropBox.width) {
      minX = (cropBox.width - width) / 2;
      maxX = minX;
    } else {
      minX = cropBox.width - width;
      maxX = 0;
    }

    let minY = 0;
    let maxY = 0;
    if (height <= cropBox.height) {
      minY = (cropBox.height - height) / 2;
      maxY = minY;
    } else {
      minY = cropBox.height - height;
      maxY = 0;
    }

    return { minScale, scale, width, height, minX, maxX, minY, maxY };
  }, [naturalDimensions, cropBox, zoom]);

  // Keep offsets in bounds when zoom changes
  useEffect(() => {
    if (!naturalDimensions.width) return;
    const { minX, maxX, minY, maxY } = getRenderDetails();
    setOffset((prev) => ({
      x: Math.max(minX, Math.min(maxX, prev.x)),
      y: Math.max(minY, Math.min(maxY, prev.y))
    }));
  }, [zoom, getRenderDetails, naturalDimensions]);

  // Drag interaction logic
  const startDrag = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStart.current = {
      x: clientX,
      y: clientY,
      offsetX: offset.x,
      offsetY: offset.y
    };
  };

  const onDrag = (clientX: number, clientY: number) => {
    if (!isDragging) return;

    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;

    const { minX, maxX, minY, maxY } = getRenderDetails();

    const nextX = Math.max(minX, Math.min(maxX, dragStart.current.offsetX + dx));
    const nextY = Math.max(minY, Math.min(maxY, dragStart.current.offsetY + dy));

    setOffset({ x: nextX, y: nextY });
  };

  const endDrag = () => {
    setIsDragging(false);
  };

  // Touch Handlers for Pinch Zoom and Pan
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      isPinching.current = true;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDist.current = dist;
      touchStartZoom.current = zoom;
    } else if (e.touches.length === 1) {
      isPinching.current = false;
      startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && isPinching.current) {
      if (e.cancelable) e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (touchStartDist.current > 10) {
        const factor = dist / touchStartDist.current;
        let nextZoom = touchStartZoom.current * factor;
        nextZoom = Math.max(1.0, Math.min(8.0, nextZoom));
        setZoom(nextZoom);
      }
    } else if (e.touches.length === 1 && !isPinching.current) {
      onDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    isPinching.current = false;
    endDrag();
  };

  // Generate cropped image and call save
  const handleSave = async () => {
    if (!imageRef.current || !naturalDimensions.width) return;
    setSaving(true);
    setError('');

    try {
      const { scale } = getRenderDetails();
      const canvas = document.createElement('canvas');
      canvas.width = outputSize.width;
      canvas.height = outputSize.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to create canvas context.');

      // Fill canvas with solid background to support contain fit strategy without empty transparent gaps
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, outputSize.width, outputSize.height);

      // Source rectangle dimensions on original image resolution
      const sx = -offset.x / scale;
      const sy = -offset.y / scale;
      const sw = cropBox.width / scale;
      const sh = cropBox.height / scale;

      // Draw original image cropped section to canvas matching output resolution
      ctx.drawImage(
        imageRef.current,
        sx,
        sy,
        sw,
        sh,
        0,
        0,
        outputSize.width,
        outputSize.height
      );

      // Convert canvas drawing to Blob file
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), imageFile?.type || 'image/jpeg', 0.92);
      });

      if (!blob) throw new Error('Failed to generate cropped image.');

      const croppedFile = new File([blob], imageFile?.name || 'cropped-image.jpg', {
        type: imageFile?.type || 'image/jpeg'
      });

      await onSave(croppedFile);
      onClose();
    } catch (err: any) {
      console.error('[ImageCropperModal] Crop save failed:', err);
      setError(err?.message || 'Failed to crop image. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !imageFile) return null;

  // Live CSS dimensions for preview display
  const { scale } = getRenderDetails();
  const avatarPreviewWidth = 100;
  const avatarPreviewScale = avatarPreviewWidth / cropBox.width;

  const bannerPreviewWidth = 240;
  const bannerPreviewScale = bannerPreviewWidth / cropBox.width;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200 flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Main Cropper Column */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Move className="w-5 h-5 text-orange-500" />
              {isAvatar ? 'Crop Profile Photo' : 'Crop Banner Photo'}
            </h2>
            <button
              onClick={onClose}
              disabled={saving}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Edit Area */}
          <div ref={wrapperRef} className="flex-1 p-6 flex items-center justify-center bg-zinc-950/40 dark:bg-zinc-950/20 min-h-[300px] relative">
            {(loading || wrapperSize.width === 0) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 bg-zinc-950/25 z-10 animate-fade-in">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
                Loading editor...
              </div>
            )}

            {wrapperSize.width > 0 && (
              <div
                ref={containerRef}
                onMouseMove={(e) => onDrag(e.clientX, e.clientY)}
                onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
                onMouseUp={endDrag}
                onMouseLeave={endDrag}
                onTouchMove={handleTouchMove}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="relative overflow-hidden select-none cursor-move touch-none border border-zinc-200 dark:border-zinc-800 bg-zinc-900 shadow-inner"
                style={{
                  width: `${cropBox.width}px`,
                  height: `${cropBox.height}px`,
                  borderRadius: isAvatar ? '50%' : '12px'
                }}
              >
                {imageSrc && (
                  <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="Crop Source"
                    onLoad={handleImageLoad}
                    className="absolute pointer-events-none select-none max-w-none max-h-none origin-top-left"
                    style={{
                      width: `${naturalDimensions.width * scale}px`,
                      height: `${naturalDimensions.height * scale}px`,
                      transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`
                    }}
                  />
                )}
                
                {/* Overlay cropping grid guidelines */}
                <div className="absolute inset-0 border border-white/20 pointer-events-none flex">
                  <div className="flex-1 border-r border-dashed border-white/10" />
                  <div className="flex-1 border-r border-dashed border-white/10" />
                  <div className="flex-1" />
                </div>
                <div className="absolute inset-0 border border-white/20 pointer-events-none flex flex-col">
                  <div className="flex-1 border-b border-dashed border-white/10" />
                  <div className="flex-1 border-b border-dashed border-white/10" />
                  <div className="flex-1" />
                </div>
              </div>
            )}
          </div>

          {/* Zoom Slider */}
          <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-4">
            <ZoomOut className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
            <input
              type="range"
              min="1.00"
              max="8.00"
              step="0.01"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              disabled={loading || saving}
              className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <ZoomIn className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
            <span className="text-xs font-bold text-zinc-500 min-w-[32px] text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-4 uppercase tracking-wider">
              Live Preview
            </h3>
            
            <div className="flex flex-col items-center justify-center py-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900">
              {/* Circular Avatar Preview */}
              {isAvatar ? (
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="relative rounded-full overflow-hidden border-2 border-orange-500 shadow-md bg-zinc-100 dark:bg-zinc-800"
                    style={{
                      width: `${avatarPreviewWidth}px`,
                      height: `${avatarPreviewWidth}px`
                    }}
                  >
                    {imageSrc && !loading && (
                      <img
                        src={imageSrc}
                        alt="Avatar Preview"
                        className="absolute pointer-events-none origin-top-left"
                        style={{
                          width: `${naturalDimensions.width * scale * avatarPreviewScale}px`,
                          height: `${naturalDimensions.height * scale * avatarPreviewScale}px`,
                          transform: `translate3d(${offset.x * avatarPreviewScale}px, ${offset.y * avatarPreviewScale}px, 0)`
                        }}
                      />
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                    Profile Circular Crop
                  </span>
                </div>
              ) : (
                /* 3:1 Banner Preview */
                <div className="flex flex-col items-center gap-3 w-full px-4">
                  <div
                    className="relative overflow-hidden border border-orange-500 shadow-sm bg-zinc-100 dark:bg-zinc-800 rounded-lg w-full"
                    style={{
                      height: '80px' // Exactly matches aspect ratio scale of 240px wide preview
                    }}
                  >
                    {imageSrc && !loading && (
                      <img
                        src={imageSrc}
                        alt="Banner Preview"
                        className="absolute pointer-events-none origin-top-left"
                        style={{
                          width: `${naturalDimensions.width * scale * bannerPreviewScale}px`,
                          height: `${naturalDimensions.height * scale * bannerPreviewScale}px`,
                          transform: `translate3d(${offset.x * bannerPreviewScale}px, ${offset.y * bannerPreviewScale}px, 0)`
                        }}
                      />
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                    Banner Crop Ratio (3:1)
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-2 text-xs text-zinc-500 leading-relaxed font-medium">
              <p>✓ Output size: {outputSize.width}x{outputSize.height} pixels.</p>
              <p>✓ High-quality cropping preserves image detail on retina displays.</p>
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-8 flex flex-col gap-2.5">
            {error && (
              <p className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-2.5 rounded-lg">
                ✗ {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={saving}
                className="flex-1 justify-center"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                loading={saving}
                disabled={loading || saving}
                className="flex-1 justify-center"
              >
                {saving ? 'Cropping...' : 'Apply Crop'}
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
