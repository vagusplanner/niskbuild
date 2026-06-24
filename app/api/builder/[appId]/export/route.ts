import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { getBuilderExportConfig, isExportSupported } from '@/lib/builder-export/config';
import { createExportJob } from '@/lib/builder-export/jobs';
import { startBuilderExportJob } from '@/lib/builder-export/run-export';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { canExportNative } from '@/lib/tier-config';

export const maxDuration = 300;

type RouteContext = { params: Promise<{ appId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request, { rateLimit: 3 });
  if (!guard.ok) return guard.response;

  try {
    const { appId } = await context.params;

    if (!isExportSupported(appId)) {
      return NextResponse.json({ error: 'Export is not supported for this app' }, { status: 404 });
    }

    const config = getBuilderExportConfig(appId);
    if (!config) {
      return NextResponse.json({ error: 'Export configuration missing' }, { status: 404 });
    }

    const { user, profile } = await getAuthenticatedProfile();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const tier = profile?.subscription_tier ?? 'free';
    const subscriptionStatus = profile?.subscription_status ?? 'inactive';

    if (!canExportNative(tier, subscriptionStatus)) {
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
          error:
            'Native export must run on your Mac with the Next.js dev server (npm run dev). It cannot run on Vercel or Linux hosts.',
        },
        { status: 400 }
      );
    }

    const job = await createExportJob({
      appSlug: appId,
      requestedBy: user.id,
    });

    startBuilderExportJob(job.id, config);

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      message: 'Export started. Poll /export/status for progress.',
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to start export');
  }
}
