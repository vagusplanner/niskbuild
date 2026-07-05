import 'server-only';

import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { guardApiRequest, unauthorizedResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { isPaidAndActive } from '@/lib/tier-config';

export async function isPlatformOwner(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('is_platform_owner').single();

  if (error) {
    console.error('is_platform_owner RPC failed:', error.message);
    return false;
  }

  return Boolean(data);
}

/** Look up platform owner by user id (admin client — for public preview pages). */
export async function isPlatformOwnerUserId(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .schema('firstparty')
    .from('platform_owners')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('platform_owners lookup failed:', error.message);
    return false;
  }

  return !!data;
}

/**
 * TEMPORARY: Platform owners may publish/view live VP preview links without an
 * active paid subscription while the deploy pipeline is verified end-to-end.
 * Billing/preview lifecycle should be re-enabled once app functionality is confirmed.
 * Scoped to genuine platform owners only (firstparty.platform_owners), not regular users.
 */
export function canPublishLivePreviewLinks(
  tier: string | null | undefined,
  status: string | null | undefined,
  platformOwner: boolean
): boolean {
  return platformOwner || isPaidAndActive(tier, status);
}

export async function requirePlatformOwnerPage(nextPath: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const owner = await isPlatformOwner();
  if (!owner) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}&error=platform_owner_required`);
  }
}

export async function requirePlatformOwner(
  request: NextRequest
): Promise<{ ok: true; user: User } | { ok: false; response: NextResponse }> {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard;

  const owner = await isPlatformOwner();
  if (!owner || !guard.user) {
    return { ok: false, response: unauthorizedResponse() };
  }

  return { ok: true, user: guard.user };
}
