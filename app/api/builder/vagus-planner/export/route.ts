import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { canExportNative } from '@/lib/tier-config';
import { readVpExportManifest } from '@/lib/vp-app-store-export';

export const maxDuration = 300;

const execFileAsync = promisify(execFile);

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 30 });
  if (!guard.ok) return guard.response;

  const manifest = await readVpExportManifest();

  return NextResponse.json({
    success: true,
    manifest,
    downloadPaths: {
      ipa: '/api/builder/vagus-planner/export/download?file=ipa',
      iosZip: '/api/builder/vagus-planner/export/download?file=ios-zip',
    },
  });
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 2 });
  if (!guard.ok) return guard.response;

  try {
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const tier = profile?.subscription_tier ?? 'free';
    const status = profile?.subscription_status ?? 'inactive';

    if (!canExportNative(tier, status)) {
      return NextResponse.json(
        {
          error: 'App Store export requires an active Agency plan or above.',
          upgrade: true,
        },
        { status: 403 }
      );
    }

    if (process.platform !== 'darwin') {
      return NextResponse.json(
        {
          error: 'App Store export must run on macOS with Xcode installed.',
          manifest: null,
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const skipOpen = body.skipOpen !== false;
    const buildIpa = body.buildIpa !== false;

    const scriptPath = path.join(process.cwd(), 'scripts/export-app-store.js');
    const args = ['--json', '--zip-project', '--skip-open'];
    if (buildIpa) args.push('--build-ipa');
    if (!skipOpen) args.splice(args.indexOf('--skip-open'), 1);

    const { stdout } = await execFileAsync('node', [scriptPath, ...args], {
      cwd: process.cwd(),
      timeout: 900_000,
      maxBuffer: 20 * 1024 * 1024,
      env: process.env,
    });

    const lastLine = stdout.trim().split('\n').filter(Boolean).pop() || '{}';
    let manifest;
    try {
      manifest = JSON.parse(lastLine);
    } catch {
      manifest = await readVpExportManifest();
    }

    if (!manifest?.success) {
      return NextResponse.json(
        {
          error: manifest?.error || manifest?.ipaError || 'Export failed',
          manifest,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      manifest,
      downloadPaths: {
        ipa: manifest.ipaAvailable
          ? '/api/builder/vagus-planner/export/download?file=ipa'
          : null,
        iosZip: manifest.xcodeZipAvailable
          ? '/api/builder/vagus-planner/export/download?file=ios-zip'
          : null,
      },
      message: manifest.ipaAvailable
        ? 'Export complete — download your .ipa below or open the Xcode project.'
        : 'Xcode project ready. Download the iOS zip or open in Xcode to archive for App Store.',
    });
  } catch (error) {
    return apiErrorResponse(error, 'App Store export failed');
  }
}
