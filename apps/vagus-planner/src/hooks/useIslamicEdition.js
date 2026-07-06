import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

function readLocalEdition() {
  try {
    const stored = localStorage.getItem('vagus_edition');
    if (stored === 'islamic' || stored === 'standard') return stored;
    if (localStorage.getItem('vagus_islamic_mode') === '1') return 'islamic';
  } catch {
    // ignore
  }
  return null;
}

function resolveEditionFromRecord(userSettings) {
  if (!userSettings) return 'standard';
  if (userSettings.edition === 'islamic' || userSettings.edition === 'standard') {
    return userSettings.edition;
  }
  const prefs = userSettings.preferences;
  if (prefs && typeof prefs === 'object' && (prefs.edition === 'islamic' || prefs.edition === 'standard')) {
    return prefs.edition;
  }
  if (userSettings.islamic_mode === true) return 'islamic';
  return 'standard';
}

/**
 * Edition for nav/UI. Local Account toggle (vagus_edition) wins over a stale
 * server "standard" so the Islam tab does not vanish when settings sync lags.
 */
function resolveEdition(userSettings) {
  const localEdition = readLocalEdition();
  const serverEdition = resolveEditionFromRecord(userSettings);

  if (localEdition === 'islamic' && serverEdition === 'standard') {
    return 'islamic';
  }
  if (localEdition === 'standard' && serverEdition === 'islamic') {
    return 'standard';
  }
  if (serverEdition === 'islamic' || serverEdition === 'standard') {
    return serverEdition;
  }
  return localEdition === 'islamic' ? 'islamic' : 'standard';
}

/**
 * Returns whether the current user has Islamic Edition enabled.
 * Checks edition field, islamic_mode flag, and Islamic subscription plans.
 */
export function useIslamicEdition() {
  const { data, isLoading, error } = useQuery({
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
    staleTime: 30000
  });

  if (!data || data.length === 0) {
    const localEdition = readLocalEdition() ?? 'standard';
    return {
      isIslamicEdition: localEdition === 'islamic',
      edition: localEdition,
      isLoading,
      userSettings: null,
      islamicMode: localEdition === 'islamic',
      error: error ?? null,
    };
  }

  const userSettings = data[0];

  const islamicPlans = [
    'basic islamic', 'pro islamic', 'enterprise islamic',
    'basic_islamic', 'pro_islamic', 'enterprise_islamic',
  ];

  const planName = (userSettings?.subscription_plan || '').toLowerCase().trim();
  const hasIslamicPlan = islamicPlans.some(p => planName.includes(p.replace('_', ' ')) || planName === p);
  const edition = resolveEdition(userSettings);
  const isIslamicEdition = hasIslamicPlan || edition === 'islamic';
  const islamicMode = edition === 'islamic';

  return { isIslamicEdition, edition, isLoading, userSettings, islamicMode, error: error ?? null };
}
