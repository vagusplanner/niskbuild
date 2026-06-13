import { createHash } from 'crypto';
import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionLimit, SESSION_LIMITS } from '@/lib/tier-config';

export { SESSION_LIMITS };

export const ACTIVE_WINDOW_MINUTES = 30;
export const INACTIVE_CLEANUP_HOURS = 24;
export const PENDING_APPROVAL_HOURS = 1;

/** @deprecated Use getUserSessionLimit — kept for imports that referenced the old cap */
export const MAX_CONCURRENT_SESSIONS = 2;

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function hashDeviceFingerprint(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Server-side fingerprint from request headers */
export function generateDeviceFingerprint(userAgent: string, ip: string): string {
  return createHash('sha256')
    .update(`${userAgent}-${ip}`)
    .digest('hex')
    .substring(0, 32);
}

export type SessionRecord = {
  id: string;
  device_fingerprint: string;
  last_active: string;
  created_at: string;
  user_agent: string | null;
  is_current?: boolean;
};

export type RegisterSessionResult =
  | { ok: true; sessionId?: string; evicted?: boolean }
  | {
      ok: false;
      error: string;
      pendingConfirmation?: boolean;
      blocked?: boolean;
    };

export async function getUserSessionLimit(userId: string): Promise<number> {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .maybeSingle();

  return getSessionLimit(profile?.subscription_tier);
}

async function countActiveSessions(userId: string): Promise<number> {
  const supabase = createAdminClient();
  const activeSince = new Date(
    Date.now() - INACTIVE_CLEANUP_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { count } = await supabase
    .from('active_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('last_active', activeSince);

  return count ?? 0;
}

async function evictOldestSession(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: oldest } = await supabase
    .from('active_sessions')
    .select('id')
    .eq('user_id', userId)
    .order('last_active', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!oldest?.id) return false;

  await supabase.from('active_sessions').delete().eq('id', oldest.id);
  return true;
}

export async function registerSession(
  userId: string,
  sessionToken: string,
  deviceFingerprintRaw: string,
  _userEmail?: string | null,
  userAgent?: string | null
): Promise<RegisterSessionResult> {
  const supabase = createAdminClient();
  const tokenHash = hashSessionToken(sessionToken);
  const fingerprintHash = hashDeviceFingerprint(deviceFingerprintRaw);
  const nowIso = new Date().toISOString();

  const { data: existing } = await supabase
    .from('active_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('session_token', tokenHash)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('active_sessions')
      .update({
        last_active: nowIso,
        device_fingerprint: fingerprintHash,
        user_agent: userAgent || null,
      })
      .eq('id', existing.id);
    return { ok: true, sessionId: existing.id };
  }

  const limit = await getUserSessionLimit(userId);
  const activeCount = await countActiveSessions(userId);
  let evicted = false;

  if (activeCount >= limit && limit < 999999) {
    evicted = await evictOldestSession(userId);
    if (!evicted && activeCount >= limit) {
      return {
        ok: false,
        error: `Session limit reached (${limit} on your plan). Sign out another device to continue.`,
        blocked: true,
      };
    }
  }

  const { data: inserted, error } = await supabase
    .from('active_sessions')
    .insert({
      user_id: userId,
      session_token: tokenHash,
      device_fingerprint: fingerprintHash,
      last_active: nowIso,
      user_agent: userAgent || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Session insert error:', error.message);
    return { ok: false, error: 'Failed to register session' };
  }

  return { ok: true, sessionId: inserted?.id, evicted };
}

export async function validateSession(sessionToken: string): Promise<{
  valid: boolean;
  userId?: string;
}> {
  const supabase = createAdminClient();
  const tokenHash = hashSessionToken(sessionToken);
  const staleBefore = new Date(
    Date.now() - INACTIVE_CLEANUP_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data: session } = await supabase
    .from('active_sessions')
    .select('user_id, last_active')
    .eq('session_token', tokenHash)
    .maybeSingle();

  if (!session) {
    return { valid: false };
  }

  if (session.last_active < staleBefore) {
    await supabase.from('active_sessions').delete().eq('session_token', tokenHash);
    return { valid: false };
  }

  await supabase
    .from('active_sessions')
    .update({ last_active: new Date().toISOString() })
    .eq('session_token', tokenHash);

  return { valid: true, userId: session.user_id };
}

export async function removeSession(sessionToken: string): Promise<void> {
  const supabase = createAdminClient();
  const tokenHash = hashSessionToken(sessionToken);
  await supabase.from('active_sessions').delete().eq('session_token', tokenHash);
}

export async function getUserActiveSessions(userId: string): Promise<SessionRecord[]> {
  return listActiveSessionsForUser(userId);
}

export async function listActiveSessionsForUser(
  userId: string,
  currentTokenHash?: string
): Promise<SessionRecord[]> {
  const supabase = createAdminClient();
  const activeSince = new Date(
    Date.now() - INACTIVE_CLEANUP_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data } = await supabase
    .from('active_sessions')
    .select('id, session_token, device_fingerprint, last_active, created_at, user_agent')
    .eq('user_id', userId)
    .gte('last_active', activeSince)
    .order('last_active', { ascending: false });

  return (data || []).map((row) => ({
    id: row.id,
    device_fingerprint: row.device_fingerprint,
    last_active: row.last_active,
    created_at: row.created_at,
    user_agent: row.user_agent,
    is_current: currentTokenHash ? row.session_token === currentTokenHash : false,
  }));
}

export async function revokeSession(
  userId: string,
  sessionId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('active_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function revokeOtherSessions(
  userId: string,
  currentTokenHash: string
): Promise<{ ok: boolean; revoked?: number; error?: string }> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('active_sessions')
    .select('id, session_token')
    .eq('user_id', userId);

  const toRevoke = (data || []).filter((s) => s.session_token !== currentTokenHash);
  if (toRevoke.length === 0) {
    return { ok: true, revoked: 0 };
  }

  const { error } = await supabase
    .from('active_sessions')
    .delete()
    .in(
      'id',
      toRevoke.map((s) => s.id)
    );

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, revoked: toRevoke.length };
}

export async function revokeAllSessions(userId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('active_sessions').delete().eq('user_id', userId);
  await supabase.from('pending_session_approvals').delete().eq('user_id', userId);
}

export async function handleSessionConfirmation(
  confirmToken: string,
  action: 'approve' | 'secure'
): Promise<{ ok: boolean; message: string }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: pending } = await supabase
    .from('pending_session_approvals')
    .select('*')
    .eq('confirm_token', confirmToken)
    .is('approved_at', null)
    .maybeSingle();

  if (!pending || pending.expires_at < now) {
    return { ok: false, message: 'This confirmation link is invalid or has expired.' };
  }

  if (action === 'secure') {
    await revokeAllSessions(pending.user_id);
    await supabase.from('pending_session_approvals').delete().eq('id', pending.id);
    return {
      ok: true,
      message: 'All sessions have been signed out. Please sign in again to continue.',
    };
  }

  await supabase.from('active_sessions').insert({
    user_id: pending.user_id,
    session_token: pending.session_token,
    device_fingerprint: pending.device_fingerprint,
    last_active: now,
    user_agent: pending.user_agent,
  });

  await supabase
    .from('pending_session_approvals')
    .update({ approved_at: now })
    .eq('id', pending.id);

  return {
    ok: true,
    message: 'Device approved. Return to NiskBuild and refresh — your session is now active.',
  };
}

export async function cleanupStaleSessions(): Promise<number> {
  const supabase = createAdminClient();
  const staleBefore = new Date(
    Date.now() - INACTIVE_CLEANUP_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data } = await supabase
    .from('active_sessions')
    .delete()
    .lt('last_active', staleBefore)
    .select('id');

  await supabase
    .from('pending_session_approvals')
    .delete()
    .lt('expires_at', new Date().toISOString());

  return data?.length ?? 0;
}
