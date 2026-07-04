import { NextRequest, NextResponse } from 'next/server';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { resolveBuilderApp } from '@/lib/builder-apps/handlers';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { isPaidAndActive } from '@/lib/tier-config';
import { deployVagusPlanner } from '@/lib/vp-deploy';

/**
 * Fluid Compute memory is NOT set here or in vercel.json (ignored with Active CPU billing).
 * Pro/Enterprise: Vercel dashboard → Project → Settings → Functions → Advanced Settings
 * → Function CPU → Performance (4 GB / 2 vCPUs). Applies project-wide to all functions.
 * @see https://vercel.com/docs/functions/configuring-functions/memory
 */
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request, { rateLimit: 5 });
  if (!guard.ok) return guard.response;

  try {
    const { id: appId } = await context.params;
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
    // Never let error-response construction itself crash into Next's HTML error page.
    try {
      try {
        captureApiException(error);
      } catch (sentryError) {
        console.error('[vp-deploy] captureApiException failed:', sentryError);
      }

      let message = 'Deploy failed — see server logs for details';
      try {
        if (error instanceof Error && typeof error.message === 'string') {
          const trimmed = error.message.trim();
          if (trimmed) message = trimmed;
        } else if (typeof error === 'string' && error.trim()) {
          message = error.trim();
        }
      } catch (messageError) {
        console.error('[vp-deploy] failed to read error.message:', messageError);
      }

      return NextResponse.json({ error: message }, { status: 500 });
    } catch (responseError) {
      console.error('[vp-deploy] failed to build error JSON response:', responseError);
      // Guaranteed-safe fallback — static JSON body, no dynamic content from the failure path.
      try {
        return NextResponse.json(
          { error: 'Deploy failed — see server logs for details' },
          { status: 500 }
        );
      } catch {
        return new Response(
          '{"error":"Deploy failed — see server logs for details"}',
          { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } }
        );
      }
    }
  }
}
