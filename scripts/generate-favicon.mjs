#!/usr/bin/env node
/**
 * Regenerate public/favicon.ico from official brand PNG (copper forge icon).
 * Run: npm run generate:favicon
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sizes = [16, 32, 48];
const logoDir = join(root, 'public', 'logo');
const outPath = join(root, 'public', 'favicon.ico');
const tmpDir = join(root, '.tmp-favicon');

function pngToIcoEntry(width, height, pngBuffer, offset) {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(width >= 256 ? 0 : width, 0);
  entry.writeUInt8(height >= 256 ? 0 : height, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(offset, 12);
  return entry;
}

function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const headerSize = 6 + 16 * images.length;
  let offset = headerSize;
  const entries = [];
  const payloads = [];

  for (const { width, height, png } of images) {
    entries.push(pngToIcoEntry(width, height, png, offset));
    payloads.push(png);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries, ...payloads]);
}

const source512 = join(logoDir, 'icon-512.png');
const source32 = join(logoDir, 'icon-32.png');
const master = existsSync(source512) ? source512 : source32;

if (!master) {
  console.error('Missing brand icon PNG. Run: npm run export:brand-logos');
  process.exit(1);
}

mkdirSync(tmpDir, { recursive: true });
const images = [];

try {
  for (const size of sizes) {
    const out = join(tmpDir, `favicon-${size}.png`);
    if (size === 32 && existsSync(source32)) {
      execSync(`cp "${source32}" "${out}"`);
    } else {
      execSync(`sips -z ${size} ${size} "${master}" --out "${out}"`, { stdio: 'pipe' });
    }
    images.push({ width: size, height: size, png: readFileSync(out) });
  }

  writeFileSync(outPath, buildIco(images));
  console.log(`Wrote ${outPath} (${sizes.join(', ')}px)`);
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
