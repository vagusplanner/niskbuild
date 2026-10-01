/**
 * Client-side plan rank helpers (mirrors lib/vp-plan-rank.ts for the Vite SPA).
 */

export const VP_PLAN_RANK = {
  free: 0,
  basic: 1,
  pro: 2,
  basic_islamic: 3,
  pro_islamic: 4,
  enterprise: 5,
  enterprise_islamic: 6,
};

export function normalizePlanId(plan) {
  if (typeof plan !== 'string') return '';
  return plan.toLowerCase().trim().replace(/\s+/g, '_');
}

export function planRank(plan) {
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

export function isEqualOrHigherPlan(existing, requested) {
  return planRank(existing) >= planRank(requested);
}

export const WEB_SUB_MANAGE_MESSAGE = "You're subscribed on web, manage there";
export const APPLE_SUB_MANAGE_MESSAGE = "You're subscribed through Apple, manage there";
