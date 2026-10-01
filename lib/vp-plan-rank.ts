/**
 * Vagus Planner plan rank for dual-purchase guards and best-plan resolution.
 * Rank: pro_islamic > basic_islamic > pro > basic > free
 */

import { normalizePlanId } from '@/lib/vp-islamic-access';

export const VP_PLAN_RANK: Record<string, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  basic_islamic: 3,
  pro_islamic: 4,
  enterprise: 5,
  enterprise_islamic: 6,
};

export function planRank(plan: unknown): number {
  const p = normalizePlanId(plan) || 'free';
  if (p in VP_PLAN_RANK) return VP_PLAN_RANK[p];
  if (p.includes('islamic') && p.includes('enterprise')) return VP_PLAN_RANK.enterprise_islamic;
  if (p.includes('islamic') && p.includes('pro')) return VP_PLAN_RANK.pro_islamic;
  if (p.includes('islamic')) return VP_PLAN_RANK.basic_islamic;
  if (p.includes('enterprise')) return VP_PLAN_RANK.enterprise;
  if (p.includes('pro')) return VP_PLAN_RANK.pro;
  if (p.includes('basic')) return VP_PLAN_RANK.basic;
  return 0;
}

/** True when `existing` is equal or higher rank than `requested`. */
export function isEqualOrHigherPlan(existing: unknown, requested: unknown): boolean {
  return planRank(existing) >= planRank(requested);
}

export function pickHighestRankPlan<T extends { plan?: unknown }>(rows: T[]): T | null {
  if (!rows?.length) return null;
  let best: T | null = null;
  let bestRank = -1;
  for (const row of rows) {
    const r = planRank(row.plan);
    if (r > bestRank) {
      bestRank = r;
      best = row;
    }
  }
  return best;
}
