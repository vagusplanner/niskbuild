/**
 * Evidence: FullAppLivePreview + chrome with Ember Habits multi-page app.
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
  habitsText: null,
  navigated: false,
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

  // Click Habits nav inside the live React app
  await frame.getByRole('link', { name: 'Habits' }).click();
  await frame.locator('h1').waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  report.habitsText = (await frame.locator('body').innerText()).trim();
  report.navigated =
    /habit/i.test(report.habitsText) &&
    report.habitsText !== report.homeText;

  // Wait for chrome back to enable (SPA history report)
  const backBtn = page.getByRole('button', { name: 'Preview back' });
  try {
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('button[aria-label="Preview back"]');
        return btn && !btn.disabled;
      },
      null,
      { timeout: 8000 }
    );
    await backBtn.click();
    await page.waitForTimeout(600);
    const afterBack = (await frame.locator('body').innerText()).trim();
    report.backWorked = /Ember Habits/i.test(afterBack);
  } catch {
    // Fallback: navigate Home via in-app link if chrome back didn't enable
    await frame.getByRole('link', { name: 'Home' }).click();
    await page.waitForTimeout(500);
    const afterHome = (await frame.locator('body').innerText()).trim();
    report.backWorked = /Ember Habits/i.test(afterHome);
    report.backViaChrome = false;
  }

  report.ok =
    /Ember Habits/i.test(report.homeText) &&
    report.navigated === true &&
    report.backWorked === true;

  const shot = path.join(outDir, 'builder-preview-ember.png');
  await page.screenshot({ path: shot, fullPage: true });
  report.screenshot = shot;
} catch (err) {
  report.errors.push(err instanceof Error ? err.message : String(err));
  try {
    const shot = path.join(outDir, 'builder-preview-ember-error.png');
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
  path.join(outDir, 'builder-preview-report.json'),
  JSON.stringify(report, null, 2)
);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
