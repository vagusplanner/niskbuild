import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';

/**
 * Hook that fetches public holidays for a given country + year
 * and returns them as pseudo-event objects for the calendar.
 */
export function usePublicHolidays(countryCode, year, enabled) {
  return useQuery({
    queryKey: ['publicHolidays', countryCode, year],
    queryFn: async () => {
      if (!countryCode || !enabled) return [];
      const { data } = await SDK.functions.invoke('fetchPublicHolidays', { countryCode, year });
      return (data?.holidays || []).map(h => ({
        id: `holiday-${h.date}-${h.countryCode}`,
        title: h.name,
        start_date: h.date + 'T00:00:00',
        end_date: h.date + 'T23:59:59',
        is_all_day: true,
        category: 'holiday',
        color: '#ef4444',
        isPublicHoliday: true,
        localName: h.localName,
      }));
    },
    enabled: !!enabled && !!countryCode,
    staleTime: 1000 * 60 * 60 * 24, // cache 24h
  });
}