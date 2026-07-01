import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSafeSession } from '@/lib/supabaseSession.server';
import ShiftAiOnboardingForm from '@/app/builder/shift-ai/onboarding/ShiftAiOnboardingForm';
import {
  SHIFT_CURRICULUM_LABELS,
  type ShiftAgeRange,
  type ShiftCurriculum,
} from '@/lib/shift-ai/constants';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';

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

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white px-6 py-16">
      <div className="mx-auto max-w-lg">
        <header className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Shift AI</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {completeMode ? 'Choose your subjects' : 'Set up your profile'}
          </h1>
          <p className="mt-3 text-slate-600">
            {completeMode
              ? 'Pick up to three favourite subjects so we can personalise your tutors and dashboard.'
              : 'Tell us a little about you so we can personalise your tutors.'}
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
                  curriculumLabel:
                    SHIFT_CURRICULUM_LABELS[(student.curriculum || 'uk') as ShiftCurriculum],
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
    title: 'Onboarding · Shift AI',
    robots: 'noindex',
  };
}
