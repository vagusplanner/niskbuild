import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { consumeOAuthStateByValue } from '@/lib/buffer/oauth-state';
import {
  exchangeGoogleCalendarCode,
  fetchGoogleAccountEmail,
  getGoogleCalendarOAuthDebug,
  GoogleCalendarAuthError,
  resolveGoogleCalendarReturnUrl,
} from '@/lib/google-calendar/oauth';
import {
  markUserSettingsConnected,
  upsertGoogleCalendarConnection,
} from '@/lib/google-calendar/tokens';
import { pullGoogleCalendarForUser } from '@/lib/google-calendar/sync';

/**
 * Google OAuth redirect target.
 * Exchanges code → stores tokens → optional first full pull → redirects to VP Account.
 *
 * Important: do NOT require a live Supabase session cookie here. Google redirects to
 * www.niskbuild.com while Vagus Planner may run on a different host (e.g. vagusplanner.com),
 * so the SPA session cookie is often invisible. User identity comes from oauth_states.
 */
export async function GET(request: NextRequest) {
  const appErrorRedirect = (code: string) =>
    NextResponse.redirect(
      resolveGoogleCalendarReturnUrl(request.cookies.get('vp_gcal_return')?.value, {
        google_calendar: code,
      })
    );

  const errorParam = request.nextUrl.searchParams.get('error');
  if (errorParam) {
    console.warn('[google-calendar/callback] Google returned error=', errorParam);
    return appErrorRedirect('denied');
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  if (!code || !state) {
    console.warn('[google-calendar/callback] missing code or state');
    return appErrorRedirect('missing_params');
  }

  // Rate-limit only — session is optional (cross-domain OAuth return).
  await guardApiRequest(request, { requireAuth: false, rateLimit: 30 });

  const verified = await consumeOAuthStateByValue(state, {
    expectedProvider: 'google_calendar',
  });
  if (!verified) {
    console.warn('[google-calendar/callback] invalid/expired/used oauth state');
    return appErrorRedirect('invalid_state');
  }

  const userId = verified.userId;
  const oauthDebug = getGoogleCalendarOAuthDebug();
  console.info('[google-calendar/callback] exchanging code', {
    userId,
    redirect_uri: oauthDebug.redirect_uri,
    client_id_suffix: oauthDebug.client_id_suffix,
    client_secret_present: oauthDebug.client_secret_present,
    redirect_uri_source: oauthDebug.redirect_uri_source,
  });

  try {
    const tokens = await exchangeGoogleCalendarCode(code);
    const email = await fetchGoogleAccountEmail(tokens.access_token);
    await upsertGoogleCalendarConnection(userId, tokens, {
      google_account_email: email,
      calendar_id: 'primary',
    });
    await markUserSettingsConnected(userId, { email });

    // Best-effort initial full pull — connection still succeeds if pull fails.
    try {
      await pullGoogleCalendarForUser(userId, { mode: 'full' });
    } catch (pullErr) {
      console.error('[google-calendar/callback] initial pull after connect failed:', pullErr);
    }

    const response = NextResponse.redirect(
      resolveGoogleCalendarReturnUrl(request.cookies.get('vp_gcal_return')?.value, {
        google_calendar: 'connected',
      })
    );
    response.cookies.set('vp_gcal_return', '', {
      httpOnly: true,
      path: '/api/vagus-planner/google-calendar',
      maxAge: 0,
    });
    return response;
  } catch (err) {
    const message =
      err instanceof GoogleCalendarAuthError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'exchange_failed';
    console.error('[google-calendar/callback] OAuth token exchange failed:', {
      message,
      redirect_uri: oauthDebug.redirect_uri,
      client_id_suffix: oauthDebug.client_id_suffix,
      client_secret_present: oauthDebug.client_secret_present,
    });
    return appErrorRedirect('exchange_failed');
  }
}
