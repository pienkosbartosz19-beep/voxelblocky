import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
const browserErrors = [];
const consoleErrors = [];
page.on('console', msg => {
  const type = msg.type();
  const text = msg.text();
  if (type === 'error') consoleErrors.push(text);
});
page.on('pageerror', err => browserErrors.push(err.message + '\n' + (err.stack || '')));

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);

// Click start
await page.getByText('GRAJ TERAZ').click();

// Wait longer for chunks to load
await page.waitForTimeout(15000);
await page.screenshot({ path: '/home/z/my-project/screenshots/game_v2_loaded.png', fullPage: false });

// Try to move around to see different terrain - press D key to walk right
await page.keyboard.down('KeyD');
await page.waitForTimeout(3000);
await page.keyboard.up('KeyD');
await page.waitForTimeout(3000);
await page.screenshot({ path: '/home/z/my-project/screenshots/game_v2_walked.png', fullPage: false });

// Press W to walk forward
await page.keyboard.down('KeyW');
await page.waitForTimeout(4000);
await page.keyboard.up('KeyW');
await page.waitForTimeout(3000);
await page.screenshot({ path: '/home/z/my-project/screenshots/game_v2_forward.png', fullPage: false });

console.log('Browser errors:', browserErrors);
console.log('Console errors:', consoleErrors.slice(0, 10));

await browser.close();
