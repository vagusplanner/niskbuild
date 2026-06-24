import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Sun, Sunrise, Sunset, Moon, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const PRAYER_NAMES = [
  { name: 'Fajr', icon: Sunrise, color: 'from-indigo-500 to-purple-600' },
  { name: 'Dhuhr', icon: Sun, color: 'from-amber-400 to-orange-500' },
  { name: 'Asr', icon: Sun, color: 'from-orange-400 to-red-500' },
  { name: 'Maghrib', icon: Sunset, color: 'from-rose-400 to-pink-600' },
  { name: 'Isha', icon: Moon, color: 'from-violet-500 to-indigo-700' }
];

// Internal prayer time calculation - use exported calculatePrayerTimes instead

function formatTime(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function getNextPrayer(times) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  for (const prayer of PRAYER_NAMES) {
    const [h, m] = times[prayer.name].split(':').map(Number);
    const prayerMinutes = h * 60 + m;
    if (prayerMinutes > currentMinutes) {
      return prayer.name;
    }
  }
  return 'Fajr'; // Next day
}

function getTimeRemaining(prayerTime) {
  const now = new Date();
  const [h, m] = prayerTime.split(':').map(Number);
  const prayerMinutes = h * 60 + m;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const remaining = prayerMinutes - currentMinutes;
  
  if (remaining < 0) return '24h';
  if (remaining < 60) return `${remaining}m`;
  const hours = Math.floor(remaining / 60);
  const mins = remaining % 60;
  return `${hours}h ${mins}m`;
}

// Cache for prayer times
let prayerCache = {};

// Export prayer times calculation using AlAdhan API
export async function calculatePrayerTimes(date, latitude = 51.5074, longitude = -0.1278, method = 'MWL') {
  const dateString = date.toISOString().split('T')[0];
  const cacheKey = `${dateString}-${latitude}-${longitude}-${method}`;
  
  // Return cached if available
  if (prayerCache[cacheKey]) {
    return prayerCache[cacheKey];
  }
  
  try {
    // Use AlAdhan API for accurate prayer times
    const timestamp = Math.floor(date.getTime() / 1000);
    const methodNum = getMethodNumber(method);
    
    const response = await fetch(
      `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${latitude}&longitude=${longitude}&method=${methodNum}`
    );
    
    if (!response.ok) throw new Error('API failed');
    
    const data = await response.json();
    const timings = data.data.timings;
    
    const result = {
      Fajr: timings.Fajr,
      Dhuhr: timings.Dhuhr,
      Asr: timings.Asr,
      Maghrib: timings.Maghrib,
      Isha: timings.Isha
    };
    
    // Cache the result
    prayerCache[cacheKey] = result;
    
    return result;
  } catch (error) {
    console.error('Prayer times API error:', error);
    // Fallback to approximate calculation
    return calculatePrayerTimesApproximate(date, latitude, longitude);
  }
}

// Map method names to AlAdhan API method numbers
function getMethodNumber(method) {
  const methods = {
    'MWL': 3,
    'ISNA': 2,
    'Egypt': 5,
    'Makkah': 4,
    'Karachi': 1,
    'Tehran': 7,
    'Jafari': 0
  };
  return methods[method] || 3;
}

// Fallback approximate calculation
function calculatePrayerTimesApproximate(date, latitude, longitude) {
  const baseHours = {
    Fajr: 5,
    Dhuhr: 12,
    Asr: 15,
    Maghrib: 18,
    Isha: 20
  };
  
  const month = date.getMonth();
  const seasonalAdjust = Math.sin((month - 3) * Math.PI / 6) * 1.5;
  
  return {
    Fajr: formatTime(baseHours.Fajr - seasonalAdjust * 0.8),
    Dhuhr: formatTime(baseHours.Dhuhr),
    Asr: formatTime(baseHours.Asr + seasonalAdjust * 0.3),
    Maghrib: formatTime(baseHours.Maghrib + seasonalAdjust),
    Isha: formatTime(baseHours.Isha + seasonalAdjust * 0.8)
  };
}

