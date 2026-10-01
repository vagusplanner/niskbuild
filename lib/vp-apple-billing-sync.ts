/**
 * Sync RevenueCat (Apple IAP) events into firstparty.vp_subscriptions.
 * Provider-scoped: never clears Stripe fields on Apple rows.
 */

import 'server-only';

import type { createAdminClient } from '@/lib/supabase/admin';
import { normalizePlanId } from '@/lib/vp-islamic-access';
import { pickHighestRankPlan, planRank } from '@/lib/vp-plan-rank';
import { resolveVpBillingUser } from '@/lib/vp-stripe-billing-sync';

type AdminClient = ReturnType<typeof createAdminClient>;

const ENTITLEMENT_TO_PLAN: Record<string, string> = {
  basic: 'basic',
  pro: 'pro',
  basic_islamic: 'basic_islamic',
  pro_islamic: 'pro_islamic',
};

const ACTIVE_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE',
  'SUBSCRIPTION_EXTENDED',
  'TEMPORARY_ENTITLEMENT_GRANT',
]);

const CANCEL_EVENT_TYPES = new Set(['CANCELLATION']);

const EXPIRE_OR_REFUND_TYPES = new Set([
  'EXPIRATION',
  'REFUND',
  'REVOKE',
]);

export type RevenueCatWebhookEvent = {
  type?: string;
  id?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string | null;
  entitlement_ids?: string[] | null;
  entitlement_id?: string | null;
  period_type?: string | null;
  purchased_at_ms?: number | null;
  expiration_at_ms?: number | null;
  event_timestamp_ms?: number | null;
  store?: string | null;
  environment?: string | null;
  original_transaction_id?: string | null;
  transaction_id?: string | null;
  cancel_reason?: string | null;
  expiration_reason?: string | null;
  price?: number | null;
  currency?: string | null;
  presented_offering_id?: string | null;
};

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/** Accept `Bearer <secret>`, `Authorization: <secret>`, or raw secret match. */
export function verifyRevenueCatWebhookAuth(
  authorizationHeader: string | null,
  secret: string
): boolean {
  if (!secret || !authorizationHeader) return false;
  const header = authorizationHeader.trim();
  const bearer = header.toLowerCase().startsWith('bearer ')
    ? header.slice(7).trim()
    : header;
  return (
    timingSafeEqualString(header, secret) ||
    timingSafeEqualString(bearer, secret) ||
    timingSafeEqualString(header, `Bearer ${secret}`)
  );
}

export function mapEntitlementsToVpPlan(
  entitlementIds: string[] | null | undefined,
  productId?: string | null
): string {
  const ents = (entitlementIds || [])
    .map((e) => normalizePlanId(e))
    .filter(Boolean);
  const mapped = ents
    .map((e) => ENTITLEMENT_TO_PLAN[e] || (e in ENTITLEMENT_TO_PLAN ? e : ''))
    .filter(Boolean);
  if (mapped.length) {
    const best = pickHighestRankPlan(mapped.map((plan) => ({ plan })));
    return best?.plan || mapped[0];
  }

  const pid = normalizePlanId(productId || '');
  if (!pid) return 'free';
  // Prefer longer / more specific matches first
  const candidates = ['pro_islamic', 'basic_islamic', 'pro', 'basic'] as const;
  for (const c of candidates) {
    if (pid === c || pid.includes(c) || pid.endsWith(`_${c}`) || pid.includes(`.${c}`)) {
      return c;
    }
  }
  return 'free';
}

