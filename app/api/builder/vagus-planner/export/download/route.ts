import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { guardApiRequest } from '@/lib/api-auth';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { canExportNative } from '@/lib/tier-config';
import {
  VP_IOS_ZIP_FILENAME,
  VP_IPA_FILENAME,
  exportFileExists,
  resolveVpExportFile,
} from '@/lib/vp-app-store-export';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 20 });
  if (!guard.ok) return guard.response;

  const { user, profile } = await getAuthenticatedProfile();
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const tier = profile?.subscription_tier ?? 'free';
  const status = profile?.subscription_status ?? 'inactive';

  if (!canExportNative(tier, status)) {
    return NextResponse.json(
      { error: 'App Store export requires an active Agency plan or above.', upgrade: true },
      { status: 403 }
    );
  }

  const fileParam = request.nextUrl.searchParams.get('file');
  const kind = fileParam === 'ipa' ? 'ipa' : fileParam === 'ios-zip' ? 'ios-zip' : null;

  if (!kind) {
    return NextResponse.json({ error: 'file query must be ipa or ios-zip' }, { status: 400 });
  }

  const exists = await exportFileExists(kind);
  if (!exists) {
    return NextResponse.json(
      { error: kind === 'ipa' ? 'IPA not available yet — run export first.' : 'iOS zip not found.' },
      { status: 404 }
    );
  }

  const filePath = resolveVpExportFile(kind);
  const buffer = await fs.readFile(filePath);
  const filename = kind === 'ipa' ? VP_IPA_FILENAME : VP_IOS_ZIP_FILENAME;
  const contentType = kind === 'ipa' ? 'application/octet-stream' : 'application/zip';

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.byteLength),
    },
  });
}
