import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import {
  buildAndUploadVpDeployArtifact,
  getLatestVpDeployArtifact,
  hashLockfile,
} from '@/lib/vp-deploy-artifact.js';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const auth = await requirePlatformOwner(request);
  if (!auth.ok) return auth.response;

  try {
    let currentHash: string | null = null;
    let hashError: string | null = null;
    try {
      currentHash = hashLockfile() as string;
    } catch (err) {
      hashError = err instanceof Error ? err.message : String(err);
      console.error('[vp-artifact] hashLockfile failed:', hashError);
    }

    const latest = await getLatestVpDeployArtifact();
    return NextResponse.json({
      currentLockfileHash: currentHash,
      hashError,
      latest: latest
        ? {
            lockfileHash: latest.lockfile_hash,
            storagePath: latest.storage_path,
            sizeBytes: latest.size_bytes,
            createdAt: latest.created_at,
            matchesCurrentLockfile:
              currentHash != null && latest.lockfile_hash === currentHash,
          }
        : null,
    });
  } catch (error) {
    console.error('[vp-artifact] GET status failed:', error);
    return apiErrorResponse(error, 'Failed to load VP deploy artifact status');
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformOwner(request);
  if (!auth.ok) return auth.response;

  try {
    const logs: string[] = [
      `[vp-artifact] POST build cwd=${process.cwd()}`,
    ];
    const result = await buildAndUploadVpDeployArtifact({
      root: process.cwd(),
      log: (msg) => {
        console.log(msg);
        logs.push(msg);
      },
    });

    return NextResponse.json({
      success: true,
      ...result,
      logs,
      message: `Artifact uploaded (${(result.sizeBytes / 1024 / 1024).toFixed(2)} MB)`,
    });
  } catch (error) {
    console.error('[vp-artifact] POST build failed:', error);
    return apiErrorResponse(error, 'Failed to build VP deploy artifact');
  }
}
