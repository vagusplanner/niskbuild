import 'server-only';

import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { guardApiRequest, unauthorizedResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * Platform-owner check. Prefer `userId` when the caller already authenticated
 * via Bearer token (VP cross-origin API) — cookie session RPC cannot see auth.uid().
 */
export async function isPlatformOwner(userId?: string): Promise<boolean> {
  if (userId) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .schema('firstparty')
        .from('platform_owners')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('platform_owners lookup failed:', error.message);
        return false;
      }

      return Boolean(data?.user_id);
    } catch (error) {
      console.error('platform_owners lookup failed:', error);
      return false;
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('is_platform_owner').single();

  if (error) {
    console.error('is_platform_owner RPC failed:', error.message);
    return false;
  }

  return Boolean(data);
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

  const owner = await isPlatformOwner(guard.user?.id);
  if (!owner || !guard.user) {
    return { ok: false, response: unauthorizedResponse() };
  }

  return { ok: true, user: guard.user };
}
