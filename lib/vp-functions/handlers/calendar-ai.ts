import { getGroqClient } from '@/lib/groq-client';
import {
  GROQ_JSON_ONLY_INSTRUCTION,
  SHIFT_GROQ_MODEL,
  logGroqParseFailure,
  parseGroqJsonContent,
  withGroqTimeout,
} from '@/lib/shift-ai/groq-json';
import type { VpFunctionHandler } from '../types';

async function groqJson<T extends Record<string, unknown>>(
  system: string,
  userPrompt: string,
  label: string
): Promise<T | null> {
  const groq = getGroqClient();
  if (!groq) return null;

  const completion = await withGroqTimeout(
    groq.chat.completions.create({
      model: SHIFT_GROQ_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `${userPrompt}\n\n${GROQ_JSON_ONLY_INSTRUCTION}` },
      ],
      temperature: 0.4,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    })
  );

  const raw = completion.choices[0]?.message?.content ?? '';
  const parsed = parseGroqJsonContent(raw, 'Could not parse AI response');
  if (!parsed.ok) {
    logGroqParseFailure(label, raw, parsed.error);
    return null;
  }
  return parsed.json as T;
}

function readText(payload: Record<string, unknown>): string {
  if (typeof payload.text === 'string' && payload.text.trim()) return payload.text.trim();
  if (typeof payload.input === 'string' && payload.input.trim()) return payload.input.trim();
  return '';
}

/** Natural-language → calendar event (NaturalLanguageInput, EventGroupChat). */
export const parseNaturalLanguageEvent: VpFunctionHandler = async ({ payload }) => {
  const text = readText(payload);
  if (!text) {
    return { ok: false, error: 'text or input is required', status: 400 };
  }

  const context =
    payload.context && typeof payload.context === 'object' && !Array.isArray(payload.context)
      ? (payload.context as Record<string, unknown>)
      : {};

  const today = new Date().toISOString().split('T')[0];
  const contextHint =
    Object.keys(context).length > 0 ? `\nContext: ${JSON.stringify(context)}` : '';

  const result = await groqJson<{
    success?: boolean;
    event?: Record<string, unknown>;
  }>(
    'You parse natural-language calendar event descriptions into structured event objects for Vagus Planner.',
    `Parse this into a calendar event. Today is ${today}.${contextHint}

Input: "${text}"

Return JSON:
{
  "success": true,
  "event": {
    "title": "string",
    "start_date": "ISO 8601 datetime",
    "end_date": "ISO 8601 datetime or null",
    "location": "string or null",
    "description": "string or null",
    "category": "work|personal|health|prayer|holiday|family|social|other",
    "is_all_day": false
  }
}

If you cannot parse it, return { "success": false, "event": null }.`,
    'vp-parseNaturalLanguageEvent'
  );

  if (!result) {
    return { ok: false, error: 'AI is temporarily unavailable', status: 503 };
  }

  if (!result.success || !result.event?.title || !result.event?.start_date) {
    return { ok: true, data: { success: false, event: null } };
  }

  return { ok: true, data: { success: true, event: result.event } };
};

/** Full schedule plan (AISchedulePlanner). */
export const aiSchedulePlanner: VpFunctionHandler = async ({ payload }) => {
  const period = typeof payload.period === 'string' ? payload.period : 'week';
  const style = typeof payload.style === 'string' ? payload.style : 'balanced';
  const today = typeof payload.today === 'string' ? payload.today : new Date().toISOString().split('T')[0];
  const islamicMode = payload.islamic_mode === true;

  const pastEvents = Array.isArray(payload.past_events) ? payload.past_events : [];
  const upcomingEvents = Array.isArray(payload.upcoming_events) ? payload.upcoming_events : [];
  const pendingTasks = Array.isArray(payload.pending_tasks) ? payload.pending_tasks : [];

  const result = await groqJson<Record<string, unknown>>(
    'You are an expert scheduling assistant for Vagus Planner. Generate realistic, balanced calendar plans.',
    `Create a ${period} schedule plan (style: ${style}) starting from ${today}.
Islamic mode: ${islamicMode ? 'yes — respect prayer times and include spiritual blocks where appropriate' : 'no'}.
Working hours: ${payload.working_hours_start ?? '09:00'}–${payload.working_hours_end ?? '17:00'}.
Working days: ${JSON.stringify(payload.working_days ?? [1, 2, 3, 4, 5])}.

Past events (sample): ${JSON.stringify(pastEvents.slice(0, 30))}
Upcoming events: ${JSON.stringify(upcomingEvents.slice(0, 20))}
Pending tasks: ${JSON.stringify(pendingTasks.slice(0, 15))}

Return JSON:
{
  "title": "string",
  "summary": "string",
  "insights": ["string"],
  "suggested_events": [
    {
      "title": "string",
      "category": "work|personal|health|prayer|family|social|holiday|other",
      "start_date": "ISO datetime",
      "end_date": "ISO datetime",
      "description": "string",
      "is_all_day": false
    }
  ],
  "alternatives": [
    {
      "label": "string",
      "description": "string",
      "focus_areas": ["string"],
      "style_key": "balanced|productive|relaxed|faith-focused"
    }
  ]
}

Generate 4–8 suggested_events for the period and 2–3 alternatives.`,
    'vp-aiSchedulePlanner'
  );

  if (!result) {
    return { ok: false, error: 'AI is temporarily unavailable', status: 503 };
  }

  return {
    ok: true,
    data: {
      title: result.title ?? `Your ${period} plan`,
      summary: result.summary ?? '',
      insights: Array.isArray(result.insights) ? result.insights : [],
      suggested_events: Array.isArray(result.suggested_events) ? result.suggested_events : [],
      alternatives: Array.isArray(result.alternatives) ? result.alternatives : [],
    },
  };
};

/** Quick scheduling suggestions (AIScheduleSuggestions). */
export const aiSchedulingSuggestions: VpFunctionHandler = async ({ payload }) => {
  const rangeStart =
    typeof payload.date_range_start === 'string'
      ? payload.date_range_start
      : new Date().toISOString();
  const rangeEnd =
    typeof payload.date_range_end === 'string'
      ? payload.date_range_end
      : new Date(Date.now() + 7 * 86400000).toISOString();

  const result = await groqJson<{ success?: boolean; suggestions?: unknown[] }>(
    'You suggest practical calendar time blocks based on productivity patterns.',
    `Suggest 3–5 scheduling ideas between ${rangeStart} and ${rangeEnd}.

Return JSON:
{
  "success": true,
  "suggestions": [
    {
      "title": "string",
      "time_slot": "e.g. Tue 2–3pm",
      "activity_type": "Work|Personal|Health|Focus|Social",
      "priority": "high|medium|low",
      "reasoning": "short explanation"
    }
  ]
}`,
    'vp-aiSchedulingSuggestions'
  );

  if (!result) {
    return { ok: false, error: 'AI is temporarily unavailable', status: 503 };
  }

  return {
    ok: true,
    data: {
      success: true,
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
    },
  };
};
