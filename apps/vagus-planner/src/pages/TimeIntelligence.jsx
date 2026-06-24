import React from 'react';
import { motion } from 'framer-motion';
import SmartTravelTime from '@/components/time/SmartTravelTime';
import TimeAuditDashboard from '@/components/time/TimeAuditDashboard';
import MeetingCostCalculator from '@/components/time/MeetingCostCalculator';
import FocusTimeGuardian from '@/components/time/FocusTimeGuardian';
import CalendarHeatmap from '@/components/time/CalendarHeatmap';

const features = [
  { id: 1, title: 'Time Audit Dashboard', component: TimeAuditDashboard },
  { id: 2, title: 'Smart Travel Time', component: SmartTravelTime },
  { id: 3, title: 'Meeting Cost Calculator', component: MeetingCostCalculator },
  { id: 4, title: 'Focus Time Guardian', component: FocusTimeGuardian },
  { id: 5, title: 'Calendar Heatmap', component: CalendarHeatmap }
];

export default function TimeIntelligence() {
  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">Time Intelligence</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Optimize your schedule with smart insights and time analytics
        </p>
      </motion.div>

      <div className="space-y-6">
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
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">💡 Time Intelligence Tips</h3>
        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <li>• Use the Time Audit to understand where your time actually goes</li>
          <li>• Set your hourly rate to see the real cost of meetings</li>
          <li>• Create focus blocks to protect deep work time</li>
          <li>• Check locations on events to auto-detect travel time</li>
          <li>• Use the heatmap to find your quietest hours for focused work</li>
        </ul>
      </motion.div>
    </div>
  );
}