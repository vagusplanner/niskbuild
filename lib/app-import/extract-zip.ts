import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);

export async function extractZipToDirectory(buffer: Buffer, targetDir: string): Promise<void> {
  const zip = await JSZip.loadAsync(buffer);
  await fs.mkdir(targetDir, { recursive: true });

  const entries = Object.values(zip.files);
  for (const entry of entries) {
    if (entry.dir) continue;
    const normalized = entry.name.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized || normalized.includes('..')) continue;

    const parts = normalized.split('/');
    if (parts.some((p) => SKIP_DIRS.has(p))) continue;

    const dest = path.join(targetDir, normalized);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    const content = await entry.async('nodebuffer');
    await fs.writeFile(dest, content);
  }
}

export async function copyAppTree(sourceRoot: string, destRoot: string): Promise<number> {
  let fileCount = 0;

  async function walk(rel: string) {
    const abs = path.join(sourceRoot, rel);
    const entries = await fs.readdir(abs, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const nextRel = rel ? `${rel}/${entry.name}` : entry.name;
      const src = path.join(sourceRoot, nextRel);
      const dst = path.join(destRoot, nextRel);
      if (entry.isDirectory()) {
        await fs.mkdir(dst, { recursive: true });
        await walk(nextRel);
      } else if (entry.isFile()) {
        await fs.mkdir(path.dirname(dst), { recursive: true });
        await fs.copyFile(src, dst);
        fileCount += 1;
      }
    }
  }

  await fs.mkdir(destRoot, { recursive: true });
  await walk('');
  return fileCount;
}
