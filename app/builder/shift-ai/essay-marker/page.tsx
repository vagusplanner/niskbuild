import { redirect } from 'next/navigation';
import ShiftAiEssayMarkerClient from '@/app/builder/shift-ai/essay-marker/ShiftAiEssayMarkerClient';
import { normalizeCurriculum } from '@/lib/shift-ai/essay-curriculum';
import { createAdminClient } from '@/lib/supabase/admin';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { getSafeSession } from '@/lib/supabaseSession.server';

export default async function ShiftAiEssayMarkerPage() {
  const session = await getSafeSession();

  if (!session?.user) {
    redirect('/builder/shift-ai/login');
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('id, favourite_subjects, year_group, curriculum')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!student || needsSubjectOnboarding(student)) {
    redirect('/builder/shift-ai/onboarding');
  }

  const subjectOptions = (
    Array.isArray(student.favourite_subjects) ? student.favourite_subjects : []
  ).filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  return (
    <ShiftAiEssayMarkerClient
      subjectOptions={subjectOptions}
      curriculum={normalizeCurriculum(student.curriculum)}
      yearGroup={student.year_group || 'secondary school'}
    />
  );
}

export async function generateMetadata() {
  return {
    title: 'Essay Marker · Shift AI',
    robots: 'noindex',
  };
}
