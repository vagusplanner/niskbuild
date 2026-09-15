import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44, getVpApiFetchHeaders } from '@/api/base44Client';

const NAV_ISLAMIC_MODE_KEY = 'vp_nav_islamic_mode';
const NAV_ISLAMIC_PAID_KEY = 'vp_nav_islamic_paid';

function readLocalEditionPreference() {
  try {
    const stored = localStorage.getItem('vagus_edition');
    if (stored === 'islamic' || stored === 'standard') return stored;
    if (localStorage.getItem('vagus_islamic_mode') === '1') return 'islamic';
  } catch {
    // ignore
  }
  return null;
}

function readStickyFlag(key) {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function hasStickyKey(key) {
  try {
    const v = sessionStorage.getItem(key);
    return v === '0' || v === '1';
  } catch {
    return false;
  }
}

function writeStickyFlag(key, value) {
  try {
    sessionStorage.setItem(key, value ? '1' : '0');
  } catch {
    // ignore
  }
}

/** Immediate sticky update for explicit user actions (Account edition toggle). */
export function persistIslamicEditionSticky({ paid, mode }) {
  writeStickyFlag(NAV_ISLAMIC_PAID_KEY, !!paid);
  writeStickyFlag(NAV_ISLAMIC_MODE_KEY, !!mode);
}

/**
 * Resolve edition preference with an explicit source tag.
 * `default` means we inferred Standard with no user/DB signal — never persist that
 * back into sticky (that was the remount race that flipped Islamic → Standard).
 */
function resolveEditionPreferenceDetailed(userSettings) {
  if (userSettings?.edition === 'islamic' || userSettings?.edition === 'standard') {
    return { edition: userSettings.edition, source: 'edition' };
  }
  const prefs = userSettings?.preferences;
  if (prefs && typeof prefs === 'object' && (prefs.edition === 'islamic' || prefs.edition === 'standard')) {
    return { edition: prefs.edition, source: 'preferences' };
  }
  if (userSettings?.islamic_mode === true) {
    return { edition: 'islamic', source: 'islamic_mode' };
  }
  if (userSettings?.islamic_mode === false) {
    return { edition: 'standard', source: 'islamic_mode' };
  }
  const local = readLocalEditionPreference();
  if (local === 'islamic' || local === 'standard') {
    return { edition: local, source: 'local' };
  }
  return { edition: 'standard', source: 'default' };
}

async function fetchIslamicAccess() {
  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const res = await fetch(`${apiBase}/api/vagus-planner/islamic-access`, {
    credentials: 'include',
    headers: await getVpApiFetchHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Could not verify Islamic Edition access');
  }
  return res.json();
}

/**
 * Islamic Edition entitlement + stable UI mode.
 *
 * Paid access is ONLY granted via server-verified subscription
 * (GET /api/vagus-planner/islamic-access). localStorage / edition preference
 * never unlocks Islamic Edition features by themselves — they only choose UI
 * mode for users who already have paid access.
 *
 * UI/nav MUST use `islamicMode` / `islamicModeForNav` (same value). These are
 * sticky-protected so route changes never flicker or permanently flip to Standard.
 * Use `islamicModeLive` only when you intentionally need the raw unresolved live value.
 */
export function useIslamicEdition() {
  const settingsQuery = useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      // Re-throw so React Query keeps previous data instead of caching [].
      const list = await base44.entities.UserSettings.list();
      return list ?? [];
    },
    staleTime: 30000,
  });

  const accessQuery = useQuery({
    queryKey: ['islamicAccess'],
    queryFn: fetchIslamicAccess,
    staleTime: 30000,
    retry: 1,
  });

  const settingsList = settingsQuery.data;
  const settingsTrustworthy = Array.isArray(settingsList) && settingsList.length > 0;
  const accessTrustworthy =
    accessQuery.data !== undefined && !accessQuery.isPending && !accessQuery.isFetching;

  // Only "loading" when we have nothing cached yet — background refetch must not hide nav.
  const isInitialLoading =
    (settingsQuery.isPending && settingsQuery.data === undefined) ||
    (accessQuery.isPending && accessQuery.data === undefined);

  const userSettings = settingsList?.[0] ?? null;
  const hasPaidIslamicAccess =
    accessQuery.data?.hasPaidIslamicAccess === true ||
    accessQuery.data?.platformOwnerBypass === true;

  const { edition: editionPreference, source: editionSource } =
    resolveEditionPreferenceDetailed(userSettings);
  const edition = hasPaidIslamicAccess ? editionPreference : 'standard';
  const isIslamicEdition = hasPaidIslamicAccess;
  const islamicModeLive = hasPaidIslamicAccess && edition === 'islamic';

  // Require the same live mode on two consecutive settled renders before sticky write.
  const stableLiveRef = useRef({ mode: null, count: 0 });

  useEffect(() => {
    // Never persist sticky from empty/failed settings or mid-fetch races.
    if (isInitialLoading || !accessTrustworthy || !settingsTrustworthy) return;
    if (settingsQuery.isFetching || accessQuery.isFetching) return;
    // Inferred Standard with no DB/local signal must never clobber sticky Islamic.
    if (editionSource === 'default') return;

    const prev = stableLiveRef.current;
    if (prev.mode === islamicModeLive) {
      prev.count += 1;
    } else {
      prev.mode = islamicModeLive;
      prev.count = 1;
    }
    // First settled resolution can seed sticky Islamic; Standard requires 2 stable frames
    // so a remount race cannot permanently flip the user out of Islamic mode.
    if (islamicModeLive) {
      if (prev.count < 1) return;
    } else if (prev.count < 2) {
      return;
    }

    writeStickyFlag(NAV_ISLAMIC_PAID_KEY, hasPaidIslamicAccess);
    writeStickyFlag(NAV_ISLAMIC_MODE_KEY, islamicModeLive);
  }, [
    isInitialLoading,
    accessTrustworthy,
    settingsTrustworthy,
    settingsQuery.isFetching,
    accessQuery.isFetching,
    hasPaidIslamicAccess,
    islamicModeLive,
    editionSource,
  ]);

  const stickyPaid = readStickyFlag(NAV_ISLAMIC_PAID_KEY);
  const stickyMode = readStickyFlag(NAV_ISLAMIC_MODE_KEY);
  const stickyInitialized =
    hasStickyKey(NAV_ISLAMIC_MODE_KEY) && hasStickyKey(NAV_ISLAMIC_PAID_KEY);

  const dataUncertain =
    isInitialLoading ||
    settingsQuery.data === undefined ||
    !settingsTrustworthy ||
    accessQuery.data === undefined ||
    settingsQuery.isFetching ||
    accessQuery.isFetching;

  // Once sticky exists, always prefer it for UI — live only seeds the first session paint.
  const islamicModeForNav = stickyInitialized
    ? stickyPaid && stickyMode
    : dataUncertain
      ? false
      : islamicModeLive;

  // No edition-loading flicker once sticky is seeded; otherwise wait for settled data.
  const islamicEditionLoading = !stickyInitialized && dataUncertain;

  // islamicMode === islamicModeForNav so UI consumers cannot accidentally read the flaky live value.
  const islamicMode = islamicModeForNav;

  return {
    isIslamicEdition,
    hasPaidIslamicAccess,
    edition,
    editionPreference,
    isLoading: islamicEditionLoading,
    userSettings,
    /** Stable UI/nav edition mode (sticky-protected). Same as islamicModeForNav. */
    islamicMode,
    /** @deprecated Alias of islamicMode — kept for call sites already migrated to ForNav. */
    islamicModeForNav,
    /** Raw live resolution — may flicker on remount; do not use for UI/nav. */
    islamicModeLive,
    subscriptionPlan: accessQuery.data?.plan ?? null,
    subscriptionStatus: accessQuery.data?.status ?? null,
    accessSource: accessQuery.data?.source ?? null,
    platformOwnerBypass: accessQuery.data?.platformOwnerBypass === true,
    error: accessQuery.error ?? settingsQuery.error ?? null,
  };
}
