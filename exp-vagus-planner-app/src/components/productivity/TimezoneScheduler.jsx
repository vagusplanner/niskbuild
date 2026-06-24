import React, { useState, useMemo, useEffect } from 'react';
import { Globe, Clock, Search, Plus, X, Star } from 'lucide-react';
import { format } from 'date-fns';

const TIMEZONES = [
  { label: 'London',        tz: 'Europe/London',        flag: '🇬🇧' },
  { label: 'New York',      tz: 'America/New_York',     flag: '🇺🇸' },
  { label: 'Los Angeles',   tz: 'America/Los_Angeles',  flag: '🇺🇸' },
  { label: 'Dubai',         tz: 'Asia/Dubai',           flag: '🇦🇪' },
  { label: 'Riyadh',        tz: 'Asia/Riyadh',          flag: '🇸🇦' },
  { label: 'Karachi',       tz: 'Asia/Karachi',         flag: '🇵🇰' },
  { label: 'Istanbul',      tz: 'Europe/Istanbul',      flag: '🇹🇷' },
  { label: 'Paris',         tz: 'Europe/Paris',         flag: '🇫🇷' },
  { label: 'Tokyo',         tz: 'Asia/Tokyo',           flag: '🇯🇵' },
  { label: 'Singapore',     tz: 'Asia/Singapore',       flag: '🇸🇬' },
  { label: 'Sydney',        tz: 'Australia/Sydney',     flag: '🇦🇺' },
  { label: 'Toronto',       tz: 'America/Toronto',      flag: '🇨🇦' },
  { label: 'Berlin',        tz: 'Europe/Berlin',        flag: '🇩🇪' },
  { label: 'Cairo',         tz: 'Africa/Cairo',         flag: '🇪🇬' },
  { label: 'Jakarta',       tz: 'Asia/Jakarta',         flag: '🇮🇩' },
  { label: 'Dhaka',         tz: 'Asia/Dhaka',           flag: '🇧🇩' },
  { label: 'Kuala Lumpur',  tz: 'Asia/Kuala_Lumpur',    flag: '🇲🇾' },
  { label: 'Lagos',         tz: 'Africa/Lagos',         flag: '🇳🇬' },
];

function getTimeInTz(tz) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date());
  } catch { return '--:--'; }
}

function getOffsetLabel(tz) {
  try {
    const now = new Date();
    const local = now.toLocaleString('en-US', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' });
    const utc = now.toLocaleString('en-US', { timeZone: 'UTC', hour12: false, hour: '2-digit', minute: '2-digit' });
    const diff = Math.round((new Date(`1970/01/01 ${local}`) - new Date(`1970/01/01 ${utc}`)) / 3600000);
    return diff >= 0 ? `UTC+${diff}` : `UTC${diff}`;
  } catch { return 'UTC'; }
}

export default function TimezoneScheduler() {
  const [pinned, setPinned] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vagus_pinned_tz') || '["Europe/London","America/New_York","Asia/Dubai"]'); } catch { return ['Europe/London', 'America/New_York', 'Asia/Dubai']; }
  });
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [now, setNow] = useState(new Date());

  // Tick every second
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const pinnedZones = TIMEZONES.filter(z => pinned.includes(z.tz));
  const filtered = search ? TIMEZONES.filter(z => z.label.toLowerCase().includes(search.toLowerCase()) && !pinned.includes(z.tz)) : [];

  const savePinned = (list) => {
    setPinned(list);
    localStorage.setItem('vagus_pinned_tz', JSON.stringify(list));
  };

  const addTz = (tz) => {
    if (!pinned.includes(tz)) savePinned([...pinned, tz]);
    setSearch('');
    setShowSearch(false);
  };

  const removeTz = (tz) => savePinned(pinned.filter(t => t !== tz));

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-white" />
          <span className="font-bold text-white">World Clock</span>
        </div>
        <button onClick={() => setShowSearch(!showSearch)}
          className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
          {showSearch ? <X className="w-4 h-4 text-white" /> : <Plus className="w-4 h-4 text-white" />}
        </button>
      </div>

      <div className="p-4 space-y-3">
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search city…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            {filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl mt-1 shadow-lg z-50 max-h-48 overflow-auto">
                {filtered.slice(0, 8).map(z => (
                  <button key={z.tz} onClick={() => addTz(z.tz)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors">
                    <span>{z.flag}</span>
                    <span className="text-sm text-slate-700 dark:text-slate-200">{z.label}</span>
                    <span className="ml-auto text-xs text-slate-400">{getOffsetLabel(z.tz)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {pinnedZones.map(z => {
          const time = getTimeInTz(z.tz);
          const hour = parseInt(time.split(':')[0]);
          const isNight = hour < 6 || hour >= 22;
          const isWork = hour >= 9 && hour < 18;
          const statusColor = isNight ? 'text-slate-400' : isWork ? 'text-emerald-500' : 'text-amber-500';
          const statusDot = isNight ? '🌙' : isWork ? '☀️' : '🌅';

          return (
            <div key={z.tz} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl group">
              <span className="text-xl">{z.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{z.label}</p>
                  <span className="text-xs">{statusDot}</span>
                </div>
                <p className="text-xs text-slate-400">{getOffsetLabel(z.tz)}</p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-black tabular-nums ${statusColor}`}>{time}</p>
              </div>
              <button onClick={() => removeTz(z.tz)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                <X className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          );
        })}

        {pinnedZones.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-4">Add cities using the + button above</p>
        )}
      </div>
    </div>
  );
}