import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getFeatureLimit,
  isUnlimitedFeature,
  periodStartForFeature,
} from '@/lib/vp-feature-limits';
import { resolveEffectivePlan } from '@/lib/vp-plan-access';

export type UsageSnapshot = {
  feature: string;
  count: number;
  limit: number;
  allowed: boolean;
  unlimited: boolean;
};

export type ConsumeUsageResult = UsageSnapshot & {
  deniedCode?: 'FEATURE_LOCKED' | 'QUOTA_EXCEEDED';
};

type AdminClient = SupabaseClient;

async function readUsageRow(
  admin: AdminClient,
  userId: string,
  feature: string,
  periodStart: string
): Promise<number> {
  const { data } = await admin
    .schema('firstparty')
    .from('vp_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('period_start', periodStart)
    .maybeSingle();

  const raw = data?.count;
  const n = typeof raw === 'number' ? raw : Number(raw ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function getUsageSnapshot(
  admin: AdminClient,
  opts: { userId: string; plan: string; feature: string }
): Promise<UsageSnapshot> {
  const limit = getFeatureLimit(opts.plan, opts.feature);
  const unlimited = isUnlimitedFeature(opts.plan, opts.feature);
  if (unlimited) {
    return { feature: opts.feature, count: 0, limit, allowed: true, unlimited: true };
  }
  if (limit <= 0) {
    return { feature: opts.feature, count: 0, limit: 0, allowed: false, unlimited: false };
  }

  const periodStart = periodStartForFeature(opts.feature);
  const count = await readUsageRow(admin, opts.userId, opts.feature, periodStart);
  return {
    feature: opts.feature,
    count,
    limit,
    allowed: count < limit,
    unlimited: false,
  };
}

/**
 * Atomically-ish consume one unit of usage. Denies when over limit.
 * Writes via service_role only (vp_usage client writes should be revoked).
 */
export async function consumeUsage(
  admin: AdminClient,
  opts: {
    userId: string;
    email: string;
    plan: string;
    feature: string;
  }
): Promise<ConsumeUsageResult> {
  const limit = getFeatureLimit(opts.plan, opts.feature);
  const unlimited = isUnlimitedFeature(opts.plan, opts.feature);

  if (unlimited) {
    return {
      feature: opts.feature,
      count: 0,
      limit,
      allowed: true,
      unlimited: true,
    };
  }

  if (limit <= 0) {
    return {
      feature: opts.feature,
      count: 0,
      limit: 0,
      allowed: false,
      unlimited: false,
      deniedCode: 'FEATURE_LOCKED',
    };
  }

  const periodStart = periodStartForFeature(opts.feature);
  const periodEnd =
    periodStart === '1970-01-01T00:00:00.000Z'
      ? '9999-12-31T23:59:59.999Z'
      : new Date(
          Date.UTC(
            new Date(periodStart).getUTCFullYear(),
            new Date(periodStart).getUTCMonth() + 1,
            1
          )
        ).toISOString();

  const current = await readUsageRow(admin, opts.userId, opts.feature, periodStart);
  if (current >= limit) {
    return {
      feature: opts.feature,
      count: current,
      limit,
      allowed: false,
      unlimited: false,
      deniedCode: 'QUOTA_EXCEEDED',
    };
  }

  const next = current + 1;
  const percentage = Math.min(100, Math.round((next / limit) * 100));

  const { error } = await admin.schema('firstparty').from('vp_usage').upsert(
    {
      user_id: opts.userId,
      user_email: opts.email,
      feature: opts.feature,
      count: next,
      limit,
      percentage,
      period_start: periodStart,
      period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,feature,period_start' }
  );

  if (error) {
    console.error('vp_usage consume failed:', error.message);
    // Fail closed for paid metering — do not grant free unlimited on write errors.
    return {
      feature: opts.feature,
      count: current,
      limit,
      allowed: false,
      unlimited: false,
      deniedCode: 'QUOTA_EXCEEDED',
    };
  }

  return {
    feature: opts.feature,
    count: next,
    limit,
    allowed: true,
    unlimited: false,
  };
}

export async function loadUserPlanContext(admin: AdminClient, userId: string) {
  const [{ data: subscriptions }, { data: profile }] = await Promise.all([
    admin
      .schema('firstparty')
      .from('vp_subscriptions')
      .select('plan, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('profiles')
      .select('subscription_tier, subscription_status, email')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  return { subscriptions: subscriptions ?? [], profile };
}

export type FeatureGateOk = { ok: true; plan: string; usage: ConsumeUsageResult };
export type FeatureGateDenied = {
  ok: false;
  plan: string;
  usage: ConsumeUsageResult;
  error: string;
  status: 402;
};

/**
 * Resolve plan + consume one unit of `feature`. Use on paid AI mutate paths.
 */
export async function requireFeatureUsage(
  admin: AdminClient,
  opts: { userId: string; email?: string | null; feature: string }
): Promise<FeatureGateOk | FeatureGateDenied> {
  const { subscriptions, profile } = await loadUserPlanContext(admin, opts.userId);
  const planInfo = resolveEffectivePlan({ subscriptions, profile });
  const email =
    (typeof opts.email === 'string' && opts.email) ||
    (typeof profile?.email === 'string' ? profile.email : '') ||
    '';

  const usage = await consumeUsage(admin, {
    userId: opts.userId,
    email,
    plan: planInfo.plan,
    feature: opts.feature,
  });

  if (!usage.allowed) {
    return {
      ok: false,
      plan: planInfo.plan,
      usage,
      status: 402,
      error:
        usage.deniedCode === 'FEATURE_LOCKED'
          ? 'This feature requires a paid plan. Upgrade in Billing to continue.'
          : 'Free usage limit reached. Upgrade in Billing for unlimited access.',
    };
  }

  return { ok: true, plan: planInfo.plan, usage };
}