export function mapRevenueCatEventToVpStatus(
  type: string,
  opts?: { expirationAtMs?: number | null; periodType?: string | null }
): { status: string; planForceFree?: boolean; autoRenew: boolean } {
  const t = (type || '').toUpperCase();
  if (EXPIRE_OR_REFUND_TYPES.has(t)) {
    return { status: 'canceled', planForceFree: true, autoRenew: false };
  }
  if (CANCEL_EVENT_TYPES.has(t)) {
    // Access continues until expiration_at_ms when present
    const exp = opts?.expirationAtMs;
    if (typeof exp === 'number' && exp > Date.now()) {
      return { status: 'active', autoRenew: false };
    }
    return { status: 'canceled', planForceFree: true, autoRenew: false };
  }
  if (t === 'BILLING_ISSUE') {
    return { status: 'past_due', autoRenew: true };
  }
  if (ACTIVE_EVENT_TYPES.has(t)) {
    const period = (opts?.periodType || '').toUpperCase();
    if (period === 'TRIAL') return { status: 'trialing', autoRenew: true };
    return { status: 'active', autoRenew: true };
  }
  // Unknown — keep active if still unexpired
  const exp = opts?.expirationAtMs;
  if (typeof exp === 'number' && exp > Date.now()) {
    return { status: 'active', autoRenew: true };
  }
  return { status: 'canceled', planForceFree: true, autoRenew: false };
}

function msToIso(ms: number | null | undefined): string | null {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return null;
  return new Date(ms).toISOString();
}

function billingCycleFromProduct(productId: string | null | undefined): 'monthly' | 'yearly' {
  const p = (productId || '').toLowerCase();
  if (p.includes('annual') || p.includes('yearly') || p.includes('_year') || p.includes('.year')) {
    return 'yearly';
  }
  return 'monthly';
}

function candidateUserIds(event: RevenueCatWebhookEvent): string[] {
  const ids = [
    event.app_user_id,
    event.original_app_user_id,
    ...(Array.isArray(event.aliases) ? event.aliases : []),
  ]
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    .map((id) => id.trim())
    // Skip anonymous RC ids
    .filter((id) => !id.startsWith('$RCAnonymousID:'));
  return [...new Set(ids)];
}

export async function resolveUserFromRevenueCatEvent(
  admin: AdminClient,
  event: RevenueCatWebhookEvent
): Promise<{ userId: string; email: string } | null> {
  for (const id of candidateUserIds(event)) {
    // Prefer UUID-shaped Supabase auth ids
    const resolved = await resolveVpBillingUser(admin, { userId: id });
    if (resolved) return resolved;
  }
  return null;
}

export type UpsertAppleSubscriptionResult = {
  id: string;
  plan: string;
  status: string;
  skipped?: boolean;
  reason?: string;
};

/**
 * Upsert an Apple-scoped vp_subscriptions row from a RevenueCat webhook event.
 * Never writes stripe_* fields (leaves existing Stripe rows untouched).
 */
