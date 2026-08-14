import 'server-only';

import {
  defaultStudyLanguageForCurriculum,
  parseStudyLanguage,
  type ShiftStudyLanguage,
} from '@/lib/shift-ai/constants';
import { createAdminClient } from '@/lib/supabase/admin';

export { parseStudyLanguage, defaultStudyLanguageForCurriculum };

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
