import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { storeOAuthState } from '@/lib/buffer/oauth-state';
import {
  buildGoogleCalendarAuthorizeUrl,
  GoogleCalendarAuthError,
  isGoogleCalendarOAuthConfigured,
} from '@/lib/google-calendar/oauth';
import {
  vpApiCorsPreflightResponse,
  vpApiJson,
  withVpApiCors,
} from '@/lib/vp-api-cors';

export async function OPTIONS(request: NextRequest) {
  return vpApiCorsPreflightResponse(request);
}

/**
 * Start Google Calendar OAuth (calendar.readonly).
 * Browser navigation → redirect to Google.
 * JSON Accept / fetch → { authorizeUrl }.
 */
export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 20 });
  if (!guard.ok) return withVpApiCors(request, guard.response);
  if (!guard.user) {
    return vpApiJson(request, { error: 'Unauthorized' }, { status: 401 });
  }

  if (!isGoogleCalendarOAuthConfigured()) {
    return vpApiJson(
      request,
      {
        error:
          'Google Calendar OAuth is not configured. Set GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET.',
        code: 'GOOGLE_CALENDAR_NOT_CONFIGURED',
      },
      { status: 503 }
    );
  }

  try {
    const returnTo = request.nextUrl.searchParams.get('return_to');
    const state = await storeOAuthState(guard.user.id, 'google_calendar');

    // Persist return_to on the state row via metadata is not available;
    // encode a short return hint in a cookie scoped to the callback path.
    const authorizeUrl = buildGoogleCalendarAuthorizeUrl(state);
    const accept = request.headers.get('accept') || '';
    const wantsJson =
      accept.includes('application/json') && !accept.includes('text/html');

    if (wantsJson) {
      const response = vpApiJson(request, { authorizeUrl, state });
      if (returnTo) {
        response.cookies.set('vp_gcal_return', returnTo, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/api/vagus-planner/google-calendar',
          maxAge: 600,
        });
      }
      return response;
    }

    const response = NextResponse.redirect(authorizeUrl);
    if (returnTo) {
      response.cookies.set('vp_gcal_return', returnTo, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/api/vagus-planner/google-calendar',
        maxAge: 600,
      });
    }
    return response;
  } catch (err) {
    const message =
      err instanceof GoogleCalendarAuthError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Failed to start Google Calendar OAuth';
    return vpApiJson(request, { error: message }, { status: 500 });
  }
}
