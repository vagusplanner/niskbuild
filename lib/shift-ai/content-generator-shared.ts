export type ContentGeneratorType = 'summary' | 'practice_questions' | 'revision_notes';

export const CONTENT_TYPES: Array<{
  id: ContentGeneratorType;
  label: string;
  emoji: string;
  desc: string;
}> = [
  {
    id: 'summary',
    label: 'Revision Summary',
    emoji: '📝',
    desc: 'Concise, structured revision notes',
  },
  {
    id: 'practice_questions',
    label: 'Practice Questions',
    emoji: '🎯',
    desc: 'Exam-style questions with model answers',
  },
  {
    id: 'revision_notes',
    label: 'Revision Notes',
    emoji: '📋',
    desc: 'Detailed notes with terms and tips',
  },
];

export type GeneratedSummary = {
  key_concepts: string;
  important_terms?: string;
  exam_tips?: string;
  common_mistakes?: string;
};

export type GeneratedQuestion = {
  question: string;
  marks: number;
  answer: string;
  mark_scheme?: string;
};

export type GeneratedContent =
  | { type: 'summary'; summary: GeneratedSummary }
  | { type: 'revision_notes'; notes: GeneratedSummary }
  | { type: 'practice_questions'; questions: GeneratedQuestion[] };

export function formatContentForNotes(content: GeneratedContent, topic: string): string {
  const header = `# ${topic}\n\n`;
  if (content.type === 'practice_questions') {
    return (
      header +
      content.questions
        .map(
          (q, i) =>
            `## Q${i + 1} (${q.marks} marks)\n${q.question}\n\n**Answer:** ${q.answer}${q.mark_scheme ? `\n\n**Mark scheme:** ${q.mark_scheme}` : ''}`
        )
        .join('\n\n')
    );
  }

  const body = content.type === 'summary' ? content.summary : content.notes;
  const parts = [`## Key Concepts\n${body.key_concepts}`];
  if (body.important_terms) parts.push(`## Important Terms\n${body.important_terms}`);
  if (body.exam_tips) parts.push(`## Exam Tips\n${body.exam_tips}`);
  if (body.common_mistakes) parts.push(`## Common Mistakes\n${body.common_mistakes}`);
  return header + parts.join('\n\n');
}
