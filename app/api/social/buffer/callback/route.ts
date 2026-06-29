import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { appUrl } from '@/lib/email/app-url';
import {
  exchangeBufferCode,
  fetchBufferProfile,
  upsertBufferToken,
} from '@/lib/buffer/client';
import { consumeOAuthState } from '@/lib/buffer/oauth-state';

const RETURN_PATH = '/dashboard/settings?buffer=connected';

/** Buffer OAuth callback — verifies state before attaching tokens */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const oauthError = request.nextUrl.searchParams.get('error');

  const failRedirect = (reason: string) =>
    NextResponse.redirect(`${appUrl(RETURN_PATH)}&buffer_error=${encodeURIComponent(reason)}`);

  if (oauthError) {
    return failRedirect(oauthError);
  }

  if (!code || !state) {
    return failRedirect('missing_code_or_state');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${appUrl('/login')}?next=${encodeURIComponent('/api/social/buffer/auth')}`
    );
  }

  const verified = await consumeOAuthState(state, user.id);
  if (!verified) {
    return failRedirect('invalid_oauth_state');
  }

  try {
    const tokens = await exchangeBufferCode(code);
    const profile = await fetchBufferProfile(tokens.access_token);
    await upsertBufferToken(user.id, tokens, profile?.id ?? null);
    return NextResponse.redirect(appUrl(RETURN_PATH));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'token_exchange_failed';
    return failRedirect(message);
  }
}
