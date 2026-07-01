import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { SHIFT_CURRICULUM_LABELS, type ShiftCurriculum } from '@/lib/shift-ai/constants';

export type ShiftSubjectRow = {
  id: string;
  name: string;
  ai_persona: string | null;
  is_favourite: boolean;
};

export type ShiftSubject = {
  id: string;
  dbId: string | null;
  name: string;
  aiPersona: string | null;
  isFavourite: boolean;
  slug: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function subjectNameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function subjectIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('math')) return '📐';
  if (lower.includes('english') || lower.includes('français') || lower.includes('french')) {
    return '📖';
  }
  if (lower.includes('science') || lower.includes('biology') || lower.includes('chemistry')) {
    return '🔬';
  }
  if (lower.includes('history')) return '🏛️';
  if (lower.includes('geograph')) return '🌍';
  if (lower.includes('comput') || lower.includes('nsi')) return '💻';
  if (lower.includes('art')) return '🎨';
  if (lower.includes('music')) return '🎵';
  if (lower.includes('pe') || lower.includes('sport') || lower.includes('eps')) return '⚽';
  return '📚';
}

export function curriculumLabel(curriculum: string): string {
  if (curriculum in SHIFT_CURRICULUM_LABELS) {
    return SHIFT_CURRICULUM_LABELS[curriculum as ShiftCurriculum];
  }
  return curriculum;
}

export function mergeStudentSubjects(
  favouriteSubjects: string[],
  dbRows: ShiftSubjectRow[]
): ShiftSubject[] {
  const byKey = new Map<string, ShiftSubject>();

  for (const row of dbRows) {
    const name = row.name.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    byKey.set(key, {
      id: row.id,
      dbId: row.id,
      name,
      aiPersona: row.ai_persona,
      isFavourite: row.is_favourite,
      slug: subjectNameToSlug(name),
    });
  }

  for (const raw of favouriteSubjects) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = byKey.get(key);
    if (existing) {
      existing.isFavourite = true;
      continue;
    }
    byKey.set(key, {
      id: subjectNameToSlug(name),
      dbId: null,
      name,
      aiPersona: null,
      isFavourite: true,
      slug: subjectNameToSlug(name),
    });
  }

  return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function resolveSubjectByParam(
  subjects: ShiftSubject[],
  subjectId: string
): ShiftSubject | null {
  const trimmed = subjectId.trim();
  if (!trimmed) return null;

  if (isUuid(trimmed)) {
    return subjects.find((subject) => subject.dbId === trimmed) ?? null;
  }

  const slug = subjectNameToSlug(trimmed);
  return subjects.find((subject) => subject.slug === slug || subject.id === trimmed) ?? null;
}

export function subjectPagePath(subject: ShiftSubject): string {
  return `/builder/shift-ai/subject/${subject.dbId ?? subject.slug}`;
}

export async function ensureSubjectRecord(
  studentId: string,
  subject: ShiftSubject
): Promise<string> {
  if (subject.dbId) return subject.dbId;

  const admin = createAdminClient();
  const { data: existing } = await admin
    .schema('firstparty')
    .from('shift_subjects')
    .select('id')
    .eq('student_id', studentId)
    .ilike('name', subject.name)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  const { data, error } = await admin
    .schema('firstparty')
    .from('shift_subjects')
    .insert({
      student_id: studentId,
      name: subject.name,
      is_favourite: subject.isFavourite,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Could not create subject record');
  }

  return data.id;
}
