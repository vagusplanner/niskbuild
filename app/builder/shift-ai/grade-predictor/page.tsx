import { redirect } from 'next/navigation';
import ShiftAiGradePredictorClient from '@/app/builder/shift-ai/grade-predictor/ShiftAiGradePredictorClient';
import type { SavedGradePrediction } from '@/lib/shift-ai/grade-predictor-shared';
import { createAdminClient } from '@/lib/supabase/admin';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { getSafeSession } from '@/lib/supabaseSession.server';

export default async function ShiftAiGradePredictorPage() {
  const session = await getSafeSession();
  if (!session?.user) redirect('/builder/shift-ai/login');

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
  ).filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  const { data: predictionRows } = await admin
    .schema('firstparty')
    .from('shift_grade_predictions')
    .select('id, subject, predicted_grade, confidence, factors, generated_at')
    .eq('student_id', student.id)
    .order('generated_at', { ascending: false })
    .limit(20);

  const recentPredictions = (predictionRows ?? []) as SavedGradePrediction[];

  return (
    <ShiftAiGradePredictorClient
      subjectOptions={subjectOptions}
      recentPredictions={recentPredictions}
    />
  );
}

export async function generateMetadata() {
  return { title: 'Grade Predictor · Shift AI', robots: 'noindex' };
}
