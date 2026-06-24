import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import PrayerAndQiblaPanel from './PrayerAndQiblaPanel';
import PrayerNotificationManager from './PrayerNotificationManager';
import PrayerTracker from './PrayerTracker';

const TABS = [
  { id: 'times', label: '🕌 Times & Qibla' },
  { id: 'notifications', label: '🔔 Notifications' },
  { id: 'track', label: '✅ Track Prayers' },
];

export default function PrayerTimesMaster() {
  const [tab, setTab] = useState('times');

  return (
    <div className="rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Tab bar */}
      <div className="flex border-b border-amber-100 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 py-3 text-xs font-semibold transition-all',
              tab === t.id
                ? 'border-b-2 border-amber-500 text-amber-700 dark:text-amber-300 bg-white dark:bg-slate-900'
                : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-400'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-0">
        {tab === 'times' && <PrayerAndQiblaPanel />}
        {tab === 'notifications' && <div className="p-4"><PrayerNotificationManager /></div>}
        {tab === 'track' && <div className="p-4"><PrayerTracker /></div>}
      </div>
    </div>
  );
}