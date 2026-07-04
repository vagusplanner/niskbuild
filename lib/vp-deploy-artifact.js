/**
 * Build and upload a prebuilt apps/vagus-planner node_modules archive.
 * Used by scripts/build-vp-deploy-artifact.js and the admin API.
 */

const { createHash } = require('crypto');
const { execSync } = require('child_process');
const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const VP_DEPLOY_ARTIFACTS_BUCKET = 'vp-deploy-artifacts';

function resolveRoot(root) {
  return root || path.join(__dirname, '..');
}

function lockfilePath(root) {
  return path.join(resolveRoot(root), 'apps', 'vagus-planner', 'package-lock.json');
}

function packageJsonPath(root) {
  return path.join(resolveRoot(root), 'apps', 'vagus-planner', 'package.json');
}

function hashLockfile(root) {
  const content = fs.readFileSync(lockfilePath(root));
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getServiceRoleKey();
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) are required'
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function copyBuildSources(vpApp, destRoot) {
  await fsp.mkdir(destRoot, { recursive: true });
  const files = [
    'package.json',
    'package-lock.json',
    'vite.config.js',
    'index.html',
    'postcss.config.js',
    'tailwind.config.js',
    'jsconfig.json',
    'components.json',
  ];
  for (const file of files) {
    const from = path.join(vpApp, file);
    if (fs.existsSync(from)) {
      await fsp.copyFile(from, path.join(destRoot, file));
    }
  }
}

/**
 * @param {{ root?: string, log?: (msg: string) => void }} [options]
 * @returns {Promise<{
 *   lockfileHash: string,
 *   storagePath: string,
 *   sizeBytes: number,
 *   createdAt: string,
 * }>}
 */
