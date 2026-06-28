import 'server-only';

import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { zipDirectoryToBuffer } from '@/lib/storage/zip-directory';

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next']);

/** Expand a native starter ZIP into a dist/ folder suitable for archiver re-packaging. */
export async function materializeDistFromNativeZip(
  zipBuffer: Buffer,
  distDir: string
): Promise<void> {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });

  const zip = await JSZip.loadAsync(zipBuffer);
  const entries = Object.keys(zip.files);

  for (const entryPath of entries) {
    const entry = zip.files[entryPath];
    if (!entry || entry.dir) continue;

    const parts = entryPath.split('/').filter(Boolean);
    if (parts.some((p) => SKIP.has(p))) continue;

    const dest = path.join(distDir, entryPath);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    const content = await entry.async('nodebuffer');
    await fs.writeFile(dest, content);
  }
}

export async function createDistArchiveBuffer(distDir: string): Promise<Buffer> {
  return zipDirectoryToBuffer(distDir);
}
