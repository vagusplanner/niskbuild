import { redirect } from 'next/navigation';
import ShiftAiPlannerClient from '@/app/builder/shift-ai/planner/ShiftAiPlannerClient';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ShiftPlannerItem } from '@/lib/shift-ai/planner';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { getSafeSession } from '@/lib/supabaseSession.server';

export default async function ShiftAiPlannerPage() {
  const session = await getSafeSession();

  if (!session?.user) {
    redirect('/builder/shift-ai/login');
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('id, favourite_subjects')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!student || needsSubjectOnboarding(student)) {
    redirect('/builder/shift-ai/onboarding');
  }

  const { data: rows, error } = await admin
    .schema('firstparty')
    .from('shift_planner_items')
    .select('id, title, description, item_type, due_date, completed')
    .eq('student_id', student.id)
    .order('due_date', { ascending: true });

  const initialItems: ShiftPlannerItem[] = error || !rows ? [] : (rows as ShiftPlannerItem[]);

  const subjectOptions = (
    Array.isArray(student.favourite_subjects) ? student.favourite_subjects : []
  ).filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  return (
    <ShiftAiPlannerClient initialItems={initialItems} subjectOptions={subjectOptions} />
  );
}

export async function generateMetadata() {
  return {
    title: 'Planner · Shift AI',
    robots: 'noindex',
  };
}
