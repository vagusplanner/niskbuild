import 'server-only';

import type { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type ShiftStudentRow = {
  id: string;
  favourite_subjects: string[] | null;
  full_name: string | null;
  is_active: boolean | null;
  curriculum: string | null;
  year_group: string | null;
  age_range: string | null;
  account_type: string | null;
  study_language: string | null;
};

/**
 * Resolve the authenticated user from cookie session and/or Bearer token.
 * Same dual-path pattern as requireApiUser in lib/api-auth.ts — required for the
 * Shift AI SPA / Capacitor clients that cannot rely on same-origin cookies.
 */
export async function resolveRequestUser(
  request?: NextRequest | null
): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error && user) {
    return user;
  }

  if (request) {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (token) {
      const {
        data: { user: bearerUser },
        error: bearerError,
      } = await supabase.auth.getUser(token);
      if (!bearerError && bearerUser) {
        return bearerUser;
      }
    }
  }

  return null;
}

export async function getShiftStudentForRequest(
  request?: NextRequest | null
): Promise<
  | { ok: true; userId: string; student: ShiftStudentRow }
  | { ok: false; status: number; error: string }
> {
  const user = await resolveRequestUser(request);

  if (!user) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const admin = createAdminClient();
  const { data: student, error } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select(
      'id, favourite_subjects, full_name, is_active, curriculum, year_group, age_range, account_type, study_language'
    )
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !student) {
    return { ok: false, status: 404, error: 'Student profile not found' };
  }

  return {
    ok: true,
    userId: user.id,
    student: student as ShiftStudentRow,
  };
}

export async function getOwnedPlannerItem(studentId: string, itemId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .schema('firstparty')
    .from('shift_planner_items')
    .select('id, student_id, completed')
    .eq('id', itemId)
    .maybeSingle();

  if (!data || data.student_id !== studentId) {
    return null;
  }

  return data;
}
