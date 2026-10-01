/**
 * RevenueCat Purchases wrapper for Vagus Planner iOS Capacitor.
 * Configure with VITE_REVENUECAT_IOS_API_KEY (baked into Cap builds).
 */

import { ensureCapacitorReady, isIosNativeApp } from '@/lib/vp-platform';
import { normalizePlanId, planRank } from '@/lib/vp-plan-rank';

const OFFERING_STANDARD = 'standard';
const OFFERING_ISLAMIC = 'islamic';

/** Soft ceiling so purchase UI never spins forever waiting on native/network. */
const CONFIGURE_TIMEOUT_MS = 15000;
const OFFERINGS_TIMEOUT_MS = 20000;
const PURCHASE_BRIDGE_TIMEOUT_MS = 120000;

let configurePromise = null;
let configured = false;
let lastConfigureError = null;

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

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function getPurchases() {
  const mod = await import('@revenuecat/purchases-capacitor');
  if (!mod?.Purchases) {
    throw new Error('RevenueCat Purchases plugin failed to load');
  }
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
 * Waits for Capacitor bridge first so configure cannot hang on a cold start.
 */
export async function configureRevenueCat(appUserId) {
  if (!isIosNativeApp()) return { ok: false, reason: 'not_ios' };
  const apiKey = iosApiKey();
  if (!apiKey) {
    console.error(
      '[RevenueCat] Missing VITE_REVENUECAT_IOS_API_KEY — set it for Capacitor builds (see docs/production-deployment.md)'
    );
    return { ok: false, reason: 'missing_api_key' };
  }

  if (configured) return { ok: true };
  if (configurePromise) return configurePromise;

  configurePromise = (async () => {
    try {
      await ensureCapacitorReady();
      const Purchases = await getPurchases();
      const config = { apiKey };
      if (typeof appUserId === 'string' && appUserId.trim()) {
        config.appUserID = appUserId.trim();
      }
      console.log('[RevenueCat] configure → native', {
        hasAppUserId: Boolean(config.appUserID),
      });
      await withTimeout(
        Purchases.configure(config),
        CONFIGURE_TIMEOUT_MS,
        'Purchases.configure'
      );
      configured = true;
      lastConfigureError = null;
      console.log('[RevenueCat] configure ✓');
      return { ok: true };
    } catch (err) {
      configurePromise = null;
      configured = false;
      lastConfigureError = err;
      console.error('[RevenueCat] configure failed:', err);
      return { ok: false, reason: 'configure_failed', error: err };
    }
  })();

  return configurePromise;
}

/**
 * Ensure SDK is configured (and optionally logged in) before purchase/offerings.
 */
export async function ensureRevenueCatReady(appUserId) {
  const result = await configureRevenueCat(appUserId);
  if (!configured) {
    const detail =
      lastConfigureError instanceof Error
        ? lastConfigureError.message
        : result?.reason || 'not_configured';
    throw new Error(`RevenueCat is not ready (${detail})`);
  }
  if (typeof appUserId === 'string' && appUserId.trim()) {
    try {
      await revenueCatLogIn(appUserId.trim());
    } catch (err) {
      // Purchase can still proceed; attribution may be anonymous until logIn succeeds.
      console.error('[RevenueCat] ensureReady logIn failed (continuing):', err);
    }
  }
  return { ok: true };
}

export async function revenueCatLogIn(supabaseUserId) {
  if (!supabaseUserId || !isIosNativeApp()) return;
  try {
    await configureRevenueCat(supabaseUserId);
    if (!configured) return;
    const Purchases = await getPurchases();
    console.log('[RevenueCat] logIn → native');
    await Purchases.logIn({ appUserID: String(supabaseUserId) });
  } catch (err) {
    console.error('[RevenueCat] logIn failed:', err);
  }
}

export async function revenueCatLogOut() {
  if (!isIosNativeApp() || !configured) return;
  try {
    const Purchases = await getPurchases();
    await Purchases.logOut();
  } catch (err) {
    console.error('[RevenueCat] logOut failed:', err);
  }
}

export function offeringIdForEdition(editionPreference) {
  const ed = typeof editionPreference === 'string' ? editionPreference.toLowerCase() : '';
  return ed === 'islamic' ? OFFERING_ISLAMIC : OFFERING_STANDARD;
}

/**
 * Cap plugin returns PurchasesOfferings `{ all, current }` directly.
 * Some wrappers historically nested under `.offerings` — accept both.
 */
export function unwrapOfferingsResult(result) {
  if (!result || typeof result !== 'object') return null;
  if (result.all || result.current) return result;
  if (result.offerings && (result.offerings.all || result.offerings.current)) {
    return result.offerings;
  }
  return null;
}

function productIdentifierOf(pkg) {
  return String(
    pkg?.product?.identifier ||
      pkg?.storeProduct?.identifier ||
      pkg?.productIdentifier ||
      ''
  );
}

function packageIdentifierOf(pkg) {
  return String(pkg?.identifier || '');
}

/**
 * Token-safe plan match for RC product ids like
 * `com.niskbuild.vagusplanner.basic.monthly` and package ids `$rc_monthly`.
 */
export function planIdFromPackage(pkg) {
  if (!pkg) return null;
  const productId = normalizePlanId(productIdentifierOf(pkg));
  const packageId = normalizePlanId(packageIdentifierOf(pkg));
  const haystack = `${productId} ${packageId}`;
  const candidates = ['pro_islamic', 'basic_islamic', 'pro', 'basic'];

  for (const c of candidates) {
    if (productId === c || packageId === c) return c;
    // Boundary-aware: `.pro.` / `_pro_` / `pro.monthly` — not a random substring.
    const re = new RegExp(`(^|[._\\-\\s])${c}([._\\-\\s]|$)`);
    if (re.test(productId) || re.test(packageId) || re.test(haystack)) return c;
  }

  const ents = pkg?.product?.entitlementIds || pkg?.product?.entitlements || [];
  if (Array.isArray(ents)) {
    for (const c of candidates) {
      if (ents.map(normalizePlanId).includes(c)) return c;
    }
  }
  return null;
}

export function billingCycleFromPackage(pkg) {
  const packageType = String(pkg?.packageType || '').toUpperCase();
  const packageId = String(pkg?.identifier || '').toUpperCase();
  if (
    packageType.includes('ANNUAL') ||
    packageType.includes('YEAR') ||
    packageType === 'ANNUAL' ||
    packageId === '$RC_ANNUAL' ||
    packageId.includes('ANNUAL') ||
    packageId.includes('YEAR')
  ) {
    return 'annual';
  }
  const productId = productIdentifierOf(pkg).toLowerCase();
  if (
    productId.includes('annual') ||
    productId.includes('yearly') ||
    productId.includes('.year') ||
    productId.includes('_year')
  ) {
    return 'annual';
  }
  return 'monthly';
}

function summarizePackages(packages) {
  return (packages || []).map((p) => ({
    packageId: packageIdentifierOf(p),
    productId: productIdentifierOf(p),
    packageType: p?.packageType,
    plan: planIdFromPackage(p),
    cycle: billingCycleFromPackage(p),
  }));
}

/**
 * @param {'standard'|'islamic'|string} offeringId
 * @returns {Promise<{ offering: object|null, packages: object[], error?: string }>}
 */
export async function getOfferingPackages(offeringId = OFFERING_STANDARD) {
  await configureRevenueCat();
  if (!configured) {
    return {
      offering: null,
      packages: [],
      error: lastConfigureError
        ? `not_configured: ${lastConfigureError.message || lastConfigureError}`
        : 'not_configured',
    };
  }

  try {
    const Purchases = await getPurchases();
    console.log('[RevenueCat] getOfferings → native', { offeringId });
    const raw = await withTimeout(
      Purchases.getOfferings(),
      OFFERINGS_TIMEOUT_MS,
      'Purchases.getOfferings'
    );
    const offerings = unwrapOfferingsResult(raw);
    if (!offerings) {
      console.error('[RevenueCat] getOfferings returned unexpected shape:', raw);
      return {
        offering: null,
        packages: [],
        error: 'getOfferings returned unexpected shape',
      };
    }

    const id = offeringId === OFFERING_ISLAMIC ? OFFERING_ISLAMIC : OFFERING_STANDARD;
    const offeringKeys = offerings.all ? Object.keys(offerings.all) : [];
    let offering =
      offerings.all?.[id] ||
      (id === OFFERING_STANDARD ? offerings.current : null) ||
      null;

    // Fallback: if named offering missing, use current then first available.
    if (!offering && offerings.current) {
      console.warn(
        `[RevenueCat] Offering "${id}" missing; falling back to current. Available:`,
        offeringKeys
      );
      offering = offerings.current;
    }
    if (!offering && offeringKeys.length) {
      console.warn(
        `[RevenueCat] Offering "${id}" missing; using first available "${offeringKeys[0]}"`
      );
      offering = offerings.all[offeringKeys[0]];
    }

    const packages = Array.isArray(offering?.availablePackages)
      ? offering.availablePackages
      : [];

    console.log('[RevenueCat] getOfferings ✓', {
      requested: id,
      offeringIdentifier: offering?.identifier || null,
      availableOfferings: offeringKeys,
      packages: summarizePackages(packages),
    });

    if (!packages.length) {
      return {
        offering,
        packages: [],
        error: `No packages in offering "${offering?.identifier || id}" (available offerings: ${offeringKeys.join(', ') || 'none'})`,
      };
    }

    return { offering, packages };
  } catch (err) {
    console.error('[RevenueCat] getOfferings failed:', err);
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
  if (error) return { pkg: null, error, packages: packages || [] };

  const want = normalizePlanId(planId);
  const wantCycle = billingCycle === 'annual' || billingCycle === 'yearly' ? 'annual' : 'monthly';

  const matches = packages.filter((p) => planIdFromPackage(p) === want);
  const byCycle = matches.find((p) => billingCycleFromPackage(p) === wantCycle);
  const pkg = byCycle || matches[0] || null;

  if (!pkg) {
    const summary = summarizePackages(packages);
    const msg = `No App Store package for plan "${want}" (${wantCycle}). Available: ${
      summary.map((s) => `${s.packageId}/${s.productId}→${s.plan || '?'}/${s.cycle}`).join('; ') ||
      'none'
    }`;
    console.error('[RevenueCat] findPackageForPlan:', msg);
    return { pkg: null, error: msg, packages };
  }

  console.log('[RevenueCat] findPackageForPlan ✓', {
    want,
    wantCycle,
    packageId: packageIdentifierOf(pkg),
    productId: productIdentifierOf(pkg),
  });
  return { pkg, packages };
}

/**
 * Bridge-safe package payload. Native purchasePackage requires identifier +
 * presentedOfferingContext — keep those fields even if JSON clone fails.
 */
function toBridgePackage(pkg) {
  if (!pkg || typeof pkg !== 'object') return pkg;
  try {
    const cloned = JSON.parse(JSON.stringify(pkg));
    if (cloned?.identifier && cloned?.presentedOfferingContext) return cloned;
  } catch {
    // fall through
  }
  return {
    identifier: pkg.identifier,
    packageType: pkg.packageType,
    product: pkg.product
      ? {
          identifier: pkg.product.identifier,
          description: pkg.product.description,
          title: pkg.product.title,
          price: pkg.product.price,
          priceString: pkg.product.priceString,
        }
      : undefined,
    presentedOfferingContext: pkg.presentedOfferingContext,
    offeringIdentifier:
      pkg.offeringIdentifier || pkg.presentedOfferingContext?.offeringIdentifier,
  };
}

export async function purchasePackage(pkg) {
  await configureRevenueCat();
  if (!configured) throw new Error('RevenueCat is not configured');
  if (!pkg) throw new Error('No package selected');

  const aPackage = toBridgePackage(pkg);
  if (!aPackage?.identifier) {
    throw new Error('Package is missing identifier — cannot start App Store purchase');
  }
  if (!aPackage?.presentedOfferingContext) {
    console.error('[RevenueCat] package missing presentedOfferingContext', aPackage);
    throw new Error(
      'Package is missing presentedOfferingContext — refresh offerings and try again'
    );
  }

  const Purchases = await getPurchases();
  console.log('[RevenueCat] purchasePackage → native', {
    packageId: aPackage.identifier,
    productId: aPackage.product?.identifier,
    offering: aPackage.presentedOfferingContext?.offeringIdentifier,
  });
  return withTimeout(
    Purchases.purchasePackage({ aPackage }),
    PURCHASE_BRIDGE_TIMEOUT_MS,
    'Purchases.purchasePackage'
  );
}

export async function restorePurchases() {
  await configureRevenueCat();
  if (!configured) throw new Error('RevenueCat is not configured');
  const Purchases = await getPurchases();
  console.log('[RevenueCat] restorePurchases → native');
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
