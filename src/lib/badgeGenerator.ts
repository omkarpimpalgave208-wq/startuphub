export async function generateBadgeImage(
  startupName: string,
  founderName: string,
  earnedDate: string
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; // 301
      canvas.height = img.height; // 221
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2d context'));
        return;
      }
      
      // Draw the original template
      ctx.drawImage(img, 0, 0);
      
      // The background color of the badge is #0a0a0a (approx)
      // We need to erase the old text.
      // Erase "StartupHub"
      ctx.fillStyle = '#050505'; // very dark background
      // Approx coordinates for the text values
      // We don't erase "Startup:" and "Founder:" - we just erase the values next to them!
      ctx.fillRect(195, 125, 100, 45); // Erasing StartupHub and Omkar
      
      // Erase the date text (May 25, 2025)
      ctx.fillRect(180, 190, 100, 20); 

      // Now draw the new text
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#facc15'; // Amber-400
      ctx.fillText(startupName, 198, 137);
      
      ctx.fillText(founderName, 198, 160);
      
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#d4d4d8'; // zinc-300
      ctx.fillText(earnedDate, 182, 202);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'));
          return;
        }
        const file = new File([blob], `first-startup-${Date.now()}.png`, { type: 'image/png' });
        resolve(file);
      }, 'image/png', 1.0);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load badge template'));
    };
    
    // Ensure the path is correct depending on where this is run (public folder)
    img.src = '/badge-template.png';
  });
}
