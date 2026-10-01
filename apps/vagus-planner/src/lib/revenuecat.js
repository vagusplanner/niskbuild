/**
 * RevenueCat Purchases wrapper for Vagus Planner iOS Capacitor.
 * Configure with VITE_REVENUECAT_IOS_API_KEY (baked into Cap builds).
 */

import { isIosNativeApp } from '@/lib/vp-platform';
import { normalizePlanId, planRank } from '@/lib/vp-plan-rank';

const OFFERING_STANDARD = 'standard';
const OFFERING_ISLAMIC = 'islamic';

let configurePromise = null;
let configured = false;

function iosApiKey() {
  try {
    return (
      (typeof import.meta !== 'undefined' &&
        import.meta.env?.VITE_REVENUECAT_IOS_API_KEY?.trim()) ||
      ''
    );
  } catch {
    return '';
  }
}

async function getPurchases() {
  const mod = await import('@revenuecat/purchases-capacitor');
  return mod.Purchases;
}

export function isRevenueCatConfigured() {
  return configured && Boolean(iosApiKey());
}

export function canUseAppleIap() {
  return isIosNativeApp() && Boolean(iosApiKey());
}

/**
 * Configure RevenueCat once on iOS. Safe to call repeatedly.
 */
export async function configureRevenueCat(appUserId) {
  if (!isIosNativeApp()) return { ok: false, reason: 'not_ios' };
  const apiKey = iosApiKey();
  if (!apiKey) {
    console.warn(
      '[RevenueCat] Missing VITE_REVENUECAT_IOS_API_KEY — set it for Capacitor builds (see docs/production-deployment.md)'
    );
    return { ok: false, reason: 'missing_api_key' };
  }

  if (configurePromise) return configurePromise;

  configurePromise = (async () => {
    try {
      const Purchases = await getPurchases();
      const config = { apiKey };
      if (typeof appUserId === 'string' && appUserId.trim()) {
        config.appUserID = appUserId.trim();
      }
      await Purchases.configure(config);
      configured = true;
      return { ok: true };
    } catch (err) {
      configurePromise = null;
      console.warn('[RevenueCat] configure failed:', err);
      return { ok: false, reason: 'configure_failed', error: err };
    }
  })();

  return configurePromise;
}

export async function revenueCatLogIn(supabaseUserId) {
  if (!supabaseUserId || !isIosNativeApp()) return;
  try {
    await configureRevenueCat(supabaseUserId);
    if (!configured) return;
    const Purchases = await getPurchases();
    await Purchases.logIn({ appUserID: String(supabaseUserId) });
  } catch (err) {
    console.warn('[RevenueCat] logIn failed:', err);
  }
}

export async function revenueCatLogOut() {
  if (!isIosNativeApp() || !configured) return;
  try {
    const Purchases = await getPurchases();
    await Purchases.logOut();
  } catch (err) {
    console.warn('[RevenueCat] logOut failed:', err);
  }
}

export function offeringIdForEdition(editionPreference) {
  const ed = typeof editionPreference === 'string' ? editionPreference.toLowerCase() : '';
  return ed === 'islamic' ? OFFERING_ISLAMIC : OFFERING_STANDARD;
}

/**
 * Infer VP plan id from a RevenueCat package / store product.
 */
export function planIdFromPackage(pkg) {
  if (!pkg) return null;
  const productId = normalizePlanId(
    pkg?.product?.identifier || pkg?.storeProduct?.identifier || pkg?.identifier || ''
  );
  const packageId = normalizePlanId(pkg?.identifier || '');
  const candidates = ['pro_islamic', 'basic_islamic', 'pro', 'basic'];
  for (const c of candidates) {
    if (
      productId === c ||
      productId.includes(c) ||
      packageId === c ||
      packageId.includes(c)
    ) {
      return c;
    }
  }
  // Entitlement hints on product
  const ents = pkg?.product?.entitlementIds || pkg?.product?.entitlements || [];
  if (Array.isArray(ents)) {
    for (const c of candidates) {
      if (ents.map(normalizePlanId).includes(c)) return c;
    }
  }
  return null;
}

