import { AsyncLocalStorage } from 'async_hooks';
import 'server-only';

import { loadActiveAdminCompedGrant } from '@/lib/access-grant';
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

type GatingStore = {
  /** firstparty.platform_owners / email allowlist */
  platformOwner: boolean;
  /** Active profiles.access_grant = admin_comped (respects expires_at) */
  adminComped: boolean;
  /** access_grant_tier when adminComped */
  grantTier: string | null;
};

const gatingStore = new AsyncLocalStorage<GatingStore>();

function storeBypass(store: GatingStore | undefined): boolean {
  return Boolean(store?.platformOwner || store?.adminComped);
}

/**
 * Sync ALS peek — unreliable after awaits. Prefer {@link resolveProductGatingBypass}(userId)
 * and pass the result into tier helpers as `bypass`.
 *
 * True for platform owners AND active admin_comped grants.
 */
export function isProductGatingBypassActive(): boolean {
  return storeBypass(gatingStore.getStore());
}

/** True only for platform owners (not admin_comped). */
export function isPlatformOwnerGatingActive(): boolean {
  return gatingStore.getStore()?.platformOwner === true;
}

/** Active admin_comped grant tier from ALS, if any. */
export function getAdminCompedGrantTier(): string | null {
  const store = gatingStore.getStore();
  if (!store?.adminComped) return null;
  return store.grantTier;
}

async function resolveGatingStore(userId?: string): Promise<GatingStore> {
  const platformOwner = await isPlatformOwner(userId);
  if (platformOwner) {
    return { platformOwner: true, adminComped: false, grantTier: null };
  }

  if (userId) {
    const grant = await loadActiveAdminCompedGrant(userId);
    if (grant) {
      return { platformOwner: false, adminComped: true, grantTier: grant.tier };
    }
  }

  return { platformOwner: false, adminComped: false, grantTier: null };
}

/**
 * Resolve platform-owner / admin_comped bypass via Supabase and store it for the
 * remainder of the current async request context.
 *
 * Prefer `userId` for Bearer/cross-origin VP API calls — cookie-session RPC
 * cannot see auth.uid() in that case.
 */
export async function initProductGatingContext(userId?: string): Promise<boolean> {
  const store = await resolveGatingStore(userId);
  gatingStore.enterWith(store);
  return storeBypass(store);
}

/**
 * Resolve bypass for the current request.
 * - Trusts ALS when already true (set by guardApiRequest / runWithProductGating).
 * - If ALS is missing/false but `userId` is provided, re-checks platform_owners
 *   and admin_comped grants (ALS can drop across awaits in some Next.js runtimes).
 *
 * Returns true for platform owners OR active admin_comped. Tier helpers use
 * {@link isPlatformOwnerGatingActive} / {@link getAdminCompedGrantTier} to
 * distinguish sovereign vs granted-tier entitlements.
 */
export async function resolveProductGatingBypass(userId?: string): Promise<boolean> {
  if (isProductGatingBypassActive()) return true;
  if (userId) return initProductGatingContext(userId);
  const cached = gatingStore.getStore();
  if (cached != null) return storeBypass(cached);
  return initProductGatingContext();
}

/** Run `fn` inside an ALS scope that survives nested awaits more reliably than enterWith alone. */
export async function runWithProductGating<T>(
  userId: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const store = await resolveGatingStore(userId);
  return gatingStore.run(store, fn);
}
