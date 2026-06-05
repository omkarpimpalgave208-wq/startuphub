/**
 * Image compression utility for frontend file optimization
 * Handles resizing and compression of images before upload
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxSizeMB?: number;
  quality?: number; // 0-1, default 0.8
}

const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  maxWidth: 800,
  maxHeight: 800,
  maxSizeMB: 1,
  quality: 0.8
};

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Compress image file to specified dimensions and quality
 * Returns a compressed Blob that can be converted to File for upload
 */
export function compressImage(
  canvas: HTMLCanvasElement,
  file: File,
  options: CompressionOptions = {}
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const opts = { ...DEFAULT_COMPRESSION_OPTIONS, ...options };
    
    // Start with high quality and reduce if needed
    let quality = opts.quality || 0.8;
    const maxSizeBytes = (opts.maxSizeMB || 1) * 1024 * 1024;
    
    const attemptCompress = () => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }
          
          // If still too large, reduce quality and retry
          if (blob.size > maxSizeBytes && quality > 0.1) {
            quality -= 0.1;
            attemptCompress();
          } else {
            resolve(blob);
          }
        },
        file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        quality
      );
    };
    
    attemptCompress();
  });
}

/**
 * Resize image to fit within max dimensions while maintaining aspect ratio
 * Returns a canvas with the resized image
 */
export function resizeImageOnCanvas(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  let width = img.width;
  let height = img.height;
  
  // Calculate new dimensions maintaining aspect ratio
  if (width > height) {
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }
  } else {
    if (height > maxHeight) {
      width = Math.round((width * maxHeight) / height);
      height = maxHeight;
    }
  }
  
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

/**
 * Main function: Read file, resize, compress, and return new File
 * This is the primary function to call from components
 */
export async function optimizeImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<{ file: File; originalSize: number; compressedSize: number }> {
  const opts = { ...DEFAULT_COMPRESSION_OPTIONS, ...options };
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const img = new Image();
        
        img.onload = async () => {
          try {
            // Step 1: Resize image on canvas
            const canvas = resizeImageOnCanvas(
              img,
              opts.maxWidth || 800,
              opts.maxHeight || 800
            );
            
            // Step 2: Compress the canvas to blob
            const compressedBlob = await compressImage(canvas, file, opts);
            
            // Step 3: Convert blob to File
            const compressedFile = new File(
              [compressedBlob],
              file.name,
              { type: file.type || 'image/jpeg' }
            );
            
            resolve({
              file: compressedFile,
              originalSize: file.size,
              compressedSize: compressedFile.size
            });
          } catch (err) {
            reject(err);
          }
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
        
        img.src = e.target?.result as string;
      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

interface FocusSettings {
  x: number;
  y: number;
  zoom: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export async function cropAndCompressBannerImage(
  file: File,
  focus: FocusSettings,
  aspectRatio: number,
  outputWidth = 1920,
  outputHeight = 720,
  options: CompressionOptions = {}
): Promise<{ file: File; originalSize: number; compressedSize: number }> {
  const opts = { ...DEFAULT_COMPRESSION_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const img = new Image();
        img.onload = async () => {
          try {
            const originalWidth = img.width;
            const originalHeight = img.height;
            const srcAspect = originalWidth / originalHeight;

            // Calculate scale factor relative to cover zoom state
            let scaleDraw = 1;
            if (srcAspect > aspectRatio) {
              // Image is wider: height matches canvas height in cover state
              scaleDraw = (outputHeight * focus.zoom) / originalHeight;
            } else {
              // Image is taller/square: width matches canvas width in cover state
              scaleDraw = (outputWidth * focus.zoom) / originalWidth;
            }

            const destW = originalWidth * scaleDraw;
            const destH = originalHeight * scaleDraw;

            const centerX = (focus.x / 100) * originalWidth;
            const centerY = (focus.y / 100) * originalHeight;

            const destX = outputWidth / 2 - centerX * scaleDraw;
            const destY = outputHeight / 2 - centerY * scaleDraw;

            const canvas = document.createElement('canvas');
            canvas.width = outputWidth;
            canvas.height = outputHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Failed to get canvas context');

            // Fill canvas background with dark zinc color
            ctx.fillStyle = '#09090b';
            ctx.fillRect(0, 0, outputWidth, outputHeight);

            // Draw blurred backdrop first if the image doesn't fully cover the canvas
            const coversCanvas = destX <= 0 && destY <= 0 && (destX + destW) >= outputWidth && (destY + destH) >= outputHeight;
            if (!coversCanvas) {
              try {
                ctx.save();
                ctx.filter = 'blur(30px) brightness(0.5)';
                // Draw blurred image stretched/covered to canvas
                let bgW = outputWidth;
                let bgH = outputHeight;
                let bgX = 0;
                let bgY = 0;
                if (srcAspect > aspectRatio) {
                  bgW = outputHeight * srcAspect;
                  bgX = (outputWidth - bgW) / 2;
                } else {
                  bgH = outputWidth / srcAspect;
                  bgY = (outputHeight - bgH) / 2;
                }
                ctx.drawImage(img, bgX - 30, bgY - 30, bgW + 60, bgH + 60);
                ctx.restore();
              } catch (blurErr) {
                console.warn('Canvas filter blur not supported or failed:', blurErr);
              }
            }

            // Draw foreground image
            ctx.drawImage(img, 0, 0, originalWidth, originalHeight, destX, destY, destW, destH);

            const compressedBlob = await compressImage(canvas, file, opts);
            const compressedFile = new File(
              [compressedBlob],
              file.name,
              { type: file.type || 'image/jpeg' }
            );

            resolve({
              file: compressedFile,
              originalSize: file.size,
              compressedSize: compressedFile.size
            });
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Check if file needs compression
 */
export function needsCompression(file: File, maxMB: number = 2): boolean {
  return file.size > maxMB * 1024 * 1024;
}

/**
 * Get compression recommendation message
 */
export function getCompressionMessage(
  originalSize: number,
  maxMB: number = 2
): string {
  const maxBytes = maxMB * 1024 * 1024;
  const originalMB = formatFileSize(originalSize);
  const maxAllowed = formatFileSize(maxBytes);
  return `File is ${originalMB}. Auto-compressing to ${maxAllowed}...`;
}
