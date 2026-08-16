import { redirect } from 'next/navigation';
import ShiftAiCurriculumPacksClient from '@/app/builder/shift-ai/curriculum-packs/ShiftAiCurriculumPacksClient';
import { listPublishedPacks } from '@/lib/shift-ai/curriculum-packs';
import { normalizeCurriculum } from '@/lib/shift-ai/essay-curriculum';
import { createAdminClient } from '@/lib/supabase/admin';
import { shiftAiCatalog } from '@/lib/shift-ai/i18n';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { getRequestStudyLanguage } from '@/lib/shift-ai/study-language';
import { getSafeSession } from '@/lib/supabaseSession.server';

export default async function ShiftAiCurriculumPacksPage() {
  const session = await getSafeSession();
  if (!session?.user) redirect('/builder/shift-ai/login');

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
  ).filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  const catalog = shiftAiCatalog(await getRequestStudyLanguage());
  const curriculum = normalizeCurriculum(student.curriculum);
  const yearGroup = student.year_group?.trim() || catalog.curriculumPacks.secondarySchool;

  const initialPacks = await listPublishedPacks({ curriculum, yearGroup });

  return (
    <ShiftAiCurriculumPacksClient
      subjectOptions={subjectOptions}
      curriculum={curriculum}
      yearGroup={yearGroup}
      initialPacks={initialPacks}
    />
  );
}

export async function generateMetadata() {
  return {
    title: shiftAiCatalog(await getRequestStudyLanguage()).curriculumPacks.metaTitle,
    robots: 'noindex',
  };
}
