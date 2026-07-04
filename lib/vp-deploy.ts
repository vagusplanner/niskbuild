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

export function buildVagusPlannerDist(appDir = VP_APP): void {
  execSync('npm run build', {
    cwd: appDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...buildVpCapacitorBuildEnv(true),
    },
  });
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

/**
 * Install VP production + build-tool deps into the /tmp workspace via npm ci.
 * Intentionally does not symlink apps/vagus-planner/node_modules — that tree is
 * not traced into the serverless function (too large for the 250MB limit).
 *
 * /tmp is ~500MB on Vercel. npm always writes tarballs to a cache before extract
 * (no stream-only mode). We avoid a second dedicated cache dir and wipe npm's
 * cache immediately after install so cache + node_modules do not coexist longer
 * than necessary.
 */
function installVpWorkspaceNodeModules(appDir: string): void {
  // Do not use --omit=optional: rollup's optional native bindings are required.
  // No --cache=… and no --prefer-offline: one-shot install; do not grow /tmp.
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

  const started = Date.now();
  try {
    const stdout = execSync(cmd, {
      cwd: appDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 20 * 1024 * 1024,
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
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
        env: { ...process.env, NODE_ENV: 'production' },
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
  cleanup: () => Promise<void>;
}> {
  if (process.env.NODE_ENV === 'development') {
    const overlayStarted = Date.now();
    await applyVpSourcesToDirectory(userId, path.join(VP_APP, 'src'));
    logStage('overlay (dev in-place)', overlayStarted);
    return {
      appDir: VP_APP,
      distDir: VP_DIST,
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
  installVpWorkspaceNodeModules(tmpRoot);
  logStage('npm ci --omit=dev', installStarted);

  return {
    appDir: tmpRoot,
    distDir: path.join(tmpRoot, 'dist'),
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

  console.log('[vp-deploy] start');

  const workspaceStarted = Date.now();
  const workspace = await prepareVpBuildWorkspace(params.userId);
  logStage('prepare workspace (total)', workspaceStarted);

  try {
    const buildStarted = Date.now();
    buildVagusPlannerDist(workspace.appDir);
    logStage('vite build', buildStarted);

    const indexPath = path.join(workspace.distDir, 'index.html');
    try {
      await fs.access(indexPath);
    } catch {
      throw new Error('Vagus Planner build did not produce dist/index.html');
    }

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
