/**
 * Evidence: create a trial user, obtain a browser session cookie, then hit
 * POST /api/shift-ai/create-checkout the same way ShiftAiSubscribePanel does
 * (including success/cancel URLs). Asserts a live Stripe Checkout URL.
 *
 * For UI click evidence, run after `npm run dev -- --port 3010` and use the
 * printed credentials against /builder/shift-ai/billing → Subscribe.
 *
 * Usage: npx tsx scripts/smoke-se8-checkout-button.ts
 */
import Module from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const shim = path.resolve('scripts/shims/server-only.js');
const orig = (Module as unknown as { _resolveFilename: Function })._resolveFilename;
(Module as unknown as { _resolveFilename: Function })._resolveFilename = function (
  request: string,
  parent: unknown,
  isMain: boolean,
  options: unknown
) {
  if (request === 'server-only') return shim;
  return orig.call(this, request, parent, isMain, options);
};

function loadEnv() {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnv();

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

async function main() {
  const baseUrl = (process.env.SE8_SMOKE_BASE_URL || 'http://127.0.0.1:3010').replace(/\/$/, '');
  const { createClient } = await import('@supabase/supabase-js');
  const { createAdminClient } = await import('../lib/supabase/admin');
  const { startSe8TrialForUser } = await import('../lib/shift-ai/trial');
  const { ensureProfileForUser } = await import('../lib/ensure-profile');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  assert(url && anon, 'NEXT_PUBLIC_SUPABASE_URL + ANON_KEY required');

  const admin = createAdminClient();
  const email = `se8.checkout.btn.${Date.now()}@students.niskbuild.com`;
  const password = `SmokeBtn${Date.now()}!aA1`;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert(!createErr && created.user, `createUser failed: ${createErr?.message}`);
  const userId = created.user!.id;
  console.log('userId', userId);
  console.log('email', email);
  console.log('password', password);

  await ensureProfileForUser({ userId, email });
  await startSe8TrialForUser(admin, userId);

  const browserClient = createClient(url!, anon!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signedIn, error: signErr } = await browserClient.auth.signInWithPassword({
    email,
    password,
  });
  assert(!signErr && signedIn.session, `signIn failed: ${signErr?.message}`);

  const accessToken = signedIn.session!.access_token;
  const refreshToken = signedIn.session!.refresh_token;

  // Mirror ShiftAiSubscribePanel body
  const successUrl = `${baseUrl}/builder/shift-ai/billing?checkout=success`;
  const cancelUrl = `${baseUrl}/builder/shift-ai/billing?checkout=canceled`;

  const res = await fetch(`${baseUrl}/api/shift-ai/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      Cookie: `sb-access-token=${accessToken}; sb-refresh-token=${refreshToken}`,
    },
    body: JSON.stringify({
      plan: 'student',
      interval: 'month',
      childQuantity: 0,
      successUrl,
      cancelUrl,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    sessionUrl?: string;
    sessionId?: string;
  };

  console.log('create-checkout status', res.status);
  console.log('create-checkout body', JSON.stringify(data, null, 2));

  assert(res.ok, `create-checkout failed: ${data.error || res.status}`);
  assert(
    typeof data.sessionUrl === 'string' && data.sessionUrl.includes('checkout.stripe.com'),
    'expected Stripe Checkout URL'
  );
  assert(typeof data.sessionId === 'string' && data.sessionId.startsWith('cs_'), 'expected cs_ session id');

  console.log('PASS create-checkout via SubscribePanel payload');
  console.log('sessionUrl', data.sessionUrl);
  console.log('sessionId', data.sessionId);
  console.log('\nUI click credentials (login → /builder/shift-ai/billing → Subscribe):');
  console.log(`  email=${email}`);
  console.log(`  password=${password}`);
  console.log(`  base=${baseUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
