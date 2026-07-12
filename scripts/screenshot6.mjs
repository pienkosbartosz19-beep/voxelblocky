import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', err => errors.push(err.message));
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);
await page.getByText('GRAJ TERAZ').click();

// Wait for chunks to load
await page.waitForTimeout(25000);
await page.screenshot({ path: '/home/z/my-project/screenshots/game_v6_initial.png' });
console.log('v6_initial saved');

// Walk forward to enter the forest
await page.keyboard.down('KeyW');
await page.waitForTimeout(5000);
await page.keyboard.up('KeyW');
await page.waitForTimeout(2000);
await page.screenshot({ path: '/home/z/my-project/screenshots/game_v6_walked.png' });
console.log('v6_walked saved');

// Look around by rotating camera
await page.mouse.move(800, 450);
await page.mouse.down();
await page.mouse.move(1100, 450, { steps: 20 });
await page.mouse.up();
await page.waitForTimeout(2000);
await page.screenshot({ path: '/home/z/my-project/screenshots/game_v6_turned.png' });
console.log('v6_turned saved');

console.log('Errors:', errors.length);
errors.slice(0, 5).forEach(e => console.log('  ', e));

await browser.close();
