/**
 * Parse / validate Full App (React+Vite) multi-file generation bundles.
 */

import type { ProjectFile } from '@/lib/project-files';
import { providerIndicatesTruncation } from '@/lib/generation-completeness';

export const FULL_APP_FILE_START = '@@@FILE';
export const FULL_APP_FILE_END = '@@@ENDFILE';
export const FULL_APP_DONE = '@@@DONE';

const FILE_BLOCK_RE =
  /@@@FILE\s+([^\n\r]+)\r?\n([\s\S]*?)@@@ENDFILE/g;

export type FullAppParseResult = {
  files: Record<string, string>;
  done: boolean;
  fileCount: number;
};

export function stripFullAppFences(raw: string): string {
  let cleaned = raw.trim();
  // Models sometimes wrap the whole bundle once.
  const fenced = cleaned.match(/^```(?:[\w-]*)?\s*\n?([\s\S]*?)\n?```$/);
  if (fenced) cleaned = fenced[1].trim();
  return cleaned;
}

export function parseFullAppBundle(raw: string): FullAppParseResult {
  const text = stripFullAppFences(raw);
  const files: Record<string, string> = {};
  let match: RegExpExecArray | null;
  const re = new RegExp(FILE_BLOCK_RE.source, 'g');
  while ((match = re.exec(text)) !== null) {
    const path = match[1].trim().replace(/^\.\//, '');
    if (!path || path.includes('..') || path.startsWith('/') || path.includes('\\')) {
      continue;
    }
    files[path] = match[2].replace(/^\n/, '').replace(/\n$/, '');
  }
  const done = /(^|\n)@@@DONE\s*(\n|$)/.test(text);
  return { files, done, fileCount: Object.keys(files).length };
}

export function iconForProjectPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.css')) return '🎨';
  if (lower.endsWith('.json')) return '📦';
  if (lower.endsWith('.html')) return '📄';
  if (lower.endsWith('.tsx') || lower.endsWith('.jsx')) return '⚛️';
  if (lower.endsWith('.ts') || lower.endsWith('.js') || lower.endsWith('.mjs')) return '⚡';
  if (lower.endsWith('.md')) return '📝';
  if (lower.includes('component')) return '🧩';
  return '📄';
}

export function fullAppFilesToProjectFiles(files: Record<string, string>): ProjectFile[] {
  return Object.entries(files)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, content]) => ({
      path,
      name: path.split('/').pop() || path,
      content,
      icon: iconForProjectPath(path),
    }));
}

export function isFullAppProjectFiles(files: ProjectFile[] | null | undefined): boolean {
  if (!files?.length) return false;
  const paths = new Set(files.map((f) => f.path));
  return (
    paths.has('package.json') &&
    (paths.has('src/main.jsx') || paths.has('src/main.tsx')) &&
    (paths.has('src/App.jsx') || paths.has('src/App.tsx'))
  );
}

const REQUIRED_PATH_GROUPS: string[][] = [
  ['package.json'],
  ['vite.config.js', 'vite.config.ts', 'vite.config.mjs'],
  ['index.html'],
  ['src/main.jsx', 'src/main.tsx'],
  ['src/App.jsx', 'src/App.tsx'],
  ['src/styles.css', 'src/index.css', 'src/App.css'],
];

function hasAnyPath(files: Record<string, string>, candidates: string[]): boolean {
  return candidates.some((p) => typeof files[p] === 'string' && files[p].trim().length > 0);
}

function countRoutePages(files: Record<string, string>): number {
  return Object.keys(files).filter(
    (p) =>
      /^src\/pages\/.+\.(jsx|tsx)$/i.test(p) ||
      /^src\/routes\/.+\.(jsx|tsx)$/i.test(p)
  ).length;
}

export type FullAppCompleteness = {
  complete: boolean;
  reason: string | null;
  missing: string[];
};

/**
 * Structural completeness for a Full App bundle (independent of HTML </html>).
 */
