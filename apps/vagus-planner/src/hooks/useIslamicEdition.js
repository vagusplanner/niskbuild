import { useQuery } from '@tanstack/react-query';
import { base44, getVpApiFetchHeaders } from '@/api/base44Client';

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

  const isLoading = settingsQuery.isLoading || accessQuery.isLoading;
  const userSettings = settingsQuery.data?.[0] ?? null;
  const hasPaidIslamicAccess =
    accessQuery.data?.hasPaidIslamicAccess === true ||
    accessQuery.data?.platformOwnerBypass === true;

  const editionPreference = resolveEditionPreference(userSettings);
  // Preference only applies when entitled — otherwise force standard for UI.
  const edition = hasPaidIslamicAccess ? editionPreference : 'standard';
  /** User has Islamic Edition entitlement (paid plan or platform-owner bypass). */
  const isIslamicEdition = hasPaidIslamicAccess;
  /** Active Islamic UI mode — entitlement AND user chose Islamic edition in settings. */
  const islamicMode = hasPaidIslamicAccess && edition === 'islamic';

  return {
    isIslamicEdition,
    hasPaidIslamicAccess,
    edition,
    editionPreference,
    isLoading,
    userSettings,
    islamicMode,
    subscriptionPlan: accessQuery.data?.plan ?? null,
    subscriptionStatus: accessQuery.data?.status ?? null,
    accessSource: accessQuery.data?.source ?? null,
    platformOwnerBypass: accessQuery.data?.platformOwnerBypass === true,
    error: accessQuery.error ?? settingsQuery.error ?? null,
  };
}
