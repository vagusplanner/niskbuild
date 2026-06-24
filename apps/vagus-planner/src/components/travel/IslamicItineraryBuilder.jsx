/**
 * IslamicItineraryBuilder
 *
 * Shown after a trip is created. Fetches prayer times and halal restaurant
 * suggestions for the destination and lets the user insert them into the
 * daily calendar in one click.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Moon, Utensils, Calendar, Check, Loader2,
  ChevronDown, ChevronUp, MapPin, Sparkles, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { addDays, format, parseISO, differenceInDays } from 'date-fns';

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_EMOJIS = { Fajr: '🌅', Dhuhr: '☀️', Asr: '🌤️', Maghrib: '🌇', Isha: '🌙' };

// Fetch prayer times for a city/date from AlAdhan
async function fetchPrayerTimes(city, country, date) {
  const url = `https://api.aladhan.com/v1/timingsByCity/${date}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=2`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Prayer API error');
  const json = await res.json();
  return json.data?.timings || {};
}

// Parse city/country from a destination string
function parseDestination(dest) {
  const parts = dest.split(',').map(s => s.trim());
  return { city: parts[0] || dest, country: parts[1] || '' };
}

// Build trip days array between start and end dates (max 14)
function buildDays(startDate, endDate) {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const totalDays = Math.min(differenceInDays(end, start) + 1, 14);
  return Array.from({ length: totalDays }, (_, i) => {
    const date = addDays(start, i);
    return { date, dateStr: format(date, 'yyyy-MM-dd'), label: format(date, 'EEE, d MMM yyyy') };
  });
}

function PrayerRow({ prayer, time, added, onAdd, disabled }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-amber-100 dark:border-amber-900/30 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-base">{PRAYER_EMOJIS[prayer]}</span>
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{prayer}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-mono">{time}</p>
        </div>
      </div>
      <Button
        size="sm"
        variant={added ? 'ghost' : 'outline'}
        disabled={added || disabled}
        onClick={onAdd}
        className={cn(
          'h-7 text-xs px-2.5',
          added
            ? 'text-green-600 dark:text-green-400'
            : 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300'
        )}
      >
        {added ? <><Check className="w-3 h-3 mr-1" />Added</> : '+ Calendar'}
      </Button>
    </div>
  );
}

function HalalRestaurantRow({ restaurant, onAdd, added, disabled }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{restaurant.name}</p>
        <p className="text-xs text-slate-400 truncate">{restaurant.address || restaurant.vicinity || ''}</p>
        {restaurant.cuisine && (
          <Badge className="mt-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px]">
            {restaurant.cuisine}
          </Badge>
        )}
      </div>
      <Button
        size="sm"
        variant={added ? 'ghost' : 'outline'}
        disabled={added || disabled}
        onClick={onAdd}
        className={cn(
          'ml-2 flex-shrink-0 h-7 text-xs px-2.5',
          added
            ? 'text-green-600 dark:text-green-400'
            : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300'
        )}
      >
        {added ? <><Check className="w-3 h-3 mr-1" />Added</> : '+ Calendar'}
      </Button>
    </div>
  );
}

function DaySection({ day, destination, prayerTimings, halalRestaurants, addedSlots, onAddPrayer, onAddRestaurant }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-amber-200/60 dark:border-amber-900/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-50 to-emerald-50 dark:from-amber-950/20 dark:to-emerald-950/20 hover:from-amber-100 hover:to-emerald-100 dark:hover:from-amber-950/30 dark:hover:to-emerald-950/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {/* day number from dateStr */}
            {parseInt(day.dateStr.split('-')[2], 10)}
          </div>
          <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">{day.label}</p>
        </div>
        <div className="flex items-center gap-2">
          {Object.keys(addedSlots).filter(k => k.startsWith(day.dateStr)).length > 0 && (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-[10px]">
              {Object.keys(addedSlots).filter(k => k.startsWith(day.dateStr)).length} added
            </Badge>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Prayer Times */}
              {prayerTimings && (
                <div>
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Moon className="w-3 h-3" /> Prayer Times in {destination.city}
                  </p>
                  <div className="bg-amber-50/80 dark:bg-amber-950/20 rounded-xl px-3 py-1 border border-amber-200/50 dark:border-amber-900/30">
                    {PRAYER_NAMES.map(prayer => {
                      const time = prayerTimings[prayer];
                      if (!time) return null;
                      const key = `${day.dateStr}_prayer_${prayer}`;
                      return (
                        <PrayerRow
                          key={prayer}
                          prayer={prayer}
                          time={time}
                          added={!!addedSlots[key]}
                          onAdd={() => onAddPrayer(day, prayer, time)}
                          disabled={false}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Halal Restaurants */}
              {halalRestaurants?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Utensils className="w-3 h-3" /> Halal Restaurants Nearby
                  </p>
                  <div className="space-y-1.5">
                    {halalRestaurants.slice(0, 4).map((r, i) => {
                      const key = `${day.dateStr}_halal_${i}`;
                      return (
                        <HalalRestaurantRow
                          key={i}
                          restaurant={r}
                          added={!!addedSlots[key]}
                          onAdd={() => onAddRestaurant(day, r, i)}
                          disabled={false}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function IslamicItineraryBuilder({ holiday, onClose }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [prayerTimings, setPrayerTimings] = useState(null); // timings for day 1 (representative)
  const [halalData, setHalalData] = useState(null);
  const [addedSlots, setAddedSlots] = useState({});
  const [addingAll, setAddingAll] = useState(false);
  const [fetched, setFetched] = useState(false);

  const destination = parseDestination(holiday.destination || '');
  const days = buildDays(holiday.start_date, holiday.end_date);

  const handleFetch = async () => {
    if (!holiday.destination) { toast.error('No destination set for this trip'); return; }
    setLoading(true);
    setFetched(false);

    // Fetch prayer times for day 1
    const prayerPromise = fetchPrayerTimes(destination.city, destination.country, days[0]?.dateStr || holiday.start_date)
      .catch(() => null);

    // Fetch halal locations via backend function
    const halalPromise = base44.functions.invoke('getHalalAndPrayerLocations', { location: holiday.destination })
      .then(r => r.data)
      .catch(() => null);

    const [timings, halal] = await Promise.all([prayerPromise, halalPromise]);
    setPrayerTimings(timings);
    setHalalData(halal);
    setFetched(true);
    setLoading(false);
  };

  // Parse time string "HH:MM" into hours + minutes offset from midnight
  const parseTime = (timeStr) => {
    const [h, m] = (timeStr || '00:00').split(':').map(Number);
    return { h: h || 0, m: m || 0 };
  };

  const addPrayerToCalendar = async (day, prayer, time) => {
    const key = `${day.dateStr}_prayer_${prayer}`;
    if (addedSlots[key]) return;
    const { h, m } = parseTime(time);
    const startISO = `${day.dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    const endH = h + (prayer === 'Fajr' || prayer === 'Isha' ? 0 : 0);
    const endISO = `${day.dateStr}T${String(h).padStart(2, '0')}:${String(m + 15).padStart(2, '0').replace(/(\d{2})(\d{2})/, (_, hh, mm) => {
      const totalMins = parseInt(hh) * 60 + parseInt(mm);
      return `${String(Math.floor(totalMins / 60) % 24).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`;
    })}:00`;

    // simpler end time calculation
    const totalStart = h * 60 + m;
    const totalEnd = totalStart + 15;
    const endHour = Math.floor(totalEnd / 60) % 24;
    const endMin = totalEnd % 60;
    const endISOClean = `${day.dateStr}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;

    await base44.entities.Event.create({
      title: `${PRAYER_EMOJIS[prayer]} ${prayer} Prayer`,
      description: `${prayer} prayer time in ${holiday.destination}`,
      start_date: startISO,
      end_date: endISOClean,
      category: 'prayer',
      location: holiday.destination,
      is_all_day: false,
    });
    setAddedSlots(s => ({ ...s, [key]: true }));
    queryClient.invalidateQueries({ queryKey: ['events'] });
    toast.success(`${PRAYER_EMOJIS[prayer]} ${prayer} added for ${day.label}`);
  };

  const addRestaurantToCalendar = async (day, restaurant, idx) => {
    const key = `${day.dateStr}_halal_${idx}`;
    if (addedSlots[key]) return;
    // Default to lunch slot
    await base44.entities.Event.create({
      title: `🥩 Halal Dining: ${restaurant.name}`,
      description: `Halal restaurant recommendation for ${holiday.destination}${restaurant.cuisine ? ` — ${restaurant.cuisine}` : ''}`,
      start_date: `${day.dateStr}T13:00:00`,
      end_date: `${day.dateStr}T14:00:00`,
      category: 'personal',
      location: restaurant.address || restaurant.vicinity || holiday.destination,
      is_all_day: false,
    });
    setAddedSlots(s => ({ ...s, [key]: true }));
    queryClient.invalidateQueries({ queryKey: ['events'] });
    toast.success(`🍽️ ${restaurant.name} added for ${day.label}`);
  };

  const handleAddAll = async () => {
    if (!prayerTimings) return;
    setAddingAll(true);
    const restaurants = halalData?.halal_restaurants || halalData?.restaurants || [];
    const topRestaurant = restaurants[0];

    for (const day of days) {
      for (const prayer of PRAYER_NAMES) {
        const time = prayerTimings[prayer];
        if (!time) continue;
        const key = `${day.dateStr}_prayer_${prayer}`;
        if (addedSlots[key]) continue;
        await addPrayerToCalendar(day, prayer, time);
      }
      // Add top halal restaurant once per day at lunch
      if (topRestaurant) {
        const key = `${day.dateStr}_halal_0`;
        if (!addedSlots[key]) {
          await addRestaurantToCalendar(day, topRestaurant, 0);
        }
      }
    }
    setAddingAll(false);
    toast.success(`✅ All prayers & halal dining added for ${days.length} day${days.length !== 1 ? 's' : ''}!`);
  };

  const restaurants = halalData?.halal_restaurants || halalData?.restaurants || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-300/50 dark:border-amber-800/50 shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <Moon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-black text-white text-base">Islamic Itinerary Builder</h3>
            <p className="text-xs text-amber-100 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {holiday.destination}
              <span className="mx-1">·</span>
              {days.length} day{days.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Fetch button */}
        {!fetched && (
          <div className="text-center py-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Automatically insert prayer times and halal restaurant suggestions into your daily schedule for this trip.
            </p>
            <Button
              onClick={handleFetch}
              disabled={loading}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white font-bold"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Fetching prayer times & halal spots…</>
                : <><Sparkles className="w-4 h-4 mr-2" />Build Islamic Itinerary</>}
            </Button>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {fetched && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

              {/* Summary */}
              <div className="flex gap-2 flex-wrap">
                {prayerTimings && (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                    🤲 Prayer times fetched
                  </Badge>
                )}
                {restaurants.length > 0 && (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                    🥩 {restaurants.length} halal spots found
                  </Badge>
                )}
              </div>

              {/* Add All button */}
              {(prayerTimings || restaurants.length > 0) && (
                <Button
                  onClick={handleAddAll}
                  disabled={addingAll}
                  className="w-full bg-gradient-to-r from-[#1a4a6e] to-[#3ecfa0] hover:opacity-90 text-white font-bold border border-[#E8B84B]/40"
                >
                  {addingAll
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Adding to calendar…</>
                    : <><Calendar className="w-4 h-4 mr-2" />Add All Prayers + Halal Dining to Calendar</>}
                </Button>
              )}

              {/* Day-by-day */}
              <div className="space-y-2">
                {days.map(day => (
                  <DaySection
                    key={day.dateStr}
                    day={day}
                    destination={destination}
                    prayerTimings={prayerTimings}
                    halalRestaurants={restaurants}
                    addedSlots={addedSlots}
                    onAddPrayer={addPrayerToCalendar}
                    onAddRestaurant={addRestaurantToCalendar}
                  />
                ))}
              </div>

              {!prayerTimings && !restaurants.length && (
                <p className="text-sm text-slate-400 text-center py-4">Could not retrieve data for this destination. Try a more specific city name.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}