export function billingCycleFromPackage(pkg) {
  const packageType = String(pkg?.packageType || pkg?.identifier || '').toUpperCase();
  if (
    packageType.includes('ANNUAL') ||
    packageType.includes('YEAR') ||
    packageType === '$RC_ANNUAL'
  ) {
    return 'annual';
  }
  const productId = String(pkg?.product?.identifier || '').toLowerCase();
  if (productId.includes('annual') || productId.includes('yearly') || productId.includes('year')) {
    return 'annual';
  }
  return 'monthly';
}

/**
 * @param {'standard'|'islamic'|string} offeringId
 * @returns {Promise<{ offering: object|null, packages: object[], error?: string }>}
 */
export async function getOfferingPackages(offeringId = OFFERING_STANDARD) {
  await configureRevenueCat();
  if (!configured) return { offering: null, packages: [], error: 'not_configured' };

  try {
    const Purchases = await getPurchases();
    const { offerings } = await Purchases.getOfferings();
    const id = offeringId === OFFERING_ISLAMIC ? OFFERING_ISLAMIC : OFFERING_STANDARD;
    const offering =
      offerings?.all?.[id] ||
      (id === OFFERING_STANDARD ? offerings?.current : null) ||
      null;
    const packages = Array.isArray(offering?.availablePackages)
      ? offering.availablePackages
      : [];
    return { offering, packages };
  } catch (err) {
    console.warn('[RevenueCat] getOfferings failed:', err);
    return {
      offering: null,
      packages: [],
      error: err instanceof Error ? err.message : 'getOfferings failed',
    };
  }
}

/**
 * Find a package for plan + billing cycle within an offering.
 */
export async function findPackageForPlan({
  planId,
  billingCycle = 'monthly',
  editionPreference = 'standard',
}) {
  const offeringId = offeringIdForEdition(
    planId?.includes('islamic') ? 'islamic' : editionPreference
  );
  const { packages, error } = await getOfferingPackages(offeringId);
  if (error) return { pkg: null, error };

  const want = normalizePlanId(planId);
  const wantCycle = billingCycle === 'annual' || billingCycle === 'yearly' ? 'annual' : 'monthly';

  const matches = packages.filter((p) => planIdFromPackage(p) === want);
  const byCycle = matches.find((p) => billingCycleFromPackage(p) === wantCycle);
  return { pkg: byCycle || matches[0] || null, packages };
}

export async function purchasePackage(pkg) {
  await configureRevenueCat();
  if (!configured) throw new Error('RevenueCat is not configured');
  if (!pkg) throw new Error('No package selected');

  const Purchases = await getPurchases();
  // Capacitor bridge requires a plain object (not a Proxy)
  let aPackage = pkg;
  try {
    aPackage = JSON.parse(JSON.stringify(pkg));
  } catch {
    aPackage = { ...pkg };
  }
  return Purchases.purchasePackage({ aPackage });
}

export async function restorePurchases() {
  await configureRevenueCat();
  if (!configured) throw new Error('RevenueCat is not configured');
  const Purchases = await getPurchases();
  return Purchases.restorePurchases();
}

/**
 * Sort packages for display: higher plan rank first, monthly before annual within plan.
 */
export function sortPackagesForDisplay(packages) {
  return [...(packages || [])].sort((a, b) => {
    const planDiff = planRank(planIdFromPackage(b)) - planRank(planIdFromPackage(a));
    if (planDiff !== 0) return planDiff;
    const ca = billingCycleFromPackage(a);
    const cb = billingCycleFromPackage(b);
    if (ca === cb) return 0;
    return ca === 'monthly' ? -1 : 1;
  });
}

export { OFFERING_STANDARD, OFFERING_ISLAMIC };
