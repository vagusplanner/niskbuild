#!/usr/bin/env node
/**
 * Build and upload a prebuilt VP node_modules archive for web Deploy.
 *
 * Usage:
 *   node scripts/build-vp-deploy-artifact.js
 *   node scripts/build-vp-deploy-artifact.js --verify-only
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY).
 * Loads .env.local / .env from the repo root when present.
 *
 * Prerequisite: run supabase/vp-deploy-artifacts-migration.sql in Supabase.
 */

const fs = require('fs');
const path = require('path');
const {
  buildAndUploadVpDeployArtifact,
  verifyVpDeployArtifactRoundTrip,
  getLatestVpDeployArtifact,
  hashLockfile,
} = require('../lib/vp-deploy-artifact.js');

const ROOT = path.join(__dirname, '..');
const verifyOnly = process.argv.includes('--verify-only');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile(path.join(ROOT, '.env.local'));
loadEnvFile(path.join(ROOT, '.env'));

async function main() {
  if (verifyOnly) {
    const latest = await getLatestVpDeployArtifact();
    if (!latest) {
      console.error('No artifact manifest found.');
      process.exit(1);
    }
    console.log('[vp-artifact] verifying', latest);
    const result = await verifyVpDeployArtifactRoundTrip({
      lockfileHash: latest.lockfile_hash,
      storagePath: latest.storage_path,
      sizeBytes: latest.size_bytes,
    });
    console.log('[vp-artifact] round-trip OK:', result);
    return;
  }

  console.log('[vp-artifact] current lockfile hash:', hashLockfile(ROOT));
  const result = await buildAndUploadVpDeployArtifact({ root: ROOT });
  console.log('[vp-artifact] upload complete:', result);

  const verify = await verifyVpDeployArtifactRoundTrip({
    lockfileHash: result.lockfileHash,
    storagePath: result.storagePath,
    sizeBytes: result.sizeBytes,
  });
  console.log('[vp-artifact] round-trip OK:', verify);
}

main().catch((err) => {
  console.error('[vp-artifact] FAILED:', err.message || err);
  process.exit(1);
});
