import 'server-only';

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  previewPublicUrl,
  upsertPreview,
} from '@/lib/preview-links';
import { applyVpSourcesToDirectory } from '@/lib/vp-builder-source-store';
import { buildVpCapacitorBuildEnv } from '@/lib/vp-capacitor-build-env.js';
import {
  downloadAndExtractVpDeployArtifact,
  getVpDeployArtifactByHash,
  hashLockfile,
} from '@/lib/vp-deploy-artifact.js';

const ROOT = process.cwd();
const VP_APP = path.join(ROOT, 'apps/vagus-planner');
const VP_DIST = path.join(VP_APP, 'dist');
const VP_DEPLOY_BUCKET = 'vp-deployments';

/** Only files/dirs required for `vite build` — keep /tmp footprint minimal. */
const VP_BUILD_ROOT_FILES = [
  'package.json',
  'package-lock.json',
  'vite.config.js',
  'index.html',
  'postcss.config.js',
  'tailwind.config.js',
  'jsconfig.json',
  'components.json',
] as const;

const VP_BUILD_DIRS = ['src', 'public'] as const;

type DeployFile = {
  relativePath: string;
  absolutePath: string;
};

function contentTypeFor(relativePath: string): string {
  const ext = path.extname(relativePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
    case '.mjs':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'application/octet-stream';
  }
}

function elapsedMs(startedAt: number): number {
  return Date.now() - startedAt;
}

function logStage(stage: string, startedAt: number, extra = ''): void {
  const suffix = extra ? ` ${extra}` : '';
  console.log(`[vp-deploy] ${stage}: ${elapsedMs(startedAt)}ms${suffix}`);
}

async function collectFiles(
  dir: string,
  prefix = '',
  skipDirNames?: ReadonlySet<string>
): Promise<DeployFile[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: DeployFile[] = [];

  for (const entry of entries) {
    if (skipDirNames?.has(entry.name)) continue;

    const absolutePath = path.join(dir, entry.name);
    const relativePath = prefix ? path.posix.join(prefix, entry.name) : entry.name;

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath, relativePath, skipDirNames)));
    } else {
      files.push({ relativePath, absolutePath });
    }
  }

  return files;
}

async function copyDir(
  src: string,
  dest: string,
  skipDirNames?: ReadonlySet<string>
): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const files = await collectFiles(src, '', skipDirNames);

  for (const file of files) {
    const target = path.join(dest, file.relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(file.absolutePath, target);
  }
}

async function logViteBinaryPreflight(appDir: string): Promise<void> {
  const candidates = [
    path.join(appDir, 'node_modules', '.bin', 'vite'),
    path.join(appDir, 'node_modules', 'vite', 'bin', 'vite.js'),
    path.join(appDir, 'node_modules', 'vite', 'package.json'),
  ];

  for (const candidate of candidates) {
    try {
      const st = await fs.lstat(candidate);
      const mode = (st.mode & 0o777).toString(8);
      const executable = (st.mode & 0o111) !== 0;
      let linkTarget = '';
      if (st.isSymbolicLink()) {
        try {
          linkTarget = ` -> ${await fs.readlink(candidate)}`;
        } catch {
          linkTarget = ' -> (unreadable link)';
        }
      }
      console.log(
        `[vp-deploy] vite preflight: ${candidate} exists size=${st.size} mode=0o${mode} ` +
          `executable=${executable} symlink=${st.isSymbolicLink()}${linkTarget}`
      );
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as NodeJS.ErrnoException).code)
          : 'unknown';
      console.error(
        `[vp-deploy] vite preflight: ${candidate} MISSING (${code})`
      );
    }
  }

  try {
    const binDir = await fs.readdir(path.join(appDir, 'node_modules', '.bin'));
    console.log(
      `[vp-deploy] vite preflight: node_modules/.bin entries (first 30): ${binDir.slice(0, 30).join(', ')}`
    );
  } catch (err) {
    console.error('[vp-deploy] vite preflight: cannot read node_modules/.bin:', err);
  }
}

/**
 * Run Vite production build with full stdout/stderr capture on failure.
 * A sub-second exit usually means command-not-found / permission errors, not compile.
 */
