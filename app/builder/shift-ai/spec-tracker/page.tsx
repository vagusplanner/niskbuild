import { redirect } from 'next/navigation';
import ShiftAiSpecTrackerClient from '@/app/builder/shift-ai/spec-tracker/ShiftAiSpecTrackerClient';
import { normalizeCurriculum } from '@/lib/shift-ai/essay-curriculum';
import type { SpecPoint } from '@/lib/shift-ai/spec-tracker-shared';
import { createAdminClient } from '@/lib/supabase/admin';
import { shiftAiCatalog } from '@/lib/shift-ai/i18n';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { getRequestStudyLanguage } from '@/lib/shift-ai/study-language';
import { getSafeSession } from '@/lib/supabaseSession.server';

export default async function ShiftAiSpecTrackerPage() {
  const session = await getSafeSession();
  if (!session?.user) redirect('/builder/shift-ai/login');

  const admin = createAdminClient();
  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('id, favourite_subjects, curriculum')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!student || needsSubjectOnboarding(student)) {
    redirect('/builder/shift-ai/onboarding');
  }

  const subjectOptions = (
    Array.isArray(student.favourite_subjects) ? student.favourite_subjects : []
  ).filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  const { data: pointRows } = await admin
    .schema('firstparty')
    .from('shift_spec_points')
    .select('id, student_id, subject, spec_code, description, status, updated_at')
    .eq('student_id', student.id)
    .order('spec_code', { ascending: true });

  return (
    <ShiftAiSpecTrackerClient
      subjectOptions={subjectOptions}
      curriculum={normalizeCurriculum(student.curriculum)}
      initialPoints={(pointRows ?? []) as SpecPoint[]}
    />
  );
}

export async function generateMetadata() {
  return {
    title: shiftAiCatalog(await getRequestStudyLanguage()).specTracker.metaTitle,
    robots: 'noindex',
  };
}
