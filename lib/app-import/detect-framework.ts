import fs from 'fs/promises';
import path from 'path';
import type { DetectedFramework } from '@/lib/app-import/types';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);

export async function findAppRoot(extractDir: string): Promise<string | null> {
  const queue = [extractDir];
  while (queue.length > 0) {
    const dir = queue.shift()!;
    const pkgPath = path.join(dir, 'package.json');
    try {
      await fs.access(pkgPath);
      return dir;
    } catch {
      /* continue */
    }

    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue;
      const full = path.join(dir, entry);
      try {
        const stat = await fs.stat(full);
        if (stat.isDirectory()) queue.push(full);
      } catch {
        /* skip */
      }
    }
  }

  const indexHtml = path.join(extractDir, 'index.html');
  try {
    await fs.access(indexHtml);
    return extractDir;
  } catch {
    return null;
  }
}

export function detectFrameworkFromPackage(
  pkg: Record<string, unknown>
): DetectedFramework {
  const deps = {
    ...(typeof pkg.dependencies === 'object' && pkg.dependencies ? pkg.dependencies : {}),
    ...(typeof pkg.devDependencies === 'object' && pkg.devDependencies
      ? pkg.devDependencies
      : {}),
  } as Record<string, string>;

  if (deps.next) return 'next';
  if (deps.vite || deps['@vitejs/plugin-react']) return 'vite';
  if (deps['react-scripts']) return 'cra';
  return 'unknown';
}

export async function detectEntryFiles(appRoot: string, framework: DetectedFramework): Promise<string[]> {
  const candidates = [
    'src/main.jsx',
    'src/main.tsx',
    'src/main.js',
    'src/index.jsx',
    'src/index.tsx',
    'src/App.jsx',
    'src/App.tsx',
    'index.html',
    'app/page.tsx',
    'pages/index.tsx',
  ];

  const found: string[] = [];
  for (const rel of candidates) {
    try {
      await fs.access(path.join(appRoot, rel));
      found.push(rel);
    } catch {
      /* not present */
    }
  }
  if (found.length === 0 && framework === 'static') found.push('index.html');
  return found;
}
