import { redirect } from 'next/navigation';
import ShiftAiAnalyticsClient from '@/app/builder/shift-ai/analytics/ShiftAiAnalyticsClient';
import { buildAnalyticsSnapshot } from '@/lib/shift-ai/analytics';
import { createAdminClient } from '@/lib/supabase/admin';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { getSafeSession } from '@/lib/supabaseSession.server';

export default async function ShiftAiAnalyticsPage() {
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

  const initialSnapshot = await buildAnalyticsSnapshot(student.id, subjectOptions, '30', 'all');

  return (
    <ShiftAiAnalyticsClient subjectOptions={subjectOptions} initialSnapshot={initialSnapshot} />
  );
}

export async function generateMetadata() {
  return { title: 'Analytics · Shift AI', robots: 'noindex' };
}
