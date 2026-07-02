import { redirect } from 'next/navigation';
import ShiftAiHomeworkClient from '@/app/builder/shift-ai/homework/ShiftAiHomeworkClient';
import { createAdminClient } from '@/lib/supabase/admin';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { getSafeSession } from '@/lib/supabaseSession.server';

export default async function ShiftAiHomeworkPage() {
  const session = await getSafeSession();

  if (!session?.user) {
    redirect('/builder/shift-ai/login');
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('id, favourite_subjects, year_group')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!student || needsSubjectOnboarding(student)) {
    redirect('/builder/shift-ai/onboarding');
  }

  const subjectOptions = (
    Array.isArray(student.favourite_subjects) ? student.favourite_subjects : []
  ).filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  return (
    <ShiftAiHomeworkClient
      subjectOptions={subjectOptions}
      yearGroup={student.year_group || 'secondary school'}
    />
  );
}

export async function generateMetadata() {
  return {
    title: 'Snap Homework · Shift AI',
    robots: 'noindex',
  };
}
