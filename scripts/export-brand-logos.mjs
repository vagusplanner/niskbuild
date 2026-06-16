#!/usr/bin/env node
/**
 * Exports attached brand PDFs to web-ready PNG assets.
 * Source PDFs (place in public/logo/):
 *   - icon logo niskbuild.pdf
 *   - logo typo only niskbuild.pdf
 *   - logo+typo niskbuild.pdf
 *
 * Run: npm run export:brand-logos
 */
import { copyFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const logoDir = join(__dirname, '..', 'public', 'logo');

const sources = [
  { pdf: 'icon logo niskbuild.pdf', png: 'niskbuild-icon-brand.png' },
  { pdf: 'logo+typo niskbuild.pdf', png: 'niskbuild-lockup-brand.png' },
  { pdf: 'logo typo only niskbuild.pdf', png: 'niskbuild-wordmark-brand.png' },
];

for (const { pdf, png } of sources) {
  const pdfPath = join(logoDir, pdf);
  const thumbPath = join(logoDir, `${pdf}.png`);
  const outPath = join(logoDir, png);
  if (!existsSync(pdfPath)) {
    console.warn(`Skip (missing): ${pdfPath}`);
    continue;
  }
  if (!existsSync(thumbPath)) {
    execSync(`qlmanage -t -s 2048 -o "${logoDir}" "${pdfPath}"`, { stdio: 'inherit' });
  }
  if (existsSync(thumbPath)) {
    copyFileSync(thumbPath, outPath);
    console.log(`Wrote ${outPath}`);
  }
}

for (const size of [32, 180, 512]) {
  const icon = join(logoDir, 'niskbuild-icon-brand.png');
  const out = join(logoDir, `icon-${size}.png`);
  execSync(`sips -z ${size} ${size} "${icon}" --out "${out}"`, { stdio: 'inherit' });
}

copyFileSync(join(logoDir, 'niskbuild-lockup-brand.png'), join(logoDir, 'niskbuild-lockup.png'));
copyFileSync(join(logoDir, 'niskbuild-icon-brand.png'), join(__dirname, '..', 'public', 'logo-icon.png'));
console.log('Brand logo export complete.');
