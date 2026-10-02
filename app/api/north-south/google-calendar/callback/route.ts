import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { consumeOAuthStateByValue } from '@/lib/buffer/oauth-state';
import {
  exchangeNsGoogleCalendarCode,
  fetchNsGoogleAccountEmail,
  getNsGoogleCalendarOAuthDebug,
  NsGoogleCalendarAuthError,
  NS_OAUTH_STATE_PROVIDER,
  resolveNsGoogleCalendarReturnUrl,
} from '@/lib/ns-google-calendar/oauth';
import { upsertNsGoogleCalendarConnection } from '@/lib/ns-google-calendar/tokens';

/**
 * NS Google OAuth redirect target.
 * Exchanges code → stores tokens in firstparty.ns_google_calendar_connections.
 * Identity from oauth_states (provider=ns_google_calendar), not session cookie.
 */
export async function GET(request: NextRequest) {
  const appErrorRedirect = (code: string) =>
    NextResponse.redirect(
      resolveNsGoogleCalendarReturnUrl(request.cookies.get('ns_gcal_return')?.value, {
        ns_google_calendar: code,
      })
    );

  const errorParam = request.nextUrl.searchParams.get('error');
  if (errorParam) {
    console.warn('[ns-google-calendar/callback] Google returned error=', errorParam);
    return appErrorRedirect('denied');
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  if (!code || !state) {
    console.warn('[ns-google-calendar/callback] missing code or state');
    return appErrorRedirect('missing_params');
  }

  await guardApiRequest(request, { requireAuth: false, rateLimit: 30 });

  // Prefer distinct NS provider; accept google_calendar fallback until
  // ns-google-calendar-oauth-migration.sql widens the check constraint.
  let verified = await consumeOAuthStateByValue(state, {
    expectedProvider: NS_OAUTH_STATE_PROVIDER,
  });
  if (!verified) {
    verified = await consumeOAuthStateByValue(state, {
      expectedProvider: 'google_calendar',
    });
  }
  if (!verified) {
    console.warn('[ns-google-calendar/callback] invalid/expired/used oauth state');
    return appErrorRedirect('invalid_state');
  }

  const userId = verified.userId;
  const oauthDebug = getNsGoogleCalendarOAuthDebug();
  console.info('[ns-google-calendar/callback] exchanging code', {
    userId,
    redirect_uri: oauthDebug.redirect_uri,
    client_id_suffix: oauthDebug.client_id_suffix,
    client_secret_present: oauthDebug.client_secret_present,
    redirect_uri_source: oauthDebug.redirect_uri_source,
  });

  try {
    const tokens = await exchangeNsGoogleCalendarCode(code);
    const email = await fetchNsGoogleAccountEmail(tokens.access_token);
    await upsertNsGoogleCalendarConnection(userId, tokens, {
      calendar_email: email,
    });

    const response = NextResponse.redirect(
      resolveNsGoogleCalendarReturnUrl(request.cookies.get('ns_gcal_return')?.value, {
        ns_google_calendar: 'connected',
      })
    );
    response.cookies.set('ns_gcal_return', '', {
      httpOnly: true,
      path: '/api/north-south/google-calendar',
      maxAge: 0,
    });
    return response;
  } catch (err) {
    const message =
      err instanceof NsGoogleCalendarAuthError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'exchange_failed';
    console.error('[ns-google-calendar/callback] OAuth token exchange failed:', {
      message,
      redirect_uri: oauthDebug.redirect_uri,
      client_id_suffix: oauthDebug.client_id_suffix,
      client_secret_present: oauthDebug.client_secret_present,
    });
    return appErrorRedirect('exchange_failed');
  }
}
