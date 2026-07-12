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
await page.waitForTimeout(25000);
await page.screenshot({ path: '/home/z/my-project/screenshots/game_v5_initial.png' });
console.log('v5_initial saved');

// Walk forward to see if view changes
await page.keyboard.down('KeyW');
await page.waitForTimeout(5000);
await page.keyboard.up('KeyW');
await page.waitForTimeout(2000);
await page.screenshot({ path: '/home/z/my-project/screenshots/game_v5_walked.png' });
console.log('v5_walked saved');

console.log('Errors:', errors.length);
errors.slice(0, 5).forEach(e => console.log('  ', e));

await browser.close();
