/**
 * Reproduces the Calendar → Account Islam-nav regression without a browser.
 *
 * Failure mode we saw in production:
 * 1. Shared React Query key ['userSettings'] is populated with real settings.
 * 2. Calendar remounts Layout + a page-level userSettings observer (staleTime 0)
 *    whose queryFn catches errors and returns [].
 * 3. Empty [] overwrites the shared cache → edition falls back to 'standard'
 *    → islamicMode becomes false → sticky session flags get rewritten to '0'.
 * 4. Account later refetches successfully → Islam reappears.
 *
 * Also covers the dual-gate bug: Layout main nav used sticky forNav while
 * SidebarTools still filtered on raw islamicMode.
 *
 * Run: node scripts/verify-islam-nav-flicker.mjs
 */

import assert from 'node:assert/strict';

const NAV_ISLAMIC_MODE_KEY = 'vp_nav_islamic_mode';
const NAV_ISLAMIC_PAID_KEY = 'vp_nav_islamic_paid';

function makeSession() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    _store: store,
  };
}

function readSticky(session, key) {
  return session.getItem(key) === '1';
}

function writeSticky(session, key, value) {
  session.setItem(key, value ? '1' : '0');
}

function resolveEditionPreference(userSettings, localEdition = null) {
  if (userSettings?.edition === 'islamic' || userSettings?.edition === 'standard') {
    return userSettings.edition;
  }
  if (userSettings?.islamic_mode === true) return 'islamic';
  return localEdition === 'islamic' ? 'islamic' : 'standard';
}

/** Broken sticky logic from the first "fix" (still wrong when cache is poisoned). */
function computeNavBrokenSticky(opts) {
  const {
    settingsList,
    access,
    isLoading,
    session,
  } = opts;
  const userSettings = settingsList?.[0] ?? null;
  const hasPaid = access?.hasPaidIslamicAccess === true;
  const edition = hasPaid ? resolveEditionPreference(userSettings, null) : 'standard';
  const islamicMode = hasPaid && edition === 'islamic';

  if (!isLoading) {
    writeSticky(session, NAV_ISLAMIC_PAID_KEY, hasPaid);
    writeSticky(session, NAV_ISLAMIC_MODE_KEY, islamicMode);
  }

  const stickyPaid = readSticky(session, NAV_ISLAMIC_PAID_KEY);
  const stickyMode = readSticky(session, NAV_ISLAMIC_MODE_KEY);
  const islamicModeForNav = isLoading ? stickyPaid && stickyMode : islamicMode;
  const sidebarToolsVisible = islamicMode; // Layout still passed raw islamicMode

  return { islamicMode, islamicModeForNav, sidebarToolsVisible, mainNavVisible: islamicModeForNav };
}

/** Fixed logic: keep sticky across empty/error settings; use forNav everywhere. */
function computeNavFixed(opts) {
  const {
    settingsList,
    access,
    settingsPending,
    accessPending,
    session,
  } = opts;

  const settingsUndefined = settingsList === undefined;
  const settingsEmpty = Array.isArray(settingsList) && settingsList.length === 0;
  const accessUndefined = access === undefined;

  const isInitialLoading =
    (settingsPending && settingsUndefined) || (accessPending && accessUndefined);

  const userSettings = settingsList?.[0] ?? null;
  const hasPaid = access?.hasPaidIslamicAccess === true;
  const edition = hasPaid ? resolveEditionPreference(userSettings, null) : 'standard';
  const islamicMode = hasPaid && edition === 'islamic';

  const settingsTrustworthy = Array.isArray(settingsList) && settingsList.length > 0;
  const accessTrustworthy = access !== undefined && !accessPending;

  // Only persist sticky when we have real entitlement + settings — never poison with [].
  if (!isInitialLoading && accessTrustworthy && settingsTrustworthy) {
    writeSticky(session, NAV_ISLAMIC_PAID_KEY, hasPaid);
    writeSticky(session, NAV_ISLAMIC_MODE_KEY, islamicMode);
  }

  const stickyPaid = readSticky(session, NAV_ISLAMIC_PAID_KEY);
  const stickyMode = readSticky(session, NAV_ISLAMIC_MODE_KEY);
  const useSticky =
    isInitialLoading || settingsUndefined || settingsEmpty || accessUndefined;

  const islamicModeForNav = useSticky ? stickyPaid && stickyMode : islamicMode;
  // SidebarTools must use the same gate as main nav.
  const sidebarToolsVisible = islamicModeForNav;

  return { islamicMode, islamicModeForNav, sidebarToolsVisible, mainNavVisible: islamicModeForNav };
}

