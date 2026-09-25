/**
 * Headless evidence for Full App preview spike.
 * Usage: npx playwright test --config=scripts/full-app-preview-spike.playwright.mjs
 * Or: node scripts/run-full-app-preview-spike-browser.mjs
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, '.tmp-full-app-preview-spike');
const url = process.env.SPIKE_URL || 'http://localhost:3010/dev/full-app-preview-spike';

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleLogs = [];
page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => consoleLogs.push(`[pageerror] ${err.message}`));

const report = {
  url,
  ok: false,
  headerText: null,
  iframeText: null,
  screenshot: null,
  errors: [],
  consoleLogs: [],
};

try {
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  report.status = res?.status() ?? null;

  // Wait for either ready header or error (wasm init can take a while)
  await page.waitForFunction(
    () => {
      const header = document.querySelector('header');
      const text = header?.textContent || '';
      return (
        text.includes('bundled') ||
        text.includes('error') ||
        !!document.querySelector('pre')
      );
    },
    null,
    { timeout: 120000 }
  );

  report.headerText = (await page.locator('header').innerText().catch(() => '')).trim();
  const preText = (await page.locator('pre').innerText().catch(() => '')).trim();
  if (preText) report.errors.push(preText);

  if (
    report.headerText.toLowerCase().includes('error') ||
    (await page.locator('pre').count()) > 0
  ) {
    if (!preText) report.errors.push(report.headerText);
  } else {
    const frame = page.frameLocator('iframe').first();
    await frame.locator('h1').waitFor({ timeout: 60000 });
    report.iframeText = (await frame.locator('main').innerText()).trim();
    report.ok =
      report.iframeText.includes('Hello from esbuild-wasm') &&
      report.headerText.includes('bundled');
  }

  const shotPath = path.join(outDir, 'browser-spike.png');
  await page.screenshot({ path: shotPath, fullPage: true });
  report.screenshot = shotPath;
} catch (err) {
  report.errors.push(err instanceof Error ? err.message : String(err));
  try {
    const shotPath = path.join(outDir, 'browser-spike-error.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    report.screenshot = shotPath;
  } catch {
    /* ignore */
  }
} finally {
  report.consoleLogs = consoleLogs.slice(0, 40);
  await browser.close();
}

fs.writeFileSync(path.join(outDir, 'browser-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
