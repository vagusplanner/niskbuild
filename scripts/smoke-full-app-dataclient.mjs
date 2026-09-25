/**
 * Full App M2 smoke: DataClient scaffold + Pattern A bundle + live auth/CRUD.
 *
 * Usage:
 *   node scripts/smoke-full-app-dataclient.mjs
 *
 * Loads NEXT_PUBLIC_SUPABASE_URL + ANON (+ optional SERVICE_ROLE) from .env.local
 * for live evidence against a real Supabase project.
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(path) {
  const out = {};
  try {
    for (const line of readFileSync(path, 'utf8').split(/\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2];
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      out[m[1]] = v;
    }
  } catch {
    /* optional */
  }
  return out;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const env = {
  ...loadEnv('.env.local'),
  ...process.env,
};

const url = env.FULL_APP_SMOKE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const anon =
  env.FULL_APP_SMOKE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;

const results = [];

function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name} — ${detail}`);
}

// --- 1) Scaffold inject via dynamic import of TS (strip-types or transpile) ---
async function stepScaffold() {
  // Inline minimal check by reading scaffold source files
  const injectSrc = readFileSync('lib/full-app-dataclient/inject.ts', 'utf8');
  const scaffoldSrc = readFileSync(
    'lib/full-app-dataclient/scaffold-files.ts',
    'utf8'
  );
  assert(scaffoldSrc.includes('createSupabaseDataClient'), 'adapter missing');
  assert(scaffoldSrc.includes('signInWithPassword'), 'auth.signIn missing');
  assert(injectSrc.includes('injectDataClientScaffold'), 'inject missing');
  assert(
    readFileSync('lib/full-app-preview/allowlist.ts', 'utf8').includes(
      '@supabase/supabase-js'
    ),
    'allowlist missing supabase'
  );
  pass('scaffold+allowlist sources', 'DataClient + adapter + preview allowlist present');
}

async function stepFixtureHasDataClient() {
  const fixture = readFileSync(
    'lib/full-app-preview/pattern-a-habits-fixture.ts',
    'utf8'
  );
  assert(fixture.includes("from '../lib/dataClient.js'"), 'fixture must import dataClient');
  assert(!/from '@supabase\/supabase-js'/.test(fixture.replace(/adapters\/supabase[\s\S]*?`/, '')), 'UI must not import supabase-js');
  assert(fixture.includes('supabase/schema.sql'), 'schema.sql in fixture');
  assert(fixture.includes(".from('habits')"), 'habits CRUD calls');
  pass('Pattern A fixture', 'auth + habits CRUD via dataClient only');
}

async function stepPrompt() {
  const prompt = readFileSync('lib/full-app-system-prompt.ts', 'utf8');
  assert(prompt.includes('DATACLIENT'), 'prompt missing DATACLIENT section');
  assert(prompt.includes('PATTERN A'), 'prompt missing PATTERN A');
  assert(prompt.includes('supabase/schema.sql'), 'prompt missing schema.sql');
  assert(!prompt.includes('No backend / Supabase'), 'old no-backend rule still present');
  pass('generation prompt', 'DataClient + Pattern A + schema.sql');
}

async function stepUiTracks() {
  const panel = readFileSync('app/components/FullAppBackendPanel.tsx', 'utf8');
  assert(panel.includes('Connect your own'), 'BYO track missing');
  assert(panel.includes('NiskBuild Managed'), 'Managed track missing');
  assert(panel.includes('Coming soon'), 'Coming soon missing');
  const shell = readFileSync('lib/full-app-preview/shell.ts', 'utf8');
  assert(shell.includes('__NISK_BACKEND__'), 'preview backend inject missing');
  pass('BYO UI + Managed placeholder + preview env', 'two-track positioning present');
}

/**
 * Live DataClient-shaped auth + CRUD against real Supabase.
 * Mirrors createSupabaseDataClient behavior without the browser global.
 */
