import { createAdminClient } from '@/lib/supabase/admin';
import {
  detectArt9CategoriesFromText,
  mergeArt9Categories,
} from '@/lib/vp-gdpr/art9-ai-gate';
import type { VpArt9Category } from '@/lib/vp-gdpr/tables';
import { vpChatCompletionJson } from '@/lib/vp-ai-providers';
import {
  logGroqParseFailure,
  parseGroqJsonContent,
} from '@/lib/shift-ai/groq-json';
import type { VpFunctionHandler, VpFunctionResult } from '../types';
import {
  aiUnavailableMessage,
  gateFeatureWithArt9,
} from './calendar-ai';

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asBool(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null) return false;
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on';
  }
  return false;
}

function asPositiveInt(value: unknown, fallback: number): number {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), 30);
}

function asOptionalBudget(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function parseYmd(value: unknown): string | null {
  const s = asString(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return s;
}

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetweenInclusive(start: string, end: string): number {
  const a = new Date(`${start}T12:00:00Z`).getTime();
  const b = new Date(`${end}T12:00:00Z`).getTime();
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

function isPackingOnly(payload: Record<string, unknown>): boolean {
  const mode = asString(payload.mode).toLowerCase();
  if (mode === 'packing' || mode === 'packing_only') return true;
  return asBool(payload.packing_only);
}

function resolveTravelStyle(payload: Record<string, unknown>): string {
  return (
    asString(payload.travel_style) ||
    asString(payload.style) ||
    asString(payload.trip_type) ||
    'leisure'
  );
}

/** Halal Mode / islamic flags — unconditional Art.9 religious trigger (ignore destination text). */
function resolveHalalMode(payload: Record<string, unknown>): boolean {
  return (
    asBool(payload.halal_mode) ||
    asBool(payload.halalMode) ||
    asBool(payload.islamic_mode) ||
    asBool(payload.islamicMode)
  );
}

/**
 * Travel Art.9 scan.
 * - halal_mode / islamic_mode → always religious (even if destination is "Tokyo")
 * - destination / style / origin / extras scanned via shared detectArt9CategoriesFromText
 *   (covers Mekkah/Makkah/Mecca/Madinah and underscore styles like halal_tourism)
 */
export function scanTravelArt9(parts: {
  destination: string;
  travelStyle: string;
  origin: string;
  halalMode: boolean;
  extra?: string;
}): VpArt9Category[] {
  // Unconditional: Halal Mode alone is sufficient — do not depend on destination spelling.
  if (parts.halalMode) {
    return mergeArt9Categories(
      ['religious'],
      detectArt9CategoriesFromText(parts.destination),
      detectArt9CategoriesFromText(parts.travelStyle),
      detectArt9CategoriesFromText(parts.origin),
      detectArt9CategoriesFromText(parts.extra || '')
    );
  }

  return mergeArt9Categories(
    detectArt9CategoriesFromText(parts.destination),
    detectArt9CategoriesFromText(parts.travelStyle),
    detectArt9CategoriesFromText(parts.origin),
    detectArt9CategoriesFromText(parts.extra || '')
  );
}

async function travelAiJson<T extends Record<string, unknown>>(
  system: string,
  userPrompt: string,
  label: string,
  userTier: string,
  art9Categories: VpArt9Category[]
): Promise<{ data: T; provider: string } | null> {
  const result = await vpChatCompletionJson(system, userPrompt, {
    userTier,
    label,
    temperature: 0.4,
    art9Categories,
  });

  if (!result.ok) {
    console.warn(`VP AI [${label}] providers failed:`, result.error, {
      art9Categories,
      triedProviders: result.triedProviders,
      groqOnly: art9Categories.length > 0,
    });
    return null;
  }

  const parsed = parseGroqJsonContent(result.content, 'Could not parse AI response');
  if (!parsed.ok) {
    logGroqParseFailure(label, result.content, parsed.error);
    return null;
  }

  console.info(`[planTripWithAi] AI provider=${result.provider} art9=${JSON.stringify(art9Categories)} label=${label}`);
  return { data: parsed.json as T, provider: result.provider };
}

type ItineraryActivity = {
  time: string;
  description: string;
  type: string;
  halal_note?: string;
};

type ItineraryDay = {
  day: number;
  title: string;
  date: string;
  activities: ItineraryActivity[];
};

type PackingCategory = {
  category: string;
  items: string[];
};

type TripPlanAiResult = {
  itinerary?: ItineraryDay[];
  packing_list?: PackingCategory[];
  travel_tips?: string[];
  estimated_travel_time_hours?: number;
  accommodation_suggestion?: string;
  summary?: string;
};

function normalizeItinerary(
  raw: unknown,
  startDate: string,
  dayCount: number
): ItineraryDay[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, Math.min(dayCount, 21)).map((day, idx) => {
    const d = day && typeof day === 'object' ? (day as Record<string, unknown>) : {};
    const dayNum =
      typeof d.day === 'number' && Number.isFinite(d.day) ? Math.floor(d.day) : idx + 1;
    const date =
      parseYmd(d.date) || addDaysYmd(startDate, Math.max(0, dayNum - 1));
    const activitiesRaw = Array.isArray(d.activities) ? d.activities : [];
    const activities: ItineraryActivity[] = activitiesRaw.slice(0, 10).map((act) => {
      const a = act && typeof act === 'object' ? (act as Record<string, unknown>) : {};
      return {
        time: asString(a.time) || '09:00',
        description: asString(a.description) || asString(a.title) || 'Activity',
        type: asString(a.type) || 'activity',
        ...(asString(a.halal_note) ? { halal_note: asString(a.halal_note) } : {}),
      };
    });
    return {
      day: dayNum,
      title: asString(d.title) || `Day ${dayNum}`,
      date,
      activities,
    };
  });
}

function normalizePackingList(raw: unknown): PackingCategory[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 12).map((cat) => {
    const c = cat && typeof cat === 'object' ? (cat as Record<string, unknown>) : {};
    const category = asString(c.category) || asString(c.name) || 'Essentials';
    const itemsRaw = Array.isArray(c.items) ? c.items : [];
    const items = itemsRaw
      .slice(0, 24)
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>;
          return asString(o.item) || asString(o.name) || asString(o.title);
        }
        return '';
      })
      .filter(Boolean);
    return { category, items };
  }).filter((c) => c.items.length > 0);
}

