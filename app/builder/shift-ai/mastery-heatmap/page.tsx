import { redirect } from 'next/navigation';
import ShiftAiMasteryHeatmapClient from '@/app/builder/shift-ai/mastery-heatmap/ShiftAiMasteryHeatmapClient';
import { buildActivityHeatmap } from '@/lib/shift-ai/analytics';
import { createAdminClient } from '@/lib/supabase/admin';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { getSafeSession } from '@/lib/supabaseSession.server';

export default async function ShiftAiMasteryHeatmapPage() {
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

  const heatmapDays = await buildActivityHeatmap(student.id, 84);
  const totalActivity = heatmapDays.reduce((sum, d) => sum + d.count, 0);
  const activeDays = heatmapDays.filter((d) => d.count > 0).length;

  return (
    <ShiftAiMasteryHeatmapClient
      heatmapDays={heatmapDays}
      totalActivity={totalActivity}
      activeDays={activeDays}
    />
  );
}

export async function generateMetadata() {
  return { title: 'Mastery Heatmap · Shift AI', robots: 'noindex' };
}
