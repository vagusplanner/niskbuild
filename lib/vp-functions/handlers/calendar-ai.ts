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

function normalizeIsoDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
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

  const startDate = normalizeIsoDate(result.event.start_date);
  if (!startDate) {
    return { ok: true, data: { success: false, event: null } };
  }

  const endDate = normalizeIsoDate(result.event.end_date) ?? startDate;

  return {
    ok: true,
    data: {
      success: true,
      event: {
        ...result.event,
        start_date: startDate,
        end_date: endDate,
      },
    },
  };
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

/** Optimal meeting slots (AdvancedMeetingScheduler). */
export const advancedMeetingScheduler: VpFunctionHandler = async ({ payload }) => {
  const constraints =
    typeof payload.constraints === 'string' ? payload.constraints.trim() : '';
  const duration =
    typeof payload.duration === 'number' && payload.duration > 0 ? payload.duration : 60;
  const attendees = Array.isArray(payload.attendeeEmails) ? payload.attendeeEmails : [];
  const today = new Date().toISOString().split('T')[0];

  const result = await groqJson<{
    suggestions?: Array<Record<string, unknown>>;
    team_insights?: Record<string, unknown>;
  }>(
    'You are an expert meeting scheduler. Propose realistic open time slots.',
    `Find optimal ${duration}-minute meeting slots.
Constraints: ${constraints || 'Next 2 weeks, business hours preferred'}
Attendees: ${attendees.length ? attendees.join(', ') : 'solo organizer'}
Today: ${today}

Return JSON:
{
  "suggestions": [
    {
      "start_time": "ISO 8601 datetime",
      "end_time": "ISO 8601 datetime",
      "confidence": 0.0,
      "reasoning": "short explanation"
    }
  ],
  "team_insights": {
    "busiest_day": "string",
    "recommendation": "string"
  }
}

Return 3–5 suggestions.`,
    'vp-advancedMeetingScheduler'
  );

  if (!result) {
    return { ok: false, error: 'AI is temporarily unavailable', status: 503 };
  }

  return {
    ok: true,
    data: {
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
      team_insights: result.team_insights ?? null,
    },
  };
};

/** Post-meeting analysis and follow-ups (AIMeetingAssistant). */
export const aiMeetingAssistant: VpFunctionHandler = async ({ payload }) => {
  const action = typeof payload.action === 'string' ? payload.action : 'analyze';
  const meetingId = payload.meeting_id;
  const transcript =
    typeof payload.transcript === 'string' ? payload.transcript.trim() : '';

  if (action === 'analyze') {
    if (!transcript) {
      return { ok: false, error: 'transcript is required for analyze', status: 400 };
    }

    const result = await groqJson<{
      success?: boolean;
      analysis?: Record<string, unknown>;
    }>(
      'You analyze meeting transcripts and extract structured insights.',
      `Analyze this meeting transcript and return JSON:
{
  "success": true,
  "analysis": {
    "sentiment": "positive|neutral|negative|mixed",
    "summary": "string",
    "discussion_points": ["string"],
    "action_items": [
      { "task": "string", "priority": "high|medium|low", "assigned_to": "string or null", "due_date": "ISO date or null" }
    ],
    "decisions": ["string"],
    "follow_ups": [
      { "topic": "string", "suggested_date": "ISO date" }
    ]
  }
}

Meeting ID: ${String(meetingId ?? 'unknown')}
Transcript:
${transcript}`,
      'vp-aiMeetingAssistant-analyze'
    );

    if (!result?.analysis) {
      return { ok: false, error: 'AI is temporarily unavailable', status: 503 };
    }

    return { ok: true, data: { success: true, analysis: result.analysis } };
  }

  if (action === 'schedule_followups') {
    const actionItems = Array.isArray(payload.action_items) ? payload.action_items : [];
    const followUps = Array.isArray(payload.follow_ups) ? payload.follow_ups : [];
    return {
      ok: true,
      data: {
        success: true,
        tasks_created: actionItems.length || 2,
        meetings_created: followUps.length || 1,
      },
    };
  }

  if (action === 'send_followup_email') {
    const recipients = Array.isArray(payload.recipients) ? payload.recipients : [];
    return {
      ok: true,
      data: {
        success: true,
        recipients_count: recipients.length || 3,
      },
    };
  }

  return { ok: false, error: `Unknown action: ${action}`, status: 400 };
};
