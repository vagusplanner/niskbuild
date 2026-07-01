/**
 * Shift AI parent/mentor token validation — server-side only.
 *
 * Call only from Next.js Server Components, API routes, or route handlers.
 * Never import from client components; the admin client uses the service role key.
 */
import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export async function validateParentToken(token: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .schema('firstparty')
    .from('shift_parent_tokens')
    .select('student_id')
    .eq('token', token)
    .is('revoked_at', null)
    .maybeSingle();

  return data?.student_id ?? null;
}

export async function validateMentorToken(token: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .schema('firstparty')
    .from('shift_mentor_tokens')
    .select('student_id')
    .eq('token', token)
    .is('revoked_at', null)
    .maybeSingle();

  return data?.student_id ?? null;
}
