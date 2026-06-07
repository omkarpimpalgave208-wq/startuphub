import { chromium } from 'playwright';

(async () => {
  // Use the system Chrome instead of downloading one
  const browser = await chromium.launch({ channel: 'chrome' }).catch(async () => {
    console.log('Chrome failed, trying msedge...');
    return await chromium.launch({ channel: 'msedge' });
  });
  
  const context = await browser.newContext({ viewport: { width: 1280, height: 1080 } });
  const page = await context.newPage();
  
  console.log('Navigating to http://localhost:5174/non-existent-route-for-badge-test ...');
  await page.goto('http://localhost:5174/non-existent-route-for-badge-test', { waitUntil: 'networkidle' });
  
  console.log('Waiting for badge to render...');
  await page.waitForTimeout(3000); // Wait for React to render
  
  const badgeElement = await page.$('.flex.flex-col.items-center.w-full.max-w-sm');
  
  if (badgeElement) {
    await badgeElement.screenshot({ path: 'C:\\Users\\madha\\.gemini\\antigravity\\brain\\aeac3740-a35b-486a-9336-73c8b2113037\\badge_screenshot.png' });
    console.log('Screenshot saved to artifact directory!');
  } else {
    await page.screenshot({ path: 'C:\\Users\\madha\\.gemini\\antigravity\\brain\\aeac3740-a35b-486a-9336-73c8b2113037\\full_page_screenshot.png', fullPage: true });
    console.log('Badge not found! Saved full page screenshot instead.');
  }
  
  await browser.close();
})();
