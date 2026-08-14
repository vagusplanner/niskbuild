import 'server-only';

import {
  defaultStudyLanguageForCurriculum,
  parseStudyLanguage,
  type ShiftStudyLanguage,
} from '@/lib/shift-ai/constants';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export { parseStudyLanguage, defaultStudyLanguageForCurriculum };
export type { ShiftStudyLanguage };

/** Resolve study language from a student row that is already in memory. */
export function studyLanguageFromStudent(student: {
  study_language?: unknown;
  curriculum?: unknown;
}): ShiftStudyLanguage {
  const curriculum = typeof student.curriculum === 'string' ? student.curriculum : 'uk';
  return parseStudyLanguage(student.study_language, curriculum);
}

/** Fetch the student's current study language preference (Phase 2a AI call sites). */
export async function getStudentLanguage(studentId: string): Promise<ShiftStudyLanguage> {
  const admin = createAdminClient();
  const { data } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('study_language, curriculum')
    .eq('id', studentId)
    .maybeSingle();

  if (!data) {
    return 'en';
  }

  return studyLanguageFromStudent(data);
}

/**
 * Locale for Shift AI UI (Phase 2b). Preference-based — no URL locale segment.
 * Unauthenticated / missing profile defaults to English (LTR).
 */
export async function getRequestStudyLanguage(): Promise<ShiftStudyLanguage> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 'en';
  }

  const admin = createAdminClient();
  const { data } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('study_language, curriculum')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!data) {
    return 'en';
  }

  return studyLanguageFromStudent(data);
}

/**
 * Append to system/user prompts. Empty for English.
 * JSON keys stay English; only human-readable values switch to Arabic.
 */
export function languageInstruction(lang: ShiftStudyLanguage | null | undefined): string {
  if (lang !== 'ar') return '';
  return [
    'Respond in Modern Standard Arabic (العربية الفصحى), even though these instructions are in English.',
    'If the output is JSON, keep every JSON key, field name, and identifier exactly as specified in English.',
    'Only write human-readable content values in Arabic (questions, answers, explanations, titles, card text, hints, comments, narratives).',
  ].join(' ');
}

export function withLanguageInstruction(
  text: string,
  lang: ShiftStudyLanguage | null | undefined
): string {
  const extra = languageInstruction(lang);
  return extra ? `${text}\n\n${extra}` : text;
}
