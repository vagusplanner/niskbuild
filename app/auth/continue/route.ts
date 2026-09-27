import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isPlatformOwner } from '@/lib/platform-owner-auth';
import {
  resolvePostAuthPath,
  resolvePostAuthProductFromRequest,
  resolvePostAuthRedirectUrl,
} from '@/lib/post-auth-redirect';
import { getAuthRedirectOrigin } from '@/lib/canonical-url';

/**
 * Post-password (and already-signed-in) continue hop.
 *
 * Email/password sign-in previously jumped straight to `next` (default `/pricing`)
 * and skipped {@link resolvePostAuthPath} — so platform owners and paid users
 * landed on pricing instead of the dashboard. OAuth already used the callback
 * path; this route gives the same resolution to non-OAuth flows.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = requestUrl.searchParams.get('next');
  const productParam = requestUrl.searchParams.get('product');
  const origin = getAuthRedirectOrigin(requestUrl.origin);
  const product = resolvePostAuthProductFromRequest({
    hostOrOrigin: origin,
    productParam,
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL('/login', origin);
    if (next) login.searchParams.set('next', next);
    if (product === 'supereduc8') login.searchParams.set('product', 'supereduc8');
    return NextResponse.redirect(login);
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_tier, subscription_status, phone_verified')
    .eq('id', user.id)
    .single();

  const platformOwner = await isPlatformOwner(user.id);
  const destinationPath = resolvePostAuthPath(profile ?? {}, next, {
    isPlatformOwner: platformOwner,
    product,
  });

  return NextResponse.redirect(
    resolvePostAuthRedirectUrl({
      destinationPath,
      callbackOrigin: origin,
      product,
    })
  );
}
