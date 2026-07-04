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
    const latest = await getLatestVpDeployArtifact();
    const currentHash = hashLockfile();
    return NextResponse.json({
      currentLockfileHash: currentHash,
      latest: latest
        ? {
            lockfileHash: latest.lockfile_hash,
            storagePath: latest.storage_path,
            sizeBytes: latest.size_bytes,
            createdAt: latest.created_at,
            matchesCurrentLockfile: latest.lockfile_hash === currentHash,
          }
        : null,
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to load VP deploy artifact status');
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformOwner(request);
  if (!auth.ok) return auth.response;

  try {
    const logs: string[] = [];
    const result = await buildAndUploadVpDeployArtifact({
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
    return apiErrorResponse(error, 'Failed to build VP deploy artifact');
  }
}
