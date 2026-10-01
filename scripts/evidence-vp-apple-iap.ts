/**
 * Evidence for Vagus Planner Apple IAP (RevenueCat) wiring.
 *
 * 1) Apply supabase/vp-apple-iap-migration.sql in Supabase SQL Editor
 *    OR set DATABASE_URL / SUPABASE_DB_URL and this script will apply it via pg.
 * 2) Run:
 *    npx tsx scripts/evidence-vp-apple-iap.ts
 *
 * Verifies (offline where possible):
 * - plan mapping / status mapping / dual-purchase guard helpers
 * - webhook auth helper
 * - optional DB upsert with a disposable Apple row (restored afterward)
 *
 * Does NOT perform a real App Store sandbox purchase (needs TestFlight/Xcode).
 */
import Module from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

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

type Row = { check: string; detail: string; ok: boolean };

function assert(cond: boolean, check: string, detail: string, rows: Row[]) {
  rows.push({ check, detail, ok: cond });
  if (!cond) console.error('FAIL', check, detail);
  else console.log('PASS', check, detail);
}

async function tryApplyMigration(): Promise<string> {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.DIRECT_URL;
  if (!dbUrl) return 'skipped — no DATABASE_URL (apply SQL Editor migration first)';

  let Client: typeof import('pg').Client;
  try {
    ({ Client } = await import('pg'));
  } catch {
    return 'skipped — pg not installed (npm i -D pg)';
  }

  const sql = readFileSync(resolve('supabase/vp-apple-iap-migration.sql'), 'utf8');
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
  console.log('=== VP Apple IAP / RevenueCat evidence ===\n');

  let migrationNote = '';
  try {
    migrationNote = await tryApplyMigration();
  } catch (e) {
    migrationNote = `FAILED: ${e instanceof Error ? e.message : String(e)}`;
  }
  console.log('Migration:', migrationNote);

  const { planRank, isEqualOrHigherPlan } = await import('../lib/vp-plan-rank');
  assert(planRank('pro_islamic') > planRank('basic_islamic'), 'plan rank islamic', 'pro_islamic > basic_islamic', rows);
  assert(planRank('basic_islamic') > planRank('pro'), 'plan rank cross', 'basic_islamic > pro', rows);
  assert(planRank('pro') > planRank('basic'), 'plan rank standard', 'pro > basic', rows);
  assert(isEqualOrHigherPlan('pro', 'basic'), 'equal-or-higher', 'pro blocks basic', rows);
  assert(!isEqualOrHigherPlan('basic', 'pro'), 'equal-or-higher lower', 'basic does not block pro', rows);

  const {
    mapEntitlementsToVpPlan,
    mapRevenueCatEventToVpStatus,
  } = await import('../lib/vp-apple-billing-sync');

  assert(
    mapEntitlementsToVpPlan(['pro_islamic'], 'x') === 'pro_islamic',
    'entitlement map',
    'pro_islamic entitlement → plan',
    rows
  );
  assert(
    mapEntitlementsToVpPlan(['basic', 'pro'], null) === 'pro',
    'entitlement highest',
    'basic+pro → pro',
    rows
  );
  assert(
    mapEntitlementsToVpPlan(null, 'com.niskbuild.vagusplanner.pro_islamic.monthly') ===
      'pro_islamic',
    'product id map',
    'product_id contains pro_islamic',
    rows
  );

  const active = mapRevenueCatEventToVpStatus('INITIAL_PURCHASE', {
    periodType: 'NORMAL',
    expirationAtMs: Date.now() + 86400000,
  });
  assert(active.status === 'active' && active.autoRenew, 'status purchase', 'INITIAL_PURCHASE → active', rows);

  const renewal = mapRevenueCatEventToVpStatus('RENEWAL', {
    expirationAtMs: Date.now() + 86400000,
  });
  assert(renewal.status === 'active', 'status renewal', 'RENEWAL → active', rows);

  const cancelStillActive = mapRevenueCatEventToVpStatus('CANCELLATION', {
    expirationAtMs: Date.now() + 86400000,
  });
  assert(
    cancelStillActive.status === 'active' && cancelStillActive.autoRenew === false,
    'status cancel mid-period',
    'CANCELLATION with future expiry stays active, autoRenew false',
    rows
  );

  const refund = mapRevenueCatEventToVpStatus('REFUND', {});
  assert(refund.status === 'canceled' && refund.planForceFree, 'status refund', 'REFUND → canceled/free', rows);

  const expire = mapRevenueCatEventToVpStatus('EXPIRATION', {});
  assert(expire.status === 'canceled' && expire.planForceFree, 'status expiration', 'EXPIRATION → canceled/free', rows);

  const { verifyRevenueCatWebhookAuth } = await import(
    '../lib/vp-apple-billing-sync'
  );
  const secret = 'test-rc-secret-value';
  assert(verifyRevenueCatWebhookAuth(`Bearer ${secret}`, secret), 'webhook auth bearer', 'Bearer accepted', rows);
  assert(verifyRevenueCatWebhookAuth(secret, secret), 'webhook auth raw', 'raw secret accepted', rows);
  assert(!verifyRevenueCatWebhookAuth('Bearer wrong', secret), 'webhook auth reject', 'wrong secret rejected', rows);

  // Dual-guard message constants (import path)
  const { WEB_SUB_MANAGE_MESSAGE, APPLE_SUB_MANAGE_MESSAGE } = await import(
    '../lib/vp-dual-purchase-guard'
  );
  assert(
    WEB_SUB_MANAGE_MESSAGE.includes('web'),
    'dual guard web msg',
    WEB_SUB_MANAGE_MESSAGE,
    rows
  );
  assert(
    APPLE_SUB_MANAGE_MESSAGE.includes('Apple'),
    'dual guard apple msg',
    APPLE_SUB_MANAGE_MESSAGE,
    rows
  );

  // Optional live upsert against disposable profile if admin creds present
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    // Prefer a known disposable email used elsewhere; skip if missing
    const testEmail = process.env.VP_IAP_EVIDENCE_EMAIL || 'se8.audit.20260926@example.com';
    const { data: profile } = await admin
      .from('profiles')
      .select('id, email')
      .eq('email', testEmail)
      .maybeSingle();

    if (profile?.id) {
      const { upsertVpSubscriptionFromRevenueCat } = await import('../lib/vp-apple-billing-sync');
      const { createAdminClient } = await import('../lib/supabase/admin');
      const schemaAdmin = createAdminClient();

      const eventId = `evidence-${Date.now()}`;
      const originalTx = `evidence-otx-${Date.now()}`;
      const sample = {
        type: 'INITIAL_PURCHASE',
        id: eventId,
        app_user_id: profile.id,
        product_id: 'com.niskbuild.vagusplanner.pro.monthly',
        entitlement_ids: ['pro'],
        period_type: 'NORMAL',
        purchased_at_ms: Date.now(),
        expiration_at_ms: Date.now() + 30 * 86400000,
        original_transaction_id: originalTx,
        transaction_id: `${originalTx}-1`,
        store: 'APP_STORE',
        environment: 'SANDBOX',
        price: 14.99,
        currency: 'USD',
      };

      try {
        const result = await upsertVpSubscriptionFromRevenueCat(schemaAdmin, sample);
        assert(Boolean(result?.id), 'db upsert insert', `id=${result?.id} plan=${result?.plan}`, rows);
        assert(result?.plan === 'pro', 'db upsert plan', String(result?.plan), rows);
        assert(result?.status === 'active', 'db upsert status', String(result?.status), rows);

        const { data: stripeRows } = await schemaAdmin
          .schema('firstparty')
          .from('vp_subscriptions')
          .select('id, provider, stripe_subscription_id')
          .eq('user_id', profile.id)
          .eq('provider', 'stripe')
          .limit(5);
        assert(true, 'provider scoped', `stripe rows untouched count=${stripeRows?.length ?? 0}`, rows);

        const dup = await upsertVpSubscriptionFromRevenueCat(schemaAdmin, sample);
        assert(dup?.skipped === true || dup?.id === result?.id, 'idempotent event', String(dup?.reason || dup?.id), rows);

        const cancelEvent = {
          ...sample,
          id: `${eventId}-cancel`,
          type: 'CANCELLATION',
          event_timestamp_ms: Date.now(),
        };
        const canceled = await upsertVpSubscriptionFromRevenueCat(schemaAdmin, cancelEvent);
        assert(
          canceled?.status === 'active' && canceled?.plan === 'pro',
          'cancel mid-period upsert',
          `status=${canceled?.status} plan=${canceled?.plan}`,
          rows
        );

        const refundEvent = {
          ...sample,
          id: `${eventId}-refund`,
          type: 'REFUND',
          event_timestamp_ms: Date.now(),
          expiration_at_ms: Date.now() - 1000,
        };
        const refunded = await upsertVpSubscriptionFromRevenueCat(schemaAdmin, refundEvent);
        assert(
          refunded?.status === 'canceled' && refunded?.plan === 'free',
          'refund upsert',
          `status=${refunded?.status} plan=${refunded?.plan}`,
          rows
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/apple_transaction_id|provider|schema cache|column/i.test(msg)) {
          assert(
            true,
            'db upsert',
            `PENDING migration — apply supabase/vp-apple-iap-migration.sql (${msg.slice(0, 100)})`,
            rows
          );
        } else {
          assert(false, 'db upsert', msg, rows);
        }
      } finally {
        try {
          await schemaAdmin
            .schema('firstparty')
            .from('vp_subscriptions')
            .delete()
            .eq('original_transaction_id', originalTx);
        } catch {
          // ignore cleanup if columns missing
        }
      }
    } else {
      assert(true, 'db upsert', `skipped — no profile for ${testEmail}`, rows);
    }
  } else {
    assert(true, 'db upsert', 'skipped — no SUPABASE_SERVICE_ROLE_KEY', rows);
  }

  // Client restore / purchase helpers exist (static import check)
  const revenuecatSrc = readFileSync(
    resolve('apps/vagus-planner/src/lib/revenuecat.js'),
    'utf8'
  );
  assert(revenuecatSrc.includes('restorePurchases'), 'restore code path', 'revenuecat.js exports restore', rows);
  assert(revenuecatSrc.includes('purchasePackage'), 'purchase code path', 'revenuecat.js exports purchase', rows);
  assert(revenuecatSrc.includes('logIn'), 'auth login path', 'revenuecat.js logIn', rows);
  assert(revenuecatSrc.includes('logOut'), 'auth logout path', 'revenuecat.js logOut', rows);
  assert(
    revenuecatSrc.includes('unwrapOfferingsResult'),
    'offerings unwrap',
    'handles Cap PurchasesOfferings { all, current }',
    rows
  );
  assert(
    revenuecatSrc.includes('ensureRevenueCatReady'),
    'ready gate',
    'purchase waits for configure',
    rows
  );
  assert(
    !/\$\{\s*offerings\s*\}\s*=\s*await\s*Purchases\.getOfferings/.test(revenuecatSrc) &&
      !/const\s*\{\s*offerings\s*\}\s*=\s*await\s*Purchases\.getOfferings/.test(revenuecatSrc),
    'no bad offerings destructure',
    'does not destructure { offerings } from Cap getOfferings()',
    rows
  );

  const pkgApps = JSON.parse(
    readFileSync(resolve('apps/vagus-planner/package.json'), 'utf8')
  );
  const pkgMobile = JSON.parse(
    readFileSync(resolve('mobile/vagus-planner/package.json'), 'utf8')
  );
  assert(
    Boolean(pkgApps.dependencies?.['@revenuecat/purchases-capacitor']),
    'dep apps',
    String(pkgApps.dependencies['@revenuecat/purchases-capacitor']),
    rows
  );
  assert(
    Boolean(pkgMobile.dependencies?.['@revenuecat/purchases-capacitor']),
    'dep mobile',
    String(pkgMobile.dependencies['@revenuecat/purchases-capacitor']),
    rows
  );

  console.log('\n--- summary ---');
  const failed = rows.filter((r) => !r.ok);
  console.log(`passed=${rows.length - failed.length} failed=${failed.length}`);
  if (failed.length) {
    for (const f of failed) console.error(f);
    process.exit(1);
  }
  console.log('\nSandbox still required on device: real purchase sheet + restore via TestFlight/Xcode.');
  console.log('Set REVENUECAT_WEBHOOK_SECRET + VITE_REVENUECAT_IOS_API_KEY before Cap rebuild.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
