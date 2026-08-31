import { createAdminClient } from '@/lib/supabase/admin';
import {
  detectArt9CategoriesFromText,
  mergeArt9Categories,
} from '@/lib/vp-gdpr/art9-ai-gate';
import type { VpFunctionHandler } from '../types';
import {
  aiUnavailableMessage,
  findOptimalMeetingTimes,
  gateFeatureWithArt9,
  groqJson,
  runSuggestTimeSlotsCore,
} from './calendar-ai';

const TASK_PRIORITY_MAP: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 3,
};

const PERIOD_LABELS: Record<string, string> = {
  morning_peak: 'Morning peak',
  mid_morning: 'Mid-morning focus',
  post_lunch: 'Post-lunch window',
  afternoon: 'Afternoon block',
  evening: 'Evening slot',
  night: 'Quiet hours',
};

function readCommand(payload: Record<string, unknown>): string {
  for (const key of ['command', 'text', 'input'] as const) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function mapTaskPriority(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return Math.min(3, Math.max(0, value));
  }
  if (typeof value === 'string') {
    return TASK_PRIORITY_MAP[value.toLowerCase()] ?? 2;
  }
  return 2;
}

function normalizeIsoDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function combineDateAndTime(date: string | null, time: string | null): string | null {
  const day = date ?? new Date().toISOString().split('T')[0];
  const clock = time && /^\d{1,2}:\d{2}$/.test(time) ? time : '09:00';
  const iso = normalizeIsoDate(`${day}T${clock}:00`);
  return iso;
}

