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
 * Resolve platform-owner bypass via Supabase is_platform_owner() / platform_owners
 * and store it for the remainder of the current async request context.
 *
 * Prefer `userId` for Bearer/cross-origin VP API calls — cookie-session RPC
 * cannot see auth.uid() in that case.
 */
export async function initProductGatingContext(userId?: string): Promise<boolean> {
  const bypass = await isPlatformOwner(userId);
  gatingStore.enterWith({ bypass });
  return bypass;
}

/**
 * Resolve bypass for the current request.
 * - Trusts ALS when already true (set by guardApiRequest / runWithProductGating).
 * - If ALS is missing/false but `userId` is provided, re-checks platform_owners
 *   (ALS can drop across awaits in some Next.js runtimes; VP Bearer calls need this).
 */
export async function resolveProductGatingBypass(userId?: string): Promise<boolean> {
  if (isProductGatingBypassActive()) return true;
  if (userId) return initProductGatingContext(userId);
  const cached = gatingStore.getStore()?.bypass;
  if (cached != null) return cached;
  return initProductGatingContext();
}

/** Run `fn` inside an ALS scope that survives nested awaits more reliably than enterWith alone. */
export async function runWithProductGating<T>(
  userId: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const bypass = await isPlatformOwner(userId);
  return gatingStore.run({ bypass }, fn);
}
