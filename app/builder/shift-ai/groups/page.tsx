import { redirect } from 'next/navigation';
import ShiftAiGroupsClient from '@/app/builder/shift-ai/groups/ShiftAiGroupsClient';
import { listGroupsForStudent } from '@/lib/shift-ai/groups';
import { shiftAiCatalog } from '@/lib/shift-ai/i18n';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { getRequestStudyLanguage } from '@/lib/shift-ai/study-language';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSafeSession } from '@/lib/supabaseSession.server';

export default async function ShiftAiGroupsPage() {
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

  const groups = await listGroupsForStudent(student.id);

  return <ShiftAiGroupsClient subjectOptions={subjectOptions} initialGroups={groups} />;
}

export async function generateMetadata() {
  return {
    title: shiftAiCatalog(await getRequestStudyLanguage()).groups.metaTitle,
    robots: 'noindex',
  };
}
