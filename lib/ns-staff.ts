import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { isPlatformOwner } from '@/lib/platform-owner-auth';

/**
 * Mirror firstparty.ns_is_staff(): platform owner OR ns_staff coach/admin.
 * Used in service-role API handlers where auth.uid() RLS helpers don't apply.
 */
export async function isNsStaffUser(userId: string): Promise<boolean> {
  if (!userId) return false;

  if (await isPlatformOwner(userId)) return true;

  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('firstparty')
    .from('ns_staff')
    .select('user_id, role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[ns-staff] lookup failed:', error.message);
    return false;
  }

  return Boolean(data && (data.role === 'coach' || data.role === 'admin'));
}
