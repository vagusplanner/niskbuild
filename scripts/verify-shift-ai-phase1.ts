/**
 * Phase 1 auth loop verification (Bearer + /api/shift-ai/me).
 * Run with Next.js available at localhost:3000 OR pass SHIFT_AI_API_BASE.
 *
 *   npx tsx scripts/verify-shift-ai-phase1.ts
 */
import Module from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

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

type Check = { name: string; ok: boolean; detail: string };

async function main() {
  const { createAdminClient } = await import('../lib/supabase/admin');
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createAdminClient();

  const results: Check[] = [];
  const apiBase = (process.env.SHIFT_AI_API_BASE || 'http://localhost:3000').replace(/\/$/, '');
  const suffix = randomBytes(4).toString('hex');
  const email = `shift.phase1.${suffix}@students.niskbuild.com`;
  const password = `Phase1-${suffix}!aA1`;
  const fullName = `Phase1 Test ${suffix}`;

  let userId: string | null = null;
  let studentId: string | null = null;

  try {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message || 'createUser failed');
    }
    userId = created.user.id;

    const { data: student, error: studentErr } = await admin
      .schema('firstparty')
      .from('shift_students')
      .insert({
        user_id: userId,
        full_name: fullName,
        curriculum: 'uk',
        year_group: 'Year 10',
        key_stage: 'Key Stage 4 (GCSEs)',
        age_range: '14_15',
        favourite_subjects: ['Maths', 'Physics'],
        account_type: 'self',
        is_active: true,
        parent_consent_given: false,
        study_language: 'en',
      })
      .select('id')
      .single();

    if (studentErr || !student) {
      throw new Error(studentErr?.message || 'student insert failed');
    }
    studentId = student.id;
    results.push({ name: 'seed-student', ok: true, detail: `${email} / ${studentId}` });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const browser = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signed, error: signErr } = await browser.auth.signInWithPassword({
      email,
      password,
    });
    if (signErr || !signed.session?.access_token) {
      throw new Error(signErr?.message || 'signIn failed');
    }
    results.push({
      name: 'supabase-signIn',
      ok: true,
      detail: `token_len=${signed.session.access_token.length}`,
    });

    const meRes = await fetch(`${apiBase}/api/shift-ai/me`, {
      headers: {
        Authorization: `Bearer ${signed.session.access_token}`,
        'Content-Type': 'application/json',
      },
    });
    const meBody = await meRes.json().catch(() => ({}));
    const meOk =
      meRes.ok &&
      meBody?.student?.fullName === fullName &&
      meBody?.student?.needsOnboarding === false &&
      Array.isArray(meBody?.student?.favouriteSubjects);
    results.push({
      name: 'GET /api/shift-ai/me (Bearer)',
      ok: meOk,
      detail: `status=${meRes.status} body=${JSON.stringify(meBody).slice(0, 240)}`,
    });

    const noAuth = await fetch(`${apiBase}/api/shift-ai/me`);
    results.push({
      name: 'GET /api/shift-ai/me without auth → 401',
      ok: noAuth.status === 401,
      detail: `status=${noAuth.status}`,
    });

    // CORS preflight from SPA origin
    const opt = await fetch(`${apiBase}/api/shift-ai/me`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5176',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization,content-type',
      },
    });
    const allowOrigin = opt.headers.get('access-control-allow-origin');
    results.push({
      name: 'CORS preflight localhost:5176',
      ok: opt.status === 204 && allowOrigin === 'http://localhost:5176',
      detail: `status=${opt.status} allow-origin=${allowOrigin}`,
    });
  } catch (err) {
    results.push({
      name: 'phase1-fatal',
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  } finally {
    if (studentId) {
      await admin.schema('firstparty').from('shift_students').delete().eq('id', studentId);
    }
    if (userId) {
      await admin.auth.admin.deleteUser(userId);
    }
  }

  console.log('\n=== Shift AI Phase 1 verification ===\n');
  let failed = 0;
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`);
    console.log(`       ${r.detail}\n`);
    if (!r.ok) failed += 1;
  }
  console.log(`Summary: ${results.length - failed}/${results.length} passed`);
  // Print credentials hint only if something failed mid-flight — always cleaned up.
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
