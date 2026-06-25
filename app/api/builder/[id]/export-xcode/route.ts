import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { resolveBuilderApp } from '@/lib/builder-apps/handlers';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { canExportNative } from '@/lib/tier-config';

export const maxDuration = 300;

const execFileAsync = promisify(execFile);

const IOS_WORKSPACE = 'mobile/vagus-planner/ios/App/App.xcworkspace';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request, { rateLimit: 3 });
  if (!guard.ok) return guard.response;

  try {
    const { id: appId } = await context.params;
    const app = resolveBuilderApp(appId);
    if (!app) {
      return NextResponse.json({ error: 'Unknown builder app' }, { status: 404 });
    }

    if (!app.supportsXcodeExport) {
      return NextResponse.json({ error: 'Xcode export is not supported for this app' }, { status: 400 });
    }

    const { user, profile } = await getAuthenticatedProfile();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const tier = profile?.subscription_tier ?? 'free';
    const status = profile?.subscription_status ?? 'inactive';

    if (!canExportNative(tier, status)) {
      return NextResponse.json(
        {
          error: 'Xcode export requires an active Agency plan or above.',
          upgrade: true,
        },
        { status: 403 }
      );
    }

    if (process.platform !== 'darwin') {
      return NextResponse.json(
        { error: 'Xcode export must run on macOS with Xcode installed.' },
        { status: 400 }
      );
    }

    if (appId !== 'vagus-planner') {
      return NextResponse.json({ error: 'Xcode export handler not configured' }, { status: 501 });
    }

    const scriptPath = path.join(process.cwd(), 'scripts/export-xcode.js');
    const skipOpen = (await request.json().catch(() => ({}))).skipOpen === true;
    const args = skipOpen ? ['--skip-open'] : [];

    await execFileAsync('node', [scriptPath, ...args], {
      cwd: process.cwd(),
      timeout: 600_000,
      maxBuffer: 10 * 1024 * 1024,
      env: process.env,
    });

    return NextResponse.json({
      success: true,
      workspace: IOS_WORKSPACE,
      message: skipOpen
        ? 'Capacitor iOS project synced. Open the workspace in Xcode to continue.'
        : 'Xcode opened with Vagus Planner ready for signing and submission.',
    });
  } catch (error) {
    return apiErrorResponse(error, 'Xcode export failed');
  }
}
