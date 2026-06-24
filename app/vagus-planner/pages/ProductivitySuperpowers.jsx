import React from 'react';
import { motion } from 'framer-motion';
import SmartConflictResolution from '@/components/productivity/SmartConflictResolution';
import OneClickReschedule from '@/components/productivity/OneClickReschedule';
import MeetingFreeDays from '@/components/productivity/MeetingFreeDays';
import HabitStacking from '@/components/productivity/HabitStacking';
import PomodoroIntegration from '@/components/productivity/PomodoroIntegration';

const features = [
  { id: 1, title: 'Smart Conflict Resolution', component: SmartConflictResolution },
  { id: 2, title: 'One-Click Reschedule', component: OneClickReschedule },
  { id: 3, title: 'Meeting-Free Days', component: MeetingFreeDays },
  { id: 4, title: 'Habit Stacking', component: HabitStacking },
  { id: 5, title: 'Pomodoro Integration', component: PomodoroIntegration }
];

export default function ProductivitySuperpowers() {
  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">Productivity Superpowers</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Advanced scheduling, habit building, and focus management tools
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

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 p-6 bg-gradient-to-r from-teal-50 dark:from-teal-950 to-cyan-50 dark:to-cyan-950 rounded-xl border border-teal-200 dark:border-teal-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">⚡ Power Tips</h3>
        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <li>• Use AI Conflict Resolution when you have overlapping meetings</li>
          <li>• One-Click Reschedule saves 10+ minutes when you're running behind</li>
          <li>• Block "Meeting-Free Wednesdays" for deep focus work</li>
          <li>• Stack habits like "5min meditation before team meetings"</li>
          <li>• Use Pomodoro to break long focus blocks into manageable chunks</li>
        </ul>
      </motion.div>
    </div>
  );
}