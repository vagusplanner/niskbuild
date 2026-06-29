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
    console.warn(`Skip raster (missing SVG): ${svgName}`);
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

function downscaleIcon(masterName, outName, size) {
  const src = join(logoDir, masterName);
  const out = join(logoDir, outName);
  if (!existsSync(src)) return;
  execSync(`sips -z ${size} ${size} "${src}" --out "${out}"`, { stdio: 'pipe' });
  console.log(`Downscale ${outName} (${size}px) from ${masterName}`);
}

/** Master rasters at 512 — small sizes derived for full bleed (qlmanage pads at 32px) */
rasterizeSvg('niskbuild-icon-light.svg', 'icon-512.png', 512);
rasterizeSvg('niskbuild-icon.svg', 'icon-matte-512.png', 512);
downscaleIcon('icon-512.png', 'icon-180.png', 180);
downscaleIcon('icon-512.png', 'icon-32.png', 32);
downscaleIcon('icon-matte-512.png', 'icon-matte-180.png', 180);
downscaleIcon('icon-matte-512.png', 'icon-matte-32.png', 32);

rasterizeSvg('niskbuild-wordmark-matte.svg', 'niskbuild-wordmark-matte-raster.png', 1200);
rasterizeSvg('niskbuild-wordmark-matte-wide.svg', 'niskbuild-wordmark-matte-wide-raster.png', 1500);
rasterizeSvg('niskbuild-lockup-matte-wide.svg', 'niskbuild-lockup-matte-wide-raster.png', 1500);
rasterizeSvg('niskbuild-lockup-light.svg', 'niskbuild-lockup-light-raster.png', 1500);
rasterizeSvg('niskbuild-wordmark-light.svg', 'niskbuild-wordmark-raster.png', 1200);

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

execSync('node scripts/generate-brand-pdfs.mjs', { stdio: 'inherit', cwd: join(__dirname, '..') });
execSync('node scripts/generate-favicon.mjs', { stdio: 'inherit', cwd: join(__dirname, '..') });
console.log('Brand logo export complete (copper SVG raster).');
