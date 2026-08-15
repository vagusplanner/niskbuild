import { redirect } from 'next/navigation';
import ShiftAiArcadeClient from '@/app/builder/shift-ai/arcade/ShiftAiArcadeClient';
import type { ArcadeScoreRecord } from '@/lib/shift-ai/arcade-shared';
import { shiftAiCatalog } from '@/lib/shift-ai/i18n';
import { createAdminClient } from '@/lib/supabase/admin';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { getRequestStudyLanguage } from '@/lib/shift-ai/study-language';
import { getSafeSession } from '@/lib/supabaseSession.server';

type PageProps = {
  searchParams: Promise<{ subject?: string }>;
};

export default async function ShiftAiArcadePage({ searchParams }: PageProps) {
  const { subject: subjectParam } = await searchParams;
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

  const subjectOptions = (
    Array.isArray(student.favourite_subjects) ? student.favourite_subjects : []
  ).filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  const { data: scoreRows, error } = await admin
    .schema('firstparty')
    .from('shift_arcade_scores')
    .select('id, subject, score, questions_total, questions_correct, streak_bonus, played_at')
    .eq('student_id', student.id)
    .order('played_at', { ascending: false })
    .limit(10);

  const recentScores: ArcadeScoreRecord[] =
    error || !scoreRows ? [] : (scoreRows as ArcadeScoreRecord[]);

  return (
    <ShiftAiArcadeClient
      subjectOptions={subjectOptions}
      recentScores={recentScores}
      initialSubject={subjectParam ?? null}
    />
  );
}

export async function generateMetadata() {
  return {
    title: shiftAiCatalog(await getRequestStudyLanguage()).arcade.metaTitle,
    robots: 'noindex',
  };
}
