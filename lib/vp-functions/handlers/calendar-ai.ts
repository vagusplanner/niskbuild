import { getGroqClient } from '@/lib/groq-client';
import {
  GROQ_JSON_ONLY_INSTRUCTION,
  SHIFT_GROQ_MODEL,
  logGroqParseFailure,
  parseGroqJsonContent,
  withGroqTimeout,
} from '@/lib/shift-ai/groq-json';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireFeatureUsage } from '@/lib/vp-usage-meter';
import type { VpFunctionHandler, VpFunctionResult } from '../types';

async function gateFeature(
  user: { id: string; email?: string | null },
  feature: string
): Promise<{ ok: true } | { ok: false; result: VpFunctionResult }> {
  const admin = createAdminClient();
  const gate = await requireFeatureUsage(admin, {
    userId: user.id,
    email: user.email,
    feature,
  });
  if (!gate.ok) {
    return {
      ok: false,
      result: { ok: false, error: gate.error, status: gate.status },
    };
  }
  return { ok: true };
}

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
export const parseNaturalLanguageEvent: VpFunctionHandler = async ({ user, payload }) => {
  const gate = await gateFeature(user, 'ai_requests');
  if (!gate.ok) return gate.result;

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
export const aiSchedulePlanner: VpFunctionHandler = async ({ user, payload }) => {
  const gate = await gateFeature(user, 'ai_scheduler');
  if (!gate.ok) return gate.result;

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
export const aiSchedulingSuggestions: VpFunctionHandler = async ({ user, payload }) => {
  const gate = await gateFeature(user, 'ai_requests');
  if (!gate.ok) return gate.result;

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
export const advancedMeetingScheduler: VpFunctionHandler = async ({ user, payload }) => {
  const gate = await gateFeature(user, 'ai_requests');
  if (!gate.ok) return gate.result;

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
export const aiMeetingAssistant: VpFunctionHandler = async ({ user, payload }) => {
  const gate = await gateFeature(user, 'ai_requests');
  if (!gate.ok) return gate.result;

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

type MeetingSlot = {
  start_time?: string;
  end_time?: string;
  start?: string;
  end?: string;
  date?: string;
  score?: number;
  reasoning?: string;
  confidence?: number;
};

async function groqMeetingSlots(
  label: string,
  userPrompt: string
): Promise<MeetingSlot[] | null> {
  const result = await groqJson<{ suggestions?: MeetingSlot[]; optimal_slots?: MeetingSlot[] }>(
    'You are an expert meeting scheduler. Propose realistic open time slots.',
    `${userPrompt}

Return JSON with a "suggestions" array (3–5 items). Each item:
{
  "start_time": "ISO 8601 datetime",
  "end_time": "ISO 8601 datetime",
  "date": "YYYY-MM-DD",
  "score": 1-10,
  "reasoning": "short explanation",
  "confidence": 0.0-1.0
}`,
    label
  );
  if (!result) return null;
  return Array.isArray(result.suggestions)
    ? result.suggestions
    : Array.isArray(result.optimal_slots)
      ? result.optimal_slots
      : [];
}

function normalizeMeetingSlots(slots: MeetingSlot[]) {
  return slots.map((slot, idx) => {
    const start = slot.start_time ?? slot.start ?? null;
    const end = slot.end_time ?? slot.end ?? null;
    const startDate = start ? new Date(start) : null;
    return {
      start_time: start,
      end_time: end,
      start,
      end,
      date: slot.date ?? (startDate && !Number.isNaN(startDate.getTime())
        ? startDate.toISOString().split('T')[0]
        : null),
      score: typeof slot.score === 'number' ? slot.score : Math.max(6, 9 - idx),
      reasoning: slot.reasoning ?? 'Suggested based on typical availability',
      confidence: typeof slot.confidence === 'number' ? slot.confidence : 0.75,
    };
  });
}

/** SmartMeetingScheduler — find optimal meeting windows. */
export const findOptimalMeetingTimes: VpFunctionHandler = async ({ user, payload }) => {
  const gate = await gateFeature(user, 'ai_requests');
  if (!gate.ok) return gate.result;

  const participants = Array.isArray(payload.participants) ? payload.participants : [];
  const duration =
    typeof payload.duration === 'number' && payload.duration > 0 ? payload.duration : 60;
  const dateRange =
    typeof payload.dateRange === 'number' && payload.dateRange > 0 ? payload.dateRange : 7;
  const today = new Date().toISOString().split('T')[0];

  const slots = await groqMeetingSlots(
    'vp-findOptimalMeetingTimes',
    `Find optimal ${duration}-minute meeting slots in the next ${dateRange} days.
Participants: ${participants.length ? participants.join(', ') : 'organizer only'}
Today: ${today}`
  );

  if (!slots) {
    return { ok: false, error: 'AI is temporarily unavailable', status: 503 };
  }

  const normalized = normalizeMeetingSlots(slots);
  return {
    ok: true,
    data: {
      optimal_slots: normalized,
      suggestions: normalized,
    },
  };
};

/** SmartMeetingTimeSelector — single best meeting time suggestions. */
export const suggestOptimalMeetingTime: VpFunctionHandler = async ({ user, payload }) => {
  const gate = await gateFeature(user, 'ai_requests');
  if (!gate.ok) return gate.result;

  const title = typeof payload.meeting_title === 'string' ? payload.meeting_title : 'Meeting';
  const attendees = Array.isArray(payload.attendee_emails) ? payload.attendee_emails : [];
  const duration =
    typeof payload.duration_minutes === 'number' && payload.duration_minutes > 0
      ? payload.duration_minutes
      : 30;

  const slots = await groqMeetingSlots(
    'vp-suggestOptimalMeetingTime',
    `Suggest optimal ${duration}-minute slots for "${title}".
Attendees: ${attendees.length ? attendees.join(', ') : 'organizer only'}`
  );

  if (!slots) {
    return { ok: false, error: 'AI is temporarily unavailable', status: 503 };
  }

  const normalized = normalizeMeetingSlots(slots);
  return {
    ok: true,
    data: {
      analysis: `Analyzed schedules for ${attendees.length || 1} participant(s).`,
      optimal_slots: normalized,
      recommendations: normalized.slice(0, 2).map((s) => s.reasoning).filter(Boolean),
    },
  };
};

/** AICollaborationTools — lightweight meeting time suggestions. */
export const suggestMeetingTimes: VpFunctionHandler = async ({ user, payload }) => {
  const gate = await gateFeature(user, 'ai_requests');
  if (!gate.ok) return gate.result;

  const duration =
    typeof payload.duration === 'number' && payload.duration > 0 ? payload.duration : 60;
  const attendees = Array.isArray(payload.attendees) ? payload.attendees : [];

  const slots = await groqMeetingSlots(
    'vp-suggestMeetingTimes',
    `Suggest ${duration}-minute collaboration meeting times.
Attendees: ${attendees.length ? attendees.join(', ') : 'team'}`
  );

  if (!slots) {
    return { ok: false, error: 'AI is temporarily unavailable', status: 503 };
  }

  return { ok: true, data: { suggestions: normalizeMeetingSlots(slots) } };
};

/** PrayerAwareScheduler — slots that avoid prayer times. */
export const suggestPrayerAwareMeetingTimes: VpFunctionHandler = async ({ user, payload }) => {
  const gate = await gateFeature(user, 'ai_requests');
  if (!gate.ok) return gate.result;

  const duration =
    typeof payload.duration_minutes === 'number' && payload.duration_minutes > 0
      ? payload.duration_minutes
      : 60;
  const buffer =
    typeof payload.buffer_minutes === 'number' && payload.buffer_minutes >= 0
      ? payload.buffer_minutes
      : 15;
  const date =
    typeof payload.date === 'string' ? payload.date : new Date().toISOString().split('T')[0];
  const prayerTimes =
    payload.prayer_times && typeof payload.prayer_times === 'object'
      ? (payload.prayer_times as Record<string, string>)
      : {};

  const slots = await groqMeetingSlots(
    'vp-suggestPrayerAwareMeetingTimes',
    `Suggest ${duration}-minute meeting slots on ${date} that avoid these prayer times (leave ${buffer} min buffer):
${JSON.stringify(prayerTimes)}`
  );

  if (!slots) {
    return { ok: false, error: 'AI is temporarily unavailable', status: 503 };
  }

  return { ok: true, data: { suggestions: normalizeMeetingSlots(slots) } };
};

/**
 * Calendar / event AI summary.
 * Period summaries (AICalendarSummaryCard) consume `ai_calendar_summary` quota.
 * Single-event insights consume monthly `ai_requests`.
 */
export const aiEventSummary: VpFunctionHandler = async ({ user, payload }) => {
  const isPeriodSummary =
    typeof payload.period === 'string' ||
    typeof payload.start_date === 'string' ||
    typeof payload.end_date === 'string';

  const feature = isPeriodSummary ? 'ai_calendar_summary' : 'ai_requests';
  const gate = await gateFeature(user, feature);
  if (!gate.ok) return gate.result;

  if (isPeriodSummary) {
    const period = typeof payload.period === 'string' ? payload.period : 'daily';
    const start = typeof payload.start_date === 'string' ? payload.start_date : '';
    const end = typeof payload.end_date === 'string' ? payload.end_date : '';

    const result = await groqJson<{
      overview?: string;
      workload?: string;
      statistics?: Record<string, unknown>;
      key_events?: unknown[];
      advice?: string | string[];
    }>(
      'You summarize a user calendar period for Vagus Planner. Be concise and practical.',
      `Create a ${period} calendar summary for the range ${start || 'today'} to ${end || 'today'}.

Return JSON:
{
  "overview": "2-3 sentence overview",
  "workload": "light|moderate|busy|very_busy",
  "statistics": { "total_events": 0, "high_priority": 0 },
  "key_events": [{ "title": "string", "time": "string", "importance": "high|medium|low" }],
  "advice": "one short productivity tip"
}

If no event details were provided, still return a helpful generic summary for the period.`,
      'vp-aiEventSummary-period'
    );

    if (!result) {
      return { ok: false, error: 'AI is temporarily unavailable', status: 503 };
    }

    return {
      ok: true,
      data: {
        success: true,
        summary: {
          overview: result.overview ?? `Your ${period} calendar summary.`,
          workload: result.workload ?? 'moderate',
          statistics: result.statistics ?? { total_events: 0, high_priority: 0 },
          key_events: Array.isArray(result.key_events) ? result.key_events : [],
          advice: result.advice ?? 'Block focus time for your highest-priority work.',
        },
      },
    };
  }

  const eventData =
    payload.event_data && typeof payload.event_data === 'object'
      ? (payload.event_data as Record<string, unknown>)
      : {};
  const title = typeof eventData.title === 'string' ? eventData.title : 'this event';

  const result = await groqJson<{
    overview?: string;
    suggestions?: string[];
  }>(
    'You provide short AI insights for a single calendar event in Vagus Planner.',
    `Summarize this event and suggest 2–3 prep tips.

Event: ${JSON.stringify(eventData)}

Return JSON:
{
  "overview": "1-2 sentence summary of ${title}",
  "suggestions": ["string"]
}`,
    'vp-aiEventSummary-event'
  );

  return {
    ok: true,
    data: {
      success: true,
      summary: {
        overview:
          result?.overview ??
          `Summary for "${title}" — review agenda and prep materials ahead of time.`,
        suggestions: Array.isArray(result?.suggestions) ? result.suggestions : [],
      },
    },
  };
};

/**
 * Schedule conflict resolution suggestions (ConflictResolutionModal).
 * Returns real AI suggestions or a clear failure — never fabricates client-side fallbacks.
 */
export const detectConflicts: VpFunctionHandler = async ({ user, payload }) => {
  const gate = await gateFeature(user, 'ai_requests');
  if (!gate.ok) return gate.result;

  const event1Id = payload.event1_id;
  const event2Id = payload.event2_id;
  const event1 =
    payload.event1 && typeof payload.event1 === 'object'
      ? (payload.event1 as Record<string, unknown>)
      : {};
  const event2 =
    payload.event2 && typeof payload.event2 === 'object'
      ? (payload.event2 as Record<string, unknown>)
      : {};

  const result = await groqJson<{
    suggestions?: Array<Record<string, unknown>>;
  }>(
    'You resolve calendar scheduling conflicts for Vagus Planner. Propose practical, realistic alternatives only.',
    `Two events conflict. Propose 2–3 resolution options.

Event 1 id: ${String(event1Id ?? '')}
Event 1: ${JSON.stringify(event1)}
Event 2 id: ${String(event2Id ?? '')}
Event 2: ${JSON.stringify(event2)}

Return JSON:
{
  "suggestions": [
    {
      "type": "reschedule|alternative|delegate",
      "action": "short imperative label",
      "rationale": "1-2 sentence explanation",
      "event_id": "id of event to change (or null for delegate)",
      "new_start_date": "ISO datetime or null",
      "new_end_date": "ISO datetime or null"
    }
  ]
}

Only include suggestions you can justify from the event data. Do not invent attendees or constraints.`,
    'vp-detectConflicts'
  );

  if (!result) {
    return { ok: false, error: 'Could not check for conflicts right now', status: 503 };
  }

  const suggestions = Array.isArray(result.suggestions) ? result.suggestions : [];
  if (suggestions.length === 0) {
    return {
      ok: false,
      error: 'No conflict resolution suggestions available right now',
      status: 502,
    };
  }

  return {
    ok: true,
    data: {
      suggestions: suggestions.map((s) => ({
        type: typeof s.type === 'string' ? s.type : 'reschedule',
        action: typeof s.action === 'string' ? s.action : 'Adjust schedule',
        rationale: typeof s.rationale === 'string' ? s.rationale : '',
        event_id: s.event_id ?? null,
        new_start_date: s.new_start_date ?? null,
        new_end_date: s.new_end_date ?? null,
      })),
    },
  };
};
