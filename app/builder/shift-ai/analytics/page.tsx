import { redirect } from 'next/navigation';
import ShiftAiAnalyticsClient from '@/app/builder/shift-ai/analytics/ShiftAiAnalyticsClient';
import { buildActivityHeatmap, buildAnalyticsSnapshot } from '@/lib/shift-ai/analytics';
import { shiftAiCatalog } from '@/lib/shift-ai/i18n';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { getRequestStudyLanguage } from '@/lib/shift-ai/study-language';
import { createAdminClient } from '@/lib/supabase/admin';
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
  const heatmapDays = await buildActivityHeatmap(student.id, 84);
  const heatmapTotal = heatmapDays.reduce((sum, d) => sum + d.count, 0);
  const heatmapActiveDays = heatmapDays.filter((d) => d.count > 0).length;

  return (
    <ShiftAiAnalyticsClient
      subjectOptions={subjectOptions}
      initialSnapshot={initialSnapshot}
      heatmapDays={heatmapDays}
      heatmapTotal={heatmapTotal}
      heatmapActiveDays={heatmapActiveDays}
    />
  );
}

export async function generateMetadata() {
  return {
    title: shiftAiCatalog(await getRequestStudyLanguage()).analytics.metaTitle,
    robots: 'noindex',
  };
}
