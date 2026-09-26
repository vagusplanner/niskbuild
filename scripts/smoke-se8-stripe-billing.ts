/**
 * SE8 Stripe billing evidence smoke.
 *
 * 1) Creates a real Stripe Checkout session (SE8 student price)
 * 2) Completes a real $0 subscription (100% once coupon) — no card charged
 * 3) Syncs into firstparty.se8_subscriptions (webhook path)
 * 4) Asserts resolveShiftPlanAccess() trial → student
 *
 * Requires: supabase/se8-subscriptions-migration.sql applied.
 *
 * Usage: npx tsx scripts/smoke-se8-stripe-billing.ts
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
  const Stripe = (await import('stripe')).default;
  const { createAdminClient } = await import('../lib/supabase/admin');
  const { resolveShiftPlanAccess } = await import('../lib/shift-ai/plan-access');
  const { startSe8TrialForUser } = await import('../lib/shift-ai/trial');
  const { syncSe8BillingFromSubscription } = await import('../lib/se8-stripe-billing-sync');
  const { SE8_STRIPE_PRICE_IDS } = await import('../lib/se8-stripe-price-ids');

  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  assert(stripeKey, 'STRIPE_SECRET_KEY required');
  const stripe = new Stripe(stripeKey);
  const admin = createAdminClient();

  const probe = await admin
    .schema('firstparty')
    .from('se8_subscriptions')
    .select('id')
    .limit(1);
  if (probe.error) {
    throw new Error(
      `se8_subscriptions missing — apply supabase/se8-subscriptions-migration.sql first: ${probe.error.message}`
    );
  }

  const email = `se8.billing.smoke.${Date.now()}@students.niskbuild.com`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: `Smoke${Date.now()}!aA1`,
    email_confirm: true,
  });
  assert(!createErr && created.user, `createUser failed: ${createErr?.message}`);
  const userId = created.user!.id;
  console.log('userId', userId);

  let couponId: string | null = null;
  let customerId: string | null = null;
  let subscriptionId: string | null = null;

  try {
    await startSe8TrialForUser(admin, userId);
    const trialAccess = await resolveShiftPlanAccess(userId);
    console.log('trial access', trialAccess);
    assert(trialAccess.plan === 'trial', 'expected trial plan');
    assert(trialAccess.hasFullAccess === true, 'trial should have full access');

    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: SE8_STRIPE_PRICE_IDS.studentMonthly, quantity: 1 }],
      success_url: 'https://www.supereduc8.com/billing?checkout=success',
      cancel_url: 'https://www.supereduc8.com/billing?checkout=canceled',
      metadata: {
        userId,
        source: 'supereduc8',
        plan: 'student',
        interval: 'month',
        childQuantity: '0',
        multiCurriculum: 'false',
      },
      subscription_data: {
        metadata: {
          userId,
          source: 'supereduc8',
          plan: 'student',
          interval: 'month',
          childQuantity: '0',
          multiCurriculum: 'false',
        },
      },
    });
    assert(checkout.id && checkout.url, 'checkout session missing id/url');
    console.log('checkoutSessionId', checkout.id);
    console.log('checkoutUrl', checkout.url);
    console.log('checkoutLivemode', checkout.livemode);

    // Complete a real Stripe subscription at $0 (100% once coupon) — no card charged.
    const coupon = await stripe.coupons.create({
      percent_off: 100,
      duration: 'once',
      name: 'SE8 smoke evidence',
      metadata: { purpose: 'se8_smoke_evidence', userId },
    });
    couponId = coupon.id;

    const customer = await stripe.customers.create({
      email,
      metadata: { userId, source: 'supereduc8', smoke: 'se8-billing' },
    });
    customerId = customer.id;

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: SE8_STRIPE_PRICE_IDS.studentMonthly, quantity: 1 }],
      discounts: [{ coupon: coupon.id }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice'],
      metadata: {
        userId,
        source: 'supereduc8',
        plan: 'student',
        interval: 'month',
        childQuantity: '0',
        multiCurriculum: 'false',
      },
    });
    subscriptionId = subscription.id;
    console.log('subscriptionId', subscription.id, 'status', subscription.status);
    assert(subscription.status === 'active', `expected active, got ${subscription.status}`);

    await syncSe8BillingFromSubscription(admin, {
      subscription,
      userId,
    });

    const { data: row, error: rowErr } = await admin
      .schema('firstparty')
      .from('se8_subscriptions')
      .select('status, plan, stripe_subscription_id, trial_ends_at')
      .eq('user_id', userId)
      .maybeSingle();
    assert(!rowErr && row, `row missing: ${rowErr?.message}`);
    console.log('se8_subscriptions row', row);
    assert(row!.status === 'active', 'row status should be active');
    assert(row!.plan === 'student', 'row plan should be student');
    assert(row!.stripe_subscription_id === subscription.id, 'stripe sub id mismatch');
    assert(row!.trial_ends_at, 'trial_ends_at should be preserved');

    const paidAccess = await resolveShiftPlanAccess(userId);
    console.log('paid access', paidAccess);
    assert(paidAccess.plan === 'student', 'expected student plan');
    assert(paidAccess.hasFullAccess === true, 'paid should have full access');
    assert(paidAccess.isPaid === true, 'isPaid should be true');

    await stripe.checkout.sessions.expire(checkout.id).catch(() => {});
    console.log('\nPASS se8 stripe billing evidence');
  } finally {
    if (subscriptionId) {
      await stripe.subscriptions.cancel(subscriptionId).catch(() => {});
    }
    if (customerId) {
      await stripe.customers.del(customerId).catch(() => {});
    }
    if (couponId) {
      await stripe.coupons.del(couponId).catch(() => {});
    }
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }
}

main().catch((err) => {
  console.error('FAIL', err);
  process.exit(1);
});
