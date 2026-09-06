import { useEffect } from 'react';
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

function writeStickyFlag(key, value) {
  try {
    sessionStorage.setItem(key, value ? '1' : '0');
  } catch {
    // ignore
  }
}

function resolveEditionPreference(userSettings) {
  if (userSettings?.edition === 'islamic' || userSettings?.edition === 'standard') {
    return userSettings.edition;
  }
  const prefs = userSettings?.preferences;
  if (prefs && typeof prefs === 'object' && (prefs.edition === 'islamic' || prefs.edition === 'standard')) {
    return prefs.edition;
  }
  if (userSettings?.islamic_mode === true) return 'islamic';
  const local = readLocalEditionPreference();
  return local === 'islamic' ? 'islamic' : 'standard';
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
 * Islamic Edition entitlement.
 *
 * Paid access is ONLY granted via server-verified subscription
 * (GET /api/vagus-planner/islamic-access). localStorage / edition preference
 * never unlocks Islamic Edition features by themselves — they only choose UI
 * mode for users who already have paid access.
 *
 * Nav uses sticky session flags so Layout remounts on route change don't briefly
 * hide the Islam item while islamic-access / settings re-subscribe.
 */
export function useIslamicEdition() {
  const settingsQuery = useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      try {
        const list = await base44.entities.UserSettings.list();
        return list ?? [];
      } catch (err) {
        console.error('Error fetching user settings:', err);
        return [];
      }
    },
    staleTime: 30000,
  });

  const accessQuery = useQuery({
    queryKey: ['islamicAccess'],
    queryFn: fetchIslamicAccess,
    staleTime: 30000,
    retry: 1,
  });

  // Only "loading" when we have nothing cached yet — background refetch must not hide nav.
  const isLoading =
    (settingsQuery.isPending && settingsQuery.data === undefined) ||
    (accessQuery.isPending && accessQuery.data === undefined);

  const userSettings = settingsQuery.data?.[0] ?? null;
  const hasPaidIslamicAccess =
    accessQuery.data?.hasPaidIslamicAccess === true ||
    accessQuery.data?.platformOwnerBypass === true;

  const editionPreference = resolveEditionPreference(userSettings);
  const edition = hasPaidIslamicAccess ? editionPreference : 'standard';
  const isIslamicEdition = hasPaidIslamicAccess;
  const islamicMode = hasPaidIslamicAccess && edition === 'islamic';

  useEffect(() => {
    if (isLoading) return;
    writeStickyFlag(NAV_ISLAMIC_PAID_KEY, hasPaidIslamicAccess);
    writeStickyFlag(NAV_ISLAMIC_MODE_KEY, islamicMode);
  }, [isLoading, hasPaidIslamicAccess, islamicMode]);

  const stickyPaid = readStickyFlag(NAV_ISLAMIC_PAID_KEY);
  const stickyMode = readStickyFlag(NAV_ISLAMIC_MODE_KEY);
  // While entitlement re-fetches on Layout remount, keep last-known nav visibility.
  const islamicModeForNav = isLoading ? stickyPaid && stickyMode : islamicMode;
  const islamicEditionLoading = isLoading && !(stickyPaid && stickyMode);

  return {
    isIslamicEdition,
    hasPaidIslamicAccess,
    edition,
    editionPreference,
    isLoading: islamicEditionLoading,
    userSettings,
    islamicMode,
    /** Prefer this for sidebar / mobile tab visibility (anti-flicker). */
    islamicModeForNav,
    subscriptionPlan: accessQuery.data?.plan ?? null,
    subscriptionStatus: accessQuery.data?.status ?? null,
    accessSource: accessQuery.data?.source ?? null,
    platformOwnerBypass: accessQuery.data?.platformOwnerBypass === true,
    error: accessQuery.error ?? settingsQuery.error ?? null,
  };
}
