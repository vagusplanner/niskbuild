/**
 * Evidence: route dropdown navigates Full App preview via navigateRequest postMessage.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, '.tmp-full-app-preview-spike');
const url =
  process.env.SPIKE_URL ||
  'http://localhost:3010/dev/full-app-builder-preview';

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleLogs = [];
page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

const report = {
  url,
  ok: false,
  homeText: null,
  habitsViaDropdown: null,
  homeViaDropdown: null,
  dropdownOk: false,
  screenshot: null,
  errors: [],
  consoleLogs: [],
};

try {
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  report.status = res?.status() ?? null;

  const frame = page.frameLocator('iframe').first();
  await frame.locator('h1').waitFor({ timeout: 120000 });
  report.homeText = (await frame.locator('body').innerText()).trim();

  // Open route dropdown and pick Habits
  await page.getByRole('button', { name: /Home/i }).first().click();
  await page.getByRole('option', { name: /Habits/i }).click();
  await page.waitForTimeout(800);
  report.habitsViaDropdown = (await frame.locator('body').innerText()).trim();

  // Pick Home again via dropdown
  await page.getByRole('button', { name: /Habits/i }).first().click();
  await page.getByRole('option', { name: /Home/i }).click();
  await page.waitForTimeout(800);
  report.homeViaDropdown = (await frame.locator('body').innerText()).trim();

  report.dropdownOk =
    /Your Habits|Add/i.test(report.habitsViaDropdown || '') &&
    /Ember Habits/i.test(report.homeViaDropdown || '') &&
    report.habitsViaDropdown !== report.homeViaDropdown;

  report.ok = /Ember Habits/i.test(report.homeText || '') && report.dropdownOk === true;

  const shot = path.join(outDir, 'builder-preview-route-dropdown.png');
  await page.screenshot({ path: shot, fullPage: true });
  report.screenshot = shot;
} catch (err) {
  report.errors.push(err instanceof Error ? err.message : String(err));
  try {
    const shot = path.join(outDir, 'builder-preview-route-dropdown-error.png');
    await page.screenshot({ path: shot, fullPage: true });
    report.screenshot = shot;
  } catch {
    /* ignore */
  }
} finally {
  report.consoleLogs = consoleLogs.slice(0, 50);
  await browser.close();
}

fs.writeFileSync(
  path.join(outDir, 'builder-preview-route-dropdown-report.json'),
  JSON.stringify(report, null, 2)
);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
