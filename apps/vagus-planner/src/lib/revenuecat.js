/**
 * RevenueCat Purchases wrapper for Vagus Planner iOS Capacitor.
 * Configure with VITE_REVENUECAT_IOS_API_KEY (baked into Cap builds).
 */

import { ensureCapacitorReady, isIosNativeApp } from '@/lib/vp-platform';
import { normalizePlanId, planRank } from '@/lib/vp-plan-rank';

const OFFERING_STANDARD = 'standard';
const OFFERING_ISLAMIC = 'islamic';

/** Soft ceilings so purchase UI never spins forever waiting on native/network. */
const CAPACITOR_READY_TIMEOUT_MS = 8000;
const IMPORT_TIMEOUT_MS = 10000;
const CONFIGURE_TIMEOUT_MS = 15000;
const OFFERINGS_TIMEOUT_MS = 20000;
const PURCHASE_BRIDGE_TIMEOUT_MS = 120000;
/**
 * Max wait when joining an in-flight configure started elsewhere (e.g. Cap auth).
 * Keep short enough to abandon a hung Cap-auth configure and retry, but long enough
 * for a healthy cold start (cap ready + import + configure).
 */
const IN_FLIGHT_CONFIGURE_WAIT_MS =
  CAPACITOR_READY_TIMEOUT_MS + IMPORT_TIMEOUT_MS + CONFIGURE_TIMEOUT_MS + 2000;
/** Whole ensureReady budget: in-flight abandon/retry + optional logIn. */
const ENSURE_READY_TIMEOUT_MS = IN_FLIGHT_CONFIGURE_WAIT_MS + CONFIGURE_TIMEOUT_MS + 5000;

let configurePromise = null;
let configured = false;
let lastConfigureError = null;
/** Bumped when abandoning a hung in-flight configure so stale success cannot win. */
let configureGeneration = 0;
/** Cached Purchases plugin after first successful dynamic import. */
let purchasesPlugin = null;

/** Ring-buffer of recent IAP logs — survives Xcode console attach races. */
const IAP_DEBUG_STORAGE_KEY = 'vp_iap_debug_logs';
const IAP_DEBUG_MAX_LINES = 40;
const iapDebugLines = [];

