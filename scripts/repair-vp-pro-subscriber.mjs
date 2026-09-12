/**
 * One-shot repair: backfill profiles + vp_subscriptions for the Sept 12 Pro payer.
 * Run: node --env-file=.env.local scripts/repair-vp-pro-subscriber.mjs
 */
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const USER_ID = '173e9723-f1a9-449f-91d4-df1e3ca9f872';
const SUB_ID = 'sub_1UEvvSDffiW7XraevE41f8BR';
const EMAIL = 'sofiane.kemih@mamadelice.com';

const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeKey || !url || !serviceKey) {
  console.error('Missing STRIPE_SECRET_KEY / SUPABASE URL / SERVICE_ROLE_KEY');
  process.exit(1);
}

const stripe = new Stripe(stripeKey);
const admin = createClient(url, serviceKey);

function unixToIso(ts) {
  if (typeof ts !== 'number' || !Number.isFinite(ts) || ts <= 0) return null;
  return new Date(ts * 1000).toISOString();
}

async function main() {
  const sub = await stripe.subscriptions.retrieve(SUB_ID, {
    expand: ['items.data.price'],
  });
  console.log('Stripe sub:', sub.id, sub.status, sub.metadata);

  const price = sub.items?.data?.[0]?.price;
  const unit = typeof price?.unit_amount === 'number' ? price.unit_amount / 100 : 14.99;
  const interval = price?.recurring?.interval === 'year' ? 'yearly' : 'monthly';
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;

  // 1) Ensure profiles row
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id, email, subscription_tier')
    .eq('id', USER_ID)
    .maybeSingle();

  if (!existingProfile) {
    const { error } = await admin.from('profiles').insert({
      id: USER_ID,
      email: EMAIL,
      subscription_tier: 'pro',
      subscription_status: 'active',
      subscription_id: SUB_ID,
      stripe_customer_id: customerId,
      cloud_credits_remaining: 600,
    });
    if (error) throw new Error(`profiles insert failed: ${error.message}`);
    console.log('Created profiles row for', USER_ID);
  } else {
    const { error } = await admin
      .from('profiles')
      .update({
        email: existingProfile.email || EMAIL,
        subscription_tier: 'pro',
        subscription_status: 'active',
        subscription_id: SUB_ID,
        stripe_customer_id: customerId,
        cloud_credits_remaining: 600,
        credit_alert_80_sent: false,
        credit_alert_100_sent: false,
      })
      .eq('id', USER_ID);
    if (error) throw new Error(`profiles update failed: ${error.message}`);
    console.log('Updated existing profiles row');
  }

  // 2) Upsert vp_subscriptions
  const fp = createClient(url, serviceKey, { db: { schema: 'firstparty' } });
  const now = new Date().toISOString();
  const periodStart = unixToIso(sub.current_period_start);
  const periodEnd = unixToIso(sub.current_period_end);

  const row = {
    user_id: USER_ID,
    user_email: EMAIL,
    plan: 'pro',
    status: sub.status === 'active' ? 'active' : sub.status,
    price_per_month: interval === 'yearly' ? Math.round((unit / 12) * 100) / 100 : unit,
    billing_cycle: interval,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    trial_end: unixToIso(sub.trial_end),
    canceled_at: null,
    auto_renew: !sub.cancel_at_period_end,
    payment_method_id:
      typeof sub.default_payment_method === 'string' ? sub.default_payment_method : null,
    payment_retry_count: 0,
    stripe_subscription_id: SUB_ID,
    stripe_customer_id: customerId,
    updated_at: now,
  };

  const { data: existingSub } = await fp
    .from('vp_subscriptions')
    .select('id')
    .eq('stripe_subscription_id', SUB_ID)
    .maybeSingle();

  if (existingSub?.id) {
    const { error } = await fp.from('vp_subscriptions').update(row).eq('id', existingSub.id);
    if (error) throw new Error(`vp_subscriptions update failed: ${error.message}`);
    console.log('Updated vp_subscriptions', existingSub.id);
  } else {
    const { data, error } = await fp
      .from('vp_subscriptions')
      .insert({ ...row, created_at: now })
      .select('id')
      .single();
    if (error) throw new Error(`vp_subscriptions insert failed: ${error.message}`);
    console.log('Inserted vp_subscriptions', data.id);
  }

  // Verify
  const { data: profileCheck } = await admin
    .from('profiles')
    .select('id,email,subscription_tier,subscription_status,subscription_id')
    .eq('id', USER_ID)
    .single();
  const { data: vpCheck } = await fp
    .from('vp_subscriptions')
    .select('id,plan,status,stripe_subscription_id,price_per_month')
    .eq('user_id', USER_ID)
    .maybeSingle();

  console.log('VERIFY profiles:', profileCheck);
  console.log('VERIFY vp_subscriptions:', vpCheck);
  console.log('DONE');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
