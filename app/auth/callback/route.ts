import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  resolvePostAuthPath,
  resolvePostAuthProductFromRequest,
  resolvePostAuthRedirectUrl,
} from '@/lib/post-auth-redirect';
import { isPlatformOwner } from '@/lib/platform-owner-auth';
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
  const productParam = requestUrl.searchParams.get('product');
  const ssoFlag = requestUrl.searchParams.get('sso') === '1';
  const authError = requestUrl.searchParams.get('error');
  const origin = redirectBase(requestUrl);
  const product = resolvePostAuthProductFromRequest({
    hostOrOrigin: origin,
    productParam,
  });

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

    const platformOwner = await isPlatformOwner(userId);

    let destinationPath = resolvePostAuthPath(profile ?? {}, next, {
      isPlatformOwner: platformOwner,
      product,
    });

    const ssoLogin = ssoFlag || isSsoUser(user);
    if (ssoLogin && user.email && product !== 'supereduc8') {
      const domain = emailDomain(user.email);
      const org = domain ? await findEnabledOrgBySsoDomain(domain) : null;

      const duplicate = await findDuplicateNonSsoAccount({
        userId,
        email: user.email,
      });
      if (duplicate) {
        destinationPath = '/dashboard';
        const destination = new URL(
          resolvePostAuthRedirectUrl({
            destinationPath: `${destinationPath}?sso_notice=duplicate_account`,
            callbackOrigin: origin,
            product,
          })
        );
        return NextResponse.redirect(destination);
      }

      if (org) {
        const membership = await completeSsoInviteIfPresent({
          userId,
          email: user.email,
          orgId: org.orgId,
        });
        if (membership.status === 'no_invite') {
          const destination = new URL(
            resolvePostAuthRedirectUrl({
              destinationPath: '/dashboard',
              callbackOrigin: origin,
              product,
            })
          );
          destination.searchParams.set('sso_notice', 'no_invite');
          destination.searchParams.set('sso_org', membership.orgName);
          return NextResponse.redirect(destination);
        }
        if (membership.status === 'invite_accepted') {
          const destination = new URL(
            resolvePostAuthRedirectUrl({
              destinationPath: '/dashboard',
              callbackOrigin: origin,
              product,
            })
          );
          destination.searchParams.set('sso_notice', 'joined');
          destination.searchParams.set('sso_org', membership.orgName);
          return NextResponse.redirect(destination);
        }
      }
    }

    if (
      product !== 'supereduc8' &&
      (destinationPath.startsWith('/builder') || (next && next.startsWith('/builder')))
    ) {
      const destination = new URL(
        resolvePostAuthRedirectUrl({
          destinationPath,
          callbackOrigin: origin,
          product,
        })
      );
      destination.searchParams.set('welcome', '1');
      return NextResponse.redirect(destination);
    }

    return NextResponse.redirect(
      resolvePostAuthRedirectUrl({
        destinationPath,
        callbackOrigin: origin,
        product,
      })
    );
  }

  return NextResponse.redirect(
    resolvePostAuthRedirectUrl({
      destinationPath: resolvePostAuthPath({}, next, { product }),
      callbackOrigin: origin,
      product,
    })
  );
}
