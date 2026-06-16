import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');
  const origin = request.nextUrl.origin;
  const settingsUrl = `${origin}/settings/github`;

  if (error) {
    return NextResponse.redirect(`${settingsUrl}?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${settingsUrl}?error=${encodeURIComponent('missing_code')}`);
  }

  const clientId =
    process.env.GITHUB_CLIENT_ID || process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent('github_oauth_not_configured')}`
    );
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${origin}/api/github/callback`,
      }),
    });

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenRes.ok || !tokenData.access_token) {
      const msg = tokenData.error_description || tokenData.error || 'token_exchange_failed';
      return NextResponse.redirect(`${settingsUrl}?error=${encodeURIComponent(msg)}`);
    }

    return NextResponse.redirect(`${settingsUrl}?token=${encodeURIComponent(tokenData.access_token)}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'oauth_failed';
    return NextResponse.redirect(`${settingsUrl}?error=${encodeURIComponent(msg)}`);
  }
}
