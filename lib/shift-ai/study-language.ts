import 'server-only';

import {
  defaultStudyLanguageForCurriculum,
  parseStudyLanguage,
  type ShiftStudyLanguage,
} from '@/lib/shift-ai/constants';
import { SHIFT_AI_LANG_HEADER, parseLangQueryParam } from '@/lib/shift-ai/locale-query';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

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
 * On /signup and /parent/consent/*, `?lang=ar|en` (forwarded as x-shift-ai-lang)
 * overrides that default for the current render, including when no session exists.
 */
export async function getRequestStudyLanguage(): Promise<ShiftStudyLanguage> {
  const headerStore = await headers();
  const fromQuery = parseLangQueryParam(headerStore.get(SHIFT_AI_LANG_HEADER));
  if (fromQuery) {
    return fromQuery;
  }

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
 * Append to system/user prompts. Always states the response language explicitly —
 * empty instructions for English let some models (e.g. qwen vision) drift into Arabic
 * when surrounding prompts mention Arabic section examples.
 */
export function languageInstruction(lang: ShiftStudyLanguage | null | undefined): string {
  const resolved: ShiftStudyLanguage =
    lang === 'ar' || lang === 'fr' || lang === 'es' || lang === 'en' ? lang : 'en';

  if (resolved === 'ar') {
    return [
      'CRITICAL: Write the entire reply in Modern Standard Arabic (العربية الفصحى). Do not use English, French, or Spanish for any student-facing sentences.',
      'If the output is JSON, keep every JSON key, field name, and identifier exactly as specified in English.',
      'Only write human-readable content values in Arabic (questions, answers, explanations, titles, card text, hints, comments, narratives).',
    ].join(' ');
  }

  if (resolved === 'fr') {
    return [
      'CRITICAL: Write the entire reply in clear French (français). Do not use English, Arabic, or Spanish for any student-facing sentences.',
      'If the output is JSON, keep every JSON key, field name, and identifier exactly as specified in English.',
      'Only write human-readable content values in French.',
    ].join(' ');
  }

  if (resolved === 'es') {
    return [
      'CRITICAL: Write the entire reply in clear Spanish (español). Do not use English, Arabic, or French for any student-facing sentences.',
      'If the output is JSON, keep every JSON key, field name, and identifier exactly as specified in English.',
      'Only write human-readable content values in Spanish.',
    ].join(' ');
  }

  return [
    'CRITICAL: Write the entire reply in clear English. Do not use Arabic, French, or Spanish for any student-facing sentences.',
    'If the output is JSON, keep every JSON key, field name, and identifier exactly as specified in English.',
  ].join(' ');
}

export function withLanguageInstruction(
  text: string,
  lang: ShiftStudyLanguage | null | undefined
): string {
  const extra = languageInstruction(lang);
  // Put language first so multimodal models see it before image/content instructions.
  return `${extra}\n\n${text}`;
}

/** Short human label for prompts / logs. */
export function studyLanguageLabel(lang: ShiftStudyLanguage | null | undefined): string {
  switch (lang) {
    case 'ar':
      return 'Arabic';
    case 'fr':
      return 'French';
    case 'es':
      return 'Spanish';
    case 'en':
    default:
      return 'English';
  }
}
