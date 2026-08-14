import 'server-only';

import type { CurriculumPack, CurriculumPackContent } from '@/lib/shift-ai/curriculum-packs-shared';
import { parsePackContent } from '@/lib/shift-ai/curriculum-packs-shared';
import { curriculumLabel } from '@/lib/shift-ai/subjects';
import { getGroqClient } from '@/lib/groq-client';
import {
  GROQ_JSON_ONLY_INSTRUCTION,
  SHIFT_GROQ_MODEL,
  logGroqParseFailure,
  parseGroqJsonContent,
  withGroqTimeout,
} from '@/lib/shift-ai/groq-json';
import { createAdminClient } from '@/lib/supabase/admin';

export function rowToPack(row: Record<string, unknown>): CurriculumPack {
  return {
    id: String(row.id),
    subject: String(row.subject),
    curriculum: String(row.curriculum),
    year_group: String(row.year_group),
    title: String(row.title),
    content: parsePackContent(row.content),
    source: row.source === 'admin' ? 'admin' : 'ai',
    created_by: typeof row.created_by === 'string' ? row.created_by : null,
    is_published: Boolean(row.is_published),
    created_at: String(row.created_at),
  };
}

export async function findPublishedPack(input: {
  subject: string;
  curriculum: string;
  yearGroup: string;
  title: string;
}): Promise<CurriculumPack | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .schema('firstparty')
    .from('shift_curriculum_packs')
    .select('*')
    .eq('subject', input.subject)
    .eq('curriculum', input.curriculum)
    .eq('year_group', input.yearGroup)
    .ilike('title', input.title.trim())
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? rowToPack(data as Record<string, unknown>) : null;
}

export async function listPublishedPacks(input: {
  curriculum: string;
  yearGroup: string;
  subject?: string;
}): Promise<CurriculumPack[]> {
  const admin = createAdminClient();
  let query = admin
    .schema('firstparty')
    .from('shift_curriculum_packs')
    .select('*')
    .eq('curriculum', input.curriculum)
    .eq('year_group', input.yearGroup)
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (input.subject) {
    query = query.eq('subject', input.subject);
  }

  const { data } = await query;
  return (data ?? []).map((row) => rowToPack(row as Record<string, unknown>));
}

export async function generateCurriculumPack(input: {
  subject: string;
  curriculum: string;
  yearGroup: string;
  topic: string;
  packType: string;
  examBoard?: string;
  createdBy?: string | null;
}): Promise<
  { ok: true; pack: CurriculumPack; reused: boolean } | { ok: false; error: string }
> {
  const existing = await findPublishedPack({
    subject: input.subject,
    curriculum: input.curriculum,
    yearGroup: input.yearGroup,
    title: input.topic,
  });

  if (existing) {
    return { ok: true, pack: existing, reused: true };
  }

  const groq = getGroqClient();
  if (!groq) {
    return { ok: false, error: 'Curriculum pack generator is temporarily unavailable' };
  }

  const curriculumName = curriculumLabel(input.curriculum);
  const boardNote = input.examBoard ? ` (${input.examBoard} exam board)` : '';
  const saudiNote =
    input.curriculum === 'saudi'
      ? ' Align with the Saudi Ministry of Education K-12 structure (Primary 1–6, Intermediate 1–3, Secondary 1–3). Write in English.'
      : '';

  const prompt = `Create a comprehensive ${input.packType} curriculum revision pack for a ${input.yearGroup} student studying ${input.subject} (${curriculumName} curriculum)${boardNote}.${saudiNote}
Topic: "${input.topic}"
Structure with 4-6 clear sections. Each section: title, content, key_points array, exam_tip.
Include practice_questions array (4-6 exam-style questions).
Also return overview and title fields.

${GROQ_JSON_ONLY_INSTRUCTION}
JSON shape:
{
  "title": "",
  "overview": "",
  "sections": [{ "title": "", "content": "", "key_points": [], "exam_tip": "" }],
  "practice_questions": []
}`;

  try {
    const completion = await withGroqTimeout(
      groq.chat.completions.create({
        model: SHIFT_GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You create accurate, student-friendly curriculum revision packs.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.55,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      })
    );

    const raw = completion.choices[0]?.message?.content ?? '';
    const parsed = parseGroqJsonContent(raw, 'Could not parse curriculum pack');
    if (!parsed.ok) {
      logGroqParseFailure('curriculum pack', raw, parsed.error);
      return { ok: false, error: parsed.error };
    }

    const data = parsed.json as Record<string, unknown>;
    const title = input.topic.trim();

    const content: CurriculumPackContent = {
      overview: typeof data.overview === 'string' ? data.overview : '',
      pack_type: input.packType,
      exam_board: input.examBoard,
      topic: input.topic,
      sections: parsePackContent(data).sections,
      practice_questions: Array.isArray(data.practice_questions)
        ? data.practice_questions.filter((q): q is string => typeof q === 'string')
        : [],
    };

    const admin = createAdminClient();
    const { data: inserted, error } = await admin
      .schema('firstparty')
      .from('shift_curriculum_packs')
      .insert({
        subject: input.subject,
        curriculum: input.curriculum,
        year_group: input.yearGroup,
        title,
        content,
        source: 'ai',
        created_by: input.createdBy ?? null,
        is_published: true,
      })
      .select('*')
      .single();

    if (error || !inserted) {
      return { ok: false, error: error?.message || 'Could not save curriculum pack' };
    }

    return { ok: true, pack: rowToPack(inserted as Record<string, unknown>), reused: false };
  } catch (error) {
    console.error('Curriculum pack generate error:', error);
    return { ok: false, error: 'Curriculum pack generator is temporarily unavailable' };
  }
}
