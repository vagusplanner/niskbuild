import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Returns whether the current user has an active Islamic Edition plan.
 * Checks both subscription_plan string AND islamic_mode flag.
 */
export function useIslamicEdition() {
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list(),
    staleTime: 30000
  });

  const userSettings = settings[0];

  const islamicPlans = [
    'basic islamic', 'pro islamic', 'enterprise islamic',
    'basic_islamic', 'pro_islamic', 'enterprise_islamic',
  ];

  const planName = (userSettings?.subscription_plan || '').toLowerCase().trim();
  const hasIslamicPlan = islamicPlans.some(p => planName.includes(p.replace('_', ' ')) || planName === p);
  const islamicModeEnabled = userSettings?.islamic_mode === true;

  // Islamic Edition requires an actual Islamic plan subscription
  // islamic_mode toggle alone (without a plan) does NOT grant Islamic Edition access
  const isIslamicEdition = hasIslamicPlan;

  // islamicMode is the UI toggle (shows prayer widgets etc) — only meaningful when user has Islamic plan
  const islamicMode = isIslamicEdition && islamicModeEnabled;

  return { isIslamicEdition, isLoading, userSettings, islamicMode };
}