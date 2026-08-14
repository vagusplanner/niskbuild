import 'server-only';

import { CURRICULUM_RUBRICS, normalizeCurriculum } from '@/lib/shift-ai/essay-curriculum';
import { curriculumLabel } from '@/lib/shift-ai/subjects';
import { withLanguageInstruction, type ShiftStudyLanguage } from '@/lib/shift-ai/study-language';
import { getGroqClient } from '@/lib/groq-client';
import {
  GROQ_JSON_ONLY_INSTRUCTION,
  SHIFT_GROQ_MODEL,
  logGroqParseFailure,
  parseGroqJsonContent,
  withGroqTimeout,
} from '@/lib/shift-ai/groq-json';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SpecPoint } from '@/lib/shift-ai/spec-tracker-shared';

export async function generateSpecPoints(input: {
  studentId: string;
  subject: string;
  examBoard: string;
  yearGroup: string;
  curriculum: string;
  language?: ShiftStudyLanguage;
}): Promise<{ ok: true; points: SpecPoint[] } | { ok: false; error: string }> {
  const groq = getGroqClient();
  if (!groq) {
    return { ok: false, error: 'Spec Tracker is temporarily unavailable' };
  }

  const curriculum = normalizeCurriculum(input.curriculum);
  const rubric = CURRICULUM_RUBRICS[curriculum];
  const curriculumName = curriculumLabel(input.curriculum);

  const prompt = withLanguageInstruction(
    `Generate real ${input.examBoard} specification points for ${input.subject} (${curriculumName}, ${input.yearGroup}).
Use authentic spec codes where applicable (e.g. GCSE AQA 4.1.1, AP Unit 3, Bac SVT points).
Cover all major testable areas students must revise.

Return JSON:
{
  "points": [
    { "spec_code": "4.1.1", "description": "Clear revision point students can track" }
  ]
}

Include 15-30 points. ${rubric}
${GROQ_JSON_ONLY_INSTRUCTION}`,
    input.language
  );

  try {
    const completion = await withGroqTimeout(
      groq.chat.completions.create({
        model: SHIFT_GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: withLanguageInstruction(
              'You output accurate curriculum specification points for students to track.',
              input.language
            ),
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 3500,
        response_format: { type: 'json_object' },
      })
    );

    const raw = completion.choices[0]?.message?.content ?? '';
    const parsed = parseGroqJsonContent(raw, 'Could not parse spec points');
    if (!parsed.ok) {
      logGroqParseFailure('spec tracker', raw, parsed.error);
      return { ok: false, error: parsed.error };
    }

    const data = parsed.json as Record<string, unknown>;
    const rawPoints = Array.isArray(data.points) ? data.points : [];
    const points: Array<{ spec_code: string; description: string }> = [];

    for (const item of rawPoints) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const spec_code = typeof row.spec_code === 'string' ? row.spec_code.trim() : '';
      const description = typeof row.description === 'string' ? row.description.trim() : '';
      if (!spec_code || !description) continue;
      points.push({ spec_code, description });
    }

    if (points.length === 0) {
      return { ok: false, error: 'No specification points were generated' };
    }

    const admin = createAdminClient();
    await admin
      .schema('firstparty')
      .from('shift_spec_points')
      .delete()
      .eq('student_id', input.studentId)
      .eq('subject', input.subject);

    const now = new Date().toISOString();
    const { data: inserted, error } = await admin
      .schema('firstparty')
      .from('shift_spec_points')
      .insert(
        points.map((p) => ({
          student_id: input.studentId,
          subject: input.subject,
          spec_code: p.spec_code,
          description: p.description,
          status: 'not_covered',
          updated_at: now,
        }))
      )
      .select('id, student_id, subject, spec_code, description, status, updated_at');

    if (error || !inserted) {
      return { ok: false, error: error?.message || 'Could not save spec points' };
    }

    return { ok: true, points: inserted as SpecPoint[] };
  } catch (error) {
    console.error('Spec tracker generate error:', error);
    return { ok: false, error: 'Spec Tracker is temporarily unavailable' };
  }
}

export async function verifySpecPointOwnership(
  pointId: string,
  studentId: string
): Promise<{ id: string; status: string } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .schema('firstparty')
    .from('shift_spec_points')
    .select('id, status')
    .eq('id', pointId)
    .eq('student_id', studentId)
    .maybeSingle();
  return data;
}
