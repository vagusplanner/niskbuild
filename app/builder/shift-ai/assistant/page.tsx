import { redirect } from 'next/navigation';
import ShiftAiAssistantClient from '@/app/builder/shift-ai/assistant/ShiftAiAssistantClient';
import type { ShiftChatMessage } from '@/lib/shift-ai/assistant';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSafeSession } from '@/lib/supabaseSession.server';

export default async function ShiftAiAssistantPage() {
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

  const { data: rows, error } = await admin
    .schema('firstparty')
    .from('shift_chat_history')
    .select('id, role, content, subject, created_at')
    .eq('student_id', student.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const initialMessages: ShiftChatMessage[] =
    error || !rows
      ? []
      : (rows as ShiftChatMessage[]).slice().reverse();

  const subjectOptions = (
    Array.isArray(student.favourite_subjects) ? student.favourite_subjects : []
  ).filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  return (
    <ShiftAiAssistantClient
      initialMessages={initialMessages}
      subjectOptions={subjectOptions}
    />
  );
}

export async function generateMetadata() {
  return {
    title: 'Teaching Assistant · Shift AI',
    robots: 'noindex',
  };
}
