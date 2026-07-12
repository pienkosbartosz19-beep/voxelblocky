import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
page.on('console', msg => {
  const type = msg.type();
  if (type === 'error') console.log('BROWSER ERROR:', msg.text());
  else if (type === 'warning') console.log('WARN:', msg.text());
});
page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: '/home/z/my-project/screenshots/menu_after_upgrade.png' });
console.log('Menu screenshot saved');

// Click "GRAJ TERAZ" (Start Game)
const startBtn = page.getByText('GRAJ TERAZ');
await startBtn.click();
console.log('Clicked start button');

// Wait for game canvas to render
await page.waitForTimeout(8000);
await page.screenshot({ path: '/home/z/my-project/screenshots/game_initial_after_upgrade.png' });
console.log('Game initial screenshot saved');

// Wait more for chunks to load
await page.waitForTimeout(8000);
await page.screenshot({ path: '/home/z/my-project/screenshots/game_loaded_after_upgrade.png' });
console.log('Game loaded screenshot saved');

// Try to look around (simulating pointer lock movement is hard without lock, but the game still renders)
// Press some keys to look around
await page.mouse.move(640, 360);
await page.mouse.down();
await page.mouse.move(700, 360, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(2000);
await page.screenshot({ path: '/home/z/my-project/screenshots/game_looking_after_upgrade.png' });
console.log('Game looking screenshot saved');

// Capture console errors
const errors = [];
page.on('pageerror', err => errors.push(err.message));

await browser.close();
console.log('Done. Errors:', errors);
