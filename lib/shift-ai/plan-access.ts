import 'server-only';

import { resolveProductGatingBypass } from '@/lib/platform-owner-bypass';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSe8SubscriptionEntitled } from '@/lib/se8-stripe-billing-sync';
import { shiftAiApiJson } from '@/lib/shift-ai-api-cors';
import type { NextRequest, NextResponse } from 'next/server';

/**
 * SuperEduc8 plan access — server-authoritative.
 *
 * Order: platform owner → active/past_due-grace Stripe sub → app trial → free.
 */

export type ShiftPlanId = 'free' | 'trial' | 'student' | 'family' | 'full';

export type ShiftPlanAccess = {
  plan: ShiftPlanId;
  status: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';
  isPaid: boolean;
  /** True only when server verified the user is in firstparty.platform_owners */
  platformOwnerBypass: boolean;
  hasFullAccess: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  childQuantity: number;
  multiCurriculum: boolean;
};

export const PLATFORM_OWNER_SHIFT_PLAN_ACCESS: ShiftPlanAccess = {
  plan: 'full',
  status: 'active',
  isPaid: true,
  platformOwnerBypass: true,
  hasFullAccess: true,
  trialEndsAt: null,
  currentPeriodEnd: null,
  childQuantity: 0,
  multiCurriculum: false,
};

export const FREE_SHIFT_PLAN_ACCESS: ShiftPlanAccess = {
  plan: 'free',
  status: 'none',
  isPaid: false,
  platformOwnerBypass: false,
  hasFullAccess: false,
  trialEndsAt: null,
  currentPeriodEnd: null,
  childQuantity: 0,
  multiCurriculum: false,
};

function asShiftStatus(raw: string | null | undefined): ShiftPlanAccess['status'] {
  const s = (raw || '').toLowerCase().trim();
  if (s === 'trialing' || s === 'active' || s === 'past_due' || s === 'canceled') {
    return s;
  }
  return 'none';
}

function asShiftPlan(raw: string | null | undefined): ShiftPlanId {
  const p = (raw || '').toLowerCase().trim();
  if (p === 'trial' || p === 'student' || p === 'family' || p === 'full') return p;
  return 'free';
}

/** Resolve SuperEduc8 entitlement for a verified auth user id. */
export async function resolveShiftPlanAccess(userId: string): Promise<ShiftPlanAccess> {
  if (await resolveProductGatingBypass(userId)) {
    return PLATFORM_OWNER_SHIFT_PLAN_ACCESS;
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .schema('firstparty')
    .from('se8_subscriptions')
    .select(
      'status, plan, trial_ends_at, current_period_end, child_quantity, multi_curriculum, stripe_subscription_id'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (row && isSe8SubscriptionEntitled(row)) {
    const plan = asShiftPlan(row.plan);
    return {
      plan: plan === 'family' || plan === 'student' ? plan : row.child_quantity > 0 ? 'family' : 'student',
      status: asShiftStatus(row.status),
      isPaid: true,
      platformOwnerBypass: false,
      hasFullAccess: true,
      trialEndsAt: row.trial_ends_at ?? null,
      currentPeriodEnd: row.current_period_end ?? null,
      childQuantity: typeof row.child_quantity === 'number' ? row.child_quantity : 0,
      multiCurriculum: Boolean(row.multi_curriculum),
    };
  }

  const trialEndsAt = row?.trial_ends_at ? new Date(row.trial_ends_at) : null;
  if (trialEndsAt && Number.isFinite(trialEndsAt.getTime()) && trialEndsAt.getTime() > Date.now()) {
    return {
      plan: 'trial',
      status: 'trialing',
      isPaid: false,
      platformOwnerBypass: false,
      hasFullAccess: true,
      trialEndsAt: row!.trial_ends_at,
      currentPeriodEnd: row?.current_period_end ?? null,
      childQuantity: typeof row?.child_quantity === 'number' ? row.child_quantity : 0,
      multiCurriculum: Boolean(row?.multi_curriculum),
    };
  }

  return {
    ...FREE_SHIFT_PLAN_ACCESS,
    trialEndsAt: row?.trial_ends_at ?? null,
    currentPeriodEnd: row?.current_period_end ?? null,
    status: asShiftStatus(row?.status),
    plan: 'free',
  };
}

/** Convenience gate for premium feature checks. */
export async function hasShiftPremiumAccess(userId: string): Promise<boolean> {
  const access = await resolveShiftPlanAccess(userId);
  return access.hasFullAccess;
}

/** Return a 402 JSON response when the user lacks premium access; otherwise null. */
export async function requireShiftPremiumAccess(
  request: NextRequest,
  userId: string
): Promise<NextResponse | null> {
  if (await hasShiftPremiumAccess(userId)) return null;
  return shiftAiApiJson(
    request,
    {
      error: 'Premium subscription or active trial required',
      code: 'SHIFT_PREMIUM_REQUIRED',
    },
    { status: 402 }
  );
}
