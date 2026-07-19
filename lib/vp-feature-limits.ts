/**
 * Server source of truth for Vagus Planner feature limits.
 * Keep aligned with apps/vagus-planner/src/components/utils/featureGating.jsx.
 */

import { normalizePlanId } from '@/lib/vp-islamic-access';

/** Lifetime soft-trial features (not monthly). */
export const LIFETIME_FEATURES = new Set(['ai_calendar_summary', 'ai_scheduler']);

export const LIFETIME_PERIOD_START = '1970-01-01T00:00:00.000Z';

type FeatureLimits = Record<string, number>;

/**
 * Numeric limits. 0 = blocked, >= 999999 = unlimited.
 * ai_calendar_summary: free soft-trial of 2 (matches prior UpgradeGate UX); paid = unlimited.
 * ai_scheduler: free/basic soft-trial of 1; pro+ = unlimited (AppReadiness).
 */
const PLAN_LIMITS: Record<string, FeatureLimits> = {
  free: {
    ai_requests: 150,
    ai_calendar_summary: 2,
    ai_scheduler: 1,
    ai_islamic_coach: 0,
  },
  basic: {
    ai_requests: 1000,
    ai_calendar_summary: 999999,
    ai_scheduler: 1,
    ai_islamic_coach: 0,
  },
  pro: {
    ai_requests: 5000,
    ai_calendar_summary: 999999,
    ai_scheduler: 999999,
    ai_islamic_coach: 0,
  },
  enterprise: {
    ai_requests: 999999,
    ai_calendar_summary: 999999,
    ai_scheduler: 999999,
    ai_islamic_coach: 0,
  },
  basic_islamic: {
    ai_requests: 1000,
    ai_calendar_summary: 999999,
    ai_scheduler: 1,
    ai_islamic_coach: 0,
  },
  pro_islamic: {
    ai_requests: 5000,
    ai_calendar_summary: 999999,
    ai_scheduler: 999999,
    ai_islamic_coach: 1,
  },
  enterprise_islamic: {
    ai_requests: 999999,
    ai_calendar_summary: 999999,
    ai_scheduler: 999999,
    ai_islamic_coach: 1,
  },
  premium: {
    ai_requests: 999999,
    ai_calendar_summary: 999999,
    ai_scheduler: 999999,
    ai_islamic_coach: 1,
  },
};

export function getFeatureLimit(plan: unknown, feature: string): number {
  const p = normalizePlanId(plan) || 'free';
  const limits = PLAN_LIMITS[p] ?? PLAN_LIMITS.free;
  return limits[feature] ?? 0;
}

export function canAccessFeature(plan: unknown, feature: string): boolean {
  return getFeatureLimit(plan, feature) > 0;
}

export function isUnlimitedFeature(plan: unknown, feature: string): boolean {
  return getFeatureLimit(plan, feature) >= 999999;
}

export function monthPeriodStart(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export function periodStartForFeature(feature: string, now = new Date()): string {
  if (LIFETIME_FEATURES.has(feature)) return LIFETIME_PERIOD_START;
  return monthPeriodStart(now);
}
