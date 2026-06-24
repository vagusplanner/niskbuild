import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sunrise, Loader2, MapPin, CheckCircle2, Clock, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { format } from 'date-fns';

const PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_ICONS = { Fajr: '🌙', Sunrise: '🌅', Dhuhr: '☀️', Asr: '🌤', Maghrib: '🌇', Isha: '🌃' };

function to12h(time24) {
  if (!time24) return '--:--';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getNextPrayer(times) {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  for (const p of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) {
    if (!times[p]) continue;
    const [h, m] = times[p].split(':').map(Number);
    if (h * 60 + m > nowMins) return p;
  }
  return 'Fajr'; // next day
}

export default function PrayerTimesWidget() {
  const [coords, setCoords] = useState(() => {
    try {
      const saved = localStorage.getItem('prayerTimesCoords');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [cityName, setCityName] = useState(() => localStorage.getItem('prayerTimesCity') || '');
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState(2); // ISNA default

  // Fetch settings to get saved location
  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list(),
  });

  useEffect(() => {
    if (settings[0]?.latitude && !coords) {
      setCoords({ lat: settings[0].latitude, lng: settings[0].longitude });
      setCityName(settings[0].location_city || '');
    }
  }, [settings]);

  const { data: prayerTimes, isLoading: timesLoading } = useQuery({
    queryKey: ['prayerTimesWidget', coords?.lat, coords?.lng, method],
    enabled: !!coords,
    queryFn: async () => {
      const today = format(new Date(), 'dd-MM-yyyy');
      const res = await fetch(
        `https://api.aladhan.com/v1/timings/${today}?latitude=${coords.lat}&longitude=${coords.lng}&method=${method}`
      );
      const json = await res.json();
      return json.data?.timings;
    },
    staleTime: 1000 * 60 * 60, // 1h
  });

  const getLocation = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        setCoords({ lat: latitude, lng: longitude });
        localStorage.setItem('prayerTimesCoords', JSON.stringify({ lat: latitude, lng: longitude }));
        // Reverse geocode for city name
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || '';
          setCityName(city);
          localStorage.setItem('prayerTimesCity', city);
        } catch {}
        setLoading(false);
        toast.success('Location set');
      },
      () => { toast.error('Could not get location'); setLoading(false); },
      { timeout: 10000 }
    );
  };

  const nextPrayer = prayerTimes ? getNextPrayer(prayerTimes) : null;

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-xl">
              <Sunrise className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 dark:text-amber-100">Prayer Times</h3>
              {cityName && <p className="text-xs text-amber-600/70 dark:text-amber-400/70">{cityName} · Today</p>}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={getLocation} disabled={loading}
            className="text-xs text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 h-8">
            {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <MapPin className="w-3 h-3 mr-1" />}
            {coords ? 'Update' : 'Set Location'}
          </Button>
        </div>

        {!coords ? (
          <div className="text-center py-6 space-y-3">
            <MapPin className="w-12 h-12 text-amber-400 mx-auto" />
            <p className="text-sm text-amber-700 dark:text-amber-300">Enable location to see today's prayer times</p>
            <Button onClick={getLocation} disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
              {loading ? 'Locating…' : 'Use My Location'}
            </Button>
          </div>
        ) : timesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : prayerTimes ? (
          <div className="space-y-2">
            {PRAYERS.map(prayer => {
              const isNext = prayer === nextPrayer;
              const time = prayerTimes[prayer];
              return (
                <div key={prayer}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${
                    isNext
                      ? 'bg-amber-500 dark:bg-amber-600 shadow-md'
                      : 'bg-white/50 dark:bg-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{PRAYER_ICONS[prayer]}</span>
                    <span className={`text-sm font-semibold ${isNext ? 'text-white' : 'text-amber-900 dark:text-amber-100'}`}>
                      {prayer}
                    </span>
                    {isNext && (
                      <span className="text-[10px] font-bold text-white/80 bg-white/20 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                        Next
                      </span>
                    )}
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${isNext ? 'text-white' : 'text-amber-700 dark:text-amber-300'}`}>
                    {to12h(time)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-sm text-amber-600 py-4">Could not load prayer times. Try again.</p>
        )}
      </div>
    </Card>
  );
}