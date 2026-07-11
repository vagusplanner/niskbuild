import { NextRequest, NextResponse } from 'next/server';
import { emailDomain, findEnabledOrgBySsoDomain } from '@/lib/org-sso';

/** Public: resolve whether an email domain has SSO configured (no secrets). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Enter a work email address.' }, { status: 400 });
    }
    const domain = emailDomain(email);
    if (!domain) {
      return NextResponse.json({ error: 'Enter a valid work email address.' }, { status: 400 });
    }

    const org = await findEnabledOrgBySsoDomain(domain);
    if (!org) {
      return NextResponse.json({
        matched: false,
        message:
          'No SSO is configured for that email domain. Sign in with Google or email/password, or ask your admin to enable SSO.',
      });
    }

    return NextResponse.json({
      matched: true,
      domain,
      orgName: org.orgName,
      providerId: org.ssoProviderId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'SSO lookup failed' },
      { status: 500 }
    );
  }
}
