import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, MapPin, Moon, AlertCircle, CheckCircle2, Loader2, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { toast } from 'sonner';

const QASR_PRAYERS = ['Dhuhr', 'Asr', 'Isha']; // prayers shortened during travel

export default function IslamicTravelMode() {
  const [destinationTimes, setDestinationTimes] = useState(null);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const queryClient = useQueryClient();

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => SDK.entities.Holiday.list('-start_date', 10),
    staleTime: 60000,
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list(),
    staleTime: 60000,
  });

  const today = new Date();
  const activeTrip = holidays.find(h => {
    if (!h.start_date || !h.end_date) return false;
    try {
      return isWithinInterval(today, { start: parseISO(h.start_date), end: parseISO(h.end_date) }) &&
        h.status !== 'cancelled';
    } catch { return false; }
  });

  const daysUntilTrip = holidays
    .filter(h => h.start_date && new Date(h.start_date) > today && h.status !== 'cancelled')
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];

  const isInTravelMode = !!activeTrip;

  const fetchDestinationPrayerTimes = async (destination) => {
    if (!destination) return;
    setLoadingTimes(true);
    try {
      const result = await SDK.functions.invoke('fetchPrayerTimes', {
        city: destination,
        country: '',
        method: settings[0]?.prayer_method || 'MWL',
      });
      if (result?.data?.timings) {
        setDestinationTimes({ city: destination, timings: result.data.timings });
      }
    } catch (_) {
      // If function fails, show placeholder
      setDestinationTimes({ city: destination, timings: null, error: true });
    }
    setLoadingTimes(false);
  };

  useEffect(() => {
    if (activeTrip?.destination && !destinationTimes) {
      fetchDestinationPrayerTimes(activeTrip.destination);
    }
  }, [activeTrip]);

  const openMosqueFinder = () => {
    const query = activeTrip?.destination || 'mosque near me';
    window.open(`https://www.google.com/maps/search/mosque+near+${encodeURIComponent(query)}`, '_blank');
  };

  if (!isInTravelMode && !daysUntilTrip) {
    return (
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 text-center">
        <Plane className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500 dark:text-slate-400">No upcoming trips found.</p>
        <p className="text-xs text-slate-400 mt-1">Add a trip in the Travel module to enable Islamic Travel Mode.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Travel Mode Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-4 ${
          isInTravelMode
            ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg'
            : 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800'
        }`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isInTravelMode ? 'bg-white/20' : 'bg-amber-100 dark:bg-amber-900/40'}`}>
            <Plane className={`w-5 h-5 ${isInTravelMode ? 'text-white' : 'text-amber-600'}`} />
          </div>
          <div>
            <p className={`text-sm font-bold ${isInTravelMode ? 'text-white' : 'text-amber-800 dark:text-amber-300'}`}>
              {isInTravelMode ? '✈️ Islamic Travel Mode Active' : '📅 Upcoming Trip'}
            </p>
            <p className={`text-xs ${isInTravelMode ? 'text-sky-100' : 'text-amber-600 dark:text-amber-500'}`}>
              {isInTravelMode
                ? `${activeTrip.destination} · ${format(parseISO(activeTrip.start_date), 'MMM d')} – ${format(parseISO(activeTrip.end_date), 'MMM d')}`
                : `${daysUntilTrip.destination} · starts ${format(parseISO(daysUntilTrip.start_date), 'MMM d')}`
              }
            </p>
          </div>
        </div>

        {isInTravelMode && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-white/15 rounded-xl p-3">
              <p className="text-xs font-bold text-sky-100 mb-1">🕌 Qasr Prayer</p>
              <p className="text-xs text-white/80">Dhuhr, Asr & Isha shortened to 2 rakaat each</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3">
              <p className="text-xs font-bold text-sky-100 mb-1">🤝 Combining Prayers</p>
              <p className="text-xs text-white/80">Dhuhr+Asr and Maghrib+Isha may be combined</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Destination Prayer Times */}
      {isInTravelMode && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-500" />
              Prayer Times in {activeTrip?.destination || 'Destination'}
            </p>
            <button
              onClick={() => fetchDestinationPrayerTimes(activeTrip?.destination)}
              className="text-xs text-blue-500 hover:underline"
            >
              Refresh
            </button>
          </div>

          {loadingTimes ? (
            <div className="flex items-center justify-center py-4 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-sm text-slate-500">Fetching prayer times…</span>
            </div>
          ) : destinationTimes?.timings ? (
            <div className="space-y-2">
              {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(prayer => {
                const time = destinationTimes.timings[prayer];
                const isQasr = QASR_PRAYERS.includes(prayer);
                return (
                  <div key={prayer} className="flex items-center gap-3 py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex-1">{prayer}</span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">{time?.substring(0, 5)}</span>
                    {isQasr && (
                      <span className="text-[10px] bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 px-2 py-0.5 rounded-full font-semibold">
                        Qasr
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-3">Prayer times unavailable for this destination</p>
          )}
        </div>
      )}

      {/* Qasr Guide */}
      {isInTravelMode && (
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4">
          <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-2">📖 Traveller (Musafir) Rulings</p>
          <ul className="space-y-1.5">
            {[
              'Travel distance ≥ 48 miles (77km) qualifies for Qasr',
              'Shorten Dhuhr, Asr, Isha from 4 to 2 rakaat',
              'Fajr (2) and Maghrib (3) remain unchanged',
              'May combine Dhuhr+Asr, and Maghrib+Isha',
              'Qasr applies until you intend to stay 4+ days',
              'Friday Jumu\'ah: join the congregation if available'
            ].map((rule, i) => (
              <li key={i} className="text-xs text-blue-700 dark:text-blue-400 flex items-start gap-1.5">
                <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-500" />
                {rule}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Mosque Finder */}
      {isInTravelMode && (
        <Button
          onClick={openMosqueFinder}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
        >
          <Navigation className="w-4 h-4" />
          Find Mosques Near {activeTrip?.destination}
        </Button>
      )}
    </div>
  );
}