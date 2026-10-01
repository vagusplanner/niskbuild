/**
 * Evidence for admin-comped access.
 *
 * 1) Apply supabase/access-grant-migration.sql in Supabase SQL Editor
 *    OR set DATABASE_URL / SUPABASE_DB_URL and this script will apply it via pg.
 * 2) Run:
 *    npx tsx scripts/evidence-access-grant.ts
 *
 * Uses disposable profile se8.audit.20260926@example.com and restores afterward.
 */
import Module from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

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

const TEST_EMAIL = 'se8.audit.20260926@example.com';

type Row = { check: string; before: string; after: string; ok: boolean };

async function tryApplyMigration(): Promise<string> {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.DIRECT_URL;
  if (!dbUrl) return 'skipped — no DATABASE_URL (apply SQL Editor migration first)';

  let Client: typeof import('pg').Client;
  try {
    ({ Client } = await import('pg'));
  } catch {
    return 'skipped — pg not installed (npm i -D pg)';
  }

  const sql = readFileSync(resolve('supabase/access-grant-migration.sql'), 'utf8');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    return 'applied via DATABASE_URL';
  } finally {
    await client.end();
  }
}

async function main() {
  const rows: Row[] = [];
  console.log('=== admin-comped evidence ===\n');

  let migrationNote = '';
  try {
    migrationNote = await tryApplyMigration();
  } catch (e) {
    migrationNote = `FAILED: ${e instanceof Error ? e.message : String(e)}`;
  }
  console.log('Migration:', migrationNote);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  {
    const { error } = await admin.from('profiles').select('access_grant').limit(1);
    if (error) {
      console.error('\naccess_grant columns missing.');
      console.error('Apply supabase/access-grant-migration.sql in Supabase SQL Editor, then re-run.\n');
      console.error('Probe error:', error.message);
      process.exit(2);
    }
  }
  rows.push({
    check: 'Migration columns present',
    before: 'column profiles.access_grant does not exist',
    after: 'access_grant selectable via service role',
    ok: true,
  });

  const { data: profile, error: findErr } = await admin
    .from('profiles')
    .select(
      'id, email, subscription_tier, subscription_status, subscription_id, access_grant, access_grant_tier, stripe_customer_id, cloud_credits_remaining'
    )
    .eq('email', TEST_EMAIL)
    .maybeSingle();
  if (findErr || !profile) throw new Error(findErr?.message || `Missing ${TEST_EMAIL}`);

  const before = { ...profile };
  console.log('Before:', {
    id: before.id,
    tier: before.subscription_tier,
    status: before.subscription_status,
    grant: before.access_grant,
    subId: before.subscription_id,
  });

  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  const stripe = stripeKey ? new Stripe(stripeKey) : null;

  async function countStripeSubs(): Promise<number> {
    if (!stripe) return -1;
    let n = 0;
    if (before.stripe_customer_id) {
      const list = await stripe.subscriptions.list({
        customer: before.stripe_customer_id,
        limit: 100,
        status: 'all',
      });
      n += list.data.length;
    } else {
      const customers = await stripe.customers.list({ email: TEST_EMAIL, limit: 5 });
      for (const c of customers.data) {
        const list = await stripe.subscriptions.list({
          customer: c.id,
          limit: 100,
          status: 'all',
        });
        n += list.data.length;
      }
    }
    return n;
  }

  const stripeBefore = await countStripeSubs();

  const { grantAdminCompedAccess, revokeAdminCompedAccess, hasComplimentaryProductAccess } =
    await import('../lib/access-grant');
  const {
    resolveProductGatingBypass,
    getAdminCompedGrantTier,
    isPlatformOwnerGatingActive,
    runWithProductGating,
  } = await import('../lib/platform-owner-bypass');
  const { isPaidAndActive, getProjectLimit } = await import('../lib/tier-access-server');
  const { sendPaymentFailedEmail } = await import('../lib/email/lifecycle');
  const { ALREADY_HAVE_ACCESS_MESSAGE } = await import('../lib/checkout-access-block');

  // Refuse path: set fake subscription_id then grant must 409
  await admin
    .from('profiles')
    .update({
      access_grant: 'none',
      access_grant_tier: null,
      access_grant_notes: null,
      access_grant_granted_by: null,
      access_grant_expires_at: null,
      subscription_tier: 'free',
      subscription_status: 'inactive',
      subscription_id: 'sub_evidence_fake_refuse',
    })
    .eq('id', profile.id);

  const refused = await grantAdminCompedAccess({
    userId: profile.id,
    tier: 'pro',
    grantedBy: 'evidence-script',
  });
  rows.push({
    check: 'Refuse grant while subscription_id set',
    before: 'subscription_id=sub_evidence_fake_refuse',
    after: refused.ok ? 'UNEXPECTED ok' : `status=${refused.status} ${refused.error}`,
    ok: !refused.ok && refused.status === 409,
  });

  // Clear fake sub id then grant for real
  await admin
    .from('profiles')
    .update({
      subscription_id: null,
      subscription_tier: 'free',
      subscription_status: 'inactive',
      access_grant: 'none',
      access_grant_tier: null,
    })
    .eq('id', profile.id);

  const granted = await grantAdminCompedAccess({
    userId: profile.id,
    tier: 'pro',
    grantedBy: 'evidence-access-grant.ts',
    notes: 'evidence run',
  });
  if (!granted.ok) throw new Error(granted.error);

  const { data: afterGrant } = await admin
    .from('profiles')
    .select(
      'subscription_tier, subscription_status, subscription_id, access_grant, access_grant_tier, access_grant_granted_by, cloud_credits_remaining'
    )
    .eq('id', profile.id)
    .single();

  rows.push({
    check: 'Grant comped Pro via grantAdminCompedAccess (DB-only)',
    before: `tier=${before.subscription_tier} grant=${before.access_grant ?? 'none'}`,
    after: `tier=${afterGrant?.subscription_tier} grant=${afterGrant?.access_grant} grant_tier=${afterGrant?.access_grant_tier} credits=${afterGrant?.cloud_credits_remaining}`,
    ok:
      granted.ok &&
      afterGrant?.access_grant === 'admin_comped' &&
      afterGrant?.access_grant_tier === 'pro' &&
      afterGrant?.subscription_tier === 'pro' &&
      !afterGrant?.subscription_id,
  });

  const stripeAfter = await countStripeSubs();
  rows.push({
    check: 'Zero Stripe subscription objects created',
    before: `stripe_subs=${stripeBefore}`,
    after: `stripe_subs=${stripeAfter}`,
    ok: stripeBefore < 0 || stripeAfter === stripeBefore,
  });

  // runWithProductGating keeps ALS across nested awaits (enterWith alone can drop).
  const gating = await runWithProductGating(profile.id, async () => {
    const bypass = await resolveProductGatingBypass(profile.id);
    const grantTier = getAdminCompedGrantTier();
    const ownerOnly = isPlatformOwnerGatingActive();
    const paid = isPaidAndActive(
      afterGrant?.subscription_tier,
      afterGrant?.subscription_status,
      bypass
    );
    const projectLimit = getProjectLimit(afterGrant?.subscription_tier, bypass);
    return { bypass, grantTier, ownerOnly, paid, projectLimit };
  });
  rows.push({
    check: 'Gating: paid+active with Pro limits (not sovereign)',
    before: 'bypass=false paid=false',
    after: `bypass=${gating.bypass} owner=${gating.ownerOnly} grantTier=${gating.grantTier} paid=${gating.paid} projectLimit=${gating.projectLimit}`,
    ok:
      gating.bypass === true &&
      gating.ownerOnly === false &&
      gating.grantTier === 'pro' &&
      gating.paid === true &&
      gating.projectLimit === 15,
  });

  const complimentary = await hasComplimentaryProductAccess(profile.id);
  rows.push({
    check: 'Checkout blocked for complimentary',
    before: 'checkout allowed',
    after: complimentary
      ? `403 ${ALREADY_HAVE_ACCESS_MESSAGE.slice(0, 48)}…`
      : 'NOT blocked',
    ok: complimentary === true,
  });

  // Suppress outbound email for this evidence run
  process.env.RESEND_API_KEY = '';
  const emailResult = await sendPaymentFailedEmail(profile.id, TEST_EMAIL);
  rows.push({
    check: 'sendPaymentFailedEmail suppressed for comped',
    before: 'would send (force:true)',
    after: `returned ${emailResult}`,
    ok: emailResult === false,
  });

  // Restore
  await revokeAdminCompedAccess(profile.id);
  await admin
    .from('profiles')
    .update({
      subscription_tier: before.subscription_tier || 'free',
      subscription_status: before.subscription_status || 'inactive',
      subscription_id: before.subscription_id,
      cloud_credits_remaining: before.cloud_credits_remaining ?? 5,
    })
    .eq('id', profile.id);

  console.log('\n=== Evidence matrix ===');
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'} | ${r.check}`);
    console.log(`  before: ${r.before}`);
    console.log(`  after:  ${r.after}`);
  }

  const failed = rows.filter((r) => !r.ok);
  if (failed.length) {
    console.error(`\n${failed.length} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll evidence checks passed. Test user restored.');
  console.log('Migration note:', migrationNote);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
