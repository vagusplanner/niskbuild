#!/usr/bin/env node
/**
 * Generate high-res brand kit downloads into public/brand/.
 * Source: public/logo/niskbuild-icon.svg (final forge mark).
 * Wordmark text: Geist Bold outlined via opentype.js.
 *
 * Run: npm run generate:brand-kit
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Resvg } from '@resvg/resvg-js';
import opentype from 'opentype.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const logoDir = join(root, 'public', 'logo');
const brandDir = join(root, 'public', 'brand');
const fontPath = join(__dirname, 'fonts', 'Geist-Bold.ttf');

const PLATE = '#1a1612';
const WORDMARK_FILL = '#e8dcc8'; // --nisk-color / parchment
const ICON_SIZES = [512, 1024, 2048];

const ICON_MARK = `  <!-- Left paren -->
  <path d="M200,80 Q100,250 200,420 Q160,250 200,80 Z" fill="url(#fused-body)"/>
  <!-- Right paren -->
  <path d="M312,80 Q412,250 312,420 Q352,250 312,80 Z" fill="url(#fused-body)"/>
  <!-- Faceted ember -->
  <polygon points="256,222 288,254 256,286 224,254" fill="url(#fused-dot)"/>`;

const ICON_DEFS = `  <defs>
    <linearGradient id="fused-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#b87333"/>
      <stop offset="55%" stop-color="#d49a5c"/>
      <stop offset="100%" stop-color="#e8dcc8"/>
    </linearGradient>
    <linearGradient id="fused-dot" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e8dcc8"/>
      <stop offset="100%" stop-color="#d49a5c"/>
    </linearGradient>
  </defs>`;

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function writeIconSvgs() {
  const transparent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="NiskBuild icon">
${ICON_DEFS}
${ICON_MARK}
</svg>
`;

  const dark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="NiskBuild icon on dark plate">
${ICON_DEFS}
  <rect width="512" height="512" fill="${PLATE}"/>
${ICON_MARK}
</svg>
`;

  writeFileSync(join(brandDir, 'niskbuild-icon-transparent.svg'), transparent);
  writeFileSync(join(brandDir, 'niskbuild-icon-dark.svg'), dark);
  // Keep canonical app icon in sync (dark plate)
  writeFileSync(join(logoDir, 'niskbuild-icon.svg'), dark);
  console.log('Wrote icon SVGs (transparent + dark plate)');
  return { transparent, dark };
}

function rasterize(svgString, outPath, width) {
  const resvg = new Resvg(svgString, {
    fitTo: { mode: 'width', value: width },
    background: 'rgba(0,0,0,0)',
  });
  writeFileSync(outPath, resvg.render().asPng());
  console.log(`PNG ${outPath.replace(root + '/', '')} (${width}px wide)`);
}

function writeIconPngs(transparentSvg, darkSvg) {
  for (const size of ICON_SIZES) {
    rasterize(darkSvg, join(brandDir, `icon-dark-${size}.png`), size);
    rasterize(transparentSvg, join(brandDir, `icon-transparent-${size}.png`), size);
  }
  // User-requested aliases for the 2048 masters
  copyFileSync(join(brandDir, 'icon-dark-2048.png'), join(brandDir, 'brandkit_icon_2048.png'));
  copyFileSync(
    join(brandDir, 'icon-transparent-2048.png'),
    join(brandDir, 'brandkit_icon_transparent_2048.png')
  );
  console.log('Wrote brandkit_icon_*_2048.png aliases');
}

function textToPathData(font, text, fontSize) {
  const path = font.getPath(text, 0, 0, fontSize);
  return path.toPathData(3);
}

function measureText(font, text, fontSize) {
  const advance = font.getAdvanceWidth(text, fontSize);
  const path = font.getPath(text, 0, 0, fontSize);
  const box = path.getBoundingBox();
  return { advance, box };
}

function loadFont() {
  if (!existsSync(fontPath)) {
    throw new Error(`Missing Geist Bold at ${fontPath}`);
  }
  const parse = opentype.parse ?? opentype.default?.parse;
  if (typeof parse !== 'function') {
    throw new Error('opentype.js parse() unavailable');
  }
  return parse(new Uint8Array(readFileSync(fontPath)).buffer);
}

function buildLockupSvg({ withPlate }) {
  const font = loadFont();

  // Layout in design units (icon 512 square, text beside it)
  const iconSize = 512;
  const gap = 72;
  const fontSize = 220;
  const padX = 64;
  const padY = 96;

  const { advance, box } = measureText(font, 'NiskBuild', fontSize);
  const textWidth = Math.max(advance, box.x2 - box.x1);
  const textHeight = box.y2 - box.y1;

  const contentW = iconSize + gap + textWidth;
  const contentH = Math.max(iconSize, textHeight);
  const width = Math.ceil(contentW + padX * 2);
  const height = Math.ceil(contentH + padY * 2);

  const iconX = padX;
  const iconY = (height - iconSize) / 2;
  // Baseline: vertically center glyph bbox with icon
  const textX = iconX + iconSize + gap - box.x1;
  const textY = height / 2 - (box.y1 + box.y2) / 2;

  const pathData = textToPathData(font, 'NiskBuild', fontSize);

  const plate = withPlate
    ? `  <rect width="${width}" height="${height}" fill="${PLATE}"/>\n`
    : '';

  // Unique gradient ids per file to avoid collisions when inlined
  const gid = withPlate ? 'lockup-dark' : 'lockup-clear';

  return {
    width,
    height,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="NiskBuild wordmark lockup">
  <defs>
    <linearGradient id="${gid}-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#b87333"/>
      <stop offset="55%" stop-color="#d49a5c"/>
      <stop offset="100%" stop-color="#e8dcc8"/>
    </linearGradient>
    <linearGradient id="${gid}-dot" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e8dcc8"/>
      <stop offset="100%" stop-color="#d49a5c"/>
    </linearGradient>
  </defs>
${plate}  <g transform="translate(${iconX}, ${iconY}) scale(${iconSize / 512})">
    <path d="M200,80 Q100,250 200,420 Q160,250 200,80 Z" fill="url(#${gid}-body)"/>
    <path d="M312,80 Q412,250 312,420 Q352,250 312,80 Z" fill="url(#${gid}-body)"/>
    <polygon points="256,222 288,254 256,286 224,254" fill="url(#${gid}-dot)"/>
  </g>
  <g transform="translate(${textX}, ${textY})">
    <path d="${pathData}" fill="${WORDMARK_FILL}"/>
  </g>
</svg>
`,
  };
}

function writeLockups() {
  const dark = buildLockupSvg({ withPlate: true });
  const clear = buildLockupSvg({ withPlate: false });

  writeFileSync(join(brandDir, 'niskbuild-wordmark-lockup-dark.svg'), dark.svg);
  writeFileSync(join(brandDir, 'niskbuild-wordmark-lockup-transparent.svg'), clear.svg);
  console.log(`Lockup SVG viewBox ${dark.width}×${dark.height}`);

  rasterize(dark.svg, join(brandDir, 'niskbuild-wordmark-lockup-dark-2048.png'), 2048);
  rasterize(clear.svg, join(brandDir, 'niskbuild-wordmark-lockup-transparent-2048.png'), 2048);
}

ensureDir(brandDir);
const { transparent, dark } = writeIconSvgs();
writeIconPngs(transparent, dark);
writeLockups();
console.log('Brand kit generation complete → public/brand/');
