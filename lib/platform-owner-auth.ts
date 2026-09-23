import 'server-only';

import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { guardApiRequest, unauthorizedResponse } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * Hard-coded + env allowlist. Used when firstparty.platform_owners lookup fails
 * or the row is missing — still treat these emails as platform owners and heal the table.
 * Override/extend with PLATFORM_OWNER_EMAILS=a@x.com,b@y.com
 */
function ownerEmailAllowlist(): Set<string> {
  const fromEnv = (process.env.PLATFORM_OWNER_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return new Set(['sofiane.kemih@gmail.com', ...fromEnv]);
}

async function resolveUserEmail(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();
  if (profile?.email) return String(profile.email).toLowerCase();

  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    return data.user?.email?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

async function ensurePlatformOwnerRow(userId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.schema('firstparty').from('platform_owners').upsert(
      { user_id: userId },
      { onConflict: 'user_id', ignoreDuplicates: true }
    );
  } catch (error) {
    console.error('platform_owners heal failed:', error);
  }
}

async function isOwnerByEmailAllowlist(userId: string): Promise<boolean> {
  const email = await resolveUserEmail(userId);
  if (!email || !ownerEmailAllowlist().has(email)) return false;
  await ensurePlatformOwnerRow(userId);
  return true;
}

async function isOwnerViaSessionRpc(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('is_platform_owner').single();
    if (error) {
      console.error('is_platform_owner RPC failed:', error.message);
      return false;
    }
    return Boolean(data);
  } catch (error) {
    console.error('is_platform_owner RPC failed:', error);
    return false;
  }
}

/**
 * Platform-owner check. Prefer `userId` when the caller already authenticated
 * via Bearer token (VP cross-origin API) — cookie-session RPC cannot see auth.uid()
 * in that case.
 *
 * Lookup order for userId path:
 * 1) firstparty.platform_owners via service role
 * 2) email allowlist (heals missing platform_owners row)
 * 3) cookie-session RPC (survives service-role / schema hiccups on authenticated requests)
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

      if (!error && data?.user_id) return true;
      if (error) {
        console.error('platform_owners lookup failed:', error.message);
      }
    } catch (error) {
      console.error('platform_owners lookup failed:', error);
    }

    try {
      if (await isOwnerByEmailAllowlist(userId)) return true;
    } catch (error) {
      console.error('platform owner email allowlist failed:', error);
    }

    // Authenticated API/page requests: RPC sees auth.uid() even if admin schema failed.
    if (await isOwnerViaSessionRpc()) {
      await ensurePlatformOwnerRow(userId);
      return true;
    }

    return false;
  }

  return isOwnerViaSessionRpc();
}

export async function requirePlatformOwnerPage(nextPath: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const owner = await isPlatformOwner(user.id);
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
