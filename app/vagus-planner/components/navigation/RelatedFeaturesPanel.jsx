import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Sparkles } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

const PAGE_RELATIONSHIPS = {
  Calendar: [
    { page: 'Profile', label: 'View Tasks & Goals', icon: '✅', description: 'Manage your to-dos' },
    { page: 'Islamic', label: 'Prayer Times', icon: '🕌', description: 'View today\'s prayers' },
    { page: 'Holidays', label: 'Plan a Trip', icon: '✈️', description: 'Schedule vacation' }
  ],
  Islamic: [
    { page: 'Calendar', label: 'View Calendar', icon: '📅', description: 'See prayer events' },
    { page: 'Profile', label: 'Quran Goals', icon: '📖', description: 'Track memorization' },
    { page: 'Holidays', label: 'Hajj/Umrah', icon: '🕋', description: 'Plan pilgrimage' }
  ],
  Health: [
    { page: 'Calendar', label: 'Schedule Workouts', icon: '🏋️', description: 'Add to calendar' },
    { page: 'Profile', label: 'Health Goals', icon: '🎯', description: 'Track progress' },
    { page: 'Islamic', label: 'Fasting Tracker', icon: '🌙', description: 'Log fasts' }
  ],
  Profile: [
    { page: 'Calendar', label: 'View Schedule', icon: '📅', description: 'See your events' },
    { page: 'Health', label: 'Wellness Goals', icon: '💪', description: 'Track health' },
    { page: 'Chat', label: 'Team Chat', icon: '💬', description: 'Collaborate' }
  ],
  Holidays: [
    { page: 'Calendar', label: 'Block Dates', icon: '📅', description: 'Reserve time' },
    { page: 'Islamic', label: 'Hajj Planner', icon: '🕋', description: 'Religious travel' },
    { page: 'Chat', label: 'Share Trip', icon: '💬', description: 'Invite friends' }
  ],
  Chat: [
    { page: 'Calendar', label: 'Schedule Meeting', icon: '📅', description: 'Plan together' },
    { page: 'Profile', label: 'Team Tasks', icon: '✅', description: 'Assign work' },
    { page: 'Holidays', label: 'Group Trip', icon: '✈️', description: 'Plan together' }
  ]
};

export default function RelatedFeaturesPanel({ currentPage }) {
  const relatedFeatures = PAGE_RELATIONSHIPS[currentPage] || [];

  if (relatedFeatures.length === 0) return null;

  return (
    <Card className="border-teal-200 bg-gradient-to-br from-teal-50/50 to-cyan-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-4 h-4 text-teal-600" />
          Related Features
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {relatedFeatures.map((feature, index) => (
            <motion.div
              key={feature.page}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={createPageUrl(feature.page)}>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white hover:shadow-md transition-all group cursor-pointer border border-transparent hover:border-teal-200">
                  <div className="text-2xl">{feature.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm group-hover:text-teal-700 transition-colors">
                      {feature.label}
                    </p>
                    <p className="text-xs text-slate-500">
                      {feature.description}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}