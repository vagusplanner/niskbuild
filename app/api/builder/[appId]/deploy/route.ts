import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { resolveBuilderApp } from '@/lib/builder-apps/handlers';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { isPaidAndActive } from '@/lib/tier-config';
import { deployVagusPlanner } from '@/lib/vp-deploy';

export const maxDuration = 300;

type RouteContext = { params: Promise<{ appId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request, { rateLimit: 5 });
  if (!guard.ok) return guard.response;

  try {
    const { appId } = await context.params;
    const app = resolveBuilderApp(appId);
    if (!app) {
      return NextResponse.json({ error: 'Unknown builder app' }, { status: 404 });
    }

    if (!app.supportsDeploy) {
      return NextResponse.json({ error: 'Deploy is not supported for this app' }, { status: 400 });
    }

    const { user, profile } = await getAuthenticatedProfile();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const tier = profile?.subscription_tier ?? 'free';
    const status = profile?.subscription_status ?? 'inactive';

    if (!isPaidAndActive(tier, status)) {
      return NextResponse.json(
        {
          error: 'Active paid subscription required to deploy live preview links',
          upgrade: true,
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const title =
      typeof body.title === 'string' && body.title.trim()
        ? body.title.trim()
        : app.deployTitle;

    if (appId !== 'vagus-planner') {
      return NextResponse.json({ error: 'Deploy handler not configured' }, { status: 501 });
    }

    const result = await deployVagusPlanner({
      userId: user.id,
      title,
      requestOrigin: request.nextUrl.origin,
    });

    if (!result) {
      return NextResponse.json({ error: 'Failed to publish deployment' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      bundleUrl: result.bundleUrl,
      token: result.token,
      message: `${app.name} deployed — share your live preview link.`,
    });
  } catch (error) {
    return apiErrorResponse(error, 'Deploy failed');
  }
}
