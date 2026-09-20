/**
 * Child-safety: under-13 self-signup must be rejected server-side.
 *
 *   npx tsx scripts/verify-shift-ai-under13-self-signup.ts
 *
 * Requires .env.local (Supabase admin) and a reachable Next.js API
 * (SHIFT_AI_API_BASE or http://localhost:3000).
 */
import Module from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';

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

function fail(msg: string): never {
  console.error(`\nFAIL: ${msg}\n`);
  process.exit(1);
}

async function main() {
  const {
    isUnder13AgeRange,
    isSelfServeAgeRange,
    SHIFT_UNDER_13_AGE_RANGES,
    SHIFT_SELF_SERVE_AGE_RANGES,
    SHIFT_UNDER_13_SELF_SIGNUP_ERROR,
  } = await import('../lib/shift-ai/constants');

  // --- Unit checks (no network) ---
  for (const band of SHIFT_UNDER_13_AGE_RANGES) {
    if (!isUnder13AgeRange(band) || isSelfServeAgeRange(band)) {
      fail(`helper mismatch for under-13 band ${band}`);
    }
  }
  for (const band of SHIFT_SELF_SERVE_AGE_RANGES) {
    if (isUnder13AgeRange(band) || !isSelfServeAgeRange(band)) {
      fail(`helper mismatch for self-serve band ${band}`);
    }
  }
  console.log('OK helpers: under-13 vs self-serve age bands');

  const { createAdminClient } = await import('../lib/supabase/admin');
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createAdminClient();

  const results: Check[] = [];
  const apiBase = (process.env.SHIFT_AI_API_BASE || 'http://localhost:3000').replace(/\/$/, '');
  const suffix = randomBytes(4).toString('hex');
  const email = `shift.u13bypass.${suffix}@students.niskbuild.com`;
  const password = `U13Test-${suffix}!aA1`;
  let userId: string | null = null;
  let supervisedStudentId: string | null = null;

  try {
    // Health check
    const health = await fetch(`${apiBase}/api/shift-ai/me`).catch(() => null);
    if (!health) {
      fail(
        `API not reachable at ${apiBase}. Start Next.js (npm run dev) or set SHIFT_AI_API_BASE.`
      );
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message || 'createUser failed');
    }
    userId = created.user.id;

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
    const token = signed.session.access_token;

    // --- Bypass attempt: under-13 via self signup ---
    for (const ageRange of SHIFT_UNDER_13_AGE_RANGES) {
      const res = await fetch(`${apiBase}/api/shift-ai/signup/self`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: `Bypass ${ageRange}`,
          curriculum: 'uk',
          yearGroup: 'Year 5',
          ageRange,
          favouriteSubjects: ['Maths'],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      const blocked =
        res.status === 403 &&
        typeof data.error === 'string' &&
        data.error.includes('supervised');
      results.push({
        name: `self-signup-reject-${ageRange}`,
        ok: blocked,
        detail: `status=${res.status} error=${data.error ?? '(none)'}`,
      });
      if (!blocked) {
        fail(
          `Bypass NOT blocked for age_range=${ageRange}: status=${res.status} body=${JSON.stringify(data)}`
        );
      }
    }
    console.log('OK API: under-13 self-signup rejected (7_8, 9_10, 11_12)');

    // Confirm no student row was created for this user
    const { data: leaked } = await admin
      .schema('firstparty')
      .from('shift_students')
      .select('id, age_range, account_type')
      .eq('user_id', userId)
      .maybeSingle();
    if (leaked) {
      fail(`Student row exists after rejected bypass: ${JSON.stringify(leaked)}`);
    }
    results.push({ name: 'no-student-row-after-bypass', ok: true, detail: 'none' });
    console.log('OK DB: no shift_students row created for bypass attempts');

    // Allowed self-serve band still works
    const okRes = await fetch(`${apiBase}/api/shift-ai/signup/self`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fullName: `Allowed ${suffix}`,
        curriculum: 'uk',
        yearGroup: 'Year 10',
        ageRange: '14_15',
        favouriteSubjects: ['Maths'],
      }),
    });
    const okData = (await okRes.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!okRes.ok || !okData.ok) {
      fail(`Legitimate 14_15 self-signup failed: ${okRes.status} ${JSON.stringify(okData)}`);
    }
    results.push({ name: 'self-signup-allow-14_15', ok: true, detail: 'ok' });
    console.log('OK API: age 14_15 self-signup still allowed');

    // Cleanup allowed student so supervised path can be checked separately
    await admin.schema('firstparty').from('shift_students').delete().eq('user_id', userId);

    // --- Supervised path intact (under-13 via parental consent) ---
    const parentEmail = `parent.u13.${suffix}@example.com`;
    const supervisedRes = await fetch(`${apiBase}/api/shift-ai/signup/supervised`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childFirstName: `Child${suffix}`,
        yearGroup: 'Year 6',
        curriculum: 'uk',
        parentEmail,
        accountType: 'supervised',
        favouriteSubjects: ['English'],
      }),
    });
    const supervisedData = (await supervisedRes.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };
    if (!supervisedRes.ok || !supervisedData.ok) {
      fail(
        `Supervised signup broken: ${supervisedRes.status} ${JSON.stringify(supervisedData)}`
      );
    }

    const { data: pending } = await admin
      .schema('firstparty')
      .from('shift_students')
      .select('id, age_range, account_type, is_active, user_id, parent_email')
      .eq('parent_email', parentEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      !pending ||
      pending.account_type !== 'supervised' ||
      pending.is_active !== false ||
      pending.user_id !== null ||
      pending.age_range !== '11_12'
    ) {
      fail(`Supervised pending student unexpected: ${JSON.stringify(pending)}`);
    }
    supervisedStudentId = pending.id;

    const { data: consent } = await admin
      .schema('firstparty')
      .from('shift_parent_consent_requests')
      .select('id, status, consent_token')
      .eq('student_id', pending.id)
      .maybeSingle();
    if (!consent?.consent_token || consent.status !== 'pending') {
      fail(`Consent request missing: ${JSON.stringify(consent)}`);
    }

    results.push({
      name: 'supervised-path-intact',
      ok: true,
      detail: `student=${pending.id} age=${pending.age_range}`,
    });
    console.log('OK supervised: pending under-13 student + consent request created');

    // Error message content check
    assert(SHIFT_UNDER_13_SELF_SIGNUP_ERROR.includes('supervised'));

    console.log('\n=== Under-13 self-signup gate verification ===\n');
    for (const r of results) {
      console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}: ${r.detail}`);
    }
    console.log('\nAll checks passed.\n');
  } finally {
    if (supervisedStudentId) {
      await admin
        .schema('firstparty')
        .from('shift_parent_consent_requests')
        .delete()
        .eq('student_id', supervisedStudentId);
      await admin.schema('firstparty').from('shift_students').delete().eq('id', supervisedStudentId);
    }
    if (userId) {
      await admin.schema('firstparty').from('shift_students').delete().eq('user_id', userId);
      await admin.auth.admin.deleteUser(userId);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
