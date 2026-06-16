/**
 * Generates public/logo/niskbuild-lockup.pdf from the lockup PNG.
 * Run: node scripts/generate-logo-pdf.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PDFDocument } from 'pdf-lib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const pngPath = join(root, 'public/logo/niskbuild-lockup.png');
const pdfPath = join(root, 'public/logo/niskbuild-lockup.pdf');

const pngBytes = readFileSync(pngPath);
const doc = await PDFDocument.create();
const page = doc.addPage([612, 120]);
const image = await doc.embedPng(pngBytes);
const maxW = 480;
const scale = maxW / image.width;
const w = image.width * scale;
const h = image.height * scale;
page.drawImage(image, {
  x: (612 - w) / 2,
  y: (120 - h) / 2,
  width: w,
  height: h,
});
writeFileSync(pdfPath, await doc.save());
console.log(`Wrote ${pdfPath}`);
