import 'server-only';

import type {
  ContentGeneratorType,
  GeneratedContent,
  GeneratedQuestion,
  GeneratedSummary,
} from '@/lib/shift-ai/content-generator-shared';
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

export async function generateStudyContent(input: {
  contentType: ContentGeneratorType;
  subject: string;
  topic: string;
  yearGroup: string;
  curriculum: string;
  examBoard?: string;
  language?: ShiftStudyLanguage;
}): Promise<{ ok: true; content: GeneratedContent } | { ok: false; error: string }> {
  const groq = getGroqClient();
  if (!groq) {
    return { ok: false, error: 'Content Generator is temporarily unavailable' };
  }

  const curriculumName = curriculumLabel(input.curriculum);
  const boardNote = input.examBoard ? ` Exam board: ${input.examBoard}.` : '';
  const base = `Curriculum: ${curriculumName}. Subject: ${input.subject}. Topic: "${input.topic}". Student level: ${input.yearGroup}.${boardNote}`;

  let userPrompt = '';
  if (input.contentType === 'practice_questions') {
    userPrompt = `${base}
Generate 8 exam-style practice questions with marks, model answers, and mark schemes.
${GROQ_JSON_ONLY_INSTRUCTION}
JSON: { "questions": [{ "question": "", "marks": 2, "answer": "", "mark_scheme": "" }] }`;
  } else if (input.contentType === 'revision_notes') {
    userPrompt = `${base}
Generate detailed revision notes with key_concepts, important_terms, exam_tips, common_mistakes (all strings, markdown-friendly).
${GROQ_JSON_ONLY_INSTRUCTION}
JSON: { "key_concepts": "", "important_terms": "", "exam_tips": "", "common_mistakes": "" }`;
  } else {
    userPrompt = `${base}
Generate a concise revision summary with key_concepts, important_terms, exam_tips, common_mistakes.
${GROQ_JSON_ONLY_INSTRUCTION}
JSON: { "key_concepts": "", "important_terms": "", "exam_tips": "", "common_mistakes": "" }`;
  }

  userPrompt = withLanguageInstruction(userPrompt, input.language);

  try {
    const completion = await withGroqTimeout(
      groq.chat.completions.create({
        model: SHIFT_GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: withLanguageInstruction(
              'You create high-quality revision materials for students.',
              input.language
            ),
          },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.65,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      })
    );

    const raw = completion.choices[0]?.message?.content ?? '';
    const parsed = parseGroqJsonContent(raw, 'Could not parse generated content');
    if (!parsed.ok) {
      logGroqParseFailure('content generator', raw, parsed.error);
      return { ok: false, error: parsed.error };
    }

    const data = parsed.json as Record<string, unknown>;

    if (input.contentType === 'practice_questions') {
      const questions = (data.questions as GeneratedQuestion[]) ?? [];
      return { ok: true, content: { type: 'practice_questions', questions } };
    }

    const summary = data as GeneratedSummary;
    if (input.contentType === 'revision_notes') {
      return { ok: true, content: { type: 'revision_notes', notes: summary } };
    }
    return { ok: true, content: { type: 'summary', summary } };
  } catch (error) {
    console.error('Content generator error:', error);
    return { ok: false, error: 'Content Generator is temporarily unavailable' };
  }
}
