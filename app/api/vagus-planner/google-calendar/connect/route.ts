import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { storeOAuthState } from '@/lib/buffer/oauth-state';
import {
  buildGoogleCalendarAuthorizeUrl,
  getGoogleCalendarOAuthDebug,
  GoogleCalendarAuthError,
  isGoogleCalendarOAuthConfigured,
  redactAuthorizeUrl,
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
 * JSON Accept / fetch → { authorizeUrl, oauthDebug }.
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
        oauthDebug: getGoogleCalendarOAuthDebug(),
      },
      { status: 503 }
    );
  }

  try {
    const returnTo = request.nextUrl.searchParams.get('return_to');
    const state = await storeOAuthState(guard.user.id, 'google_calendar');

    const authorizeUrl = buildGoogleCalendarAuthorizeUrl(state);
    const oauthDebug = {
      ...getGoogleCalendarOAuthDebug(),
      state_length: state.length,
      authorize_url_redacted: redactAuthorizeUrl(authorizeUrl),
    };

    // Safe server log for Vercel — redirect_uri + client_id suffix only.
    console.info('[google-calendar/connect] OAuth authorize request', {
      redirect_uri: oauthDebug.redirect_uri,
      client_id_suffix: oauthDebug.client_id_suffix,
      redirect_uri_source: oauthDebug.redirect_uri_source,
      next_public_app_url: oauthDebug.next_public_app_url,
      scope: oauthDebug.scope,
      state_length: oauthDebug.state_length,
      authorize_url_redacted: oauthDebug.authorize_url_redacted,
    });

    const accept = request.headers.get('accept') || '';
    const wantsJson =
      accept.includes('application/json') && !accept.includes('text/html');

    if (wantsJson) {
      const response = vpApiJson(request, {
        authorizeUrl,
        state,
        oauthDebug,
      });
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
    return vpApiJson(
      request,
      { error: message, oauthDebug: getGoogleCalendarOAuthDebug() },
      { status: 500 }
    );
  }
}
