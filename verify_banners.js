import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artifactDir = 'C:\\Users\\madha\\.gemini\\antigravity\\brain\\ba75d768-d890-4fa4-9671-0343915eeca4';

const email = 'user_a_1780503118317@gmail.com';
const password = 'TestPassword123!';
const username = 'user_a_1780503118317';

async function generateTestImage(page, width, height, color, text, filename) {
  console.log(`Generating image ${filename} (${width}x${height})...`);
  const dataUrl = await page.evaluate((w, h, c, t) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, w, h);
    
    // Draw grid pattern so we can see positioning
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 4;
    for (let x = 0; x < w; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    
    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t, w / 2, h / 2);
    
    // Draw top/bottom borders/indicators so we know where the edges are
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(0, 0, w, 20); // Top border
    ctx.fillRect(0, h - 20, w, 20); // Bottom border
    ctx.fillRect(0, 0, 20, h); // Left border
    ctx.fillRect(w - 20, 0, 20, h); // Right border
    
    return canvas.toDataURL('image/png');
  }, width, height, color, text);

  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
  fs.writeFileSync(filename, Buffer.from(base64Data, 'base64'));
}

async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  page.on('console', msg => console.log('[Browser Log]', msg.text()));
  page.on('pageerror', err => console.error('[Browser Error]', err.message));

  // Create temporary test files
  await page.goto('about:blank');
  await generateTestImage(page, 600, 1200, '#0284c7', 'PORTRAIT TEST (600x1200)', 'portrait.png');
  await generateTestImage(page, 1000, 1000, '#16a34a', 'SQUARE TEST (1000x1000)', 'square.png');
  await generateTestImage(page, 1600, 800, '#dc2626', 'LANDSCAPE TEST (1600x800)', 'landscape.png');

  try {
    // 1. Log in
    console.log('Navigating to login page...');
    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
    
    console.log('Filling login form...');
    await page.type('input[type="email"]', email);
    await page.type('input[type="password"]', password);
    
    console.log('Submitting login...');
    await page.click('button[type="submit"]');
    
    // Wait for login redirection and localStorage write
    console.log('Waiting for login redirect and localStorage write...');
    await page.waitForFunction(
      () => {
        const hasToken = Object.keys(localStorage).some(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
        const hasRedirected = window.location.pathname === '/' || window.location.pathname.includes('/profile/');
        return hasToken || hasRedirected;
      },
      { timeout: 15000 }
    );
    console.log('Session detected in browser. Waiting for persistence...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Logged in successfully!');

    // 2. Go to profile page
    console.log(`Navigating to profile page for ${username}...`);
    await page.goto(`http://localhost:5174/profile/${username}`, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const testCases = [
      { name: 'portrait', file: 'portrait.png' },
      { name: 'square', file: 'square.png' },
      { name: 'landscape', file: 'landscape.png' }
    ];

    for (const testCase of testCases) {
      console.log(`\n--- Testing ${testCase.name} banner upload ---`);
      
      // Locate the hidden banner input
      // In ProfilePage.tsx:
      // <input type="file" ref={bannerInputRef} onChange={handleBannerChange} accept="image/png, image/jpeg, image/webp" className="hidden" />
      // Wait for hidden input to load
      await page.waitForSelector('input[type="file"]');
      
      // We can query all file inputs on the page and find the one that has accepts containing banners/images
      const fileInputs = await page.$$('input[type="file"]');
      let bannerInput = null;
      for (const input of fileInputs) {
        const accept = await page.evaluate(el => el.getAttribute('accept'), input);
        const onChange = await page.evaluate(el => el.getAttribute('onChange'), input);
        // Let's print out some identifiers
        const outerHTML = await page.evaluate(el => el.outerHTML, input);
        console.log(`Found file input: ${outerHTML}`);
        // The second one is usually the banner input in ProfilePage
        bannerInput = input; // We'll upload to the second one or find it dynamically
      }
      
      // Let's identify the banner input correctly. On ProfilePage.tsx:
      // First is avatarInputRef, second is bannerInputRef.
      // Let's upload to the second file input
      if (fileInputs.length >= 2) {
        bannerInput = fileInputs[1];
      } else {
        console.log('Warning: only one file input found. Trying it.');
        bannerInput = fileInputs[0];
      }

      const absolutePath = path.resolve(testCase.file);
      console.log(`Uploading file: ${absolutePath}`);
      await bannerInput.uploadFile(absolutePath);

      // Wait for the cropper modal to open
      console.log('Waiting for cropper modal...');
      await page.waitForSelector('h2', { visible: true });
      
      // Find modal heading
      const modalHeader = await page.evaluate(() => {
        const headers = Array.from(document.querySelectorAll('h2'));
        const bannerHeader = headers.find(h => h.innerText.includes('Crop Banner Photo'));
        return bannerHeader ? bannerHeader.innerText : null;
      });
      console.log(`Modal heading: ${modalHeader}`);

      if (!modalHeader) {
        throw new Error('ImageCropperModal failed to open for banner!');
      }

      // Take screenshot of the cropper modal
      const cropperScreenshotPath = path.join(artifactDir, `${testCase.name}_cropper.png`);
      await page.screenshot({ path: cropperScreenshotPath });
      console.log(`Saved cropper screenshot: ${cropperScreenshotPath}`);

      // Click the Apply Crop button
      console.log('Clicking "Apply Crop" button...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const applyBtn = buttons.find(b => b.innerText.includes('Apply Crop') || b.innerText.includes('Cropping'));
        if (applyBtn) applyBtn.click();
      });

      // Wait for modal to close and uploading banner message to disappear
      console.log('Waiting for upload to finish...');
      await page.waitForFunction(() => {
        const modalOpen = Array.from(document.querySelectorAll('h2')).some(h => h.innerText.includes('Crop Banner Photo'));
        const uploadingVisible = Array.from(document.querySelectorAll('span')).some(s => s.innerText.includes('Uploading cover'));
        return !modalOpen && !uploadingVisible;
      }, { timeout: 30000 });
      console.log('Upload finished! Waiting for page stability...');
      
      // Wait a moment for page/images to settle
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Refresh the page as requested: "refresh the page, and verify the final profile banner truly spans the entire width of the header."
      console.log('Refreshing the page...');
      await page.reload({ waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Take screenshot of the profile page
      const profileScreenshotPath = path.join(artifactDir, `${testCase.name}_profile.png`);
      await page.screenshot({ path: profileScreenshotPath });
      console.log(`Saved profile screenshot: ${profileScreenshotPath}`);

      // Verify the banner styling and size in DOM
      console.log('Verifying DOM styles and sizes...');
      const bannerInfo = await page.evaluate(() => {
        // Find the banner image element
        const img = document.querySelector('img[alt="Profile cover"]');
        if (!img) return { error: 'Banner image element (alt="Profile cover") not found!' };

        const rect = img.getBoundingClientRect();
        const style = window.getComputedStyle(img);
        
        // Find parent container
        const container = img.parentElement;
        const containerRect = container ? container.getBoundingClientRect() : null;
        const containerStyle = container ? window.getComputedStyle(container) : null;

        return {
          imgWidth: rect.width,
          imgHeight: rect.height,
          imgObjectFit: style.objectFit,
          imgObjectPosition: style.objectPosition,
          imgTransform: style.transform,
          imgLeft: style.left,
          imgTop: style.top,
          imgMaxWidth: style.maxWidth,
          containerWidth: containerRect ? containerRect.width : null,
          containerHeight: containerRect ? containerRect.height : null,
          containerOverflow: containerStyle ? containerStyle.overflow : null
        };
      });

      console.log('DOM Banner properties:', JSON.stringify(bannerInfo, null, 2));

      if (bannerInfo.error) {
        throw new Error(bannerInfo.error);
      }

      // Assertions
      if (bannerInfo.imgObjectFit !== 'cover') {
        console.error(`FAIL: expected object-fit: cover, got: ${bannerInfo.imgObjectFit}`);
      } else {
        console.log('PASS: object-fit is cover.');
      }

      if (bannerInfo.imgWidth !== bannerInfo.containerWidth) {
        console.error(`FAIL: banner image width (${bannerInfo.imgWidth}px) does not match container width (${bannerInfo.containerWidth}px)`);
      } else {
        console.log(`PASS: banner image width matches container width (${bannerInfo.imgWidth}px) exactly.`);
      }

      if (bannerInfo.imgHeight !== bannerInfo.containerHeight) {
        console.error(`FAIL: banner image height (${bannerInfo.imgHeight}px) does not match container height (${bannerInfo.containerHeight}px)`);
      } else {
        console.log(`PASS: banner image height matches container height (${bannerInfo.imgHeight}px) exactly.`);
      }

      if (bannerInfo.imgLeft !== 'auto' && bannerInfo.imgLeft !== '0px') {
        console.error(`FAIL: unexpected left offset value: ${bannerInfo.imgLeft}`);
      } else {
        console.log('PASS: left offset is correct (no absolute positioning displacement).');
      }

      if (bannerInfo.imgMaxWidth === 'none') {
        console.log('Note: maxWidth is none, image is allowed to grow.');
      }
    }
  } catch (err) {
    console.error('Test run failed with error:', err);
    try {
      const errorScreenshotPath = path.join(artifactDir, 'error_screenshot.png');
      await page.screenshot({ path: errorScreenshotPath });
      console.log(`Saved error screenshot to: ${errorScreenshotPath}`);
    } catch (screenshotErr) {
      console.error('Failed to take error screenshot:', screenshotErr);
    }
  } finally {
    // Cleanup generated files
    fs.unlinkSync('portrait.png');
    fs.unlinkSync('square.png');
    fs.unlinkSync('landscape.png');
    
    console.log('Closing browser...');
    await browser.close();
  }
}

main();
