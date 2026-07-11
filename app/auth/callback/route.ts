import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolvePostAuthPath } from '@/lib/post-auth-redirect';
import { recordSignupIfNewUser } from '@/lib/usage-events';
import { sendWelcomeEmail } from '@/lib/email/lifecycle';
import { clientIpFromHeaders } from '@/lib/coarse-town';
import { getAuthRedirectOrigin } from '@/lib/canonical-url';
import {
  completeSsoInviteIfPresent,
  emailDomain,
  findDuplicateNonSsoAccount,
  findEnabledOrgBySsoDomain,
} from '@/lib/org-sso';

function redirectBase(requestUrl: URL): string {
  return getAuthRedirectOrigin(requestUrl.origin);
}

function isSsoUser(user: User): boolean {
  const amr = user.app_metadata?.amr;
  if (Array.isArray(amr) && amr.some((m) => String(m?.method || m).includes('sso'))) {
    return true;
  }
  const provider = String(user.app_metadata?.provider || '');
  if (provider.includes('sso')) return true;
  if (
    Array.isArray(user.identities) &&
    user.identities.some((id) => String(id.provider || '').includes('sso'))
  ) {
    return true;
  }
  // Callback flagged via ?sso=1 from our SSO kickoff
  return false;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');
  const ssoFlag = requestUrl.searchParams.get('sso') === '1';
  const authError = requestUrl.searchParams.get('error');
  const origin = redirectBase(requestUrl);

  if (authError) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', origin));
  }

  let userId: string | null = null;
  let user: User | null = null;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error.message);
      return NextResponse.redirect(new URL('/login?error=auth_failed', origin));
    }

    userId = data.user?.id ?? null;
    user = data.user ?? null;
    const isPasswordRecovery = next === '/reset-password';
    if (userId && data.user?.email && !isPasswordRecovery) {
      void recordSignupIfNewUser(userId, {
        clientIp: clientIpFromHeaders(new Headers(request.headers)),
      });
      void sendWelcomeEmail(userId, data.user.email);
    }
  }

  if (userId && user) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_tier, subscription_status, phone_verified')
      .eq('id', userId)
      .single();

    let destinationPath = resolvePostAuthPath(profile ?? {}, next);
    const destination = new URL(destinationPath, origin);

    const ssoLogin = ssoFlag || isSsoUser(user);
    if (ssoLogin && user.email) {
      const domain = emailDomain(user.email);
      const org = domain ? await findEnabledOrgBySsoDomain(domain) : null;

      const duplicate = await findDuplicateNonSsoAccount({
        userId,
        email: user.email,
      });
      if (duplicate) {
        destination.pathname = '/dashboard';
        destination.searchParams.set('sso_notice', 'duplicate_account');
        return NextResponse.redirect(destination);
      }

      if (org) {
        const membership = await completeSsoInviteIfPresent({
          userId,
          email: user.email,
          orgId: org.orgId,
        });
        if (membership.status === 'no_invite') {
          destination.pathname = '/dashboard';
          destination.searchParams.set('sso_notice', 'no_invite');
          destination.searchParams.set('sso_org', membership.orgName);
        } else if (membership.status === 'invite_accepted') {
          destination.pathname = '/dashboard';
          destination.searchParams.set('sso_notice', 'joined');
          destination.searchParams.set('sso_org', membership.orgName);
        }
      }
    }

    if (
      destinationPath.startsWith('/builder') ||
      (next && next.startsWith('/builder'))
    ) {
      destination.searchParams.set('welcome', '1');
    }
    return NextResponse.redirect(destination);
  }

  const fallback = new URL(resolvePostAuthPath({}, next), origin);
  return NextResponse.redirect(fallback);
}
