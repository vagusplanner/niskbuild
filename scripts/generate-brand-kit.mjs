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
/** On dark plate — parchment / --nisk-color */
const WORDMARK_ON_DARK = '#e8dcc8';
/**
 * On transparent / light surfaces — forge iron for contrast.
 * (Parchment on cream preview was nearly invisible.)
 */
const WORDMARK_ON_LIGHT = '#1a1612';
/** Subtle outline so transparent wordmark stays legible on mid-tone grounds */
const WORDMARK_STROKE_ON_LIGHT = '#b87333';
const WORDMARK_STROKE_WIDTH = 3;
const ICON_SIZES = [512, 1024, 2048];
const PAD = 96; // padding around full content bbox for plate / canvas

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
  copyFileSync(join(brandDir, 'icon-dark-2048.png'), join(brandDir, 'brandkit_icon_2048.png'));
  copyFileSync(
    join(brandDir, 'icon-transparent-2048.png'),
    join(brandDir, 'brandkit_icon_transparent_2048.png')
  );
  console.log('Wrote brandkit_icon_*_2048.png aliases');
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

function textPathAndBox(font, text, fontSize) {
  const path = font.getPath(text, 0, 0, fontSize);
  return { pathData: path.toPathData(3), box: path.getBoundingBox() };
}

function gradientDefs(gid) {
  return `  <defs>
    <linearGradient id="${gid}-body" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#b87333"/>
      <stop offset="55%" stop-color="#d49a5c"/>
      <stop offset="100%" stop-color="#e8dcc8"/>
    </linearGradient>
    <linearGradient id="${gid}-dot" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e8dcc8"/>
      <stop offset="100%" stop-color="#d49a5c"/>
    </linearGradient>
  </defs>`;
}

function wordmarkPathAttrs(withPlate) {
  if (withPlate) {
    return `fill="${WORDMARK_ON_DARK}"`;
  }
  // Transparent: iron fill + copper outline for contrast on light/neutral grounds
  return `fill="${WORDMARK_ON_LIGHT}" stroke="${WORDMARK_STROKE_ON_LIGHT}" stroke-width="${WORDMARK_STROKE_WIDTH}" stroke-linejoin="round" paint-order="stroke fill"`;
}

/**
 * Build icon + wordmark lockup.
 * Canvas and dark plate are sized from the union bbox of icon + text + PAD,
 * so the plate always fully contains the mark contour.
 */
function buildLockupSvg({ withPlate }) {
  const font = loadFont();
  const iconSize = 512;
  const gap = 72;
  const fontSize = 220;
  const { pathData, box } = textPathAndBox(font, 'NiskBuild', fontSize);

  // Place icon at origin of content space; text to the right, vertically centered on icon
  const iconX = 0;
  const iconY = 0;
  const textX = iconSize + gap - box.x1;
  const textY = iconSize / 2 - (box.y1 + box.y2) / 2;

  const contentMinX = Math.min(iconX, textX + box.x1);
  const contentMinY = Math.min(iconY, textY + box.y1);
  const contentMaxX = Math.max(iconX + iconSize, textX + box.x2);
  const contentMaxY = Math.max(iconY + iconSize, textY + box.y2);

  // Extra inset for transparent stroke so outline isn't clipped
  const strokePad = withPlate ? 0 : WORDMARK_STROKE_WIDTH;
  const width = Math.ceil(contentMaxX - contentMinX + PAD * 2 + strokePad * 2);
  const height = Math.ceil(contentMaxY - contentMinY + PAD * 2 + strokePad * 2);
  const ox = PAD + strokePad - contentMinX;
  const oy = PAD + strokePad - contentMinY;

  const gid = withPlate ? 'lockup-dark' : 'lockup-clear';
  const plate = withPlate
    ? `  <rect width="${width}" height="${height}" fill="${PLATE}"/>\n`
    : '';

  return {
    width,
    height,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="NiskBuild wordmark lockup">
${gradientDefs(gid)}
${plate}  <g transform="translate(${ox + iconX}, ${oy + iconY}) scale(${iconSize / 512})">
    <path d="M200,80 Q100,250 200,420 Q160,250 200,80 Z" fill="url(#${gid}-body)"/>
    <path d="M312,80 Q412,250 312,420 Q352,250 312,80 Z" fill="url(#${gid}-body)"/>
    <polygon points="256,222 288,254 256,286 224,254" fill="url(#${gid}-dot)"/>
  </g>
  <g transform="translate(${ox + textX}, ${oy + textY})">
    <path d="${pathData}" ${wordmarkPathAttrs(withPlate)}/>
  </g>
</svg>
`,
  };
}

/** Typography-only “NiskBuild” — no icon. */
function buildWordmarkOnlySvg({ withPlate }) {
  const font = loadFont();
  const fontSize = 220;
  const { pathData, box } = textPathAndBox(font, 'NiskBuild', fontSize);

  const strokePad = withPlate ? 0 : WORDMARK_STROKE_WIDTH;
  const width = Math.ceil(box.x2 - box.x1 + PAD * 2 + strokePad * 2);
  const height = Math.ceil(box.y2 - box.y1 + PAD * 2 + strokePad * 2);
  const textX = PAD + strokePad - box.x1;
  const textY = PAD + strokePad - box.y1;

  const plate = withPlate
    ? `  <rect width="${width}" height="${height}" fill="${PLATE}"/>\n`
    : '';

  const label = withPlate
    ? 'NiskBuild wordmark on dark plate'
    : 'NiskBuild wordmark (transparent)';

  return {
    width,
    height,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${label}">
${plate}  <g transform="translate(${textX}, ${textY})">
    <path d="${pathData}" ${wordmarkPathAttrs(withPlate)}/>
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
  console.log(`Lockup SVG viewBox dark ${dark.width}×${dark.height}, clear ${clear.width}×${clear.height}`);

  rasterize(dark.svg, join(brandDir, 'niskbuild-wordmark-lockup-dark-2048.png'), 2048);
  rasterize(clear.svg, join(brandDir, 'niskbuild-wordmark-lockup-transparent-2048.png'), 2048);

  return { dark, clear };
}

function writeWordmarksOnly() {
  const dark = buildWordmarkOnlySvg({ withPlate: true });
  const clear = buildWordmarkOnlySvg({ withPlate: false });

  writeFileSync(join(brandDir, 'niskbuild-wordmark-dark.svg'), dark.svg);
  writeFileSync(join(brandDir, 'niskbuild-wordmark-transparent.svg'), clear.svg);
  console.log(`Wordmark-only SVG viewBox dark ${dark.width}×${dark.height}, clear ${clear.width}×${clear.height}`);

  rasterize(dark.svg, join(brandDir, 'niskbuild-wordmark-dark-2048.png'), 2048);
  rasterize(clear.svg, join(brandDir, 'niskbuild-wordmark-transparent-2048.png'), 2048);

  return { dark, clear };
}

ensureDir(brandDir);
const { transparent, dark } = writeIconSvgs();
writeIconPngs(transparent, dark);
const lockups = writeLockups();
const wordmarks = writeWordmarksOnly();
console.log('Brand kit generation complete → public/brand/');
console.log(
  JSON.stringify({
    lockupDark: { w: lockups.dark.width, h: lockups.dark.height },
    lockupClear: { w: lockups.clear.width, h: lockups.clear.height },
    wordmarkDark: { w: wordmarks.dark.width, h: wordmarks.dark.height },
    wordmarkClear: { w: wordmarks.clear.width, h: wordmarks.clear.height },
  })
);