// Check if a given time conflicts with prayer time (within 10 minutes)
export async function checkPrayerConflict(time, date, settings) {
  if (!time) return null;
  
  const prayerTimes = await calculatePrayerTimes(
    date, 
    settings?.latitude || 51.5074, 
    settings?.longitude || -0.1278,
    settings?.prayer_method || 'MWL'
  );
  
  const [eventH, eventM] = time.split(':').map(Number);
  const eventMinutes = eventH * 60 + eventM;
  
  for (const prayer of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) {
    const [prayerH, prayerM] = prayerTimes[prayer].split(':').map(Number);
    const prayerMinutes = prayerH * 60 + prayerM;
    
    // Check if event time is within 10 minutes of prayer time
    if (Math.abs(eventMinutes - prayerMinutes) < 10) {
      return { prayer, time: prayerTimes[prayer] };
    }
  }
  
  return null;
}

export default function PrayerTimes({ settings, compact = false }) {
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [nextPrayer, setNextPrayer] = useState(null);
  const [lastPlayedPrayer, setLastPlayedPrayer] = useState(null);

  // Play adhan audio
  const playAdhan = () => {
    if (settings?.adhan_enabled === false) return;
    
    try {
      // Using a public adhan audio URL
      const audio = new Audio('https://www.islamcan.com/audio/adhan/adhan.mp3');
      audio.volume = 0.7;
      audio.play().catch(err => console.log('Adhan playback prevented:', err));
    } catch (error) {
      console.log('Error playing adhan:', error);
    }
  };

  useEffect(() => {
    const fetchPrayerTimes = async () => {
      const lat = settings?.latitude || 51.5074;
      const lng = settings?.longitude || -0.1278;
      const method = settings?.prayer_method || 'MWL';
      
      const times = await calculatePrayerTimes(new Date(), lat, lng, method);
      setPrayerTimes(times);
      setNextPrayer(getNextPrayer(times));
    };
    
    fetchPrayerTimes();
    
    const interval = setInterval(() => {
      if (prayerTimes) {
        const next = getNextPrayer(prayerTimes);
        setNextPrayer(next);
        
        // Check if it's time for adhan
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        // Check each prayer time
        for (const prayer of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) {
          if (prayerTimes[prayer] === currentTime && lastPlayedPrayer !== `${prayer}-${currentTime}`) {
            playAdhan();
            setLastPlayedPrayer(`${prayer}-${currentTime}`);
            break;
          }
        }
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [settings, prayerTimes, lastPlayedPrayer]);

  if (!prayerTimes) return null;

  if (compact) {
    const next = PRAYER_NAMES.find(p => p.name === nextPrayer);
    const Icon = next?.icon || Clock;
    const timeRemaining = getTimeRemaining(prayerTimes[nextPrayer]);
    
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-r ${next?.color || 'from-emerald-500 to-teal-600'} rounded-2xl p-4 text-white`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">Next Prayer</p>
            <p className="text-2xl font-semibold">{nextPrayer}</p>
            <p className="text-white/90">{prayerTimes[nextPrayer]} • <span className="font-semibold">{timeRemaining}</span></p>
          </div>
          <Icon className="w-12 h-12 text-white/30" />
        </div>
      </motion.div>
    );
  }

  return (
    <Card className="p-6 bg-white/80 backdrop-blur border-0 shadow-lg">
      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Moon className="w-5 h-5 text-emerald-600" />
        Prayer Times
      </h3>
      <div className="space-y-3">
        {PRAYER_NAMES.map((prayer, index) => {
          const Icon = prayer.icon;
          const isNext = prayer.name === nextPrayer;
          const timeRemaining = getTimeRemaining(prayerTimes[prayer.name]);
          
          return (
            <motion.div
              key={prayer.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                isNext 
                  ? `bg-gradient-to-r ${prayer.color} text-white shadow-md` 
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isNext ? 'text-white' : 'text-slate-400'}`} />
                <span className={`font-medium ${isNext ? 'text-white' : 'text-slate-700'}`}>
                  {prayer.name}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className={isNext ? 'text-white' : 'text-slate-600'}>
                  {prayerTimes[prayer.name]}
                </span>
                {isNext && (
                  <span className="text-white/90 text-sm font-semibold bg-white/20 px-2 py-1 rounded">
                    {timeRemaining}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      {settings?.location_city && (
        <p className="text-xs text-slate-400 mt-4 text-center">
          Times for {settings.location_city}, {settings.location_country}
        </p>
      )}
    </Card>
  );
}