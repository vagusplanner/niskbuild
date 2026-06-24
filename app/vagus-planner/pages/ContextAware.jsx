import React from 'react';
import { motion } from 'framer-motion';
import WeatherSmartScheduling from '@/components/context/WeatherSmartScheduling';
import LocationAwareReminders from '@/components/context/LocationAwareReminders';
import PrayerTimeAutoAdjust from '@/components/context/PrayerTimeAutoAdjust';
import RamadanMode from '@/components/context/RamadanMode';

const features = [
  { id: 1, title: 'Weather-Smart Scheduling', component: WeatherSmartScheduling },
  { id: 2, title: 'Location-Aware Reminders', component: LocationAwareReminders },
  { id: 3, title: 'Prayer Time Auto-Adjust', component: PrayerTimeAutoAdjust },
  { id: 4, title: 'Ramadan Mode', component: RamadanMode }
];

export default function ContextAware() {
  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">Context-Aware Features</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Intelligent scheduling based on weather, location, prayers, and religious calendars
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {features.map((feature, idx) => {
          const Component = feature.component;
          return (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Component />
            </motion.div>
          );
        })}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 p-6 bg-gradient-to-r from-blue-50 dark:from-blue-950 to-cyan-50 dark:to-cyan-950 rounded-xl border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">🎯 How It Works</h3>
        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <li>• <strong>Weather</strong>: Move outdoor activities when rain is forecast</li>
          <li>• <strong>Location</strong>: Get reminded of tasks when near specific places</li>
          <li>• <strong>Prayer Times</strong>: Auto-reschedule events that conflict with prayers</li>
          <li>• <strong>Ramadan</strong>: Adjust energy expectations and schedule worship time</li>
        </ul>
      </motion.div>
    </div>
  );
}