export async function buildVagusPlannerDist(appDir = VP_APP): Promise<void> {
  const cmd = 'npm run build';
  const env = {
    ...process.env,
    ...buildVpCapacitorBuildEnv(true),
  };

  console.log('[vp-deploy] vite build STARTING');
  console.log(`[vp-deploy] vite build command: ${cmd}`);
  console.log(`[vp-deploy] vite build cwd: ${appDir}`);
  await logViteBinaryPreflight(appDir);

  const started = Date.now();
  let stdout = '';
  let stderr = '';
  let exitCode: number | string = 0;

  try {
    stdout = execSync(cmd, {
      cwd: appDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 20 * 1024 * 1024,
      env,
    });
  } catch (error: unknown) {
    const duration = Date.now() - started;
    const err = error as {
      status?: number | null;
      signal?: NodeJS.Signals | null;
      stdout?: string | Buffer;
      stderr?: string | Buffer;
      message?: string;
    };
    exitCode = err.status ?? 'unknown';
    stdout = execOutputToString(err.stdout);
    stderr = execOutputToString(err.stderr);

    console.error(`[vp-deploy] vite build FAILED — exit code: ${exitCode}`);
    console.error(`[vp-deploy] vite build failed after ${duration}ms`);
    console.error(`[vp-deploy] vite build command: ${cmd}`);
    console.error(`[vp-deploy] vite build cwd: ${appDir}`);
    if (err.signal) {
      console.error(`[vp-deploy] vite build signal: ${err.signal}`);
    }
    console.error(`[vp-deploy] vite build stderr (full):\n${stderr || '(empty)'}`);
    console.error(`[vp-deploy] vite build stdout (full):\n${stdout || '(empty)'}`);
    console.error(
      `[vp-deploy] vite build error message: ${err.message ?? String(error)}`
    );
    await logViteBinaryPreflight(appDir);

    throw new Error(
      formatViteBuildClientError({
        summary: 'vite build FAILED',
        exitCode,
        durationMs: duration,
        stdout,
        stderr,
        signal: err.signal,
      })
    );
  }

  const duration = Date.now() - started;
  console.log(`[vp-deploy] vite build process exited 0 in ${duration}ms`);
  if (stdout.trim()) {
    console.log(`[vp-deploy] vite build stdout:\n${stdout}`);
  }
  if (stderr.trim()) {
    console.log(`[vp-deploy] vite build stderr:\n${stderr}`);
  }

  const indexPath = path.join(appDir, 'dist', 'index.html');
  try {
    await fs.access(indexPath);
  } catch {
    console.error(
      `[vp-deploy] vite build produced no dist/index.html after ${duration}ms` +
        (duration < 2000 ? ' (suspiciously fast — likely command/permission failure)' : '')
    );
    console.error(`[vp-deploy] vite build command: ${cmd}`);
    console.error(`[vp-deploy] vite build cwd: ${appDir}`);
    console.error(`[vp-deploy] vite build exit code: ${exitCode}`);
    console.error(`[vp-deploy] vite build stderr (full):\n${stderr || '(empty)'}`);
    console.error(`[vp-deploy] vite build stdout (full):\n${stdout || '(empty)'}`);
    await logViteBinaryPreflight(appDir);
    throw new Error(
      formatViteBuildClientError({
        summary:
          `Vagus Planner build did not produce dist/index.html` +
          (duration < 2000
            ? ' (suspiciously fast — likely command/permission failure)'
            : ''),
        exitCode,
        durationMs: duration,
        stdout,
        stderr,
      })
    );
  }

  if (duration < 2000) {
    console.warn(
      `[vp-deploy] vite build completed unusually fast (${duration}ms) but dist/index.html exists`
    );
  }
}

