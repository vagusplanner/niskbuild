/**
 * Shift AI parental consent token validation — server-side only.
 */
import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export type ConsentRequestView = {
  id: string;
  studentId: string;
  parentEmail: string;
  status: string;
  expiresAt: string;
  childFirstName: string;
  yearGroup: string;
  accountType: string;
};

export async function getConsentRequestByToken(
  token: string
): Promise<ConsentRequestView | null> {
  const admin = createAdminClient();
  const { data: request } = await admin
    .schema('firstparty')
    .from('shift_parent_consent_requests')
    .select('id, student_id, parent_email, status, expires_at')
    .eq('consent_token', token)
    .maybeSingle();

  if (!request) return null;

  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('full_name, year_group, account_type')
    .eq('id', request.student_id)
    .maybeSingle();

  if (!student) return null;

  return {
    id: request.id,
    studentId: request.student_id,
    parentEmail: request.parent_email,
    status: request.status,
    expiresAt: request.expires_at,
    childFirstName: student.full_name?.trim() || 'your child',
    yearGroup: student.year_group?.trim() || '',
    accountType: student.account_type,
  };
}

export function isConsentRequestValid(request: ConsentRequestView): boolean {
  if (request.status !== 'pending') return false;
  return new Date(request.expiresAt).getTime() > Date.now();
}
