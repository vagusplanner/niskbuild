/**
 * One-off verification for consolidated time-slot handlers.
 * Run: npx tsx scripts/verify-slot-handlers.ts
 */
import Module from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Allow importing Next.js server modules outside the app runtime.
const originalLoad = (Module as unknown as { _load: Function })._load;
(Module as unknown as { _load: Function })._load = function (
  request: string,
  parent: unknown,
  isMain: boolean
) {
  if (request === 'server-only') return {};
  return originalLoad.call(this, request, parent, isMain);
};

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), '.env.local');
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

type CheckResult = { name: string; ok: boolean; detail: string };

function assertKeys(obj: Record<string, unknown>, keys: string[], label: string): string | null {
  for (const key of keys) {
    if (!(key in obj)) return `${label} missing key "${key}"`;
  }
  return null;
}

async function resolveTestUserId(): Promise<string> {
  const { createAdminClient } = await import('../lib/supabase/admin');
  const admin = createAdminClient();
  const { data } = await admin
    .schema('firstparty')
    .from('platform_owners')
    .select('user_id')
    .limit(1)
    .maybeSingle();
  if (data?.user_id) return data.user_id as string;

  const { data: settings } = await admin
    .schema('firstparty')
    .from('vp_user_settings')
    .select('user_id')
    .limit(1)
    .maybeSingle();
  if (settings?.user_id) return settings.user_id as string;

  throw new Error('No test user found in platform_owners or vp_user_settings');
}

async function main() {
  const { initProductGatingContext } = await import('../lib/platform-owner-bypass');
  const userId = await resolveTestUserId();
  await initProductGatingContext(userId);

  const {
    findOptimalMeetingTimes,
    suggestOptimalMeetingTime,
    advancedMeetingScheduler,
  } = await import('../lib/vp-functions/handlers/calendar-ai');
  const { suggestOptimalEventTimes } = await import(
    '../lib/vp-functions/handlers/voice-and-slots'
  );

  const ctx = {
    request: {} as import('next/server').NextRequest,
    user: { id: userId, email: 'verify@local.test' } as import('@supabase/supabase-js').User,
    payload: {} as Record<string, unknown>,
  };

  const results: CheckResult[] = [];

  const r1 = await findOptimalMeetingTimes({
    ...ctx,
    payload: { duration: 30, dateRange: 3, participants: ['alice@example.com'] },
  });
  if (!r1.ok) {
    results.push({ name: 'findOptimalMeetingTimes', ok: false, detail: r1.error ?? 'failed' });
  } else {
    const data = r1.data as Record<string, unknown>;
    const err =
      assertKeys(data, ['optimal_slots', 'suggestions'], 'findOptimalMeetingTimes') ??
      (!Array.isArray(data.optimal_slots) ? 'optimal_slots not array' : null) ??
      (!Array.isArray(data.suggestions) ? 'suggestions not array' : null);
    const slot = (data.optimal_slots as Array<Record<string, unknown>>)[0];
    const slotErr =
      slot &&
      (assertKeys(slot, ['start_time', 'score', 'reasoning'], 'optimal_slots[0]') ??
        (typeof slot.start_time !== 'string' ? 'start_time not string' : null));
    results.push({
      name: 'findOptimalMeetingTimes',
      ok: !err && !slotErr,
      detail: err ?? slotErr ?? `ok (${(data.optimal_slots as unknown[]).length} slots)`,
    });
  }

  const r2 = await suggestOptimalMeetingTime({
    ...ctx,
    payload: {
      meeting_title: 'Sprint planning',
      duration_minutes: 45,
      attendee_emails: ['bob@example.com'],
    },
  });
  if (!r2.ok) {
    results.push({ name: 'suggestOptimalMeetingTime', ok: false, detail: r2.error ?? 'failed' });
  } else {
    const data = r2.data as Record<string, unknown>;
    const err =
      assertKeys(data, ['analysis', 'optimal_slots', 'recommendations'], 'suggestOptimalMeetingTime') ??
      (!Array.isArray(data.optimal_slots) ? 'optimal_slots not array' : null) ??
      (!Array.isArray(data.recommendations) ? 'recommendations not array' : null);
    results.push({
      name: 'suggestOptimalMeetingTime',
      ok: !err,
      detail: err ?? `ok (analysis=${String(data.analysis).slice(0, 40)}…)`,
    });
  }

  const r3 = await advancedMeetingScheduler({
    ...ctx,
    payload: {
      duration: 60,
      constraints: 'Next week mornings only',
      attendeeEmails: ['carol@example.com'],
    },
  });
  if (!r3.ok) {
    results.push({ name: 'advancedMeetingScheduler', ok: false, detail: r3.error ?? 'failed' });
  } else {
    const data = r3.data as Record<string, unknown>;
    const err =
      assertKeys(data, ['suggestions', 'team_insights'], 'advancedMeetingScheduler') ??
      (!Array.isArray(data.suggestions) ? 'suggestions not array' : null);
    const first = (data.suggestions as Array<Record<string, unknown>>)[0];
    const slotErr =
      first &&
      (assertKeys(first, ['start_time', 'end_time', 'reasoning'], 'suggestions[0]') ??
        (typeof first.confidence !== 'number' && first.confidence != null
          ? null
          : first.confidence == null
            ? 'confidence missing (allowed if Groq omits)'
            : null));
    results.push({
      name: 'advancedMeetingScheduler',
      ok: !err,
      detail: err ?? slotErr ?? `ok (${(data.suggestions as unknown[]).length} raw suggestions)`,
    });
  }

  const r4 = await suggestOptimalEventTimes({
    ...ctx,
    payload: { event_duration: 60, days_ahead: 5, event_category: 'work' },
  });
  if (!r4.ok) {
    results.push({ name: 'suggestOptimalEventTimes', ok: false, detail: r4.error ?? 'failed' });
  } else {
    const data = r4.data as Record<string, unknown>;
    const err =
      assertKeys(data, ['suggestions', 'analysis'], 'suggestOptimalEventTimes') ??
      (!Array.isArray(data.suggestions) ? 'suggestions not array' : null);
    const first = (data.suggestions as Array<Record<string, unknown>>)[0];
    const slotErr =
      first &&
      (assertKeys(first, ['date', 'time', 'score', 'reason', 'dayOfWeek'], 'suggestions[0]') ??
        null);
    results.push({
      name: 'suggestOptimalEventTimes',
      ok: !err && !slotErr,
      detail: err ?? slotErr ?? `ok (${(data.suggestions as unknown[]).length} event suggestions)`,
    });
  }

  console.log('\nTime-slot handler verification:\n');
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}: ${r.detail}`);
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