function formatTime24(isoOrTime: string | null | undefined): string {
  if (!isoOrTime) return '09:00';
  if (/^\d{1,2}:\d{2}$/.test(isoOrTime)) {
    const [h, m] = isoOrTime.split(':');
    return `${String(Number(h)).padStart(2, '0')}:${m}`;
  }
  const d = new Date(isoOrTime);
  if (Number.isNaN(d.getTime())) return '09:00';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function productivityPeriod(hour: number): string {
  if (hour >= 6 && hour < 9) return 'morning_peak';
  if (hour >= 9 && hour < 12) return 'mid_morning';
  if (hour >= 12 && hour < 14) return 'post_lunch';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function normalizeScore(raw: unknown, fallback: number): number {
  if (typeof raw !== 'number' || Number.isNaN(raw)) return fallback;
  if (raw <= 10) return Math.min(100, Math.max(50, Math.round(raw * 10)));
  return Math.min(100, Math.max(50, Math.round(raw)));
}

type ParsedCommand = {
  success?: boolean;
  intent?: string;
  confidence?: number;
  parsed?: Record<string, unknown>;
};

async function createFromParsed(
  userId: string,
  parsed: Record<string, unknown>
): Promise<{ type: string; title: string; id: string } | null> {
  const admin = createAdminClient();
  const type = typeof parsed.type === 'string' ? parsed.type : '';

  if (type === 'event') {
    const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
    if (!title) return null;
    const eventDate =
      combineDateAndTime(
        typeof parsed.date === 'string' ? parsed.date : null,
        typeof parsed.start_time === 'string' ? parsed.start_time : null
      ) ?? new Date().toISOString();

    const { data, error } = await admin
      .schema('firstparty')
      .from('vp_events')
      .insert({
        user_id: userId,
        title,
        description: typeof parsed.description === 'string' ? parsed.description : null,
        location: typeof parsed.location === 'string' ? parsed.location : null,
        event_date: eventDate,
      })
      .select('id, title')
      .single();

    if (error || !data) return null;
    return { type: 'event', title: data.title, id: data.id };
  }

  if (type === 'task') {
    const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
    if (!title) return null;
    const due =
      combineDateAndTime(
        typeof parsed.date === 'string' ? parsed.date : null,
        typeof parsed.start_time === 'string' ? parsed.start_time : null
      ) ?? null;

    const { data, error } = await admin
      .schema('firstparty')
      .from('vp_tasks')
      .insert({
        user_id: userId,
        title,
        notes: typeof parsed.description === 'string' ? parsed.description : null,
        due_date: due,
        priority: mapTaskPriority(parsed.priority),
        status: 'pending',
      })
      .select('id, title')
      .single();

    if (error || !data) return null;
    return { type: 'task', title: data.title, id: data.id };
  }

  if (type === 'expense') {
    const amount =
      typeof parsed.amount === 'number'
        ? parsed.amount
        : typeof parsed.amount === 'string'
          ? Number(parsed.amount)
          : NaN;
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const description =
      typeof parsed.title === 'string' && parsed.title.trim()
        ? parsed.title.trim()
        : typeof parsed.description === 'string'
          ? parsed.description
          : 'Expense';

    const { data, error } = await admin
      .schema('firstparty')
      .from('vp_expenses')
      .insert({
        user_id: userId,
        amount,
        category:
          typeof parsed.expense_category === 'string'
            ? parsed.expense_category
            : typeof parsed.category === 'string'
              ? parsed.category
              : 'general',
        description,
        date:
          combineDateAndTime(
            typeof parsed.date === 'string' ? parsed.date : null,
            null
          ) ?? new Date().toISOString(),
      })
      .select('id, description')
      .single();

    if (error || !data) return null;
    return { type: 'expense', title: data.description ?? 'Expense', id: data.id };
  }

  return null;
}

async function handleReadIntent(
  userId: string,
  intent: string
): Promise<{ read: boolean; message: string } | null> {
  const admin = createAdminClient();

  if (intent === 'read_tasks') {
    const { data: tasks } = await admin
      .schema('firstparty')
      .from('vp_tasks')
      .select('title, due_date, status')
      .eq('user_id', userId)
      .not('status', 'eq', 'completed')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(5);

    const list = tasks ?? [];
    if (list.length === 0) {
      return { read: true, message: 'You have no open tasks right now.' };
    }
    const lines = list
      .map((t, i) => {
        const due = t.due_date
          ? new Date(t.due_date).toLocaleDateString('en-GB', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })
          : 'no due date';
        return `${i + 1}. ${t.title} (${due})`;
      })
      .join('; ');
    return { read: true, message: `Open tasks: ${lines}` };
  }

  if (intent === 'read_events') {
    const today = new Date().toISOString();
    const { data: events } = await admin
      .schema('firstparty')
      .from('vp_events')
      .select('title, event_date')
      .eq('user_id', userId)
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(5);

    const list = events ?? [];
    if (list.length === 0) {
      return { read: true, message: 'No upcoming events on your calendar.' };
    }
    const lines = list
      .map((e, i) => {
        const when = e.event_date
          ? new Date(e.event_date).toLocaleString('en-GB', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'TBD';
        return `${i + 1}. ${e.title} — ${when}`;
      })
      .join('; ');
    return { read: true, message: `Upcoming: ${lines}` };
  }

  if (intent === 'read_next_task') {
    const { data: tasks } = await admin
      .schema('firstparty')
      .from('vp_tasks')
      .select('title, due_date')
      .eq('user_id', userId)
      .not('status', 'eq', 'completed')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(1);

    const next = tasks?.[0];
    if (!next) {
      return { read: true, message: 'No pending tasks — you are all caught up!' };
    }
    const due = next.due_date
      ? new Date(next.due_date).toLocaleDateString('en-GB')
      : 'no due date';
    return { read: true, message: `Next up: "${next.title}" (due ${due}).` };
  }

  return null;
}

/** Voice/text command parser — events, tasks, expenses, and read-back intents. */
export const parseVoiceCommand: VpFunctionHandler = async ({ user, payload }) => {
  const command = readCommand(payload);
  if (!command) {
    return { ok: false, error: 'command is required', status: 400 };
  }

  const art9Categories = detectArt9CategoriesFromText(command);
  const gate = await gateFeatureWithArt9(user, 'ai_requests', art9Categories);
  if (!gate.ok) return gate.result;

  const today = new Date().toISOString().split('T')[0];
  const parsed = await groqJson<ParsedCommand>(
    'You parse natural-language voice commands for Vagus Planner (calendar, tasks, expenses).',
    `Today is ${today}. Parse this command:
"${command}"

Return JSON:
{
  "success": true,
  "intent": "create_event|create_task|create_expense|read_tasks|read_events|read_next_task|unknown",
  "confidence": 0-100,
  "parsed": {
    "type": "event|task|expense|null",
    "title": "string",
    "description": "string or null",
    "date": "YYYY-MM-DD or null",
    "start_time": "HH:mm or null",
    "end_time": "HH:mm or null",
    "category": "work|personal|health|shopping|other",
    "priority": "low|medium|high|urgent",
    "location": "string or null",
    "amount": number or null,
    "expense_category": "string or null"
  }
}

Examples:
- "Add meeting tomorrow 3pm" → create_event, high confidence
- "Log expense 50 for food" → create_expense, amount 50
- "Remind me to call mum Friday" → create_task
- "Read my tasks" → read_tasks
- "What's on my calendar" → read_events

If unclear, set intent to unknown and confidence below 40.`,
    'vp-parseVoiceCommand',
    gate.plan,
    gate.art9Categories
  );

  if (!parsed || parsed.success === false) {
    return { ok: true, data: { success: false } };
  }

  const intent = typeof parsed.intent === 'string' ? parsed.intent : 'unknown';
  const confidence =
    typeof parsed.confidence === 'number' && !Number.isNaN(parsed.confidence)
      ? Math.min(100, Math.max(0, Math.round(parsed.confidence)))
      : 0;
  const parsedFields =
    parsed.parsed && typeof parsed.parsed === 'object' && !Array.isArray(parsed.parsed)
      ? parsed.parsed
      : {};

  if (intent.startsWith('read_')) {
    const readResult = await handleReadIntent(user.id, intent);
    if (readResult) {
      return {
        ok: true,
        data: {
          success: true,
          result: readResult,
        },
      };
    }
  }

  if (/^read\b|what('s| is) on my/i.test(command)) {
    const readResult = await handleReadIntent(
      user.id,
      /task/i.test(command) ? 'read_tasks' : 'read_events'
    );
    if (readResult) {
      return { ok: true, data: { success: true, result: readResult } };
    }
  }

  if (confidence >= 70 && parsedFields.type) {
    const created = await createFromParsed(user.id, parsedFields);
    if (created) {
      return {
        ok: true,
        data: {
          success: true,
          created,
          parsed: { ...parsedFields, confidence },
        },
      };
    }
  }

  return {
    ok: true,
    data: {
      success: true,
      parsed: { ...parsedFields, confidence },
    },
  };
};

/** EventForm optimal-time picker — adapter over findOptimalMeetingTimes. */
export const suggestOptimalEventTimes: VpFunctionHandler = async (ctx) => {
  const duration =
    typeof ctx.payload.event_duration === 'number' && ctx.payload.event_duration > 0
      ? ctx.payload.event_duration
      : 60;
  const daysAhead =
    typeof ctx.payload.days_ahead === 'number' && ctx.payload.days_ahead > 0
      ? ctx.payload.days_ahead
      : 7;
  const category =
    typeof ctx.payload.event_category === 'string' ? ctx.payload.event_category : 'personal';

  const inner = await findOptimalMeetingTimes({
    ...ctx,
    payload: {
      duration,
      dateRange: daysAhead,
      participants: [],
    },
  });

  if (!inner.ok) return inner;

  const data = inner.data as Record<string, unknown>;
  const rawSlots = (
    Array.isArray(data.optimal_slots)
      ? data.optimal_slots
      : Array.isArray(data.suggestions)
        ? data.suggestions
        : []
  ) as Array<Record<string, unknown>>;

  const suggestions = rawSlots.slice(0, 5).map((slot, idx) => {
    const startRaw = slot.start_time ?? slot.start;
    const startIso = typeof startRaw === 'string' ? startRaw : null;
    const startDate = startIso ? new Date(startIso) : null;
    const validDate = startDate && !Number.isNaN(startDate.getTime());
    const dateStr =
      typeof slot.date === 'string'
        ? slot.date
        : validDate
          ? startDate!.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

    return {
      date: dateStr,
      time: formatTime24(startIso),
      score: normalizeScore(slot.score ?? slot.confidence, 88 - idx * 6),
      reason: String(
        slot.reasoning ?? slot.reason ?? `Strong ${category} slot based on typical availability`
      ),
      dayOfWeek: validDate
        ? startDate!.toLocaleDateString('en-US', { weekday: 'long' })
        : 'Weekday',
    };
  });

  return {
    ok: true,
    data: {
      suggestions,
      analysis: {
        total_events: 0,
        working_hours: { start: 9, end: 17 },
      },
    },
  };
};

/** TaskForm smart scheduler — productivity slots, optionally prayer-gap-aware when permitted. */
export const suggestTaskTimeSlots: VpFunctionHandler = async (ctx) => {
  const taskCategory =
    typeof ctx.payload.category === 'string' ? ctx.payload.category.toLowerCase() : '';
  const title = typeof ctx.payload.title === 'string' ? ctx.payload.title : 'Task';
  const art9Categories = mergeArt9Categories(
    taskCategory === 'health' ? (['health'] as const) : [],
    detectArt9CategoriesFromText(title)
  );
  const gate = await gateFeatureWithArt9(ctx.user, 'ai_requests', art9Categories);
  if (!gate.ok) return gate.result;

  const duration =
    typeof ctx.payload.estimated_minutes === 'number' && ctx.payload.estimated_minutes > 0
      ? ctx.payload.estimated_minutes
      : 60;
  const targetDate =
    typeof ctx.payload.target_date === 'string' && ctx.payload.target_date
      ? ctx.payload.target_date
      : typeof ctx.payload.due_date === 'string' && ctx.payload.due_date
        ? ctx.payload.due_date.split('T')[0]
        : new Date().toISOString().split('T')[0];

  const core = await runSuggestTimeSlotsCore({
    label: 'vp-suggestTaskTimeSlots',
    promptKind: 'task_focus',
    duration,
    targetDate,
    title,
    userTier: gate.plan,
    art9Categories: gate.art9Categories,
    resolvePrayerTimesFromProfile: true,
    userId: ctx.user.id,
    bufferMinutes: 15,
  });

  if (!core.ok) {
    return {
      ok: false,
      error: aiUnavailableMessage(core.slotArt9Categories),
      status: core.status,
    };
  }

  const prayerTimes = core.prayerTimes;
  const normalized = core.normalized;

  const slots = normalized.slice(0, 3).map((slot, idx) => {
    const startIso = typeof slot.start_time === 'string' ? slot.start_time : null;
    const endIso = typeof slot.end_time === 'string' ? slot.end_time : null;
    const startTime = formatTime24(startIso);
    let endTime = formatTime24(endIso);
    if (endTime === startTime) {
      const [h, m] = startTime.split(':').map(Number);
      const endMinutes = h * 60 + m + duration;
      endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
    }

    const hour = Number(startTime.split(':')[0]);
    const period = productivityPeriod(Number.isNaN(hour) ? 9 : hour);
    const reason = String(slot.reasoning ?? 'Balanced slot for focused work');

    return {
      start_time: startTime,
      end_time: endTime,
      productivity_period: period,
      label: PERIOD_LABELS[period] ?? 'Focus block',
      score: normalizeScore(slot.score ?? slot.confidence, 85 - idx * 8),
      prayer_gap: Object.keys(prayerTimes).length
        ? `Clear window between prayer times`
        : undefined,
      reason,
    };
  });

  return {
    ok: true,
    data: {
      slots,
      prayer_times: prayerTimes,
      prayer_available: Object.keys(prayerTimes).length > 0,
      balance_tip:
        slots.length > 0
          ? `Schedule "${title}" in a ${duration}-minute block that keeps space for salah and breaks.`
          : 'Try another date or shorten the estimated duration for more options.',
    },
  };
};