export async function upsertVpSubscriptionFromRevenueCat(
  admin: AdminClient,
  event: RevenueCatWebhookEvent
): Promise<UpsertAppleSubscriptionResult | null> {
  const type = (event.type || '').toUpperCase();
  if (!type || type === 'TEST' || type === 'TRANSFER' || type === 'SUBSCRIBER_ALIAS') {
    return null;
  }

  const user = await resolveUserFromRevenueCatEvent(admin, event);
  if (!user) {
    console.warn(
      '[vp-apple-billing-sync] no profile for app_user_id',
      event.app_user_id,
      event.id
    );
    return null;
  }

  const statusInfo = mapRevenueCatEventToVpStatus(type, {
    expirationAtMs: event.expiration_at_ms,
    periodType: event.period_type,
  });

  let plan = mapEntitlementsToVpPlan(event.entitlement_ids, event.product_id);
  if (statusInfo.planForceFree) plan = 'free';
  if (!plan || plan === 'free') {
    if (!statusInfo.planForceFree && ACTIVE_EVENT_TYPES.has(type)) {
      console.warn('[vp-apple-billing-sync] could not map plan from entitlements/product', {
        entitlement_ids: event.entitlement_ids,
        product_id: event.product_id,
      });
    }
    if (!statusInfo.planForceFree) plan = 'free';
  }

  const now = new Date().toISOString();
  const originalTx =
    (typeof event.original_transaction_id === 'string' && event.original_transaction_id) ||
    (typeof event.transaction_id === 'string' && event.transaction_id) ||
    null;

  const appleFields = {
    provider: 'apple' as const,
    user_id: user.userId,
    user_email: user.email || '',
    plan: statusInfo.planForceFree ? 'free' : plan || 'free',
    status: statusInfo.status,
    price_per_month:
      typeof event.price === 'number' && Number.isFinite(event.price)
        ? billingCycleFromProduct(event.product_id) === 'yearly'
          ? Math.round((event.price / 12) * 100) / 100
          : event.price
        : null,
    billing_cycle: billingCycleFromProduct(event.product_id),
    current_period_start: msToIso(event.purchased_at_ms),
    current_period_end: msToIso(event.expiration_at_ms),
    trial_end:
      (event.period_type || '').toUpperCase() === 'TRIAL' ? msToIso(event.expiration_at_ms) : null,
    canceled_at:
      CANCEL_EVENT_TYPES.has(type) || EXPIRE_OR_REFUND_TYPES.has(type)
        ? msToIso(event.event_timestamp_ms) || now
        : null,
    auto_renew: statusInfo.autoRenew,
    original_transaction_id: originalTx,
    product_id: typeof event.product_id === 'string' ? event.product_id : null,
    apple_transaction_id:
      typeof event.transaction_id === 'string' ? event.transaction_id : null,
    revenuecat_event_id: typeof event.id === 'string' ? event.id : null,
    store: typeof event.store === 'string' ? event.store : 'APP_STORE',
    updated_at: now,
    metadata: {
      revenuecat_type: type,
      environment: event.environment ?? null,
      presented_offering_id: event.presented_offering_id ?? null,
      cancel_reason: event.cancel_reason ?? null,
      expiration_reason: event.expiration_reason ?? null,
      currency: event.currency ?? null,
    },
  };

  // Idempotent: skip older events for same original tx when we already processed a newer one
  if (originalTx && event.id) {
    const { data: existingByTx } = await admin
      .schema('firstparty')
      .from('vp_subscriptions')
      .select('id, revenuecat_event_id, plan, status, metadata')
      .eq('original_transaction_id', originalTx)
      .eq('provider', 'apple')
      .maybeSingle();

    if (existingByTx?.revenuecat_event_id === event.id) {
      return {
        id: existingByTx.id,
        plan: existingByTx.plan,
        status: existingByTx.status,
        skipped: true,
        reason: 'duplicate_event',
      };
    }

    if (existingByTx?.id) {
      const { data, error } = await admin
        .schema('firstparty')
        .from('vp_subscriptions')
        .update(appleFields)
        .eq('id', existingByTx.id)
        .select('id, plan, status')
        .single();
      if (error) {
        console.error('[vp-apple-billing-sync] update failed:', error.message);
        throw new Error(`vp_subscriptions apple update failed: ${error.message}`);
      }
      return data;
    }
  }

  // Fallback: one Apple row per user (latest wins)
  const { data: existingApple } = await admin
    .schema('firstparty')
    .from('vp_subscriptions')
    .select('id')
    .eq('user_id', user.userId)
    .eq('provider', 'apple')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingApple?.id) {
    const { data, error } = await admin
      .schema('firstparty')
      .from('vp_subscriptions')
      .update(appleFields)
      .eq('id', existingApple.id)
      .select('id, plan, status')
      .single();
    if (error) {
      console.error('[vp-apple-billing-sync] update-by-user failed:', error.message);
      throw new Error(`vp_subscriptions apple update failed: ${error.message}`);
    }
    return data;
  }

  const { data, error } = await admin
    .schema('firstparty')
    .from('vp_subscriptions')
    .insert({ ...appleFields, created_at: now })
    .select('id, plan, status')
    .single();

  if (error) {
    console.error('[vp-apple-billing-sync] insert failed:', error.message);
    throw new Error(`vp_subscriptions apple insert failed: ${error.message}`);
  }
  return data;
}

/** Exported for unit-style evidence without DB. */
export function __testables() {
  return {
    mapEntitlementsToVpPlan,
    mapRevenueCatEventToVpStatus,
    planRank,
    candidateUserIds,
    ACTIVE_EVENT_TYPES,
    EXPIRE_OR_REFUND_TYPES,
  };
}