function normalizeTips(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => (typeof t === 'string' ? t.trim() : ''))
    .filter(Boolean)
    .slice(0, 12);
}

function packingPayloadForUi(packing: PackingCategory[]) {
  return {
    packing_list: packing,
    // Richer shape for AIPackingListGenerator / legacy UIs
    categories: packing.map((c) => ({
      name: c.category,
      items: c.items.map((item) => ({
        item,
        reason: '',
        priority: 'recommended',
      })),
    })),
  };
}

function foldPlanIntoFlightDetails(plan: {
  summary?: string;
  itinerary: ItineraryDay[];
  packing_list: PackingCategory[];
  travel_tips: string[];
}): string {
  const lines: string[] = [];
  if (plan.summary) lines.push(plan.summary);
  lines.push('', '=== AI Itinerary ===');
  for (const day of plan.itinerary) {
    lines.push(`Day ${day.day} (${day.date}) — ${day.title}`);
    for (const act of day.activities) {
      lines.push(`  ${act.time}: ${act.description}`);
    }
  }
  lines.push('', '=== Packing ===');
  for (const cat of plan.packing_list) {
    lines.push(`${cat.category}: ${cat.items.join(', ')}`);
  }
  if (plan.travel_tips.length) {
    lines.push('', '=== Tips ===');
    for (const tip of plan.travel_tips) lines.push(`- ${tip}`);
  }
  // Cap length — flight_details is text; keep under ~8k chars
  const text = lines.join('\n');
  return text.length > 8000 ? `${text.slice(0, 7990)}\n…` : text;
}

async function persistHolidayAndEvents(params: {
  userId: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number | null;
  accommodation: string;
  flightDetails: string;
  itinerary: ItineraryDay[];
  createCalendarEvents: boolean;
}): Promise<{ holidayId: string | null; createdEventsCount: number }> {
  const admin = createAdminClient();
  const { data: holiday, error } = await admin
    .schema('firstparty')
    .from('vp_holidays')
    .insert({
      user_id: params.userId,
      name: `Trip to ${params.destination}`,
      date: params.startDate,
      end_date: params.endDate,
      status: 'planned',
      destination: params.destination,
      ...(params.budget != null ? { budget: params.budget } : {}),
      ...(params.accommodation ? { accommodation: params.accommodation } : {}),
      ...(params.flightDetails ? { flight_details: params.flightDetails } : {}),
    })
    .select('id')
    .single();

  if (error || !holiday?.id) {
    console.error('[planTripWithAi] Holiday insert failed:', error);
    return { holidayId: null, createdEventsCount: 0 };
  }

  let createdEventsCount = 0;
  if (params.createCalendarEvents && params.itinerary.length > 0) {
    const rows = params.itinerary.map((day) => {
      const first = day.activities[0];
      const time = first?.time && /^\d{1,2}:\d{2}/.test(first.time)
        ? first.time.slice(0, 5)
        : '09:00';
      const eventDate = `${day.date}T${time}:00`;
      const desc = day.activities
        .map((a) => `${a.time} — ${a.description}`)
        .join('\n');
      return {
        user_id: params.userId,
        title: `${params.destination}: ${day.title}`,
        description: desc.slice(0, 2000),
        location: params.destination,
        event_date: eventDate,
      };
    });

    const { data: events, error: eventError } = await admin
      .schema('firstparty')
      .from('vp_events')
      .insert(rows)
      .select('id');

    if (eventError) {
      console.error('[planTripWithAi] Event insert failed:', eventError);
    } else {
      createdEventsCount = events?.length ?? 0;
    }
  }

  return { holidayId: holiday.id, createdEventsCount };
}