export function assessFullAppCompleteness(
  raw: string,
  stopReason?: string | null
): FullAppCompleteness {
  const parsed = parseFullAppBundle(raw);
  const missing: string[] = [];

  for (const group of REQUIRED_PATH_GROUPS) {
    if (!hasAnyPath(parsed.files, group)) {
      missing.push(group[0]);
    }
  }

  const pageCount = countRoutePages(parsed.files);
  if (pageCount < 2) missing.push('src/pages/* (need ≥2 pages)');

  const hasSharedComponent = Object.keys(parsed.files).some((p) =>
    /^src\/components\/.+\.(jsx|tsx)$/i.test(p)
  );
  if (!hasSharedComponent) missing.push('src/components/*');

  if (missing.length > 0) {
    // Still streaming — incomplete until files appear.
    if (parsed.fileCount === 0 && !providerIndicatesTruncation(stopReason)) {
      return { complete: false, reason: 'waiting_for_files', missing };
    }
    return { complete: false, reason: 'missing_required_files', missing };
  }

  if (!parsed.done) {
    if (providerIndicatesTruncation(stopReason)) {
      return { complete: false, reason: 'finish_reason_length', missing: ['@@@DONE'] };
    }
    // Required files present but no DONE — accept if stop was natural (end_turn / stop).
    // If still mid-stream without stop, treat incomplete.
    if (!stopReason) {
      return { complete: false, reason: 'missing_done_marker', missing: ['@@@DONE'] };
    }
  }

  return { complete: true, reason: null, missing: [] };
}

export function fullAppTruncationUserMessage(reason: string | null, missing: string[]): string {
  if (reason === 'finish_reason_length') {
    return 'Full App generation hit the model output limit before finishing. Partial files were kept — click Generate again to retry.';
  }
  if (missing.length) {
    return `Full App output was incomplete (missing: ${missing.slice(0, 4).join(', ')}). Partial files were kept — click Generate again to retry.`;
  }
  return 'Full App generation was cut off before the project finished. Partial files were kept — click Generate again to retry.';
}

/** Interim builder preview — honest until React preview host exists. */
export function fullAppPreviewPlaceholder(opts?: {
  fileCount?: number;
  generating?: boolean;
  error?: string;
}): string {
  const count = opts?.fileCount ?? 0;
  const generating = opts?.generating === true;
  const error = opts?.error?.trim();
  const title = error
    ? 'Generation issue'
    : generating
      ? 'Generating Full App…'
      : 'Full App preview coming soon';
  const detail = error
    ? error
    : generating
      ? count > 0
        ? `${count} file${count === 1 ? '' : 's'} received so far. Live React preview ships in a later milestone — use the file tree to inspect source.`
        : 'Streaming a multi-file React + Vite project. Live preview is not available yet for Full App mode.'
      : count > 0
        ? `${count} project files are ready in the file tree. Open any file to review. Live iframe preview for Full App is coming next.`
        : 'Switch to Full App, describe a multi-page product, and Generate. Files will appear in the tree; live preview follows in a later release.';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Full App</title>
<style>
  html,body{height:100%;margin:0;font-family:ui-sans-serif,system-ui,sans-serif;
    background:linear-gradient(160deg,#12101a 0%,#1a1625 50%,#0f1419 100%);color:#d4cfc6;}
  .wrap{min-height:100%;display:flex;align-items:center;justify-content:center;padding:2rem;text-align:center;}
  .card{max-width:28rem;padding:2rem 1.75rem;border-radius:16px;border:1px solid rgba(212,154,92,0.28);
    background:rgba(26,22,32,0.92);}
  h1{margin:0 0 0.75rem;font-size:1.15rem;font-weight:700;color:#e8dcc8;}
  p{margin:0;font-size:0.875rem;line-height:1.55;color:#9a9084;}
  .badge{display:inline-block;margin-bottom:1rem;font-size:0.65rem;letter-spacing:0.08em;text-transform:uppercase;
    color:#d49a5c;border:1px solid rgba(212,154,92,0.45);padding:0.25rem 0.55rem;border-radius:999px;}
</style></head><body><div class="wrap"><div class="card">
  <div class="badge">Full App · React + Vite</div>
  <h1>${title.replace(/</g, '&lt;')}</h1>
  <p>${detail.replace(/</g, '&lt;')}</p>
</div></div></body></html>`;
}

/** Prefer Vite index.html as the DB generated_code stand-in for Full App projects. */
export function fullAppPrimaryCode(files: Record<string, string>): string {
  if (files['index.html']?.trim()) return files['index.html'];
  const pkg = files['package.json']?.trim();
  if (pkg) {
    return `<!-- NiskBuild Full App — see project files (package.json + src/) -->\n${pkg.slice(0, 500)}`;
  }
  return Object.entries(files)
    .slice(0, 3)
    .map(([p, c]) => `// ${p}\n${c.slice(0, 200)}`)
    .join('\n\n');
}
