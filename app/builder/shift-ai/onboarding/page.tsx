import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSafeSession } from '@/lib/supabaseSession.server';
import ShiftAiOnboardingForm from '@/app/builder/shift-ai/onboarding/ShiftAiOnboardingForm';
import { type ShiftAgeRange, type ShiftCurriculum } from '@/lib/shift-ai/constants';
import { shiftAiCatalog } from '@/lib/shift-ai/i18n';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { getRequestStudyLanguage } from '@/lib/shift-ai/study-language';
import { SA } from '@/lib/shift-ai/theme';

export default async function ShiftAiOnboardingPage() {
  const session = await getSafeSession();

  if (!session?.user) {
    redirect('/login?next=/builder/shift-ai/onboarding');
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('id, full_name, curriculum, year_group, age_range, favourite_subjects, account_type')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (student && !needsSubjectOnboarding(student)) {
    redirect('/builder/shift-ai/dashboard');
  }

  const completeMode = Boolean(student);
  const catalog = shiftAiCatalog(await getRequestStudyLanguage());

  return (
    <main className={SA.authPage}>
      <div className="mx-auto max-w-lg">
        <header className="mb-10 text-center">
          <p className={SA.authKicker}>{catalog.auth.brand}</p>
          <h1 className={`mt-2 text-3xl font-bold ${SA.text}`}>
            {completeMode ? catalog.onboarding.chooseSubjects : catalog.onboarding.setupProfile}
          </h1>
          <p className={`mt-3 ${SA.muted}`}>
            {completeMode
              ? catalog.onboarding.completeSubtitle
              : catalog.onboarding.createSubtitle}
          </p>
        </header>
        <ShiftAiOnboardingForm
          mode={completeMode ? 'complete' : 'create'}
          initialProfile={
            student
              ? {
                  fullName: student.full_name,
                  curriculum: (student.curriculum || 'uk') as ShiftCurriculum,
                  yearGroup: student.year_group,
                  ageRange: String(student.age_range) as ShiftAgeRange,
                }
              : undefined
          }
        />
      </div>
    </main>
  );
}

export async function generateMetadata() {
  return {
    title: shiftAiCatalog(await getRequestStudyLanguage()).onboarding.metaTitle,
    robots: 'noindex',
  };
}
