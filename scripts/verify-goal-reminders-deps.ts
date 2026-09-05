/**
 * Verification for Batch 1b Tier-2 handlers + real persist paths.
 * Run: npx tsx scripts/verify-goal-reminders-deps.ts
 *
 * Requires: supabase/vp-tasks-schema-align-migration.sql applied on the target DB.
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

  throw new Error('No test user found');
}

async function main() {
  const { initProductGatingContext } = await import('../lib/platform-owner-bypass');
  const { createAdminClient } = await import('../lib/supabase/admin');
  const { getVpFunctionHandler } = await import('../lib/vp-functions/registry');
  const {
    generateTasksFromGoal,
    generateSmartReminders,
    analyzeTaskDependencies,
  } = await import('../lib/vp-functions/handlers/goal-reminders-deps-ai');
  const { detectArt9CategoriesFromText } = await import('../lib/vp-gdpr/art9-ai-gate');

  const userId = await resolveTestUserId();
  await initProductGatingContext(userId);
  const admin = createAdminClient();

  const ctx = {
    request: {} as import('next/server').NextRequest,
    user: { id: userId, email: 'verify@local.test' } as import('@supabase/supabase-js').User,
    payload: {} as Record<string, unknown>,
  };

  const results: CheckResult[] = [];
  const cleanupTaskIds: string[] = [];
  const cleanupReminderIds: string[] = [];

  for (const name of [
    'generateTasksFromGoal',
    'generateSmartReminders',
    'analyzeTaskDependencies',
  ]) {
    results.push({
      name: `registry:${name}`,
      ok: !!getVpFunctionHandler(name),
      detail: getVpFunctionHandler(name) ? 'registered' : 'MISSING',
    });
  }

  // Schema probe: new columns must exist (migration)
  {
    const { data: sample } = await admin
      .schema('firstparty')
      .from('vp_tasks')
      .select('*')
      .limit(1)
      .maybeSingle();
    const keys = sample ? Object.keys(sample) : [];
    const needed = [
      'category',
      'estimated_minutes',
      'subtasks',
      'notes',
      'tags',
      'dependencies',
      'due_time',
    ];
    const missing = needed.filter((k) => !keys.includes(k));
    // Empty table: fall back to insert probe
    if (!sample) {
      const probe = {
        user_id: userId,
        title: 'schema-probe-batch1b',
        description: 'desc',
        notes: 'notes field',
        category: 'personal',
        priority: 'medium',
        status: 'pending',
        estimated_minutes: 25,
        subtasks: [{ title: 'sub', completed: false }],
        tags: ['verify'],
        dependencies: [],
        due_time: '10:00',
      };
      const { data, error } = await admin
        .schema('firstparty')
        .from('vp_tasks')
        .insert(probe)
        .select('*')
        .single();
      if (error) {
        results.push({
          name: 'schema:vp_tasks-align',
          ok: false,
          detail: `Run supabase/vp-tasks-schema-align-migration.sql then NOTIFY pgrst. Error: ${error.message}`,
        });
      } else {
        cleanupTaskIds.push(data.id);
        results.push({
          name: 'schema:vp_tasks-align',
          ok: true,
          detail: 'insert probe ok',
        });
      }
    } else if (missing.length) {
      results.push({
        name: 'schema:vp_tasks-align',
        ok: false,
        detail: `Missing columns (run vp-tasks-schema-align-migration.sql + NOTIFY pgrst): ${missing.join(', ')}`,
      });
    } else {
      results.push({
        name: 'schema:vp_tasks-align',
        ok: true,
        detail: `all present: ${needed.join(', ')}`,
      });
    }
  }

  const schemaReady = results.find((r) => r.name === 'schema:vp_tasks-align')?.ok === true;

  // Persist path: bulk-style multi-insert (same as Task.bulkCreate)
  if (schemaReady) {
    const rows = [
      {
        user_id: userId,
        title: 'AI goal task A',
        description: 'From generateTasksFromGoal shape',
        category: 'work',
        priority: 'high',
        status: 'pending',
        estimated_minutes: 45,
        subtasks: [{ title: 'Draft outline' }],
        tags: [],
        dependencies: [],
        notes: 'AI tip',
      },
      {
        user_id: userId,
        title: 'AI goal task B',
        description: 'Second task',
        category: 'personal',
        priority: 'low',
        status: 'pending',
        estimated_minutes: 15,
        // Explicit [] — PostgREST multi-row insert nulls omitted jsonb keys
        subtasks: [],
        tags: [],
        dependencies: [],
      },
    ];
    const { data, error } = await admin
      .schema('firstparty')
      .from('vp_tasks')
      .insert(rows)
      .select('id, title, category, estimated_minutes, subtasks, notes, priority');
    if (error) {
      results.push({ name: 'persist:Task.bulkCreate-equivalent', ok: false, detail: error.message });
    } else {
      for (const row of data ?? []) cleanupTaskIds.push(row.id);
      results.push({
        name: 'persist:Task.bulkCreate-equivalent',
        ok: (data?.length ?? 0) === 2 && data![0].category === 'work',
        detail: JSON.stringify(data),
      });
    }
  } else {
    results.push({
      name: 'persist:Task.bulkCreate-equivalent',
      ok: false,
      detail: 'skipped — schema migration not applied',
    });
  }

  // Persist path: dependencies Apply + analyzeTaskDependencies
  {
    const baseInsert = {
      user_id: userId,
      title: 'Blocker task',
      description: 'Must finish first',
      priority: 'high',
      status: 'pending',
    };
    const { data: blocker, error: e1 } = await admin
      .schema('firstparty')
      .from('vp_tasks')
      .insert(baseInsert)
      .select('id, title')
      .single();
    const { data: focus, error: e2 } = await admin
      .schema('firstparty')
      .from('vp_tasks')
      .insert({
        ...baseInsert,
        title: 'Focus task',
        description: 'Depends on blocker',
        priority: 'medium',
      })
      .select('id, title')
      .single();

    if (e1 || e2 || !blocker || !focus) {
      results.push({
        name: 'persist:dependencies-apply',
        ok: false,
        detail: e1?.message || e2?.message || 'insert failed',
      });
    } else {
      cleanupTaskIds.push(blocker.id, focus.id);

      if (schemaReady) {
        const deps = [
          { task_id: blocker.id, task_title: blocker.title, type: 'required_by' },
        ];
        const { data: updated, error: e3 } = await admin
          .schema('firstparty')
          .from('vp_tasks')
          .update({ dependencies: deps })
          .eq('id', focus.id)
          .select('id, dependencies')
          .single();
        results.push({
          name: 'persist:dependencies-apply',
          ok:
            !e3 &&
            Array.isArray(updated?.dependencies) &&
            updated!.dependencies[0]?.task_id === blocker.id,
          detail: e3?.message || JSON.stringify(updated?.dependencies),
        });
      } else {
        results.push({
          name: 'persist:dependencies-apply',
          ok: false,
          detail: 'skipped — dependencies column missing until migration',
        });
      }

      const analysis = await analyzeTaskDependencies({
        ...ctx,
        payload: { task_id: focus.id },
      });
      if (!analysis.ok) {
        results.push({
          name: 'handler:analyzeTaskDependencies',
          ok: /Article 9|consent|Islamic|subscription/i.test(analysis.error),
          detail: analysis.error,
        });
      } else {
        const data = analysis.data as { analysis?: { dependencies?: unknown[] } };
        results.push({
          name: 'handler:analyzeTaskDependencies',
          ok: !!data.analysis,
          detail: JSON.stringify(data.analysis).slice(0, 280),
        });
      }
    }
  }

  // Persist path: vp_reminders (SmartReminderBuilder save)
  {
    const scheduled = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { data, error } = await admin
      .schema('firstparty')
      .from('vp_reminders')
      .insert({
        user_id: userId,
        title: 'Prep for team offsite',
        body: 'Pack laptop and badge',
        reminder_type: 'event',
        scheduled_at: scheduled,
        metadata: {
          event_id: '00000000-0000-0000-0000-000000000001',
          smart_type: 'prep',
          time_before_minutes: 120,
        },
      })
      .select('id, title, reminder_type, scheduled_at, metadata')
      .single();
    if (error) {
      results.push({ name: 'persist:vp_reminders', ok: false, detail: error.message });
    } else {
      cleanupReminderIds.push(data.id);
      results.push({
        name: 'persist:vp_reminders',
        ok: data.reminder_type === 'event' && data.metadata?.smart_type === 'prep',
        detail: JSON.stringify(data),
      });
    }
  }

  // Live generateTasksFromGoal (mundane)
  {
    const r = await generateTasksFromGoal({
      ...ctx,
      payload: {
        goal: 'Organize a small team lunch next week',
        context: 'Budget under £100, 6 people',
      },
    });
    if (!r.ok) {
      results.push({ name: 'handler:generateTasksFromGoal', ok: false, detail: r.error });
    } else {
      const data = r.data as { success?: boolean; tasks?: unknown[] };
      results.push({
        name: 'handler:generateTasksFromGoal',
        ok: data.success === true && Array.isArray(data.tasks) && data.tasks.length > 0,
        detail: JSON.stringify({
          count: data.tasks?.length,
          first: data.tasks?.[0],
        }).slice(0, 280),
      });
    }
  }

  // Live generateSmartReminders (mundane)
  {
    const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const r = await generateSmartReminders({
      ...ctx,
      payload: {
        event: {
          title: 'Client presentation downtown',
          start_date: start.toISOString(),
          end_date: new Date(start.getTime() + 2 * 60 * 60 * 1000).toISOString(),
          location: 'Canary Wharf',
        },
        user_location: { city: 'London' },
        user_availability: { work_start: '09:00', work_end: '17:00' },
        event_type: 'work',
      },
    });
    if (!r.ok) {
      results.push({ name: 'handler:generateSmartReminders', ok: false, detail: r.error });
    } else {
      const data = r.data as {
        reminders?: unknown[];
        total_prep_time_hours?: number;
      };
      results.push({
        name: 'handler:generateSmartReminders',
        ok: Array.isArray(data.reminders) && data.reminders.length > 0,
        detail: JSON.stringify({
          count: data.reminders?.length,
          total_prep_time_hours: data.total_prep_time_hours,
          first: data.reminders?.[0],
        }).slice(0, 280),
      });
    }
  }

  // Art.9 scan sanity for event title
  {
    const scan = detectArt9CategoriesFromText('Doctor appointment for medication review');
    results.push({
      name: 'art9-scan-health-event',
      ok: scan.includes('health'),
      detail: JSON.stringify(scan),
    });
  }

  // Cleanup
  if (cleanupTaskIds.length) {
    await admin.schema('firstparty').from('vp_tasks').delete().in('id', cleanupTaskIds);
  }
  if (cleanupReminderIds.length) {
    await admin
      .schema('firstparty')
      .from('vp_reminders')
      .delete()
      .in('id', cleanupReminderIds);
  }

  console.log('\n=== Batch 1b Tier-2 goal/reminders/deps verification ===\n');
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