async function runPlanTripWithAi(
  ctx: Parameters<VpFunctionHandler>[0],
  options?: { forcePackingOnly?: boolean }
): Promise<VpFunctionResult> {
  const { user, payload } = ctx;
  const packingOnly = options?.forcePackingOnly === true || isPackingOnly(payload);

  const destination = asString(payload.destination);
  if (!destination || destination.length < 2) {
    return { ok: false, error: 'destination is required', status: 400 };
  }

  const startDate = parseYmd(payload.start_date);
  if (!startDate) {
    return { ok: false, error: 'start_date is required (YYYY-MM-DD)', status: 400 };
  }

  let endDate = parseYmd(payload.end_date);
  const durationDays = asPositiveInt(
    payload.duration_days ?? payload.duration,
    0
  );
  if (!endDate && durationDays > 0) {
    endDate = addDaysYmd(startDate, durationDays - 1);
  }
  if (!endDate) {
    return {
      ok: false,
      error: 'end_date or duration_days is required',
      status: 400,
    };
  }
  if (new Date(`${endDate}T12:00:00Z`) < new Date(`${startDate}T12:00:00Z`)) {
    return { ok: false, error: 'end_date must be on or after start_date', status: 400 };
  }

  const dayCount = Math.min(daysBetweenInclusive(startDate, endDate), 14);
  const travelers = asPositiveInt(payload.travelers ?? payload.num_travelers, 1);
  const budget = asOptionalBudget(payload.budget);
  const travelStyle = resolveTravelStyle(payload);
  const origin = asString(payload.origin);
  const halalMode = resolveHalalMode(payload);
  const activitiesHint = Array.isArray(payload.activities)
    ? payload.activities.map((a) => asString(a)).filter(Boolean).slice(0, 12)
    : [];

  const createHoliday =
    payload.create_holiday === false || payload.create_holiday === 'false'
      ? false
      : packingOnly
        ? asBool(payload.create_holiday)
        : payload.create_holiday !== false;

  const createCalendarEvents =
    payload.create_calendar_events === false ||
    payload.create_calendar_events === 'false'
      ? false
      : packingOnly
        ? false
        : payload.create_calendar_events !== false;

  const art9Categories = scanTravelArt9({
    destination,
    travelStyle,
    origin,
    halalMode,
    extra: activitiesHint.join(' '),
  });

  console.info('[planTripWithAi] Art.9 scan', {
    destination,
    travelStyle,
    origin,
    packingOnly,
    halalMode,
    payload_halal_mode: payload.halal_mode,
    payload_halalMode: payload.halalMode,
    art9Categories,
  });

  const gate = await gateFeatureWithArt9(user, 'ai_requests', art9Categories);
  if (!gate.ok) {
    const blocked = gate.result;
    console.info('[planTripWithAi] Art.9/feature gate blocked', {
      art9Categories,
      error: blocked.ok === false ? blocked.error : 'blocked',
      status: blocked.ok === false ? blocked.status : 403,
    });
    return gate.result;
  }

  const religiousHint =
    gate.art9Categories.length > 0
      ? 'This trip may involve religious or health-sensitive context (e.g. Hajj/Umrah, prayer, halal). Be respectful, practical, and do not invent religious rulings or medical advice.'
      : '';

  const system = packingOnly
    ? `You are a practical travel packing assistant for Vagus Planner.
Return JSON only. Focus on realistic packing categories for the destination, season, and trip style.
${religiousHint}`
    : `You are a practical trip planner for Vagus Planner.
Return JSON only. Build a realistic day-by-day itinerary, packing list, and tips.
Keep activities feasible for the date range. Prefer local highlights over fantasy bookings.
${halalMode ? 'Halal mode is ON: schedule around prayer windows when relevant, prefer halal dining notes, include mosque/prayer-friendly options.' : ''}
${religiousHint}`;

  const userPrompt = packingOnly
    ? `Create a packing list only.

Destination: ${destination}
Start: ${startDate}
End: ${endDate} (${dayCount} days)
Travelers: ${travelers}
Travel style / trip type: ${travelStyle}
Halal mode: ${halalMode ? 'yes' : 'no'}
${origin ? `Origin: ${origin}` : ''}
${budget != null ? `Budget (USD, approx): ${budget}` : ''}
${activitiesHint.length ? `Activities: ${activitiesHint.join(', ')}` : ''}

Return:
{
  "packing_list": [
    { "category": "Documents", "items": ["Passport", "Travel insurance"] }
  ],
  "travel_tips": ["short tip"]
}`
    : `Plan this trip.

Destination: ${destination}
Start: ${startDate}
End: ${endDate} (${dayCount} days)
Travelers: ${travelers}
Travel style / trip type: ${travelStyle}
Halal mode: ${halalMode ? 'yes' : 'no'}
${origin ? `Origin: ${origin}` : ''}
${budget != null ? `Budget (USD, approx): ${budget}` : ''}

Return JSON:
{
  "summary": "1-2 sentence trip overview",
  "estimated_travel_time_hours": 8,
  "accommodation_suggestion": "short hotel/area suggestion",
  "itinerary": [
    {
      "day": 1,
      "title": "Arrival & settle in",
      "date": "${startDate}",
      "activities": [
        {
          "time": "10:00",
          "description": "What to do",
          "type": "sightseeing|food|transport|mosque|prayer|activity|morning|afternoon|evening",
          "halal_note": "optional when halal mode"
        }
      ]
    }
  ],
  "packing_list": [
    { "category": "Documents", "items": ["Passport"] }
  ],
  "travel_tips": ["practical tip"]
}

Include exactly ${dayCount} itinerary days with correct dates from ${startDate} through ${endDate}.`;

  const ai = await travelAiJson<TripPlanAiResult>(
    system,
    userPrompt,
    packingOnly ? 'vp-planTripWithAi-packing' : 'vp-planTripWithAi',
    gate.plan,
    gate.art9Categories
  );

  if (!ai) {
    return {
      ok: false,
      error: aiUnavailableMessage(gate.art9Categories),
      status: 503,
    };
  }

  const result = ai.data;
  const aiProvider = ai.provider;

  const packing_list = normalizePackingList(result.packing_list);
  const travel_tips = normalizeTips(result.travel_tips);
  const itinerary = packingOnly
    ? []
    : normalizeItinerary(result.itinerary, startDate, dayCount);

  if (packingOnly) {
    return {
      ok: true,
      data: {
        success: true,
        mode: 'packing',
        destination,
        start_date: startDate,
        end_date: endDate,
        ...packingPayloadForUi(packing_list),
        travel_tips,
        weather_summary: asString(result.summary) || undefined,
        special_tips: travel_tips,
        art9_categories: gate.art9Categories,
        ai_provider: aiProvider,
        halal_mode: halalMode,
      },
    };
  }

  const accommodation = asString(result.accommodation_suggestion);
  const flightDetails = foldPlanIntoFlightDetails({
    summary: asString(result.summary) || undefined,
    itinerary,
    packing_list,
    travel_tips,
  });

  let holidayId: string | null = null;
  let createdEventsCount = 0;
  if (createHoliday) {
    const persisted = await persistHolidayAndEvents({
      userId: user.id,
      destination,
      startDate,
      endDate,
      budget,
      accommodation,
      flightDetails,
      itinerary,
      createCalendarEvents,
    });
    holidayId = persisted.holidayId;
    createdEventsCount = persisted.createdEventsCount;
  }

  return {
    ok: true,
    data: {
      success: true,
      mode: 'full',
      destination,
      start_date: startDate,
      end_date: endDate,
      summary: asString(result.summary) || undefined,
      estimated_travel_time_hours:
        typeof result.estimated_travel_time_hours === 'number' &&
        Number.isFinite(result.estimated_travel_time_hours)
          ? Math.round(result.estimated_travel_time_hours)
          : undefined,
      accommodation_suggestion: accommodation || undefined,
      itinerary,
      ...packingPayloadForUi(packing_list),
      travel_tips,
      holiday_id: holidayId,
      created_events_count: createdEventsCount,
      art9_categories: gate.art9Categories,
      ai_provider: aiProvider,
      halal_mode: halalMode,
    },
  };
}

/** Primary Travel AI v1 handler — full itinerary + packing + tips. */
export const planTripWithAi: VpFunctionHandler = async (ctx) => runPlanTripWithAi(ctx);

/** Alias: packing-only mode of planTripWithAi. */
export const generateSmartPackingList: VpFunctionHandler = async (ctx) =>
  runPlanTripWithAi(ctx, { forcePackingOnly: true });

/** Alias: same packing-only mode (legacy SmartTravelPlanner name). */
export const generatePackingList: VpFunctionHandler = async (ctx) =>
  runPlanTripWithAi(ctx, { forcePackingOnly: true });

/** Alias: older Smart Trip Planner entry name → full plan. */
export const smartTripPlanner: VpFunctionHandler = async (ctx) => runPlanTripWithAi(ctx);

/** Alias: older AI Trip Planner entry → full plan (destination required). */
export const generatePersonalizedTripSuggestions: VpFunctionHandler = async (ctx) =>
  runPlanTripWithAi(ctx);
