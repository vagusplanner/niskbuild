import 'server-only';

import { randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

const STATE_TTL_MS = 10 * 60 * 1000;

export function generateOAuthState(): string {
  return randomBytes(32).toString('hex');
}

export async function storeOAuthState(userId: string, provider: 'buffer' = 'buffer'): Promise<string> {
  const state = generateOAuthState();
  const expiresAt = new Date(Date.now() + STATE_TTL_MS).toISOString();
  const admin = createAdminClient();

  const { error } = await admin
    .schema('firstparty')
    .from('oauth_states')
    .insert({ state, user_id: userId, provider, expires_at: expiresAt });

  if (error) {
    throw new Error(`Failed to store OAuth state: ${error.message}`);
  }

  return state;
}

export type VerifiedOAuthState = {
  userId: string;
  provider: string;
};

/** Verify state belongs to the authenticated user and has not expired. Marks as used. */
export async function consumeOAuthState(
  state: string,
  expectedUserId: string
): Promise<VerifiedOAuthState | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .schema('firstparty')
    .from('oauth_states')
    .select('user_id, provider, expires_at, used_at')
    .eq('state', state)
    .maybeSingle();

  if (error || !data) return null;
  if (data.used_at) return null;
  if (new Date(data.expires_at as string).getTime() < Date.now()) return null;
  if (data.user_id !== expectedUserId) return null;

  await admin
    .schema('firstparty')
    .from('oauth_states')
    .update({ used_at: new Date().toISOString() })
    .eq('state', state);

  return { userId: data.user_id as string, provider: data.provider as string };
}
