import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { storeOAuthState } from '@/lib/buffer/oauth-state';
import { isNsStaffUser } from '@/lib/ns-staff';
import {
  buildNsGoogleCalendarAuthorizeUrl,
  getNsGoogleCalendarOAuthDebug,
  isNsGoogleCalendarOAuthConfigured,
  NsGoogleCalendarAuthError,
  NS_OAUTH_STATE_PROVIDER,
  redactNsAuthorizeUrl,
} from '@/lib/ns-google-calendar/oauth';
import {
  nsApiCorsPreflightResponse,
  nsApiJson,
  withNsApiCors,
} from '@/lib/ns-api-cors';

export async function OPTIONS(request: NextRequest) {
  return nsApiCorsPreflightResponse(request);
}

/**
 * Start North South Google Calendar OAuth (calendar.events write + Meet).
 * Staff-only. Uses NS_GOOGLE_CALENDAR_* client — not VP GOOGLE_CALENDAR_*.
 */
export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 20 });
  if (!guard.ok) return withNsApiCors(request, guard.response);
  if (!guard.user) {
    return nsApiJson(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const staff = await isNsStaffUser(guard.user.id);
  if (!staff) {
    return nsApiJson(
      request,
      { error: 'Only North South staff can connect Calendar', code: 'NS_STAFF_REQUIRED' },
      { status: 403 }
    );
  }

  if (!isNsGoogleCalendarOAuthConfigured()) {
    return nsApiJson(
      request,
      {
        error:
          'NS Google Calendar OAuth is not configured. Set NS_GOOGLE_CALENDAR_CLIENT_ID and NS_GOOGLE_CALENDAR_CLIENT_SECRET.',
        code: 'NS_GOOGLE_CALENDAR_NOT_CONFIGURED',
        oauthDebug: getNsGoogleCalendarOAuthDebug(),
      },
      { status: 503 }
    );
  }

  try {
    const returnTo = request.nextUrl.searchParams.get('return_to');
    const state = await storeOAuthState(guard.user.id, NS_OAUTH_STATE_PROVIDER);

    const authorizeUrl = buildNsGoogleCalendarAuthorizeUrl(state);
    const oauthDebug = {
      ...getNsGoogleCalendarOAuthDebug(),
      state_length: state.length,
      authorize_url_redacted: redactNsAuthorizeUrl(authorizeUrl),
    };

    console.info('[ns-google-calendar/connect] OAuth authorize request', {
      redirect_uri: oauthDebug.redirect_uri,
      client_id_suffix: oauthDebug.client_id_suffix,
      redirect_uri_source: oauthDebug.redirect_uri_source,
      scope: oauthDebug.scope,
      state_length: oauthDebug.state_length,
    });

    const accept = request.headers.get('accept') || '';
    const wantsJson =
      accept.includes('application/json') && !accept.includes('text/html');

    if (wantsJson) {
      const response = nsApiJson(request, {
        authorizeUrl,
        state,
        oauthDebug,
      });
      if (returnTo) {
        response.cookies.set('ns_gcal_return', returnTo, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/api/north-south/google-calendar',
          maxAge: 600,
        });
      }
      return response;
    }

    const response = NextResponse.redirect(authorizeUrl);
    if (returnTo) {
      response.cookies.set('ns_gcal_return', returnTo, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/api/north-south/google-calendar',
        maxAge: 600,
      });
    }
    return response;
  } catch (err) {
    const message =
      err instanceof NsGoogleCalendarAuthError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Failed to start NS Google Calendar OAuth';
    return nsApiJson(
      request,
      { error: message, oauthDebug: getNsGoogleCalendarOAuthDebug() },
      { status: 500 }
    );
  }
}