function simulateCalendarPoison(compute) {
  const session = makeSession();
  const access = { hasPaidIslamicAccess: true };
  const goodSettings = [{ id: '1', edition: 'islamic', islamic_mode: true }];

  // Account settled
  let state = compute({
    settingsList: goodSettings,
    access,
    isLoading: false,
    settingsPending: false,
    accessPending: false,
    session,
  });
  assert.equal(state.mainNavVisible, true, 'Account: main nav Islam visible');
  assert.equal(state.sidebarToolsVisible, true, 'Account: SidebarTools Islam visible');

  // Navigate to Calendar: Layout remount + Calendar queryFn catch → []
  state = compute({
    settingsList: [], // poisoned shared cache
    access,
    isLoading: false, // not "loading" — empty array is a successful query result
    settingsPending: false,
    accessPending: false,
    session,
  });

  return { state, session };
}

console.log('--- Broken sticky (first fix) vs Calendar cache poison ---');
{
  const { state } = simulateCalendarPoison(computeNavBrokenSticky);
  assert.equal(state.islamicMode, false, 'poison makes islamicMode false');
  assert.equal(
    state.mainNavVisible,
    false,
    'BROKEN: main nav hides Islam after [] poison (sticky rewritten to 0)',
  );
  assert.equal(
    state.sidebarToolsVisible,
    false,
    'BROKEN: SidebarTools also hides (raw islamicMode)',
  );
  console.log('Reproduced: Calendar poison hides Islam even with sessionStorage sticky.');
}

console.log('--- Fixed sticky + shared forNav gate ---');
{
  const { state, session } = simulateCalendarPoison(computeNavFixed);
  assert.equal(state.islamicMode, false, 'raw islamicMode still false while settings empty');
  assert.equal(state.mainNavVisible, true, 'FIXED: main nav keeps Islam via sticky');
  assert.equal(state.sidebarToolsVisible, true, 'FIXED: SidebarTools uses forNav');
  assert.equal(session.getItem(NAV_ISLAMIC_MODE_KEY), '1', 'sticky not poisoned');
  console.log('Verified: empty settings no longer clear Islam nav.');
}

console.log('--- Dual-gate: loading with sticky, forNav vs raw ---');
{
  const session = makeSession();
  writeSticky(session, NAV_ISLAMIC_PAID_KEY, true);
  writeSticky(session, NAV_ISLAMIC_MODE_KEY, true);
  const broken = computeNavBrokenSticky({
    settingsList: undefined,
    access: undefined,
    isLoading: true,
    session,
  });
  assert.equal(broken.mainNavVisible, true);
  assert.equal(broken.sidebarToolsVisible, false, 'BROKEN dual-gate: tools hide during load');

  const fixed = computeNavFixed({
    settingsList: undefined,
    access: undefined,
    settingsPending: true,
    accessPending: true,
    session,
  });
  assert.equal(fixed.mainNavVisible, true);
  assert.equal(fixed.sidebarToolsVisible, true, 'FIXED dual-gate');
  console.log('Verified: SidebarTools and main nav stay in sync during remount load.');
}

console.log('\nALL CHECKS PASSED');
