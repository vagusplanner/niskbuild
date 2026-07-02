import 'server-only';

import { getGroqClient } from '@/lib/groq-client';
import {
  GROQ_JSON_ONLY_INSTRUCTION,
  SHIFT_GROQ_MODEL,
  logGroqParseFailure,
  parseGroqJsonContent,
  withGroqTimeout,
} from '@/lib/shift-ai/groq-json';

export type { MasteryStatus, MasteryTopic, MasterySubjectGroup } from '@/lib/shift-ai/mastery-shared';

const MASTERY_TOPIC_MIN = 12;
const MASTERY_TOPIC_MAX = 15;

function parseGeneratedTopics(raw: unknown): { ok: true; topics: string[] } | { ok: false; error: string } {
  let items: unknown[] = [];

  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.topics)) {
      items = obj.topics;
    } else {
      return { ok: false, error: 'Could not parse mastery topic response' };
    }
  } else {
    return { ok: false, error: 'Could not parse mastery topic response' };
  }

  const topics: string[] = [];
  for (const item of items) {
    if (typeof item === 'string' && item.trim()) {
      topics.push(item.trim());
    } else if (item && typeof item === 'object') {
      const row = item as Record<string, unknown>;
      const name =
        typeof row.topic === 'string'
          ? row.topic.trim()
          : typeof row.name === 'string'
            ? row.name.trim()
            : '';
      if (name) topics.push(name);
    }
  }

  const unique = [...new Set(topics)];
  if (unique.length < MASTERY_TOPIC_MIN) {
    return { ok: false, error: 'Could not generate enough mastery topics' };
  }

  return { ok: true, topics: unique.slice(0, MASTERY_TOPIC_MAX) };
}

export async function generateMasteryTopics(
  subject: string,
  yearGroup: string,
  curriculum: string
): Promise<{ ok: true; topics: string[] } | { ok: false; error: string }> {
  const groq = getGroqClient();
  if (!groq) {
    return { ok: false, error: 'AI topic generator is temporarily unavailable' };
  }

  const prompt = `List exactly ${MASTERY_TOPIC_MIN} to ${MASTERY_TOPIC_MAX} essential curriculum topics for a ${yearGroup} student studying ${subject} (${curriculum} curriculum).

Rules:
- Short topic names only (3–6 words max)
- Cover the full syllabus breadth from foundational to exam-relevant
- Age-appropriate and specific to ${curriculum}
- No duplicates or near-duplicates

Return ONLY valid JSON in this shape:
{
  "topics": ["Topic one", "Topic two"]
}`;

  try {
    const completion = await withGroqTimeout(
      groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You create curriculum topic maps for school students. ${GROQ_JSON_ONLY_INSTRUCTION}`,
          },
          {
            role: 'user',
            content: `${prompt}\n\n${GROQ_JSON_ONLY_INSTRUCTION}`,
          },
        ],
        model: SHIFT_GROQ_MODEL,
        temperature: 0.6,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      }),
      'AI topic map generation timed out — please try again'
    );

    const rawContent = completion.choices[0]?.message?.content?.trim();
    if (!rawContent) {
      return { ok: false, error: 'Empty response from AI topic generator' };
    }

    const jsonResult = parseGroqJsonContent(rawContent, 'Could not parse mastery topic response');
    if (!jsonResult.ok) {
      logGroqParseFailure('mastery', rawContent, 'JSON parse failed');
      return { ok: false, error: jsonResult.error };
    }

    const parsed = parseGeneratedTopics(jsonResult.json);
    if (!parsed.ok) {
      logGroqParseFailure('mastery', rawContent, 'response shape parse failed');
      return { ok: false, error: parsed.error };
    }

    return { ok: true, topics: parsed.topics };
  } catch (err) {
    if (err instanceof Error && err.message.includes('timed out')) {
      return { ok: false, error: err.message };
    }
    console.error('Shift AI mastery topic generation failed:', err);
    return { ok: false, error: 'Could not generate mastery topics' };
  }
}

export async function verifyMasteryTopicOwnership(topicId: string, studentId: string) {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const { data } = await admin
    .schema('firstparty')
    .from('shift_mastery_topics')
    .select('id, student_id, subject, topic, status, updated_at, created_at')
    .eq('id', topicId)
    .maybeSingle();

  if (!data || data.student_id !== studentId) return null;
  return data;
}
