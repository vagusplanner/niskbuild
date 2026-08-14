import { redirect } from 'next/navigation';
import ShiftAiContentGeneratorClient from '@/app/builder/shift-ai/content-generator/ShiftAiContentGeneratorClient';
import { normalizeCurriculum } from '@/lib/shift-ai/essay-curriculum';
import { createAdminClient } from '@/lib/supabase/admin';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { ensureSubjectRecord, mergeStudentSubjects } from '@/lib/shift-ai/subjects';
import { getSafeSession } from '@/lib/supabaseSession.server';

type PageProps = {
  searchParams: Promise<{ subject?: string; type?: string }>;
};

export default async function ShiftAiContentGeneratorPage({ searchParams }: PageProps) {
  const { subject: subjectParam, type: typeParam } = await searchParams;
  const session = await getSafeSession();

  if (!session?.user) {
    redirect('/builder/shift-ai/login');
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('id, favourite_subjects, year_group, curriculum')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!student || needsSubjectOnboarding(student)) {
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

  const merged = mergeStudentSubjects(favouriteSubjects, subjectRows ?? []);
  const subjectOptions = await Promise.all(
    merged.map(async (s) => ({
      name: s.name,
      dbId: await ensureSubjectRecord(student.id, s),
    }))
  );

  const { data: noteRows } = await admin
    .schema('firstparty')
    .from('shift_notes')
    .select('subject_id, content')
    .eq('student_id', student.id);

  const notesBySubjectId: Record<string, string> = {};
  for (const row of noteRows ?? []) {
    if (row.subject_id && typeof row.content === 'string') {
      notesBySubjectId[row.subject_id] = row.content;
    }
  }

  return (
    <ShiftAiContentGeneratorClient
      subjectOptions={subjectOptions}
      curriculum={normalizeCurriculum(student.curriculum)}
      yearGroup={student.year_group || 'secondary school'}
      notesBySubjectId={notesBySubjectId}
      initialSubject={subjectParam ?? null}
      initialType={typeParam ?? null}
    />
  );
}

export async function generateMetadata() {
  return {
    title: 'Content Generator · Shift AI',
    robots: 'noindex',
  };
}
