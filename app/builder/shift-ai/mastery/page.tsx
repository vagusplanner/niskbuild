import { redirect } from 'next/navigation';
import ShiftAiMasteryClient from '@/app/builder/shift-ai/mastery/ShiftAiMasteryClient';
import type { MasteryTopic } from '@/lib/shift-ai/mastery-shared';
import { groupMasteryBySubject } from '@/lib/shift-ai/mastery-shared';
import { createAdminClient } from '@/lib/supabase/admin';
import { shiftAiCatalog } from '@/lib/shift-ai/i18n';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { getRequestStudyLanguage } from '@/lib/shift-ai/study-language';
import { getSafeSession } from '@/lib/supabaseSession.server';

export default async function ShiftAiMasteryPage() {
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

  const { data: topicRows } = await admin
    .schema('firstparty')
    .from('shift_mastery_topics')
    .select('id, student_id, subject, topic, status, updated_at, created_at')
    .eq('student_id', student.id)
    .order('subject', { ascending: true })
    .order('topic', { ascending: true });

  const topics = (topicRows ?? []) as MasteryTopic[];
  const subjectGroups = groupMasteryBySubject(topics, subjectOptions);

  return (
    <ShiftAiMasteryClient
      subjectOptions={subjectOptions}
      initialSubjectGroups={subjectGroups}
    />
  );
}

export async function generateMetadata() {
  return {
    title: shiftAiCatalog(await getRequestStudyLanguage()).mastery.metaTitle,
    robots: 'noindex',
  };
}