async function buildAndUploadVpDeployArtifact(options = {}) {
  const root = resolveRoot(options.root);
  const log = options.log || console.log;
  const vpApp = path.join(root, 'apps', 'vagus-planner');

  if (!fs.existsSync(lockfilePath(root)) || !fs.existsSync(packageJsonPath(root))) {
    throw new Error(`Missing VP package files under ${vpApp}`);
  }

  const lockfileHash = hashLockfile(root);
  const storagePath = `vp-node-modules-${lockfileHash}.tar.gz`;
  const workRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'vp-artifact-'));
  const archivePath = path.join(os.tmpdir(), `vp-node-modules-${lockfileHash}.tar.gz`);

  try {
    log(`[vp-artifact] work dir: ${workRoot}`);
    log(`[vp-artifact] lockfile hash: ${lockfileHash}`);

    await copyBuildSources(vpApp, workRoot);

    log('[vp-artifact] npm ci --omit=dev …');
    execSync('npm ci --omit=dev --no-audit --no-fund', {
      cwd: workRoot,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' },
    });

    const nodeModules = path.join(workRoot, 'node_modules');
    if (!fs.existsSync(path.join(nodeModules, '.bin', 'vite'))) {
      throw new Error('npm ci did not produce node_modules/.bin/vite');
    }

    log(`[vp-artifact] creating ${archivePath}`);
    execSync(`tar -czf ${JSON.stringify(archivePath)} node_modules`, {
      cwd: workRoot,
      stdio: 'inherit',
    });

    const sizeBytes = fs.statSync(archivePath).size;
    log(`[vp-artifact] archive size: ${sizeBytes} bytes (${(sizeBytes / 1024 / 1024).toFixed(2)} MB)`);

    const supabase = createServiceClient();

    const { data: buckets } = await supabase.storage.listBuckets();
    const hasBucket = (buckets ?? []).some((b) => b.id === VP_DEPLOY_ARTIFACTS_BUCKET);
    if (!hasBucket) {
      log(`[vp-artifact] creating bucket ${VP_DEPLOY_ARTIFACTS_BUCKET}`);
      const { error: bucketError } = await supabase.storage.createBucket(
        VP_DEPLOY_ARTIFACTS_BUCKET,
        { public: false }
      );
      if (bucketError && !/already exists/i.test(bucketError.message)) {
        throw new Error(`Failed to create bucket: ${bucketError.message}`);
      }
    }

    const body = fs.readFileSync(archivePath);

    log(`[vp-artifact] uploading to ${VP_DEPLOY_ARTIFACTS_BUCKET}/${storagePath}`);
    const { error: uploadError } = await supabase.storage
      .from(VP_DEPLOY_ARTIFACTS_BUCKET)
      .upload(storagePath, body, {
        upsert: true,
        contentType: 'application/gzip',
        cacheControl: '3600',
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const createdAt = new Date().toISOString();
    const manifest = {
      lockfile_hash: lockfileHash,
      storage_path: storagePath,
      size_bytes: sizeBytes,
      created_at: createdAt,
    };

    // Always write a storage-side manifest (works even before SQL migration).
    const manifestPath = `vp-node-modules-${lockfileHash}.json`;
    const { error: manifestUploadError } = await supabase.storage
      .from(VP_DEPLOY_ARTIFACTS_BUCKET)
      .upload(manifestPath, JSON.stringify(manifest, null, 2), {
        upsert: true,
        contentType: 'application/json',
        cacheControl: '60',
      });
    if (manifestUploadError) {
      log(`[vp-artifact] warning: storage manifest upload failed: ${manifestUploadError.message}`);
    } else {
      log(`[vp-artifact] storage manifest: ${manifestPath}`);
    }

    const { error: upsertError } = await supabase
      .schema('firstparty')
      .from('vp_deploy_artifacts')
      .upsert(manifest, { onConflict: 'lockfile_hash' });

    if (upsertError) {
      log(
        `[vp-artifact] warning: DB manifest upsert failed (${upsertError.message}). ` +
          'Run supabase/vp-deploy-artifacts-migration.sql when convenient. Storage artifact is still valid.'
      );
    } else {
      log('[vp-artifact] DB manifest upserted');
    }

    return {
      lockfileHash,
      storagePath,
      sizeBytes,
      createdAt,
    };
  } finally {
    await fsp.rm(workRoot, { recursive: true, force: true }).catch(() => {});
    await fsp.rm(archivePath, { force: true }).catch(() => {});
  }
}

/**
 * Download artifact and verify size matches manifest (round-trip check).
 * @param {{ lockfileHash: string, storagePath: string, sizeBytes: number, root?: string }} params
 */
async function verifyVpDeployArtifactRoundTrip(params) {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(VP_DEPLOY_ARTIFACTS_BUCKET)
    .download(params.storagePath);

  if (error || !data) {
    throw new Error(`Download failed: ${error?.message || 'no data'}`);
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  if (buffer.length !== params.sizeBytes) {
    throw new Error(
      `Size mismatch: uploaded ${params.sizeBytes}, downloaded ${buffer.length}`
    );
  }

  // Spot-check gzip magic bytes
  if (buffer[0] !== 0x1f || buffer[1] !== 0x8b) {
    throw new Error('Downloaded file is not a valid gzip archive');
  }

  return { downloadedBytes: buffer.length, ok: true };
}

async function getLatestVpDeployArtifact() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .schema('firstparty')
    .from('vp_deploy_artifacts')
    .select('lockfile_hash, storage_path, size_bytes, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error && data) return data;

  // Fallback: storage-side JSON manifests
  const { data: files, error: listError } = await supabase.storage
    .from(VP_DEPLOY_ARTIFACTS_BUCKET)
    .list('', { limit: 100 });

  if (listError) {
    if (error) throw new Error(`Failed to load manifest: ${error.message}`);
    throw new Error(`Failed to list artifacts: ${listError.message}`);
  }

  const manifests = (files ?? []).filter(
    (f) => f.name.startsWith('vp-node-modules-') && f.name.endsWith('.json')
  );
  if (!manifests.length) return null;

  manifests.sort((a, b) => {
    const at = a.updated_at || a.created_at || '';
    const bt = b.updated_at || b.created_at || '';
    return bt.localeCompare(at);
  });

  const { data: blob, error: dlError } = await supabase.storage
    .from(VP_DEPLOY_ARTIFACTS_BUCKET)
    .download(manifests[0].name);

  if (dlError || !blob) {
    throw new Error(`Failed to download manifest: ${dlError?.message || 'no data'}`);
  }

  const parsed = JSON.parse(Buffer.from(await blob.arrayBuffer()).toString('utf8'));
  return {
    lockfile_hash: parsed.lockfile_hash,
    storage_path: parsed.storage_path,
    size_bytes: parsed.size_bytes,
    created_at: parsed.created_at,
  };
}

/**
 * @param {string} lockfileHash
 * @returns {Promise<{ lockfile_hash: string, storage_path: string, size_bytes: number, created_at: string } | null>}
 */
async function getVpDeployArtifactByHash(lockfileHash) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .schema('firstparty')
    .from('vp_deploy_artifacts')
    .select('lockfile_hash, storage_path, size_bytes, created_at')
    .eq('lockfile_hash', lockfileHash)
    .maybeSingle();

  if (!error && data) return data;

  // Fallback: storage-side JSON manifest for this hash
  const manifestPath = `vp-node-modules-${lockfileHash}.json`;
  const { data: blob, error: dlError } = await supabase.storage
    .from(VP_DEPLOY_ARTIFACTS_BUCKET)
    .download(manifestPath);

  if (dlError || !blob) return null;

  try {
    const parsed = JSON.parse(Buffer.from(await blob.arrayBuffer()).toString('utf8'));
    return {
      lockfile_hash: parsed.lockfile_hash,
      storage_path: parsed.storage_path,
      size_bytes: parsed.size_bytes,
      created_at: parsed.created_at,
    };
  } catch {
    return null;
  }
}

/**
 * Download prebuilt node_modules archive and extract into appDir.
 * @param {string} storagePath
 * @param {string} appDir
 * @param {{ log?: (msg: string) => void }} [options]
 * @returns {Promise<{ downloadMs: number, extractMs: number, bytes: number }>}
 */
async function downloadAndExtractVpDeployArtifact(storagePath, appDir, options = {}) {
  const log = options.log || console.log;
  const supabase = createServiceClient();

  const downloadStarted = Date.now();
  const { data, error } = await supabase.storage
    .from(VP_DEPLOY_ARTIFACTS_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Artifact download failed: ${error?.message || 'no data'}`);
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const downloadMs = Date.now() - downloadStarted;
  log(`[vp-deploy] artifact download: ${downloadMs}ms (${buffer.length} bytes)`);

  const archivePath = path.join(
    os.tmpdir(),
    `vp-artifact-dl-${path.basename(appDir)}.tar.gz`
  );
  await fsp.writeFile(archivePath, buffer);

  const extractStarted = Date.now();
  try {
    execSync(`tar -xzf ${JSON.stringify(archivePath)}`, {
      cwd: appDir,
      stdio: 'pipe',
    });
  } finally {
    await fsp.rm(archivePath, { force: true }).catch(() => {});
  }
  const extractMs = Date.now() - extractStarted;
  log(`[vp-deploy] artifact extract: ${extractMs}ms`);

  const viteBin = path.join(appDir, 'node_modules', '.bin', 'vite');
  if (!fs.existsSync(viteBin)) {
    throw new Error('Extracted artifact is missing node_modules/.bin/vite');
  }

  return { downloadMs, extractMs, bytes: buffer.length };
}

module.exports = {
  VP_DEPLOY_ARTIFACTS_BUCKET,
  hashLockfile,
  buildAndUploadVpDeployArtifact,
  verifyVpDeployArtifactRoundTrip,
  getLatestVpDeployArtifact,
  getVpDeployArtifactByHash,
  downloadAndExtractVpDeployArtifact,
};
