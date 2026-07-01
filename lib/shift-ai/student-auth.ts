import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export type ShiftStudentRow = {
  id: string;
  favourite_subjects: string[] | null;
};

export async function getShiftStudentForRequest(): Promise<
  | { ok: true; userId: string; student: ShiftStudentRow }
  | { ok: false; status: number; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const admin = createAdminClient();
  const { data: student, error } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('id, favourite_subjects')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !student) {
    return { ok: false, status: 404, error: 'Student profile not found' };
  }

  return { ok: true, userId: user.id, student };
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