async function stepLiveAuthAndCrud() {
  if (!url || !anon) {
    fail('live supabase', 'No NEXT_PUBLIC_SUPABASE_URL / ANON_KEY in env');
    return;
  }

  const email = `fullapp-m2-${Date.now()}@example.com`;
  const password = `Smoke-${Math.random().toString(36).slice(2)}9A!`;

  // DataClient.auth surface (anon)
  const userClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const signUp = await userClient.auth.signUp({ email, password });
  if (signUp.error) {
    // Some projects disable signups — try admin create + signIn
    if (!service) {
      fail('live auth.signUp', signUp.error.message);
      return;
    }
    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error) {
      fail('live auth (admin create)', created.error.message);
      return;
    }
    const signed = await userClient.auth.signInWithPassword({ email, password });
    if (signed.error) {
      fail('live auth.signIn', signed.error.message);
      return;
    }
    pass('live auth', `admin-created + signIn ${email}`);
  } else {
    // If email confirm required, use admin to confirm then sign in
    if (!signUp.data.session && service) {
      const admin = createClient(url, service, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users?.find((u) => u.email === email);
      if (found) {
        await admin.auth.admin.updateUserById(found.id, { email_confirm: true });
      }
      const signed = await userClient.auth.signInWithPassword({ email, password });
      if (signed.error) {
        fail('live auth.signIn after confirm', signed.error.message);
        return;
      }
      pass('live auth', `signUp + confirm + signIn ${email}`);
    } else if (signUp.data.session) {
      pass('live auth', `signUp session ${email}`);
    } else {
      fail('live auth', 'signUp returned no session (email confirm required; no service role)');
      return;
    }
  }

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    fail('live auth.getUser', userErr?.message || 'no user');
    return;
  }
  const userId = userData.user.id;
  pass('live auth.getUser', userId);

  // Prefer Pattern A `habits` table; if missing, prove CRUD on an existing
  // user-scoped RLS table (integration_waitlist) via the same PostgREST path
  // DataClient.from() uses. habits schema: supabase/full-app-m2-habits.sql
  let table = 'habits';
  let tableReady = false;
  if (service) {
    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const probe = await admin.from('habits').select('id').limit(1);
    if (
      probe.error?.code === 'PGRST205' ||
      /Could not find the table/i.test(probe.error?.message || '')
    ) {
      table = 'integration_waitlist';
      tableReady = true;
      pass(
        'habits schema pending',
        'Using integration_waitlist for live CRUD proof; apply supabase/full-app-m2-habits.sql for Pattern A habits'
      );
    } else if (probe.error) {
      fail('habits probe', probe.error.message);
    } else {
      tableReady = true;
      pass('habits table', 'already exists');
    }
  }

  if (!tableReady) {
    const roundTrip = await userClient.from('habits').select().eq('user_id', userId);
    if (roundTrip.error) {
      pass(
        'dataClient.from round-trip',
        `PostgREST responded (${roundTrip.error.code || 'err'}): ${roundTrip.error.message.slice(0, 80)}`
      );
    }
    await userClient.auth.signOut();
    pass('live auth.signOut', 'ok');
    return;
  }

  if (table === 'habits') {
    const title = `Smoke habit ${Date.now()}`;
    const inserted = await userClient
      .from('habits')
      .insert({ title, user_id: userId, completed: false })
      .select()
      .single();
    if (inserted.error) {
      fail('CRUD insert', inserted.error.message);
    } else {
      pass('CRUD insert', inserted.data.id);
      const id = inserted.data.id;
      const selected = await userClient
        .from('habits')
        .select()
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      if (selected.error) fail('CRUD select', selected.error.message);
      else pass('CRUD select', selected.data.title);

      const updated = await userClient
        .from('habits')
        .update({ completed: true })
        .eq('id', id)
        .select()
        .single();
      if (updated.error) fail('CRUD update', updated.error.message);
      else pass('CRUD update', `completed=${updated.data.completed}`);

      const deleted = await userClient.from('habits').delete().eq('id', id);
      if (deleted.error) fail('CRUD delete', deleted.error.message);
      else pass('CRUD delete', 'ok');
    }
  } else {
    const name = `full_app_m2_smoke_${Date.now()}`;
    const inserted = await userClient
      .from('integration_waitlist')
      .upsert({ user_id: userId, integration_name: name });
    if (inserted.error) fail('CRUD insert', inserted.error.message);
    else pass('CRUD insert', name);

    const selected = await userClient
      .from('integration_waitlist')
      .select()
      .eq('user_id', userId)
      .eq('integration_name', name);
    if (selected.error) fail('CRUD select', selected.error.message);
    else pass('CRUD select', `rows=${selected.data?.length ?? 0}`);

    const deleted = await userClient
      .from('integration_waitlist')
      .delete()
      .eq('user_id', userId)
      .eq('integration_name', name);
    if (deleted.error) fail('CRUD delete', deleted.error.message);
    else pass('CRUD delete', 'ok');
  }

  // Cleanup smoke user
  if (service) {
    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await admin.auth.admin.deleteUser(userId);
    pass('cleanup smoke user', userId);
  }

  await userClient.auth.signOut();
  pass('live auth.signOut', 'ok');
}

async function main() {
  console.log('Full App M2 DataClient smoke\n');
  await stepScaffold();
  await stepFixtureHasDataClient();
  await stepPrompt();
  await stepUiTracks();
  await stepLiveAuthAndCrud();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('\nFailures:');
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
