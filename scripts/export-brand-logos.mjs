#!/usr/bin/env node
/**
 * Sync app favicons / public logo copies from the final forge mark,
 * then regenerate the high-res brand kit under public/brand/.
 *
 * Run: npm run export:brand-logos
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const logoDir = join(root, 'public', 'logo');
const brandDir = join(root, 'public', 'brand');
const publicDir = join(root, 'public');

function rasterizeSvg(svgPath, outPath, size) {
  if (!existsSync(svgPath)) {
    console.warn(`Skip raster (missing SVG): ${svgPath}`);
    return;
  }
  const svg = readFileSync(svgPath);
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  writeFileSync(outPath, resvg.render().asPng());
  console.log(`Raster ${outPath.replace(root + '/', '')} (${size}px)`);
}

function downscaleIcon(masterPath, outPath, size) {
  if (!existsSync(masterPath)) return;
  execSync(`sips -z ${size} ${size} "${masterPath}" --out "${outPath}"`, { stdio: 'pipe' });
  console.log(`Downscale ${outPath.replace(root + '/', '')} (${size}px)`);
}

// 1) High-res brand kit (also refreshes public/logo/niskbuild-icon.svg)
execSync('node scripts/generate-brand-kit.mjs', { stdio: 'inherit', cwd: root });

// 2) App favicon / PWA sizes from dark-plate master
const master512 = join(brandDir, 'icon-dark-512.png');
const iconSvg = join(logoDir, 'niskbuild-icon.svg');

if (existsSync(master512)) {
  copyFileSync(master512, join(logoDir, 'icon-512.png'));
  downscaleIcon(master512, join(logoDir, 'icon-180.png'), 180);
  downscaleIcon(master512, join(logoDir, 'icon-192.png'), 192);
  downscaleIcon(master512, join(logoDir, 'icon-32.png'), 32);
  downscaleIcon(master512, join(logoDir, 'icon-16.png'), 16);
  copyFileSync(master512, join(publicDir, 'logo.png'));
  copyFileSync(master512, join(publicDir, 'logo-icon.png'));
}

if (existsSync(iconSvg)) {
  copyFileSync(iconSvg, join(publicDir, 'logo.svg'));
  copyFileSync(iconSvg, join(publicDir, 'favicon-source.svg'));
  console.log('Synced logo.svg + favicon-source.svg from niskbuild-icon.svg');
}

// Optional: keep a single icon PDF for print (from 2048 master)
const master2048 = join(brandDir, 'icon-dark-2048.png');
if (existsSync(master2048)) {
  try {
    const { PDFDocument } = await import('pdf-lib');
    const pngBytes = readFileSync(master2048);
    const doc = await PDFDocument.create();
    const image = await doc.embedPng(pngBytes);
    const maxW = 400;
    const scale = maxW / image.width;
    const page = doc.addPage([image.width * scale, image.height * scale]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width * scale,
      height: image.height * scale,
    });
    writeFileSync(join(logoDir, 'niskbuild-icon.pdf'), await doc.save());
    console.log('PDF public/logo/niskbuild-icon.pdf (from 2048 master)');
  } catch (err) {
    console.warn('Skip icon PDF:', err.message);
  }
}

execSync('node scripts/generate-favicon.mjs', { stdio: 'inherit', cwd: root });
console.log('Brand logo export complete.');
