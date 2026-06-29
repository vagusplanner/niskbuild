#!/usr/bin/env node
/**
 * Build official PDFs from copper PNG rasters (not legacy PDF sources).
 * Run: node scripts/generate-brand-pdfs.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PDFDocument } from 'pdf-lib';

const __dirname = dirname(fileURLToPath(import.meta.url));
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

await pngToPdf(join(logoDir, 'icon-512.png'), join(logoDir, 'niskbuild-icon.pdf'), 400);
await pngToPdf(join(logoDir, 'icon-matte-512.png'), join(logoDir, 'niskbuild-icon-matte.pdf'), 400);
await pngToPdf(
  join(logoDir, 'niskbuild-wordmark-matte-raster.png'),
  join(logoDir, 'niskbuild-wordmark-matte.pdf'),
  600
);
await pngToPdf(
  join(logoDir, 'niskbuild-wordmark-matte-wide-raster.png'),
  join(logoDir, 'niskbuild-wordmark-matte-wide.pdf'),
  750
);
await pngToPdf(
  join(logoDir, 'niskbuild-lockup-matte-wide-raster.png'),
  join(logoDir, 'niskbuild-lockup-matte-wide.pdf'),
  750
);
await pngToPdf(
  join(logoDir, 'niskbuild-lockup-light-raster.png'),
  join(logoDir, 'niskbuild-lockup-light.pdf'),
  750
);
await pngToPdf(
  join(logoDir, 'niskbuild-wordmark-raster.png'),
  join(logoDir, 'niskbuild-wordmark.pdf'),
  600
);
