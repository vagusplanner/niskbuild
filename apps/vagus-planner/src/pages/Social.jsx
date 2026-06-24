import React from 'react';
import { motion } from 'framer-motion';
import SmartAvailabilitySharing from '@/components/collaboration/SmartAvailabilitySharing';
import MeetingPolls from '@/components/collaboration/MeetingPolls';
import FamilyCalendarCoordination from '@/components/collaboration/FamilyCalendarCoordination';
import DelegateSuggestions from '@/components/collaboration/DelegateSuggestions';

const sections = [
  {
    title: 'Network & Collaboration',
    description: 'Share availability and coordinate meetings with others',
    features: [
      SmartAvailabilitySharing,
      MeetingPolls
    ]
  },
  {
    title: 'Family & Personal',
    description: 'Coordinate with family and manage personal time',
    features: [
      FamilyCalendarCoordination,
      DelegateSuggestions
    ]
  }
];

export default function Social() {
  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">Social & Collaboration</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Coordinate with your network and family, delegate meetings wisely
        </p>
      </motion.div>

      {sections.map((section, sectionIdx) => (
        <div key={section.title} className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{section.title}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{section.description}</p>
          </div>
          
          <div className="grid gap-6 lg:grid-cols-2">
            {section.features.map((Component, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (sectionIdx * 0.2) + (idx * 0.1) }}
              >
                <Component />
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 p-6 bg-gradient-to-r from-pink-50 dark:from-pink-950 to-rose-50 dark:to-rose-950 rounded-xl border border-pink-200 dark:border-pink-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">💝 Social Intelligence Features</h3>
        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <li>✓ Smart Availability Sharing - "Free for coffee?" slots with one click</li>
          <li>✓ Meeting Polls - Auto-schedule with instant group voting</li>
          <li>✓ Family Calendar Coordination - Find when everyone's free for family time</li>
          <li>✓ Delegate Suggestions - AI identifies low-value meetings you can skip</li>
          <li>🔜 Relationship Insights - Maintain work/life balance with reminders to connect</li>
          <li>🔜 Group Events Manager - Plan team activities and offsites</li>
        </ul>
      </motion.div>
    </div>
  );
}