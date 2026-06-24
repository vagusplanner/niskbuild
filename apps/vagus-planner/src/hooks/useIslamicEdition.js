import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

function resolveEdition(userSettings) {
  if (!userSettings) return 'standard';
  if (userSettings.edition === 'islamic' || userSettings.edition === 'standard') {
    return userSettings.edition;
  }
  const prefs = userSettings.preferences;
  if (prefs && typeof prefs === 'object' && (prefs.edition === 'islamic' || prefs.edition === 'standard')) {
    return prefs.edition;
  }
  if (userSettings.islamic_mode === true) return 'islamic';
  try {
    const localEdition = localStorage.getItem('vagus_edition');
    if (localEdition === 'islamic' || localEdition === 'standard') return localEdition;
  } catch {
    // ignore
  }
  return 'standard';
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
    let localEdition = 'standard';
    try {
      if (localStorage.getItem('vagus_edition') === 'islamic') localEdition = 'islamic';
      else if (localStorage.getItem('vagus_islamic_mode') === '1') localEdition = 'islamic';
    } catch {
      // ignore
    }
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
