import 'server-only';

import type { EssayMarkerFeedback } from '@/lib/shift-ai/essay-marker-shared';
import type { ShiftCurriculum } from '@/lib/shift-ai/constants';
import { CURRICULUM_RUBRICS, normalizeCurriculum } from '@/lib/shift-ai/essay-curriculum';
import { curriculumLabel } from '@/lib/shift-ai/subjects';
import { getGroqClient } from '@/lib/groq-client';
import {
  GROQ_JSON_ONLY_INSTRUCTION,
  SHIFT_GROQ_MODEL,
  logGroqParseFailure,
  parseGroqJsonContent,
  withGroqTimeout,
} from '@/lib/shift-ai/groq-json';

export async function markEssay(input: {
  essayText: string;
  subject: string;
  examBoard: string;
  level: string;
  questionText?: string;
  yearGroup: string;
  curriculum: string;
}): Promise<{ ok: true; feedback: EssayMarkerFeedback } | { ok: false; error: string }> {
  const groq = getGroqClient();
  if (!groq) {
    return { ok: false, error: 'Essay Marker is temporarily unavailable' };
  }

  const curriculum = normalizeCurriculum(input.curriculum);
  const rubric = CURRICULUM_RUBRICS[curriculum];
  const curriculumName = curriculumLabel(input.curriculum);

  const prompt = `You are an expert ${input.examBoard} ${input.level} ${input.subject} examiner marking a ${input.yearGroup} student's essay following the ${curriculumName} curriculum.
${input.questionText ? `Exam question: "${input.questionText}"` : ''}
Rubric: ${rubric}

Essay:
"""
${input.essayText}
"""

Provide curriculum-aligned marking as JSON with:
- grade_estimate, overall_mark, grade_boundary, overall_comment
- assessment_objectives: array with name, marks_awarded, marks_available, comment, strengths[], improvements[]
- annotations: line-by-line array of {excerpt, comment} quoting short phrases from the essay
- structural_critique: introduction/arguments/evidence/conclusion each with {rating, comment}, plus overall_comment and improvements[]
- rewrite_suggestions: array of actionable rewrite tips
- key_strengths, priority_improvements, examiner_tip

${GROQ_JSON_ONLY_INSTRUCTION}`;

  try {
    const completion = await withGroqTimeout(
      groq.chat.completions.create({
        model: SHIFT_GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a rigorous but fair ${curriculumName} examiner. Be specific and constructive.`,
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      })
    );

    const raw = completion.choices[0]?.message?.content ?? '';
    const parsed = parseGroqJsonContent(raw, 'Could not parse essay marking');
    if (!parsed.ok) {
      logGroqParseFailure('essay marker', raw, parsed.error);
      return { ok: false, error: parsed.error };
    }

    const feedback = parsed.json as EssayMarkerFeedback;
    if (!feedback.grade_estimate || !feedback.overall_comment) {
      return { ok: false, error: 'Essay marking returned incomplete feedback' };
    }

    return { ok: true, feedback };
  } catch (error) {
    console.error('Essay marker error:', error);
    return { ok: false, error: 'Essay Marker is temporarily unavailable' };
  }
}

export function curriculumKey(curriculum: string): ShiftCurriculum {
  return normalizeCurriculum(curriculum);
}
