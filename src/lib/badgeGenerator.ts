export async function generateBadgeImage(
  startupName: string,
  founderName: string,
  earnedDate: string
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Create a 1200x675 canvas (16:9 ratio) to provide massive space for long names
      const canvasWidth = 1200;
      const canvasHeight = 675;
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2d context'));
        return;
      }
      
      // Fill the entire canvas with the dark background color
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // Scale the original 301x221 image to fit the height of the new canvas
      const scale = canvasHeight / img.height; // ~3.054
      const drawWidth = img.width * scale; // ~919.3
      
      // Draw the original template on the left side
      ctx.drawImage(img, 0, 0, drawWidth, canvasHeight);
      
      // Erase main text area (Startup & Founder) without touching the labels
      ctx.fillRect(194 * scale, 100 * scale, canvasWidth - (194 * scale), 80 * scale); 
      // Erase the date text area
      ctx.fillRect(178 * scale, 185 * scale, canvasWidth - (178 * scale), 25 * scale); 

      // Function to dynamically reduce font size or wrap to multiple lines
      const drawDynamicText = (
        text: string, 
        x: number, // scaled X
        y: number, // scaled Y
        maxWidth: number, // scaled max width
        maxHeight: number, // scaled max height
        initialFontSize: number, 
        fontColor: string, 
        isBold: boolean
      ) => {
        let fontSize = initialFontSize;
        let lines: string[] = [];
        let lineHeight = 0;
        
        // Dynamically shrink font size until text fits within bounds
        while (fontSize >= 14) {
          ctx.font = `${isBold ? 'bold ' : ''}${fontSize}px sans-serif`;
          lineHeight = fontSize * 1.2;
          
          let words = text.split(' ');
          let line = '';
          lines = [];
          
          for(let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
              lines.push(line.trim());
              line = words[n] + ' ';
            } else {
              line = testLine;
            }
          }
          lines.push(line.trim());
          
          // Check if total height fits in maxHeight
          if (lines.length * lineHeight <= maxHeight) {
            break;
          }
          
          // Reduce font size and try again
          fontSize -= 2;
        }
        
        // Handle case where text is extremely long even at minimum font size
        ctx.font = `${isBold ? 'bold ' : ''}${fontSize}px sans-serif`;
        lineHeight = fontSize * 1.2;
        const maxLines = Math.floor(maxHeight / lineHeight);
        
        if (lines.length > maxLines) {
          lines = lines.slice(0, maxLines);
          if (lines.length > 0) {
            let lastLine = lines[lines.length - 1];
            while (lastLine.length > 0 && ctx.measureText(lastLine + '...').width > maxWidth) {
              lastLine = lastLine.slice(0, -1);
            }
            lines[lines.length - 1] = lastLine.trim() + '...';
          }
        }
        
        for (let i = 0; i < lines.length; i++) {
          if (ctx.measureText(lines[i]).width > maxWidth) {
            let line = lines[i];
            while (line.length > 0 && ctx.measureText(line + '...').width > maxWidth) {
              line = line.slice(0, -1);
            }
            lines[i] = line.trim() + '...';
          }
        }
        
        ctx.fillStyle = fontColor;
        // Vertically center within the available maxHeight
        const totalTextHeight = lines.length * lineHeight;
        const startY = y + ((maxHeight - totalTextHeight) / 2) + (fontSize * 0.8);
        
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], x, startY + (i * lineHeight));
        }
      };

      // Draw the new multi-line, dynamically scaled text
      const maxTextWidth = canvasWidth - (152 * scale) - 40; // ~695px wide
      
      // Startup Value: Place below the "Startup:" label (Y = 138 to 148)
      drawDynamicText(startupName, 152 * scale, 138 * scale, maxTextWidth, 10 * scale, 24, '#facc15', true);
      
      // Founder Value: Place below the "Founder:" label (Y = 160 to 184)
      drawDynamicText(founderName, 152 * scale, 160 * scale, maxTextWidth, 24 * scale, 24, '#facc15', true);
      
      // Date Value: Place next to the calendar icon (Y = 195 to 215, X = 180)
      drawDynamicText(earnedDate, 180 * scale, 195 * scale, canvasWidth - (180 * scale) - 40, 20 * scale, 20, '#d4d4d8', false);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'));
          return;
        }
        const file = new File([blob], `first-startup-${Date.now()}.png`, { type: 'image/png' });
        resolve(file);
      }, 'image/png', 1.0); // 1.0 quality for maximum sharpness
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load badge template'));
    };
    
    // Ensure the path is correct depending on where this is run (public folder)
    img.src = '/badge-template.png';
  });
}
