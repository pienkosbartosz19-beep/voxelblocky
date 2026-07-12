import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await context.newPage();
const browserErrors = [];
const consoleErrors = [];
page.on('console', msg => {
  const type = msg.type();
  const text = msg.text();
  if (type === 'error') consoleErrors.push(text);
});
page.on('pageerror', err => browserErrors.push(err.message));

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// Click start
await page.getByText('GRAJ TERAZ').click();

// Wait longer for chunks to load
await page.waitForTimeout(20000);
await page.screenshot({ path: '/home/z/my-project/screenshots/game_v3_initial.png' });
console.log('Initial screenshot saved');

// Press W to walk forward - we want to see more of the world
await page.keyboard.down('KeyW');
await page.waitForTimeout(3000);
await page.keyboard.up('KeyW');
await page.waitForTimeout(3000);
await page.screenshot({ path: '/home/z/my-project/screenshots/game_v3_walked.png' });

// Try pressing space to jump up to see over things
await page.keyboard.down('Space');
await page.waitForTimeout(500);
await page.keyboard.up('Space');
await page.waitForTimeout(2000);
await page.screenshot({ path: '/home/z/my-project/screenshots/game_v3_jumped.png' });

// Try Ctrl+F to fly, then space to ascend
await page.keyboard.down('ControlLeft');
await page.keyboard.press('KeyF');
await page.keyboard.up('ControlLeft');
await page.waitForTimeout(500);
await page.keyboard.down('Space');
await page.waitForTimeout(2500);
await page.keyboard.up('Space');
await page.waitForTimeout(2000);
await page.screenshot({ path: '/home/z/my-project/screenshots/game_v3_flying.png' });

console.log('Browser errors count:', browserErrors.length);
browserErrors.forEach(e => console.log('  ERR:', e));
console.log('Console errors count:', consoleErrors.length);
consoleErrors.slice(0, 5).forEach(e => console.log('  CON:', e));

await browser.close();
