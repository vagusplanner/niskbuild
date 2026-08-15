import { redirect } from 'next/navigation';
import ShiftAiEssayWorkshopClient from '@/app/builder/shift-ai/essay-workshop/ShiftAiEssayWorkshopClient';
import { normalizeCurriculum } from '@/lib/shift-ai/essay-curriculum';
import { createAdminClient } from '@/lib/supabase/admin';
import { shiftAiCatalog } from '@/lib/shift-ai/i18n';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { getRequestStudyLanguage } from '@/lib/shift-ai/study-language';
import { getSafeSession } from '@/lib/supabaseSession.server';

export default async function ShiftAiEssayWorkshopPage() {
  const session = await getSafeSession();

  if (!session?.user) {
    redirect('/builder/shift-ai/login');
  }

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
  ).filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  return (
    <ShiftAiEssayWorkshopClient
      subjectOptions={subjectOptions}
      curriculum={normalizeCurriculum(student.curriculum)}
    />
  );
}

export async function generateMetadata() {
  return {
    title: shiftAiCatalog(await getRequestStudyLanguage()).essayWorkshop.metaTitle,
    robots: 'noindex',
  };
}
