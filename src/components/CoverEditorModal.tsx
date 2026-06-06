import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Loader2, Move } from 'lucide-react';
import { Button } from './ui/Button';

interface CoverEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  initialZoom?: number;
  initialPositionX?: number;
  initialPositionY?: number;
  onSave: (zoom: number, positionX: number, positionY: number) => Promise<void>;
}

export function CoverEditorModal({
  isOpen,
  onClose,
  imageUrl,
  initialZoom = 1.0,
  initialPositionX = 0.5,
  initialPositionY = 0.35,
  onSave
}: CoverEditorModalProps) {
  const [zoom, setZoom] = useState(initialZoom);
  const [positionX, setPositionX] = useState(initialPositionX);
  const [positionY, setPositionY] = useState(initialPositionY);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, pos_x: 0, pos_y: 0 });

  // Touch pinch-to-zoom refs
  const touchStartDist = useRef<number>(0);
  const touchStartZoom = useRef<number>(1.0);
  const isPinching = useRef<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setZoom(initialZoom || 1.0);
      setPositionX(initialPositionX !== null && initialPositionX !== undefined ? initialPositionX : 0.5);
      setPositionY(initialPositionY !== null && initialPositionY !== undefined ? initialPositionY : 0.35);
      setError('');
    }
  }, [isOpen, initialZoom, initialPositionX, initialPositionY]);

  if (!isOpen) return null;

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setNaturalDimensions({ width: naturalWidth, height: naturalHeight });
  };

  const getExcessDimensions = () => {
    if (!containerRef.current || !naturalDimensions.width || !naturalDimensions.height) {
      return { excessWidth: 0, excessHeight: 0 };
    }
    const rect = containerRef.current.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;

    const imgAspect = naturalDimensions.width / naturalDimensions.height;
    const contAspect = containerWidth / containerHeight;

    let excessWidth = 0;
    let excessHeight = 0;

    if (imgAspect > contAspect) {
      // Image height scales to match containerHeight
      excessWidth = (containerHeight * imgAspect * zoom) - containerWidth;
      excessHeight = (containerHeight * zoom) - containerHeight;
    } else {
      // Image width scales to match containerWidth
      excessWidth = (containerWidth * zoom) - containerWidth;
      excessHeight = ((containerWidth / imgAspect) * zoom) - containerHeight;
    }

    return { excessWidth, excessHeight };
  };

  const startDrag = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStart.current = {
      x: clientX,
      y: clientY,
      pos_x: positionX,
      pos_y: positionY
    };
  };

  const onDrag = (clientX: number, clientY: number) => {
    if (!isDragging) return;

    const deltaX = clientX - dragStart.current.x;
    const deltaY = clientY - dragStart.current.y;

    const { excessWidth, excessHeight } = getExcessDimensions();

    // dx positive means mouse drag right -> image content moves right -> focal point moves left (decreases pos_x)
    let newPosX = dragStart.current.pos_x - (excessWidth > 0.01 ? (deltaX / excessWidth) : 0);
    let newPosY = dragStart.current.pos_y - (excessHeight > 0.01 ? (deltaY / excessHeight) : 0);

    // Clamp between 0 and 1
    newPosX = Math.max(0, Math.min(1, newPosX));
    newPosY = Math.max(0, Math.min(1, newPosY));

    setPositionX(newPosX);
    setPositionY(newPosY);
  };

  const endDrag = () => {
    setIsDragging(false);
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    onDrag(e.clientX, e.clientY);
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
      const touch = e.touches[0];
      startDrag(touch.clientX, touch.clientY);
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
        nextZoom = Math.max(1.0, Math.min(3.0, nextZoom));
        setZoom(nextZoom);
      }
    } else if (e.touches.length === 1 && !isPinching.current) {
      const touch = e.touches[0];
      onDrag(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = () => {
    isPinching.current = false;
    endDrag();
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave(zoom, positionX, positionY);
      onClose();
    } catch (err) {
      console.error('[CoverEditorModal] Save failed:', err);
      const errMsg = err instanceof Error ? err.message : 'Failed to save cover positioning. Please try again.';
      setError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Move className="w-5 h-5 text-orange-500" />
            Adjust Cover Photo
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview / Drag Container */}
        <div className="p-6">
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            onTouchMove={handleTouchMove}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="relative w-full aspect-[3/1] overflow-hidden bg-zinc-950 rounded-2xl select-none cursor-move group touch-none border border-zinc-200 dark:border-zinc-800"
          >
            <img
              src={imageUrl}
              alt="Reposition Banner"
              onLoad={handleImageLoad}
              className="w-full h-full object-cover pointer-events-none select-none"
              style={{
                objectPosition: `${positionX * 100}% ${positionY * 100}%`,
                transform: `scale(${zoom})`,
                transformOrigin: 'center'
              }}
            />
            
            {/* Visual Guide / Crop Overlay */}
            <div className="absolute inset-0 border-2 border-dashed border-white/30 pointer-events-none rounded-2xl" />
            
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg pointer-events-none opacity-80 flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5" />
              Drag to reposition • Adjust zoom below
            </div>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-4">
          <ZoomOut className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
          <input
            type="range"
            min="1.00"
            max="3.00"
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <ZoomIn className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
          <span className="text-xs font-bold text-zinc-500 min-w-[32px] text-right">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-500">
            {error ? (
              <span className="text-red-500 font-semibold">Error: {error}</span>
            ) : (
              <span>Saved coordinates will persist responsively on all screens.</span>
            )}
          </div>
          <div className="flex gap-2.5 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="flex-1 sm:flex-initial"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
              className="flex-1 sm:flex-initial"
            >
              Save Position
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
