import { redirect } from 'next/navigation';
import ShiftAiSettingsClient from '@/app/builder/shift-ai/settings/ShiftAiSettingsClient';
import { getSettingsProfile, listActiveInviteTokens } from '@/lib/shift-ai/settings';
import { createAdminClient } from '@/lib/supabase/admin';
import { shiftAiCatalog } from '@/lib/shift-ai/i18n';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { getRequestStudyLanguage } from '@/lib/shift-ai/study-language';
import { getSafeSession } from '@/lib/supabaseSession.server';
import { getSuperEduc8Origin } from '@/lib/supereduc8-host';

export default async function ShiftAiSettingsPage() {
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

  const [profile, tokens] = await Promise.all([
    getSettingsProfile(student.id),
    listActiveInviteTokens(student.id),
  ]);

  if (!profile) {
    redirect('/builder/shift-ai/onboarding');
  }

  const appOrigin = getSuperEduc8Origin();

  return (
    <ShiftAiSettingsClient profile={profile} initialTokens={tokens} appOrigin={appOrigin} />
  );
}

export async function generateMetadata() {
  return {
    title: shiftAiCatalog(await getRequestStudyLanguage()).settings.metaTitle,
    robots: 'noindex',
  };
}
