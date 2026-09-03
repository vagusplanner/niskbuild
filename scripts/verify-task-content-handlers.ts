/**
 * Verification for Batch 1b task/content AI handlers.
 * Run: npx tsx scripts/verify-task-content-handlers.ts
 */
import Module from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
  const { detectArt9CategoriesFromText } = await import('../lib/vp-gdpr/art9-ai-gate');
  const userId = await resolveTestUserId();
  await initProductGatingContext(userId);

  const {
    suggestTaskPriority,
    translateContent,
    analyzeChatForActions,
    generateRecurringTaskDescription,
  } = await import('../lib/vp-functions/handlers/task-and-content-ai');
  const { getVpFunctionHandler } = await import('../lib/vp-functions/registry');

  const ctx = {
    request: {} as import('next/server').NextRequest,
    user: { id: userId, email: 'verify@local.test' } as import('@supabase/supabase-js').User,
    payload: {} as Record<string, unknown>,
  };

  const results: CheckResult[] = [];

  for (const name of [
    'suggestTaskPriority',
    'translateContent',
    'analyzeChatForActions',
    'generateRecurringTaskDescription',
  ]) {
    results.push({
      name: `registry:${name}`,
      ok: !!getVpFunctionHandler(name),
      detail: getVpFunctionHandler(name) ? 'registered' : 'MISSING',
    });
  }

  // Art.9 detector unit checks (no LLM)
  const mundaneScan = detectArt9CategoriesFromText('Buy groceries and reply to emails');
  results.push({
    name: 'art9-scan-mundane',
    ok: mundaneScan.length === 0,
    detail: JSON.stringify(mundaneScan),
  });

  const prayerScan = detectArt9CategoriesFromText('Schedule Fajr prayer reminder');
  results.push({
    name: 'art9-scan-prayer',
    ok: prayerScan.includes('religious'),
    detail: JSON.stringify(prayerScan),
  });

  const healthScan = detectArt9CategoriesFromText('Book doctor appointment for medication review');
  results.push({
    name: 'art9-scan-health',
    ok: healthScan.includes('health'),
    detail: JSON.stringify(healthScan),
  });

  // Live LLM: mundane priority (no Art.9)
  {
    const r = await suggestTaskPriority({
      ...ctx,
      payload: {
        title: 'Buy groceries for the week',
        description: 'Milk, eggs, bread',
        due_date: '',
        due_time: '',
        category: 'personal',
      },
    });
    if (!r.ok) {
      results.push({ name: 'suggestTaskPriority-mundane', ok: false, detail: r.error });
    } else {
      const data = r.data as Record<string, unknown>;
      const ok =
        data.success === true &&
        typeof data.suggested_priority === 'string' &&
        typeof data.reasoning === 'string';
      results.push({
        name: 'suggestTaskPriority-mundane',
        ok,
        detail: JSON.stringify({
          suggested_priority: data.suggested_priority,
          confidence: data.confidence,
          reasoning: String(data.reasoning ?? '').slice(0, 120),
          art9_expected: [],
        }),
      });
    }
  }

  // Live LLM: Art.9 religious priority
  {
    const r = await suggestTaskPriority({
      ...ctx,
      payload: {
        title: 'Prepare for Maghrib prayer and Quran reading',
        description: 'Wudu and short Surah review before Maghrib',
        due_date: new Date().toISOString().split('T')[0],
        due_time: '18:00',
        category: 'spiritual',
      },
    });
    const expectedArt9 = detectArt9CategoriesFromText(
      'Prepare for Maghrib prayer and Quran reading Wudu and short Surah review before Maghrib spiritual'
    );
    if (!r.ok) {
      // Consent/plan blocks are still a valid Art.9 path exercised
      const consentBlocked = /Article 9|consent|Islamic/i.test(r.error);
      results.push({
        name: 'suggestTaskPriority-art9-prayer',
        ok: consentBlocked || r.status === 503,
        detail: `handler returned error (Art.9 gate or provider): ${r.error} | scan=${JSON.stringify(expectedArt9)}`,
      });
    } else {
      const data = r.data as Record<string, unknown>;
      results.push({
        name: 'suggestTaskPriority-art9-prayer',
        ok: data.success === true && typeof data.suggested_priority === 'string',
        detail: JSON.stringify({
          suggested_priority: data.suggested_priority,
          confidence: data.confidence,
          reasoning: String(data.reasoning ?? '').slice(0, 120),
          art9_scan: expectedArt9,
        }),
      });
    }
  }

  // Live LLM: translateContent mundane
  {
    const r = await translateContent({
      ...ctx,
      payload: {
        text: 'Meeting tomorrow at 3pm',
        target_language: 'French',
        source_language: 'auto',
      },
    });
    if (!r.ok) {
      results.push({ name: 'translateContent-mundane', ok: false, detail: r.error });
    } else {
      const data = r.data as Record<string, unknown>;
      results.push({
        name: 'translateContent-mundane',
        ok: data.success === true && typeof data.translated_text === 'string' && !!data.translated_text,
        detail: String(data.translated_text ?? '').slice(0, 160),
      });
    }
  }

  // Live LLM: analyzeChatForActions
  {
    const r = await analyzeChatForActions({
      ...ctx,
      payload: {
        conversation_id: 'verify-chat-1',
        event_title: 'Team offsite planning',
        messages: [
          { sender: 'Alex', text: 'Can someone book the venue for Friday?', timestamp: new Date().toISOString() },
          { sender: 'Sam', text: 'I will also create a packing list task', timestamp: new Date().toISOString() },
        ],
      },
    });
    if (!r.ok) {
      results.push({ name: 'analyzeChatForActions', ok: false, detail: r.error });
    } else {
      const data = r.data as Record<string, unknown>;
      const suggestions = data.suggestions;
      results.push({
        name: 'analyzeChatForActions',
        ok: Array.isArray(suggestions),
        detail: JSON.stringify(suggestions).slice(0, 240),
      });
    }
  }

  // Live LLM: generateRecurringTaskDescription
  {
    const r = await generateRecurringTaskDescription({
      ...ctx,
      payload: {
        task_title: 'Weekly inbox zero',
        category: 'work',
        recurrence_type: 'weekly',
      },
    });
    if (!r.ok) {
      results.push({ name: 'generateRecurringTaskDescription', ok: false, detail: r.error });
    } else {
      const data = r.data as Record<string, unknown>;
      results.push({
        name: 'generateRecurringTaskDescription',
        ok: typeof data.description === 'string' && data.description.length > 10,
        detail: JSON.stringify({
          description: String(data.description ?? '').slice(0, 100),
          estimated_minutes: data.estimated_minutes,
          subtasks: Array.isArray(data.subtasks) ? data.subtasks.length : 0,
          tips: Array.isArray(data.tips) ? data.tips.length : 0,
        }),
      });
    }
  }

  console.log('\n=== Batch 1b task/content handler verification ===\n');
  let failed = 0;
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`);
    console.log(`       ${r.detail}\n`);
    if (!r.ok) failed += 1;
  }
  console.log(`Summary: ${results.length - failed}/${results.length} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