function readPersistedIapDebugLogs() {
  try {
    if (typeof sessionStorage === 'undefined') return [];
    const raw = sessionStorage.getItem(IAP_DEBUG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function persistIapDebugLogs() {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(
      IAP_DEBUG_STORAGE_KEY,
      JSON.stringify(iapDebugLines.slice(-IAP_DEBUG_MAX_LINES))
    );
  } catch {
    // private mode / quota — ignore
  }
}

/** Seed in-memory buffer from a prior page load in this tab session. */
try {
  for (const line of readPersistedIapDebugLogs()) {
    iapDebugLines.push(line);
  }
} catch {
  // ignore
}

/**
 * Console + sessionStorage ring buffer. Sync-safe — call before any await so
 * cold-start / late Xcode console attach still retains the trail.
 */
export function iapDebugLog(...args) {
  const ts = new Date().toISOString().slice(11, 23);
  const text = args
    .map((a) => {
      if (a == null) return String(a);
      if (typeof a === 'string') return a;
      if (a instanceof Error) return a.message;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');
  const line = `${ts} ${text}`;
  iapDebugLines.push(line);
  if (iapDebugLines.length > IAP_DEBUG_MAX_LINES) {
    iapDebugLines.splice(0, iapDebugLines.length - IAP_DEBUG_MAX_LINES);
  }
  persistIapDebugLogs();
  console.log(...args);
}

export function getIapDebugLogs() {
  const fromStore = readPersistedIapDebugLogs();
  // Prefer live buffer; fall back to store if empty.
  const lines = iapDebugLines.length ? iapDebugLines.slice() : fromStore;
  return lines.slice(-IAP_DEBUG_MAX_LINES);
}

function iosApiKey() {
  try {
    const raw =
      typeof import.meta !== 'undefined'
        ? import.meta.env?.VITE_REVENUECAT_IOS_API_KEY
        : undefined;
    const key = typeof raw === 'string' ? raw.trim() : '';
    return key;
  } catch {
    return '';
  }
}

/** Safe apiKey summary for logs — never dump the full key. */
function apiKeyLogShape(apiKey) {
  const key = typeof apiKey === 'string' ? apiKey : '';
  return {
    present: Boolean(key),
    startsWithAppl: key.startsWith('appl_'),
    prefix: key ? key.slice(0, 5) : '',
    length: key.length,
  };
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });
  // Promise.resolve so a non-thenable return still races the timer.
  return Promise.race([Promise.resolve(promise), timeout]).finally(() =>
    clearTimeout(timer)
  );
}

function logErr(label, err) {
  const msg = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(label, msg, stack || err);
}

function getWindowCapacitor() {
  try {
    return typeof window !== 'undefined' ? window.Capacitor ?? null : null;
  } catch {
    return null;
  }
}

/**
 * Cap plugin declares configure as CAPPluginReturnNone, so the registerPlugin
 * proxy uses nativeCallback (does not await call.resolve) and may first await a
 * web impl load if platform was captured as "web". Prefer nativePromise — it
 * always posts To Native and waits for the native resolve.
 */
function invokePurchasesConfigure(Purchases, config) {
  const cap = getWindowCapacitor();
  // nativePromise is injected by Cap's native bridge only. Prefer it over the
  // registerPlugin proxy: configure is CAPPluginReturnNone (nativeCallback, no
  // await of call.resolve), and the proxy may await a web-impl import first if
  // platform was captured as "web" at registerPlugin time — hanging with no
  // "To Native -> Purchases.configure".
  if (typeof cap?.nativePromise === 'function') {
    iapDebugLog(
      '[RevenueCat] configure invoke via Capacitor.nativePromise(Purchases, configure)'
    );
    return {
      path: 'nativePromise',
      pending: cap.nativePromise('Purchases', 'configure', config),
    };
  }

  iapDebugLog('[RevenueCat] configure invoke via Purchases.configure(config) proxy');
  return {
    path: 'pluginProxy',
    pending: Purchases.configure(config),
  };
}

async function getPurchases() {
  if (purchasesPlugin) {
    iapDebugLog('[RevenueCat] Purchases plugin import (cached)');
    return purchasesPlugin;
  }
  iapDebugLog('[RevenueCat] Purchases plugin import start');
  try {
    const mod = await withTimeout(
      import('@revenuecat/purchases-capacitor'),
      IMPORT_TIMEOUT_MS,
      'Purchases plugin import'
    );
    const resolved =
      mod?.Purchases ||
      mod?.default?.Purchases ||
      (typeof mod?.default?.configure === 'function' ? mod.default : null);
    if (!resolved) {
      throw new Error(
        `RevenueCat Purchases plugin failed to load (module keys: ${Object.keys(mod || {}).join(',') || 'none'})`
      );
    }
    purchasesPlugin = resolved;
    // Cap registerPlugin proxy has empty Object.keys — also probe known methods.
    const probe = ['configure', 'getOfferings', 'purchasePackage', 'logIn', 'logOut'];
    iapDebugLog('[RevenueCat] Purchases plugin import ✓', {
      typeofConfigure: typeof purchasesPlugin.configure,
      configureIsFunction: typeof purchasesPlugin.configure === 'function',
      moduleKeys: Object.keys(mod || {}),
      purchasesKeys: Object.keys(purchasesPlugin || {}),
      methodTypes: Object.fromEntries(
        probe.map((k) => [k, typeof purchasesPlugin?.[k]])
      ),
    });
    return purchasesPlugin;
  } catch (err) {
    logErr('[RevenueCat] Purchases plugin import failed:', err);
    throw err;
  }
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
 * Soft-timeouts every await so an in-flight Cap-auth configure cannot block purchase forever.
 *
 * Ordering (definitive — single-threaded JS):
 * 1. Sync guards (platform / apiKey / already configured).
 * 2. If configurePromise set → join (log) → await with soft timeout.
 * 3. Else start a new in-flight:
 *    a. Invoke async IIFE — body runs SYNC until first await:
 *       logs "IIFE entered", then "ensureCapacitorReady start", kicks off Cap ready.
 *    b. First await yields → IIFE returns pending Promise P.
 *    c. Assign configurePromise = P, then sync-log "configurePromise stored".
 *       (Joiners can attach only after this store; body has ALWAYS already started.)
 *    d. Later: Cap ready ✓ → import Purchases → "about to call Purchases.configure"
 *       → nativePromise/proxy → configured = true.
 */
export async function configureRevenueCat(appUserId) {
  if (!isIosNativeApp()) return { ok: false, reason: 'not_ios' };
  const apiKey = iosApiKey();
  if (!apiKey) {
    const shape = apiKeyLogShape(apiKey);
    console.error(
      '[RevenueCat] Missing VITE_REVENUECAT_IOS_API_KEY — Apple IAP cannot configure.',
      shape,
      'Set it for Capacitor builds (see docs/production-deployment.md)'
    );
    lastConfigureError = new Error('missing_api_key');
    return { ok: false, reason: 'missing_api_key' };
  }

  if (configured) {
    iapDebugLog('[RevenueCat] configure skip (already configured)');
    return { ok: true };
  }

  // Join in-flight configure with a soft wait — never inherit an infinite hang.
  if (configurePromise) {
    iapDebugLog('[RevenueCat] configure joining in-flight promise');
    try {
      const joined = await withTimeout(
        configurePromise,
        IN_FLIGHT_CONFIGURE_WAIT_MS,
        'configureRevenueCat (in-flight)'
      );
      return joined;
    } catch (err) {
      logErr('[RevenueCat] in-flight configure timed out; resetting for retry:', err);
      configurePromise = null;
      configured = false;
      configureGeneration += 1; // invalidate hung starter
      // fall through to start a fresh configure
    }
  }

  const gen = ++configureGeneration;
  // RHS IIFE runs sync-to-first-await BEFORE configurePromise is assigned.
  // Split assign so we can log store as its own sync step (ordering proof on device).
  const pending = (async () => {
    // SYNC — executes before the outer `configurePromise = pending` assignment.
    iapDebugLog('[RevenueCat] configure async IIFE entered (sync, before store)', {
      gen,
    });
    try {
      iapDebugLog('[RevenueCat] ensureCapacitorReady start');
      await withTimeout(
        ensureCapacitorReady(),
        CAPACITOR_READY_TIMEOUT_MS,
        'ensureCapacitorReady'
      );
      if (gen !== configureGeneration) {
        console.warn('[RevenueCat] configure abandoned after ensureCapacitorReady');
        return { ok: false, reason: 'abandoned' };
      }
      iapDebugLog('[RevenueCat] ensureCapacitorReady ✓');

      const Purchases = await getPurchases();
      if (gen !== configureGeneration) {
        console.warn('[RevenueCat] configure abandoned after Purchases import');
        return { ok: false, reason: 'abandoned' };
      }

      // Re-resolve at call site — catch empty key even if an earlier check passed.
      const apiKeyNow = iosApiKey();
      if (!apiKeyNow) {
        const err = new Error(
          'VITE_REVENUECAT_IOS_API_KEY empty at configure invoke (was present at entry?)'
        );
        console.error('[RevenueCat] apiKey missing at invoke', apiKeyLogShape(apiKeyNow));
        throw err;
      }

      const config = { apiKey: apiKeyNow };
      if (typeof appUserId === 'string' && appUserId.trim()) {
        config.appUserID = appUserId.trim();
      }

      const cap = getWindowCapacitor();
      iapDebugLog('[RevenueCat] about to call Purchases.configure', {
        apiKey: apiKeyLogShape(apiKeyNow),
        optionKeys: Object.keys(config),
        typeofConfigure: typeof Purchases?.configure,
        configureIsFunction: typeof Purchases?.configure === 'function',
        purchasesKeys: Object.keys(Purchases || {}),
        capPlatform: cap?.getPlatform?.(),
        capIsNative: cap?.isNativePlatform?.(),
        purchasesPluginAvailable: cap?.isPluginAvailable?.('Purchases'),
        hasNativePromise: typeof cap?.nativePromise === 'function',
      });

      if (typeof Purchases?.configure !== 'function' && typeof cap?.nativePromise !== 'function') {
        throw new Error(
          `Purchases.configure is not a function (typeof=${typeof Purchases?.configure}) and Capacitor.nativePromise is unavailable`
        );
      }

      // Soft timeout wraps the configure AWAIT specifically so "never called"
      // vs "called but native never returned" are distinct in logs/errors.
      let configureInvoked = false;
      let invokePath = 'none';
      try {
        const { path, pending: nativePending } = invokePurchasesConfigure(Purchases, config);
        invokePath = path;
        configureInvoked = true;
        iapDebugLog('[RevenueCat] configure() invoked — awaiting native result', {
          path: invokePath,
          isThenable: typeof nativePending?.then === 'function',
        });
        await withTimeout(
          nativePending,
          CONFIGURE_TIMEOUT_MS,
          'Purchases.configure (native await)'
        );
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        if (!configureInvoked) {
          throw new Error(
            `Purchases.configure was NEVER invoked (${detail})`
          );
        }
        throw new Error(
          `Purchases.configure was invoked via ${invokePath} but did not complete (${detail})`
        );
      }

      if (gen !== configureGeneration) {
        console.warn('[RevenueCat] configure abandoned after Purchases.configure');
        return { ok: false, reason: 'abandoned' };
      }
      configured = true;
      lastConfigureError = null;
      iapDebugLog('[RevenueCat] configure ✓', { path: invokePath });
      return { ok: true };
    } catch (err) {
      if (gen !== configureGeneration) {
        return { ok: false, reason: 'abandoned' };
      }
      configurePromise = null;
      configured = false;
      lastConfigureError = err;
      logErr('[RevenueCat] configure failed:', err);
      return { ok: false, reason: 'configure_failed', error: err };
    }
  })();

  configurePromise = pending;
  // SYNC — same turn as IIFE start; joiners only appear after this line's turn yields.
  iapDebugLog('[RevenueCat] configurePromise stored — joiners may attach now', { gen });

  return configurePromise;
}

/**
 * Ensure SDK is configured (and optionally logged in) before purchase/offerings.
 */
export async function ensureRevenueCatReady(appUserId) {
  iapDebugLog('[RevenueCat] ensureRevenueCatReady enter', {
    hasAppUserId: Boolean(appUserId && String(appUserId).trim()),
    alreadyConfigured: configured,
    hasInFlight: Boolean(configurePromise),
  });

  try {
    const result = await withTimeout(
      (async () => {
        const cfg = await configureRevenueCat(appUserId);
        if (!configured) {
          const detail =
            lastConfigureError instanceof Error
              ? lastConfigureError.message
              : cfg?.reason || 'not_configured';
          throw new Error(`RevenueCat is not ready (${detail})`);
        }
        if (typeof appUserId === 'string' && appUserId.trim()) {
          try {
            iapDebugLog('[RevenueCat] ensureReady logIn start');
            await withTimeout(
              revenueCatLogIn(appUserId.trim()),
              CONFIGURE_TIMEOUT_MS,
              'ensureReady logIn'
            );
            iapDebugLog('[RevenueCat] ensureReady logIn ✓');
          } catch (err) {
            // Purchase can still proceed; attribution may be anonymous until logIn succeeds.
            logErr('[RevenueCat] ensureReady logIn failed (continuing):', err);
          }
        }
        return { ok: true };
      })(),
      ENSURE_READY_TIMEOUT_MS,
      'ensureRevenueCatReady'
    );
    iapDebugLog('[RevenueCat] ensureRevenueCatReady exit ✓');
    return result;
  } catch (err) {
    logErr('[RevenueCat] ensureRevenueCatReady failed:', err);
    throw err;
  }
}

export async function revenueCatLogIn(supabaseUserId) {
  if (!supabaseUserId || !isIosNativeApp()) return;
  try {
    await configureRevenueCat(supabaseUserId);
    if (!configured) return;
    const Purchases = await getPurchases();
    console.log('[RevenueCat] logIn → native');
    await withTimeout(
      Purchases.logIn({ appUserID: String(supabaseUserId) }),
      CONFIGURE_TIMEOUT_MS,
      'Purchases.logIn'
    );
    console.log('[RevenueCat] logIn ✓');
  } catch (err) {
    logErr('[RevenueCat] logIn failed:', err);
  }
}

export async function revenueCatLogOut() {
  if (!isIosNativeApp() || !configured) return;
  try {
    const Purchases = await getPurchases();
    await Purchases.logOut();
  } catch (err) {
    logErr('[RevenueCat] logOut failed:', err);
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
  console.log('[RevenueCat] getOfferingPackages start', { offeringId });
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
    logErr('[RevenueCat] getOfferings failed:', err);
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
  console.log('[RevenueCat] findPackageForPlan start', {
    planId,
    billingCycle,
    editionPreference,
  });
  const offeringId = offeringIdForEdition(
    planId?.includes('islamic') ? 'islamic' : editionPreference
  );
  const { packages, error } = await getOfferingPackages(offeringId);
  if (error) {
    console.error('[RevenueCat] findPackageForPlan offerings error:', error);
    return { pkg: null, error, packages: packages || [] };
  }

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
  console.log('[RevenueCat] purchasePackage enter');
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
  try {
    const result = await withTimeout(
      Purchases.purchasePackage({ aPackage }),
      PURCHASE_BRIDGE_TIMEOUT_MS,
      'Purchases.purchasePackage'
    );
    console.log('[RevenueCat] purchasePackage ✓');
    return result;
  } catch (err) {
    logErr('[RevenueCat] purchasePackage failed:', err);
    throw err;
  }
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
