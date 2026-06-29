#!/usr/bin/env node
/**
 * Export copper brand assets from SVG (source of truth) + PDF aliases.
 * Run: npm run export:brand-logos
 */
import { copyFileSync, existsSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const logoDir = join(__dirname, '..', 'public', 'logo');
const publicDir = join(__dirname, '..', 'public');

function rasterizeSvg(svgName, outName, size) {
  const svgPath = join(logoDir, svgName);
  const outPath = join(logoDir, outName);
  const thumbPath = join(logoDir, `${basename(svgPath)}.png`);

  if (!existsSync(svgPath)) {
    console.warn(`Skip raster (missing SVG): ${svgPath}`);
    return;
  }

  if (existsSync(thumbPath)) unlinkSync(thumbPath);
  execSync(`qlmanage -t -s ${size} -o "${logoDir}" "${svgPath}"`, { stdio: 'pipe' });

  if (!existsSync(thumbPath)) {
    console.warn(`Skip raster (qlmanage failed): ${svgName}`);
    return;
  }

  copyFileSync(thumbPath, outPath);
  unlinkSync(thumbPath);
  console.log(`Raster ${outName} (${size}px) from ${svgName}`);
}

/** Copper SVG → PNG (correct colors for social + favicon) */
rasterizeSvg('niskbuild-icon-light.svg', 'icon-512.png', 512);
rasterizeSvg('niskbuild-lockup.svg', 'niskbuild-lockup-raster.png', 1500);
rasterizeSvg('niskbuild-lockup-light.svg', 'niskbuild-lockup-light-raster.png', 1500);
rasterizeSvg('niskbuild-wordmark-light.svg', 'niskbuild-wordmark-raster.png', 1200);

for (const size of [32, 180]) {
  const src = join(logoDir, 'icon-512.png');
  const out = join(logoDir, `icon-${size}.png`);
  if (existsSync(src)) {
    execSync(`sips -z ${size} ${size} "${src}" --out "${out}"`, { stdio: 'pipe' });
    console.log(`Icon ${size}px`);
  }
}

if (existsSync(join(logoDir, 'icon-512.png'))) {
  copyFileSync(join(logoDir, 'icon-512.png'), join(publicDir, 'logo.png'));
  copyFileSync(join(logoDir, 'icon-512.png'), join(publicDir, 'logo-icon.png'));
}
const iconLightSvg = join(logoDir, 'niskbuild-icon-light.svg');
if (existsSync(iconLightSvg)) {
  copyFileSync(iconLightSvg, join(publicDir, 'logo.svg'));
  copyFileSync(iconLightSvg, join(publicDir, 'favicon-source.svg'));
  console.log('Synced logo.svg + favicon-source.svg from icon-light');
}
if (existsSync(join(logoDir, 'niskbuild-lockup-raster.png'))) {
  copyFileSync(join(logoDir, 'niskbuild-lockup-raster.png'), join(logoDir, 'niskbuild-lockup.png'));
}

execSync('node scripts/generate-brand-pdfs.mjs', { stdio: 'inherit', cwd: join(__dirname, '..') });
execSync('node scripts/generate-favicon.mjs', { stdio: 'inherit', cwd: join(__dirname, '..') });
console.log('Brand logo export complete (copper SVG raster).');
