import 'server-only';

import type { WorkshopLiveFeedback, WorkshopOutline } from '@/lib/shift-ai/essay-workshop-shared';
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

export async function generateWorkshopOutline(input: {
  subject: string;
  examBoard: string;
  level: string;
  prompt: string;
  wordTarget: number;
  curriculum: string;
  language?: ShiftStudyLanguage;
}): Promise<{ ok: true; outline: WorkshopOutline } | { ok: false; error: string }> {
  const groq = getGroqClient();
  if (!groq) {
    return { ok: false, error: 'Essay Workshop is temporarily unavailable' };
  }

  const curriculum = normalizeCurriculum(input.curriculum);
  const rubric = CURRICULUM_RUBRICS[curriculum];
  const curriculumName = curriculumLabel(input.curriculum);

  const userPrompt = withLanguageInstruction(
    `You are an expert essay coach for ${curriculumName} students.
Subject: ${input.subject}
Exam board: ${input.examBoard}, Level: ${input.level}
Essay question: "${input.prompt}"
Target word count: ${input.wordTarget}
Rubric context: ${rubric}

Generate a structured essay outline JSON with thesis, introduction {hook, context, thesis_sentence}, body_paragraphs [{topic_sentence, arguments[], evidence[], transition}], conclusion {restate_thesis, synthesis, final_thought}, key_vocabulary[], marking_tips[].

Keep quoted source/question wording in its original language when it is not Arabic. Write coaching text in the student's study language.

${GROQ_JSON_ONLY_INSTRUCTION}`,
    input.language
  );

  try {
    const completion = await withGroqTimeout(
      groq.chat.completions.create({
        model: SHIFT_GROQ_MODEL,
        messages: [
          { role: 'system', content: withLanguageInstruction('You help students plan strong curriculum-aligned essays.', input.language) },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2500,
        response_format: { type: 'json_object' },
      })
    );

    const raw = completion.choices[0]?.message?.content ?? '';
    const parsed = parseGroqJsonContent(raw, 'Could not parse outline');
    if (!parsed.ok) {
      logGroqParseFailure('essay workshop outline', raw, parsed.error);
      return { ok: false, error: parsed.error };
    }

    return { ok: true, outline: parsed.json as WorkshopOutline };
  } catch (error) {
    console.error('Essay workshop outline error:', error);
    return { ok: false, error: 'Essay Workshop is temporarily unavailable' };
  }
}

export async function generateWorkshopFeedback(input: {
  subject: string;
  examBoard: string;
  level: string;
  prompt: string;
  wordTarget: number;
  draft: string;
  outline?: WorkshopOutline | null;
  curriculum: string;
  language?: ShiftStudyLanguage;
}): Promise<{ ok: true; feedback: WorkshopLiveFeedback } | { ok: false; error: string }> {
  const groq = getGroqClient();
  if (!groq) {
    return { ok: false, error: 'Essay Workshop is temporarily unavailable' };
  }

  const wordCount = input.draft.trim().split(/\s+/).filter(Boolean).length;
  const curriculumName = curriculumLabel(input.curriculum);

  const userPrompt = withLanguageInstruction(
    `You are a supportive ${input.examBoard} ${input.level} ${input.subject} writing coach for ${curriculumName} students.
This is IN-PROGRESS workshop feedback — encouraging guidance, NOT a final exam grade.

Essay question: "${input.prompt}"
Target words: ${input.wordTarget}. Current words: ~${wordCount}

Outline given to student:
${JSON.stringify(input.outline ?? {}, null, 2)}

Current draft:
"""
${input.draft}
"""

Return JSON with: encouragement, progress_summary, suggestions[] (3-5), outline_alignment, strengths[], next_steps[], optional word_count_note.
Do NOT assign a final grade. Be warm and specific.
Keep quoted draft excerpts in the original language of the draft. Write coaching comments in the student's study language.

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
              'You give encouraging in-progress essay coaching to secondary students.',
              input.language
            ),
          },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.65,
        max_tokens: 1800,
        response_format: { type: 'json_object' },
      })
    );

    const raw = completion.choices[0]?.message?.content ?? '';
    const parsed = parseGroqJsonContent(raw, 'Could not parse workshop feedback');
    if (!parsed.ok) {
      logGroqParseFailure('essay workshop feedback', raw, parsed.error);
      return { ok: false, error: parsed.error };
    }

    return { ok: true, feedback: parsed.json as WorkshopLiveFeedback };
  } catch (error) {
    console.error('Essay workshop feedback error:', error);
    return { ok: false, error: 'Essay Workshop is temporarily unavailable' };
  }
}
