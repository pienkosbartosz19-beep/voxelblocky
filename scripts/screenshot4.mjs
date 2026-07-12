import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await context.newPage();
const browserErrors = [];
const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', err => browserErrors.push(err.message));

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);

// Click start
await page.getByText('GRAJ TERAZ').click();

// Wait for chunks to load
await page.waitForTimeout(25000);
await page.screenshot({ path: '/home/z/my-project/screenshots/game_v4_initial.png' });
console.log('v4_initial saved');

// Turn on fly mode (Ctrl+F) to ascend above trees
await page.keyboard.down('ControlLeft');
await page.keyboard.press('KeyF');
await page.keyboard.up('ControlLeft');
await page.waitForTimeout(500);

// Ascend (Space) to get above canopy
await page.keyboard.down('Space');
await page.waitForTimeout(3500);
await page.keyboard.up('Space');
await page.waitForTimeout(2000);
await page.screenshot({ path: '/home/z/my-project/screenshots/game_v4_above.png' });
console.log('v4_above saved - flying above canopy');

// Look down by moving mouse while moving forward
// Just continue forward and take screenshot
await page.keyboard.down('KeyW');
await page.waitForTimeout(4000);
await page.keyboard.up('KeyW');
await page.waitForTimeout(2000);
await page.screenshot({ path: '/home/z/my-project/screenshots/game_v4_after_fly.png' });
console.log('v4_after_fly saved');

// Stop flying - press Ctrl+F again
await page.keyboard.down('ControlLeft');
await page.keyboard.press('KeyF');
await page.keyboard.up('ControlLeft');
await page.waitForTimeout(3000); // let player fall
await page.screenshot({ path: '/home/z/my-project/screenshots/game_v4_landed.png' });
console.log('v4_landed saved');

console.log('Errors:', browserErrors.length, consoleErrors.length);
browserErrors.slice(0, 5).forEach(e => console.log('  ERR:', e));
consoleErrors.slice(0, 5).forEach(e => console.log('  CON:', e));

await browser.close();
