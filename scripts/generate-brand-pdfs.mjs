#!/usr/bin/env node
/**
 * Optional: PDF from brand-kit PNG masters.
 * Prefer SVG/PNG downloads from /brand — PDFs are not linked on the brand page.
 * Run: node scripts/generate-brand-pdfs.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PDFDocument } from 'pdf-lib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const brandDir = join(__dirname, '..', 'public', 'brand');
const logoDir = join(__dirname, '..', 'public', 'logo');

async function pngToPdf(pngPath, pdfPath, maxWidth = 612) {
  if (!existsSync(pngPath)) {
    console.warn(`Skip PDF (missing PNG): ${pngPath}`);
    return;
  }
  const pngBytes = readFileSync(pngPath);
  const doc = await PDFDocument.create();
  const image = await doc.embedPng(pngBytes);
  const scale = maxWidth / image.width;
  const w = image.width * scale;
  const h = image.height * scale;
  const page = doc.addPage([w, h]);
  page.drawImage(image, { x: 0, y: 0, width: w, height: h });
  writeFileSync(pdfPath, await doc.save());
  console.log(`PDF: ${pdfPath}`);
}

await pngToPdf(join(brandDir, 'icon-dark-2048.png'), join(logoDir, 'niskbuild-icon.pdf'), 400);
await pngToPdf(
  join(brandDir, 'niskbuild-wordmark-lockup-dark-2048.png'),
  join(brandDir, 'niskbuild-wordmark-lockup-dark.pdf'),
  750
);
