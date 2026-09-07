import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { consumeOAuthState } from '@/lib/buffer/oauth-state';
import {
  exchangeGoogleCalendarCode,
  fetchGoogleAccountEmail,
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
    return appErrorRedirect('denied');
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  if (!code || !state) {
    return appErrorRedirect('missing_params');
  }

  const guard = await guardApiRequest(request, { rateLimit: 30 });
  if (!guard.ok || !guard.user) {
    return appErrorRedirect('auth_required');
  }

  const verified = await consumeOAuthState(state, guard.user.id);
  if (!verified || verified.provider !== 'google_calendar') {
    return appErrorRedirect('invalid_state');
  }

  try {
    const tokens = await exchangeGoogleCalendarCode(code);
    const email = await fetchGoogleAccountEmail(tokens.access_token);
    await upsertGoogleCalendarConnection(guard.user.id, tokens, {
      google_account_email: email,
      calendar_id: 'primary',
    });
    await markUserSettingsConnected(guard.user.id, { email });

    // Best-effort initial full pull — connection still succeeds if pull fails.
    try {
      await pullGoogleCalendarForUser(guard.user.id, { mode: 'full' });
    } catch (pullErr) {
      console.error('[google-calendar] initial pull after connect failed:', pullErr);
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
    console.error('[google-calendar] OAuth callback failed:', err);
    return appErrorRedirect('exchange_failed');
  }
}
