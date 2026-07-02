export const PACK_TYPES = [
  'Full Topic Summary',
  'Key Facts & Definitions',
  'Common Exam Questions',
  'Worked Examples',
  'Mind Map Guide',
] as const;

export type PackType = (typeof PACK_TYPES)[number];

export type CurriculumPackSection = {
  title: string;
  content: string;
  key_points?: string[];
  exam_tip?: string;
};

export type CurriculumPackContent = {
  overview: string;
  pack_type?: string;
  exam_board?: string;
  topic?: string;
  sections: CurriculumPackSection[];
  practice_questions?: string[];
};

export type CurriculumPack = {
  id: string;
  subject: string;
  curriculum: string;
  year_group: string;
  title: string;
  content: CurriculumPackContent;
  source: 'admin' | 'ai';
  created_by: string | null;
  is_published: boolean;
  created_at: string;
};

export function parsePackContent(raw: unknown): CurriculumPackContent {
  if (!raw || typeof raw !== 'object') {
    return { overview: '', sections: [] };
  }
  const obj = raw as Record<string, unknown>;
  const sections = Array.isArray(obj.sections)
    ? obj.sections
        .filter((s): s is CurriculumPackSection => !!s && typeof s === 'object')
        .map((s) => {
          const row = s as Record<string, unknown>;
          return {
            title: typeof row.title === 'string' ? row.title : '',
            content: typeof row.content === 'string' ? row.content : '',
            key_points: Array.isArray(row.key_points)
              ? row.key_points.filter((k): k is string => typeof k === 'string')
              : undefined,
            exam_tip: typeof row.exam_tip === 'string' ? row.exam_tip : undefined,
          };
        })
    : [];

  return {
    overview: typeof obj.overview === 'string' ? obj.overview : '',
    pack_type: typeof obj.pack_type === 'string' ? obj.pack_type : undefined,
    exam_board: typeof obj.exam_board === 'string' ? obj.exam_board : undefined,
    topic: typeof obj.topic === 'string' ? obj.topic : undefined,
    sections,
    practice_questions: Array.isArray(obj.practice_questions)
      ? obj.practice_questions.filter((q): q is string => typeof q === 'string')
      : undefined,
  };
}

export function formatPackForPrint(pack: CurriculumPack): string {
  const lines: string[] = [
    `# ${pack.title}`,
    '',
    `Subject: ${pack.subject} · ${pack.curriculum.toUpperCase()} · ${pack.year_group}`,
  ];

  if (pack.content.exam_board) lines.push(`Exam board: ${pack.content.exam_board}`);
  if (pack.content.pack_type) lines.push(`Pack type: ${pack.content.pack_type}`);
  lines.push('');

  if (pack.content.overview) {
    lines.push('## Overview', pack.content.overview, '');
  }

  for (const section of pack.content.sections) {
    lines.push(`## ${section.title}`, section.content);
    if (section.key_points?.length) {
      lines.push('', '**Key points:**');
      for (const point of section.key_points) {
        lines.push(`- ${point}`);
      }
    }
    if (section.exam_tip) {
      lines.push('', `**Exam tip:** ${section.exam_tip}`);
    }
    lines.push('');
  }

  if (pack.content.practice_questions?.length) {
    lines.push('## Practice questions');
    pack.content.practice_questions.forEach((q, i) => {
      lines.push(`${i + 1}. ${q}`);
    });
  }

  return lines.join('\n');
}
