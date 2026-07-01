import { notFound, redirect } from 'next/navigation';
import ShiftAiSubjectClient from '@/app/builder/shift-ai/subject/[subjectId]/ShiftAiSubjectClient';
import type { ShiftChatMessage } from '@/lib/shift-ai/assistant';
import {
  ensureSubjectRecord,
  mergeStudentSubjects,
  resolveSubjectByParam,
  subjectIcon,
  type ShiftSubjectRow,
} from '@/lib/shift-ai/subjects';
import { SHIFT_CURRICULUM_LABELS, type ShiftCurriculum } from '@/lib/shift-ai/constants';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSafeSession } from '@/lib/supabaseSession.server';

type PageProps = {
  params: Promise<{ subjectId: string }>;
};

export default async function ShiftAiSubjectPage({ params }: PageProps) {
  const { subjectId } = await params;
  const session = await getSafeSession();

  if (!session?.user) {
    redirect('/builder/shift-ai/login');
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('id, favourite_subjects, year_group, key_stage, curriculum')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!student) {
    redirect('/builder/shift-ai/onboarding');
  }

  const favouriteSubjects = (
    Array.isArray(student.favourite_subjects) ? student.favourite_subjects : []
  ).filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  const { data: subjectRows } = await admin
    .schema('firstparty')
    .from('shift_subjects')
    .select('id, name, ai_persona, is_favourite')
    .eq('student_id', student.id);

  const mergedSubjects = mergeStudentSubjects(
    favouriteSubjects,
    (subjectRows || []) as ShiftSubjectRow[]
  );
  const subject = resolveSubjectByParam(mergedSubjects, subjectId);

  if (!subject) {
    notFound();
  }

  const subjectDbId = await ensureSubjectRecord(student.id, subject);

  const { data: noteRow } = await admin
    .schema('firstparty')
    .from('shift_notes')
    .select('content, updated_at')
    .eq('student_id', student.id)
    .eq('subject_id', subjectDbId)
    .maybeSingle();

  const { data: chatRows, error: chatError } = await admin
    .schema('firstparty')
    .from('shift_chat_history')
    .select('id, role, content, subject, created_at')
    .eq('student_id', student.id)
    .eq('subject', subject.name)
    .order('created_at', { ascending: false })
    .limit(20);

  const initialMessages: ShiftChatMessage[] =
    chatError || !chatRows ? [] : (chatRows as ShiftChatMessage[]).slice().reverse();

  const curriculum = (student.curriculum || 'uk') as ShiftCurriculum;

  return (
    <ShiftAiSubjectClient
      subject={{
        dbId: subjectDbId,
        name: subject.name,
        slug: subject.slug,
        icon: subjectIcon(subject.name),
        aiPersona: subject.aiPersona,
        isFavourite: subject.isFavourite,
      }}
      profile={{
        yearGroup: student.year_group,
        keyStage: student.key_stage,
        curriculumLabel: SHIFT_CURRICULUM_LABELS[curriculum],
      }}
      initialNotes={noteRow?.content ?? ''}
      notesUpdatedAt={noteRow?.updated_at ?? null}
      initialMessages={initialMessages}
    />
  );
}

export async function generateMetadata() {
  return {
    title: 'Subject · Shift AI',
    robots: 'noindex',
  };
}