export function buildDeployPreviewShell(bundleUrl: string): string {
  const safeUrl = bundleUrl.replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Vagus Planner</title>
<style>html,body{margin:0;height:100%;overflow:hidden;background:#060f1e}</style>
</head>
<body>
<iframe src="${safeUrl}" title="Vagus Planner" style="width:100%;height:100%;border:0" allow="clipboard-read; clipboard-write; fullscreen"></iframe>
</body>
</html>`;
}

async function updatePreviewHtml(
  userId: string,
  html: string,
  title: string
): Promise<boolean> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from('previews')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!existing?.id) return false;

  const { error } = await supabase
    .from('previews')
    .update({
      html_content: html,
      title,
      updated_at: now,
    })
    .eq('id', existing.id);

  return !error;
}

async function publishDistToPublicFromDir(
  token: string,
  requestOrigin: string,
  distDir: string
): Promise<string> {
  const targetDir = path.join(ROOT, 'public', 'vp-live', token);
  await fs.rm(targetDir, { recursive: true, force: true });
  await copyDir(distDir, targetDir);

  const origin = requestOrigin.replace(/\/$/, '');
  return `${origin}/vp-live/${token}/index.html`;
}

async function publishDistToStorageFromDir(
  userId: string,
  token: string,
  distDir: string
): Promise<string> {
  const supabase = createAdminClient();
  const prefix = `${userId}/${token}`;
  const files = await collectFiles(distDir);

  for (const file of files) {
    const storagePath = `${prefix}/${file.relativePath}`.replace(/\\/g, '/');
    const body = await fs.readFile(file.absolutePath);

    const { error } = await supabase.storage.from(VP_DEPLOY_BUCKET).upload(storagePath, body, {
      upsert: true,
      contentType: contentTypeFor(file.relativePath),
      cacheControl: '3600',
    });

    if (error) {
      throw new Error(`Storage upload failed for ${storagePath}: ${error.message}`);
    }
  }

  const { data } = supabase.storage.from(VP_DEPLOY_BUCKET).getPublicUrl(`${prefix}/index.html`);
  return data.publicUrl;
}

async function publishDistFromDir(
  userId: string,
  token: string,
  requestOrigin: string,
  distDir: string
): Promise<string> {
  if (process.env.NODE_ENV === 'development') {
    return publishDistToPublicFromDir(token, requestOrigin, distDir);
  }

  try {
    return await publishDistToStorageFromDir(userId, token, distDir);
  } catch (storageError) {
    console.warn('Supabase storage deploy failed, falling back to local public path:', storageError);
    return publishDistToPublicFromDir(token, requestOrigin, distDir);
  }
}

function execOutputToString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  return String(value);
}

const DIAGNOSTIC_TAIL_CHARS = 2000;

/**
 * Coerce unknown build output to a plain string. Never throws.
 * (execSync can theoretically yield Buffer/undefined depending on options.)
 */
function asDiagnosticText(value: unknown): string {
  try {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (Buffer.isBuffer(value)) return value.toString('utf8');
    return String(value);
  } catch {
    return '';
  }
}

/**
 * Redact tokens/keys that might appear in build output before returning to the client.
 * Uses simple, non-backtracking patterns and never throws.
 */
export function sanitizeDeployDiagnostic(text: unknown): string {
  try {
    let out = asDiagnosticText(text);
    // Apply each rule independently so one bad pattern cannot abort the rest.
    const rules: Array<[RegExp, string]> = [
      [/\bBearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]'],
      [/\bsk-[A-Za-z0-9_-]{8,}/g, 'sk-[REDACTED]'],
      [/\bsk_(?:live|test)_[A-Za-z0-9]+/g, 'sk_[REDACTED]'],
      [/\bsbp_[A-Za-z0-9]+/g, 'sbp_[REDACTED]'],
      // JWT: three base64url segments (fixed structure, no nested quantifiers)
      [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[REDACTED_JWT]'],
      // KEY=value / KEY: value — require a clear key token, avoid bare "TOKEN" alone
      [
        /\b(?:API[_-]?KEY|SECRET|PASSWORD|PRIVATE[_-]?KEY|SERVICE[_-]?ROLE|ACCESS[_-]?TOKEN|AUTH[_-]?TOKEN)\s*[=:]\s*\S+/gi,
        '[REDACTED_SECRET]',
      ],
    ];
    for (const [pattern, replacement] of rules) {
      try {
        out = out.replace(pattern, replacement);
      } catch (ruleError) {
        console.error('[vp-deploy] sanitize rule failed:', pattern, ruleError);
      }
    }
    return out;
  } catch (sanitizeError) {
    console.error('[vp-deploy] sanitizeDeployDiagnostic failed:', sanitizeError);
    return '(diagnostic unavailable)';
  }
}

function diagnosticTail(text: unknown, maxChars = DIAGNOSTIC_TAIL_CHARS): string {
  try {
    const trimmed = asDiagnosticText(text).trim();
    if (!trimmed) return '(empty)';
    const sanitized = sanitizeDeployDiagnostic(trimmed);
    if (sanitized.length <= maxChars) return sanitized;
    return `…(truncated)…\n${sanitized.slice(-maxChars)}`;
  } catch (tailError) {
    console.error('[vp-deploy] diagnosticTail failed:', tailError);
    return '(diagnostic unavailable)';
  }
}

/** Client-safe multi-line diagnostic for deploy API responses / network tab. Never throws. */
export function formatViteBuildClientError(params: {
  summary: string;
  exitCode: number | string;
  durationMs: number;
  stdout: unknown;
  stderr: unknown;
  signal?: NodeJS.Signals | null;
}): string {
  try {
    const lines = [
      asDiagnosticText(params.summary) || 'vite build failed',
      `exit code: ${asDiagnosticText(params.exitCode) || 'unknown'}`,
      `duration: ${Number(params.durationMs) || 0}ms`,
    ];
    if (params.signal) {
      lines.push(`signal: ${asDiagnosticText(params.signal)}`);
    }
    lines.push(
      '',
      `stderr (last ${DIAGNOSTIC_TAIL_CHARS} chars):`,
      diagnosticTail(params.stderr)
    );
    lines.push(
      '',
      `stdout (last ${DIAGNOSTIC_TAIL_CHARS} chars):`,
      diagnosticTail(params.stdout)
    );
    return lines.join('\n');
  } catch (formatError) {
    console.error('[vp-deploy] formatViteBuildClientError failed:', formatError);
    return asDiagnosticText(params?.summary) || 'vite build failed';
  }
}

/**
 * Prefer prebuilt node_modules artifact (no network install). Fall back to live
 * npm ci when no matching lockfile hash exists or extract fails.
 */
async function ensureVpWorkspaceNodeModules(
  appDir: string
): Promise<'artifact' | 'npm-ci'> {
  const lockfileHash = hashLockfile(ROOT) as string;

  const lookupStarted = Date.now();
  let artifact: {
    lockfile_hash: string;
    storage_path: string;
    size_bytes: number;
    created_at: string;
  } | null = null;

  try {
    artifact = await getVpDeployArtifactByHash(lockfileHash);
  } catch (lookupError) {
    console.warn('[vp-deploy] artifact lookup error:', lookupError);
  }
  logStage(
    'artifact lookup',
    lookupStarted,
    artifact ? `hit ${artifact.storage_path}` : `miss (hash=${lockfileHash})`
  );

  if (!artifact) {
    console.warn(
      `No matching deploy artifact found for lockfile hash ${lockfileHash} — falling back to live npm ci. Consider running npm run build:vp-deploy-artifact to speed up future deploys.`
    );
    await installVpWorkspaceNodeModulesViaNpmCi(appDir);
    return 'npm-ci';
  }

  try {
    const installStarted = Date.now();
    const { downloadMs, extractMs, bytes } = await downloadAndExtractVpDeployArtifact(
      artifact.storage_path,
      appDir,
      { log: console.log }
    );
    await fs.access(path.join(appDir, 'node_modules', '.bin', 'vite'));
    logStage(
      'artifact install (total)',
      installStarted,
      `(download=${downloadMs}ms extract=${extractMs}ms bytes=${bytes})`
    );
    console.log(
      `[vp-deploy] using prebuilt artifact ${artifact.storage_path} for lockfile hash ${lockfileHash}`
    );
    return 'artifact';
  } catch (artifactError) {
    console.warn(
      `[vp-deploy] artifact install failed for hash ${lockfileHash} — falling back to live npm ci:`,
      artifactError
    );
    await installVpWorkspaceNodeModulesViaNpmCi(appDir);
    return 'npm-ci';
  }
}

/** Writable HOME/cache for Vercel — default $HOME (/home/sbx_user*) is not writable. */
function npmCiEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: 'production',
    HOME: '/tmp',
    npm_config_cache: '/tmp/.npm-cache',
    npm_config_prefer_offline: 'false',
  };
}

function artifactTarballPathForAppDir(appDir: string): string {
  return path.join('/tmp', `vp-artifact-dl-${path.basename(appDir)}.tar.gz`);
}

type TmpDiskStats = { freeMb: number; totalMb: number } | null;

async function readTmpDiskStats(): Promise<TmpDiskStats> {
  try {
    const stats = await fs.statfs('/tmp');
    const bavail = Number(stats.bavail);
    const blocks = Number(stats.blocks);
    const bsize = Number(stats.bsize);
    return {
      freeMb: (bavail * bsize) / (1024 * 1024),
      totalMb: (blocks * bsize) / (1024 * 1024),
    };
  } catch {
    return null;
  }
}

async function logTmpDiskSpace(label: string): Promise<TmpDiskStats> {
  try {
    const disk = await readTmpDiskStats();
    if (!disk) {
      console.warn(`[vp-deploy] /tmp disk check failed (${label})`);
      return null;
    }
    console.log(
      `[vp-deploy] /tmp disk (${label}): free=${disk.freeMb.toFixed(1)}MB total=${disk.totalMb.toFixed(1)}MB`
    );
    return disk;
  } catch (err) {
    console.warn(`[vp-deploy] /tmp disk check failed (${label}):`, err);
    return null;
  }
}

/** Leftover paths this deploy pipeline creates under /tmp (any prior invocation). */
function isVpDeployTmpLeftoverEntry(name: string): boolean {
  if (name === '.npm-cache') return true;
  if (name.startsWith('vp-build-')) return true;
  if (name.startsWith('vp-artifact-dl-') && name.endsWith('.tar.gz')) return true;
  if (name.startsWith('vp-node-modules-') && (name.endsWith('.tar.gz') || name.endsWith('.json'))) {
    return true;
  }
  if (name.startsWith('vp-npm-cache-')) return true;
  // mkdtemp('vp-artifact-') from admin artifact build when os.tmpdir() is /tmp
  if (name.startsWith('vp-artifact-')) return true;
  return false;
}

/** Artifact/cache leftovers only — never vp-build-* (active workspace lives there). */
function isVpDeployTmpArtifactCacheEntry(name: string): boolean {
  if (name === '.npm-cache') return true;
  if (name.startsWith('vp-artifact-dl-') && name.endsWith('.tar.gz')) return true;
  if (name.startsWith('vp-node-modules-') && (name.endsWith('.tar.gz') || name.endsWith('.json'))) {
    return true;
  }
  if (name.startsWith('vp-npm-cache-')) return true;
  if (name.startsWith('vp-artifact-')) return true;
  return false;
}

const TMP_LISTING_CHUNK = 40;
const TMP_FULL_LISTING_MAX = 120;
/** Max wall time for warm-container sweep — deploy continues even if backlog remains. */
const SWEEP_TIME_BUDGET_MS = 20_000;
const SWEEP_DELETE_CONCURRENCY = 8;

/** Sort key for sweep priority — oldest vp-build workspaces first (timestamp suffix or mtime). */
async function leftoverSortKeyMs(name: string): Promise<number> {
  if (name.startsWith('vp-build-')) {
    const last = name.slice(name.lastIndexOf('-') + 1);
    const parsed = Number(last);
    if (Number.isFinite(parsed) && parsed > 1_000_000_000_000) return parsed;
  }
  try {
    return (await fs.stat(path.join('/tmp', name))).mtimeMs;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

async function sortLeftoversOldestFirst(names: string[]): Promise<string[]> {
  const keyed = await Promise.all(
    names.map(async (name) => ({ name, sortKey: await leftoverSortKeyMs(name) }))
  );
  keyed.sort((a, b) => a.sortKey - b.sortKey || a.name.localeCompare(b.name));
  return keyed.map((k) => k.name);
}

type ParallelSweepResult = {
  removed: string[];
  remaining: string[];
  budgetExceeded: boolean;
};

/**
 * Delete /tmp entries in parallel batches (oldest first) within a hard time budget.
 */
async function runParallelTimedTmpDeletions(params: {
  names: string[];
  startedAt: number;
  budgetMs: number;
  concurrency: number;
  logPrefix: string;
}): Promise<ParallelSweepResult> {
  const sorted = await sortLeftoversOldestFirst(params.names);
  const removed: string[] = [];
  let i = 0;
  let budgetExceeded = false;

  while (i < sorted.length) {
    if (Date.now() - params.startedAt >= params.budgetMs) {
      budgetExceeded = true;
      break;
    }

    const batch = sorted.slice(i, i + params.concurrency);
    i += batch.length;

    const batchResults = await Promise.all(
      batch.map(async (name) => {
        const target = path.join('/tmp', name);
        try {
          await fs.rm(target, { recursive: true, force: true });
          console.log(`[vp-deploy] ${params.logPrefix}: removed ${target}`);
          return { name, ok: true as const };
        } catch (err) {
          const code =
            err && typeof err === 'object' && 'code' in err
              ? String((err as NodeJS.ErrnoException).code)
              : '';
          if (code !== 'ENOENT') {
            console.warn(`[vp-deploy] ${params.logPrefix}: failed to remove ${target}:`, err);
          }
          return { name, ok: false as const };
        }
      })
    );

    for (const r of batchResults) {
      if (r.ok) removed.push(r.name);
    }
  }

  const remaining = sorted.filter((n) => !removed.includes(n));
  if (remaining.length > 0 && Date.now() - params.startedAt >= params.budgetMs) {
    budgetExceeded = true;
  }

  return { removed, remaining, budgetExceeded };
}

async function logTmpDirectoryListing(label: string): Promise<void> {
  try {
    const names = (await fs.readdir('/tmp')).sort((a, b) => a.localeCompare(b));
    const leftovers = names.filter(isVpDeployTmpLeftoverEntry);
    console.log(`[vp-deploy] /tmp listing (${label}): ${names.length} total entries`);
    if (names.length <= TMP_FULL_LISTING_MAX) {
      for (let i = 0; i < names.length; i += TMP_LISTING_CHUNK) {
        const chunk = names.slice(i, i + TMP_LISTING_CHUNK);
        const end = Math.min(i + TMP_LISTING_CHUNK, names.length);
        console.log(
          `[vp-deploy] /tmp listing (${label}) entries ${i + 1}-${end}: ${chunk.join(', ')}`
        );
      }
    } else {
      console.log(
        `[vp-deploy] /tmp listing (${label}): skipping full dump (${names.length} entries > ${TMP_FULL_LISTING_MAX}); logging VP leftovers only`
      );
    }
    const leftoverSummary =
      leftovers.length <= 80
        ? leftovers.join(', ') || '(none)'
        : `${leftovers.slice(0, 80).join(', ')} … and ${leftovers.length - 80} more`;
    console.log(
      `[vp-deploy] /tmp VP deploy leftovers (${label}): ${leftovers.length} → ${leftoverSummary}`
    );
  } catch (err) {
    console.warn(`[vp-deploy] /tmp listing failed (${label}):`, err);
  }
}

async function removeTmpPath(target: string, logPrefix: string): Promise<boolean> {
  try {
    const st = await fs.stat(target);
    const sizeHint = st.isFile()
      ? ` (${(st.size / (1024 * 1024)).toFixed(1)}MB file)`
      : ' (dir)';
    await fs.rm(target, { recursive: true, force: true });
    console.log(`[vp-deploy] ${logPrefix}: removed ${target}${sizeHint}`);
    return true;
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as NodeJS.ErrnoException).code)
        : '';
    if (code === 'ENOENT') {
      return false;
    }
    console.warn(`[vp-deploy] ${logPrefix}: failed to remove ${target}:`, err);
    return false;
  }
}

/**
 * Unconditional broad /tmp sweep at deploy start — clears debris from prior warm-container
 * invocations that crashed before their own cleanup ran.
 * Non-fatal: any failure is logged and deploy continues.
 */
async function sweepVpDeployTmpBeforeDeploy(): Promise<void> {
  const sweepStarted = Date.now();
  try {
    console.log('[vp-deploy] warm-container /tmp sweep: starting (all prior invocations)');

    await logTmpDiskSpace('deploy start before sweep');
    await logTmpDirectoryListing('deploy start before sweep');

    let tmpNames: string[] = [];
    try {
      tmpNames = await fs.readdir('/tmp');
    } catch (readdirErr) {
      console.error('[vp-deploy] warm-container sweep: readdir(/tmp) failed (non-fatal):', readdirErr);
      return;
    }

    const leftovers = tmpNames.filter(isVpDeployTmpLeftoverEntry);
    const deleteStarted = Date.now();
    const { removed, remaining, budgetExceeded } = await runParallelTimedTmpDeletions({
      names: leftovers,
      startedAt: deleteStarted,
      budgetMs: SWEEP_TIME_BUDGET_MS,
      concurrency: SWEEP_DELETE_CONCURRENCY,
      logPrefix: 'warm-container sweep',
    });

    const sweepMs = Date.now() - sweepStarted;
    const removedSummary =
      removed.length <= 80
        ? removed.join(', ') || '(nothing to remove)'
        : `${removed.slice(0, 80).join(', ')} … and ${removed.length - 80} more`;
    const remainingSummary =
      remaining.length <= 40
        ? remaining.join(', ') || '(none)'
        : `${remaining.slice(0, 40).join(', ')} … and ${remaining.length - 40} more`;

    if (budgetExceeded && remaining.length > 0) {
      console.warn(
        `[vp-deploy] warm-container /tmp sweep: time budget (${SWEEP_TIME_BUDGET_MS}ms) reached — ` +
          `cleared ${removed.length}/${leftovers.length}, ${remaining.length} remain for a future deploy: ${remainingSummary}`
      );
    } else {
      console.log(
        `[vp-deploy] warm-container /tmp sweep: removed ${removed.length}/${leftovers.length} entries in ${sweepMs}ms: ${removedSummary}`
      );
    }

    await logTmpDiskSpace('deploy start after sweep');
    await logTmpDirectoryListing('deploy start after sweep');
  } catch (sweepErr) {
    console.error(
      `[vp-deploy] warm-container /tmp sweep failed after ${Date.now() - sweepStarted}ms (non-fatal, continuing deploy):`,
      sweepErr
    );
  }
}

/**
 * Free /tmp before live npm ci: wipe extracted node_modules, download tarball,
 * and npm cache so ENOSPC is less likely after an artifact attempt.
 * Does not remove vp-build-* dirs (current workspace); start-of-deploy sweep handles stale builds.
 */
async function prepareTmpForNpmCiFallback(appDir: string): Promise<void> {
  const nodeModules = path.join(appDir, 'node_modules');
  const tarballPath = artifactTarballPathForAppDir(appDir);

  console.log('[vp-deploy] fallback cleanup: starting');
  await logTmpDiskSpace('fallback before cleanup');
  await logTmpDirectoryListing('fallback before cleanup');

  await removeTmpPath(nodeModules, 'fallback cleanup');
  await removeTmpPath(tarballPath, 'fallback cleanup');

  const tmpNames = await fs.readdir('/tmp').catch(() => [] as string[]);
  for (const name of tmpNames) {
    if (!isVpDeployTmpArtifactCacheEntry(name)) continue;
    await removeTmpPath(path.join('/tmp', name), 'fallback cleanup');
  }

  const nmGone = await fs.access(nodeModules).then(() => false).catch(() => true);
  const tarGone = await fs.access(tarballPath).then(() => false).catch(() => true);
  console.log(
    `[vp-deploy] fallback cleanup: node_modules gone=${nmGone}, tarball gone=${tarGone}`
  );

  const remaining = (await fs.readdir('/tmp').catch(() => [] as string[])).filter(
    isVpDeployTmpArtifactCacheEntry
  );
  console.log(
    `[vp-deploy] fallback cleanup: remaining artifact/cache entries: ${remaining.join(', ') || '(none)'}`
  );

  await logTmpDiskSpace('fallback after cleanup, before npm ci');
  await logTmpDirectoryListing('fallback after cleanup');

  if (!nmGone || !tarGone) {
    throw new Error(
      `fallback cleanup incomplete: node_modules gone=${nmGone}, tarball gone=${tarGone}`
    );
  }
}

/**
 * Live npm ci fallback. Avoids a long-lived cache dir; cleans cache after install.
 */
async function installVpWorkspaceNodeModulesViaNpmCi(appDir: string): Promise<void> {
  await prepareTmpForNpmCiFallback(appDir);

  // Do not use --omit=optional: rollup's optional native bindings are required.
  const cmd = [
    'npm ci',
    '--omit=dev',
    '--no-audit',
    '--no-fund',
    '--fetch-retries=5',
    '--fetch-retry-mintimeout=5000',
    '--fetch-retry-maxtimeout=30000',
  ].join(' ');

  console.log('[vp-deploy] npm ci STARTING');
  console.log(`[vp-deploy] npm ci command: ${cmd}`);
  console.log(`[vp-deploy] npm ci cwd: ${appDir}`);
  console.log('[vp-deploy] npm ci HOME=/tmp npm_config_cache=/tmp/.npm-cache');

  const started = Date.now();
  try {
    const stdout = execSync(cmd, {
      cwd: appDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 20 * 1024 * 1024,
      env: npmCiEnv(),
    });

    const duration = Date.now() - started;
    console.log(`[vp-deploy] npm ci completed successfully in ${duration}ms`);
    if (stdout.trim()) {
      console.log(`[vp-deploy] npm ci stdout:\n${stdout}`);
    }
  } catch (error: unknown) {
    const duration = Date.now() - started;
    const err = error as {
      status?: number | null;
      signal?: NodeJS.Signals | null;
      stdout?: string | Buffer;
      stderr?: string | Buffer;
      message?: string;
    };
    const exitCode = err.status ?? 'unknown';
    const stdout = execOutputToString(err.stdout);
    const stderr = execOutputToString(err.stderr);

    // Explicit failure markers — do not rely on a generic outer catch alone.
    console.error(`[vp-deploy] npm ci FAILED — exit code: ${exitCode}`);
    console.error(`[vp-deploy] npm ci failed after ${duration}ms`);
    if (err.signal) {
      console.error(`[vp-deploy] npm ci signal: ${err.signal}`);
    }
    console.error(`[vp-deploy] npm ci stderr (full):\n${stderr || '(empty)'}`);
    console.error(`[vp-deploy] npm ci stdout (full):\n${stdout || '(empty)'}`);
    console.error(
      `[vp-deploy] npm ci error message: ${err.message ?? String(error)}`
    );

    throw new Error(
      `npm ci FAILED — exit code: ${exitCode} after ${duration}ms` +
        (stderr.trim() ? ` — ${stderr.trim().slice(-800)}` : '')
    );
  } finally {
    // Free tarball cache as soon as install finishes (success or fail).
    try {
      execSync('npm cache clean --force', {
        cwd: appDir,
        stdio: 'pipe',
        env: npmCiEnv(),
      });
      console.log('[vp-deploy] npm cache cleaned after install');
    } catch (cleanError) {
      console.warn('[vp-deploy] npm cache clean failed:', cleanError);
    }
  }
}

/** After Vite, only dist/ is needed — drop node_modules + sources to free /tmp. */
async function pruneWorkspaceKeepDistOnly(appDir: string, distDir: string): Promise<void> {
  const entries = await fs.readdir(appDir);
  for (const name of entries) {
    if (name === 'dist') continue;
    await fs.rm(path.join(appDir, name), { recursive: true, force: true });
  }

  try {
    await fs.access(path.join(distDir, 'index.html'));
  } catch {
    throw new Error('pruneWorkspaceKeepDistOnly: dist/index.html missing after prune');
  }

  console.log('[vp-deploy] pruned workspace to dist/ only (freed node_modules + sources)');
}

async function copyVpBuildSources(destRoot: string): Promise<void> {
  await fs.mkdir(destRoot, { recursive: true });

  for (const file of VP_BUILD_ROOT_FILES) {
    const from = path.join(VP_APP, file);
    try {
      await fs.access(from);
    } catch {
      continue;
    }
    await fs.copyFile(from, path.join(destRoot, file));
  }

  for (const dir of VP_BUILD_DIRS) {
    const from = path.join(VP_APP, dir);
    try {
      await fs.access(from);
    } catch {
      continue;
    }
    await copyDir(from, path.join(destRoot, dir));
  }
}

async function prepareVpBuildWorkspace(userId: string): Promise<{
  appDir: string;
  distDir: string;
  depsMode: 'dev' | 'artifact' | 'npm-ci';
  cleanup: () => Promise<void>;
}> {
  if (process.env.NODE_ENV === 'development') {
    const overlayStarted = Date.now();
    await applyVpSourcesToDirectory(userId, path.join(VP_APP, 'src'));
    logStage('overlay (dev in-place)', overlayStarted);
    return {
      appDir: VP_APP,
      distDir: VP_DIST,
      depsMode: 'dev',
      cleanup: async () => {},
    };
  }

  const tmpRoot = path.join('/tmp', `vp-build-${userId.slice(0, 8)}-${Date.now()}`);

  const copyStarted = Date.now();
  await copyVpBuildSources(tmpRoot);
  logStage('copy build sources to /tmp', copyStarted, `(${tmpRoot})`);

  const overlayStarted = Date.now();
  await applyVpSourcesToDirectory(userId, path.join(tmpRoot, 'src'));
  logStage('overlay user sources', overlayStarted);

  const installStarted = Date.now();
  const depsMode = await ensureVpWorkspaceNodeModules(tmpRoot);
  logStage(`deps install (${depsMode})`, installStarted);

  return {
    appDir: tmpRoot,
    distDir: path.join(tmpRoot, 'dist'),
    depsMode,
    cleanup: async () => {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    },
  };
}

export async function deployVagusPlanner(params: {
  userId: string;
  title?: string;
  requestOrigin?: string;
}): Promise<{ url: string; token: string; bundleUrl: string } | null> {
  const deployStarted = Date.now();
  const requestOrigin =
    params.requestOrigin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';
  const title = params.title || 'Vagus Planner';

  // First: reclaim /tmp from any prior warm-container invocation (before workspace setup).
  await sweepVpDeployTmpBeforeDeploy();

  console.log('[vp-deploy] start');

  const workspaceStarted = Date.now();
  const workspace = await prepareVpBuildWorkspace(params.userId);
  logStage('prepare workspace (total)', workspaceStarted);

  try {
    const buildStarted = Date.now();
    try {
      await buildVagusPlannerDist(workspace.appDir);
    } catch (buildError) {
      // Wrong-platform natives or missing vite binary; recover via npm ci.
      if (workspace.depsMode === 'artifact') {
        console.warn(
          '[vp-deploy] Vite failed with prebuilt artifact — falling back to live npm ci:',
          buildError
        );
        const fallbackStarted = Date.now();
        await installVpWorkspaceNodeModulesViaNpmCi(workspace.appDir);
        logStage('deps install (npm-ci fallback after vite fail)', fallbackStarted);
        await buildVagusPlannerDist(workspace.appDir);
      } else {
        throw buildError;
      }
    }
    logStage('vite build', buildStarted);

    // Free ~300MB before storage upload — only dist/ is published.
    const pruneStarted = Date.now();
    await pruneWorkspaceKeepDistOnly(workspace.appDir, workspace.distDir);
    logStage('prune to dist only', pruneStarted);

    const previewStarted = Date.now();
    const placeholder = await upsertPreview(
      params.userId,
      '<!DOCTYPE html><html><body style="margin:0;background:#060f1e;color:#94a3b8;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh">Deploying Vagus Planner…</body></html>',
      title,
      requestOrigin
    );
    logStage('upsert preview row', previewStarted);

    if (!placeholder) return null;

    const publishStarted = Date.now();
    const bundleUrl = await publishDistFromDir(
      params.userId,
      placeholder.token,
      requestOrigin,
      workspace.distDir
    );
    logStage('publish dist', publishStarted);

    const finalizeStarted = Date.now();
    const html = buildDeployPreviewShell(bundleUrl);
    const updated = await updatePreviewHtml(params.userId, html, title);
    logStage('update preview html', finalizeStarted);

    if (!updated) return null;

    logStage('deploy complete', deployStarted, `(token=${placeholder.token})`);

    return {
      url: previewPublicUrl(placeholder.token, requestOrigin),
      token: placeholder.token,
      bundleUrl,
    };
  } finally {
    const cleanupStarted = Date.now();
    await workspace.cleanup();
    logStage('cleanup /tmp workspace', cleanupStarted);
  }
}

export function previewUrlForToken(token: string, requestOrigin?: string): string {
  return previewPublicUrl(token, requestOrigin);
}
