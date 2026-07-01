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

const ROOT = process.cwd();
const VP_APP = path.join(ROOT, 'apps/vagus-planner');
const VP_DIST = path.join(VP_APP, 'dist');
const VP_DEPLOY_BUCKET = 'vp-deployments';

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

async function collectFiles(dir: string, prefix = ''): Promise<DeployFile[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: DeployFile[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    const relativePath = prefix ? path.posix.join(prefix, entry.name) : entry.name;

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath, relativePath)));
    } else {
      files.push({ relativePath, absolutePath });
    }
  }

  return files;
}

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const files = await collectFiles(src);

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
    env: { ...process.env, CAPACITOR_BUILD: '1' },
  });
}

export function buildNiskBuildShell(): void {
  execSync('npm run build', {
    cwd: ROOT,
    stdio: 'inherit',
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

async function publishDistToPublic(token: string, requestOrigin: string): Promise<string> {
  return publishDistToPublicFromDir(token, requestOrigin, VP_DIST);
}

async function publishDistToStorage(userId: string, token: string): Promise<string> {
  return publishDistToStorageFromDir(userId, token, VP_DIST);
}

async function publishDist(
  userId: string,
  token: string,
  requestOrigin: string
): Promise<string> {
  return publishDistFromDir(userId, token, requestOrigin, VP_DIST);
}

async function prepareVpBuildWorkspace(userId: string): Promise<{
  appDir: string;
  distDir: string;
  cleanup: () => Promise<void>;
}> {
  if (process.env.NODE_ENV === 'development') {
    await applyVpSourcesToDirectory(userId, path.join(VP_APP, 'src'));
    return {
      appDir: VP_APP,
      distDir: VP_DIST,
      cleanup: async () => {},
    };
  }

  const tmpRoot = path.join('/tmp', `vp-build-${userId.slice(0, 8)}-${Date.now()}`);
  await copyDir(VP_APP, tmpRoot);
  await applyVpSourcesToDirectory(userId, path.join(tmpRoot, 'src'));
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
  const requestOrigin =
    params.requestOrigin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';
  const title = params.title || 'Vagus Planner';

  const workspace = await prepareVpBuildWorkspace(params.userId);

  try {
    buildNiskBuildShell();
    buildVagusPlannerDist(workspace.appDir);

    const indexPath = path.join(workspace.distDir, 'index.html');
    try {
      await fs.access(indexPath);
    } catch {
      throw new Error('Vagus Planner build did not produce dist/index.html');
    }

    const placeholder = await upsertPreview(
      params.userId,
      '<!DOCTYPE html><html><body style="margin:0;background:#060f1e;color:#94a3b8;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh">Deploying Vagus Planner…</body></html>',
      title,
      requestOrigin
    );

    if (!placeholder) return null;

    const bundleUrl = await publishDistFromDir(
      params.userId,
      placeholder.token,
      requestOrigin,
      workspace.distDir
    );
    const html = buildDeployPreviewShell(bundleUrl);
    const updated = await updatePreviewHtml(params.userId, html, title);

    if (!updated) return null;

    return {
      url: previewPublicUrl(placeholder.token, requestOrigin),
      token: placeholder.token,
      bundleUrl,
    };
  } finally {
    await workspace.cleanup();
  }
}

export function previewUrlForToken(token: string, requestOrigin?: string): string {
  return previewPublicUrl(token, requestOrigin);
}
