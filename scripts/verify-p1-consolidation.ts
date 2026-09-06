/**
 * Functional verification for P1 consolidation merges:
 * 1) suggestTaskPriority (single + batch shape)
 * 2) generateTasksFromGoal (Apply → Tasks)
 * 3) Prayer coach report schema (local normalize + optional live LLM if env allows)
 *
 * Run: npx tsx scripts/verify-p1-consolidation.ts
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
  try {
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
  } catch {
    // optional
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

  throw new Error('No test user found');
}

function assertPriority(data: Record<string, unknown>, label: string): CheckResult {
  const priority = String(data.suggested_priority || '');
  const ok =
    data.success === true &&
    ['low', 'medium', 'high', 'urgent'].includes(priority) &&
    typeof data.reasoning === 'string' &&
    (data.reasoning as string).length > 5;
  return {
    name: label,
    ok,
    detail: JSON.stringify({
      suggested_priority: data.suggested_priority,
      confidence: data.confidence,
      reasoning: String(data.reasoning || '').slice(0, 140),
      factors: data.urgency_factors,
    }),
  };
}

async function main() {
  const { initProductGatingContext } = await import('../lib/platform-owner-bypass');
  const userId = await resolveTestUserId();
  await initProductGatingContext(userId);

  const { suggestTaskPriority } = await import('../lib/vp-functions/handlers/task-and-content-ai');
  const { generateTasksFromGoal } = await import('../lib/vp-functions/handlers/goal-reminders-deps-ai');
  const { getVpFunctionHandler } = await import('../lib/vp-functions/registry');
  const { groqJson } = await import('../lib/vp-functions/handlers/calendar-ai');

  const ctx = {
    request: {} as import('next/server').NextRequest,
    user: { id: userId, email: 'verify@local.test' } as import('@supabase/supabase-js').User,
    payload: {} as Record<string, unknown>,
  };

  const results: CheckResult[] = [];

  results.push({
    name: 'registry:suggestTaskPriority',
    ok: !!getVpFunctionHandler('suggestTaskPriority'),
    detail: getVpFunctionHandler('suggestTaskPriority') ? 'registered' : 'MISSING',
  });
  results.push({
    name: 'registry:generateTasksFromGoal',
    ok: !!getVpFunctionHandler('generateTasksFromGoal'),
    detail: getVpFunctionHandler('generateTasksFromGoal') ? 'registered' : 'MISSING',
  });
  results.push({
    name: 'registry:reprioritizeTasks-absent',
    ok: !getVpFunctionHandler('reprioritizeTasks'),
    detail: 'expected absent — BulkReprioritize now batches suggestTaskPriority',
  });

  // ── 1) Priority: mundane + urgent-ish ─────────────────────────────────────
  {
    const r = await suggestTaskPriority({
      ...ctx,
      payload: {
        title: 'Reply to client email about invoice',
        description: 'Non-urgent admin',
        due_date: '',
        category: 'work',
      },
    });
    if (!r.ok) results.push({ name: 'priority-single-mundane', ok: false, detail: r.error });
    else results.push(assertPriority(r.data as Record<string, unknown>, 'priority-single-mundane'));
  }

  {
    const r = await suggestTaskPriority({
      ...ctx,
      payload: {
        title: 'Submit tax filing before midnight deadline',
        description: 'Legal deadline today',
        due_date: new Date().toISOString().slice(0, 10),
        due_time: '23:00',
        category: 'work',
      },
    });
    if (!r.ok) results.push({ name: 'priority-single-deadline', ok: false, detail: r.error });
    else {
      const data = r.data as Record<string, unknown>;
      const base = assertPriority(data, 'priority-single-deadline');
      const elevated = ['high', 'urgent'].includes(String(data.suggested_priority));
      results.push({
        name: 'priority-single-deadline',
        ok: base.ok && elevated,
        detail: base.detail + (elevated ? '' : ' | expected high/urgent for same-day tax deadline'),
      });
    }
  }

  // Batch simulation (same handler twice — mirrors AITaskPrioritizer / BulkReprioritize)
  {
    const tasks = [
      { title: 'Water the plants', category: 'home' },
      { title: 'Prepare presentation for board meeting tomorrow', due_date: new Date().toISOString().slice(0, 10), category: 'work' },
    ];
    const batchRows = [];
    let ok = true;
    let detail = '';
    for (const t of tasks) {
      const r = await suggestTaskPriority({ ...ctx, payload: t });
      if (!r.ok) {
        ok = false;
        detail = r.error;
        break;
      }
      const data = r.data as Record<string, unknown>;
      batchRows.push({
        title: t.title,
        suggested_priority: data.suggested_priority,
        reasoning: String(data.reasoning || '').slice(0, 80),
      });
    }
    results.push({
      name: 'priority-batch-two-tasks',
      ok: ok && batchRows.length === 2,
      detail: ok ? JSON.stringify(batchRows) : detail,
    });
  }

  // ── 2) generateTasksFromGoal ──────────────────────────────────────────────
  {
    const r = await generateTasksFromGoal({
      ...ctx,
      payload: {
        goal: 'Build a consistent morning workout habit for 30 days',
        context: 'Beginner, 20 minutes available before work',
      },
    });
    if (!r.ok) {
      results.push({ name: 'generateTasksFromGoal-live', ok: false, detail: r.error });
    } else {
      const data = r.data as Record<string, unknown>;
      const tasks = Array.isArray(data.tasks) ? data.tasks : [];
      const titlesOk = tasks.every((t: any) => t && typeof t.title === 'string' && t.title.length > 2);
      results.push({
        name: 'generateTasksFromGoal-live',
        ok: data.success === true && tasks.length >= 3 && titlesOk,
        detail: JSON.stringify({
          count: tasks.length,
          titles: tasks.slice(0, 5).map((t: any) => t.title),
          tips: data.tips,
        }),
      });
    }
  }

  // ── 3) Prayer coach unified report shape (live LLM) ───────────────────────
  {
    const report = await groqJson<{
      consistency_score?: number;
      overall_assessment?: string;
      strongest_prayer?: string;
      needs_improvement?: string;
      actionable_tips?: string[];
      motivation?: string;
      weekly_goal?: string;
    }>(
      'You are an Islamic prayer coach. Return JSON only.',
      `Sample prayer week: Fajr 4/7, Dhuhr 7/7, Asr 6/7, Maghrib 7/7, Isha 5/7.
Return:
{
  "consistency_score": 0-100,
  "overall_assessment": "string",
  "strongest_prayer": "string",
  "needs_improvement": "string",
  "actionable_tips": ["tip"],
  "motivation": "string",
  "weekly_goal": "string"
}`,
      'vp-verify-prayer-coach',
      'pro',
      ['religious']
    );

    if (!report) {
      results.push({
        name: 'prayer-coach-report-live',
        ok: false,
        detail: 'groqJson returned null (provider/Art9/gate)',
      });
    } else {
      const ok =
        typeof report.consistency_score === 'number' &&
        report.consistency_score >= 0 &&
        report.consistency_score <= 100 &&
        typeof report.overall_assessment === 'string' &&
        report.overall_assessment.length > 10 &&
        typeof report.strongest_prayer === 'string' &&
        Array.isArray(report.actionable_tips) &&
        report.actionable_tips.length > 0;
      results.push({
        name: 'prayer-coach-report-live',
        ok,
        detail: JSON.stringify({
          consistency_score: report.consistency_score,
          strongest_prayer: report.strongest_prayer,
          needs_improvement: report.needs_improvement,
          tips: report.actionable_tips?.slice(0, 3),
          motivation: String(report.motivation || '').slice(0, 100),
        }),
      });
    }
  }

  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`);
    console.log(`       ${r.detail}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
