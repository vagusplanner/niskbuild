import { redirect } from 'next/navigation';
import ShiftAiEssayMarkerClient from '@/app/builder/shift-ai/essay-marker/ShiftAiEssayMarkerClient';
import { normalizeCurriculum } from '@/lib/shift-ai/essay-curriculum';
import { createAdminClient } from '@/lib/supabase/admin';
import { shiftAiCatalog } from '@/lib/shift-ai/i18n';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { getRequestStudyLanguage } from '@/lib/shift-ai/study-language';
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

  const catalog = shiftAiCatalog(await getRequestStudyLanguage());
  const subjectOptions = (
    Array.isArray(student.favourite_subjects) ? student.favourite_subjects : []
  ).filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  return (
    <ShiftAiEssayMarkerClient
      subjectOptions={subjectOptions}
      curriculum={normalizeCurriculum(student.curriculum)}
      yearGroup={student.year_group || catalog.essayMarker.secondarySchool}
    />
  );
}

export async function generateMetadata() {
  return {
    title: shiftAiCatalog(await getRequestStudyLanguage()).essayMarker.metaTitle,
    robots: 'noindex',
  };
}
