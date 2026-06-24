export function useIslamicEdition() {
  return {
    data: {
      prayerTimes: {
        fajr: '5:30 AM',
        dhuhr: '12:30 PM',
        asr: '3:45 PM',
        maghrib: '6:30 PM',
        isha: '8:00 PM',
      },
      hijriDate: '15 Ramadan 1446',
      currentMonth: 'Ramadan',
      isIslamicMode: true,
    },
    isLoading: false,
    error: null,
  };
}

export default useIslamicEdition;
