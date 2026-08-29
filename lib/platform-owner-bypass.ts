import { AsyncLocalStorage } from 'async_hooks';
import 'server-only';

import { isPlatformOwner } from '@/lib/platform-owner-auth';

/**
 * In-memory tier/status used ONLY for product gating checks.
 * Never written to profiles — billing UI keeps the real subscription_tier.
 */
export const PLATFORM_OWNER_GATING_TIER = 'sovereign';
export const PLATFORM_OWNER_GATING_STATUS = 'active';
export const PLATFORM_OWNER_VP_PLAN = 'enterprise_islamic';

export const PLATFORM_OWNER_VP_PLAN_INFO = {
  plan: PLATFORM_OWNER_VP_PLAN,
  status: 'active' as const,
  source: null,
  hasPaidIslamicAccess: true,
  isPaid: true,
};

export const PLATFORM_OWNER_ISLAMIC_ACCESS = {
  hasPaidIslamicAccess: true,
  plan: PLATFORM_OWNER_VP_PLAN,
  status: 'active' as const,
  source: null,
};

type GatingStore = { bypass: boolean };

const gatingStore = new AsyncLocalStorage<GatingStore>();

/** True when the current request/session is a registered platform owner (server-only). */
export function isProductGatingBypassActive(): boolean {
  return gatingStore.getStore()?.bypass === true;
}

/**
 * Resolve platform-owner bypass via Supabase is_platform_owner() and store it
 * for the remainder of the current async request context.
 */
export async function initProductGatingContext(userId?: string): Promise<boolean> {
  const bypass = await isPlatformOwner(userId);
  gatingStore.enterWith({ bypass });
  return bypass;
}

/** Resolve bypass, using request cache when already initialized. */
export async function resolveProductGatingBypass(): Promise<boolean> {
  const cached = gatingStore.getStore()?.bypass;
  if (cached != null) return cached;
  return initProductGatingContext();
}
