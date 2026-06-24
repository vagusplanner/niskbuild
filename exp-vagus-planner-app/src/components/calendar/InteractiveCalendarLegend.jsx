import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CALENDAR_LEGEND = [
  {
    id: 'ritual',
    label: 'Religious Ritual',
    color: 'bg-emerald-600',
    bgLight: 'bg-emerald-50',
    borderLight: 'border-emerald-200',
    textDark: 'text-emerald-900',
    description: 'Hajj, Umrah, prayer events, or other Islamic rituals and observances',
    examples: ['Tawaf', 'Sa\'i', 'Prayer time', 'Adhan']
  },
  {
    id: 'prayer',
    label: 'Prayer Time',
    color: 'bg-blue-600',
    bgLight: 'bg-blue-50',
    borderLight: 'border-blue-200',
    textDark: 'text-blue-900',
    description: 'Scheduled prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha)',
    examples: ['Fajr 5:30 AM', 'Dhuhr 12:45 PM', 'Jumah prayer']
  },
  {
    id: 'fasting',
    label: 'Fasting Day',
    color: 'bg-purple-600',
    bgLight: 'bg-purple-50',
    borderLight: 'border-purple-200',
    textDark: 'text-purple-900',
    description: 'Days designated for fasting (Ramadan, Sunnah fasting, or personal goals)',
    examples: ['Ramadan fast', 'Monday/Thursday', 'Arafat fasting']
  },
  {
    id: 'holiday',
    label: 'Holiday/Travel',
    color: 'bg-orange-600',
    bgLight: 'bg-orange-50',
    borderLight: 'border-orange-200',
    textDark: 'text-orange-900',
    description: 'Travel plans, vacations, and holiday breaks',
    examples: ['Summer holiday', 'Business trip', 'Family visit']
  },
  {
    id: 'health',
    label: 'Health Tracking',
    color: 'bg-rose-600',
    bgLight: 'bg-rose-50',
    borderLight: 'border-rose-200',
    textDark: 'text-rose-900',
    description: 'Health-related events, exercises, and wellness activities',
    examples: ['Gym', 'Doctor appointment', 'Meditation']
  },
  {
    id: 'work',
    label: 'Work/Personal',
    color: 'bg-slate-600',
    bgLight: 'bg-slate-50',
    borderLight: 'border-slate-200',
    textDark: 'text-slate-900',
    description: 'Work meetings, personal tasks, and daily activities',
    examples: ['Meeting', 'Task', 'Birthday']
  },
  {
    id: 'social',
    label: 'Social/Community',
    color: 'bg-cyan-600',
    bgLight: 'bg-cyan-50',
    borderLight: 'border-cyan-200',
    textDark: 'text-cyan-900',
    description: 'Social gatherings, community events, and group activities',
    examples: ['Community event', 'Family gathering', 'Group outing']
  }
];

export default function InteractiveCalendarLegend({ compact = false }) {
  const [expandedItem, setExpandedItem] = useState(null);

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {CALENDAR_LEGEND.map(item => (
          <div
            key={item.id}
            className="relative group"
            onMouseEnter={() => setExpandedItem(item.id)}
            onMouseLeave={() => setExpandedItem(null)}
          >
            <Badge className={`${item.color} cursor-help`}>
              {item.label}
            </Badge>
            <AnimatePresence>
              {expandedItem === item.id && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className={`absolute z-50 top-full mt-2 w-64 p-3 rounded-lg shadow-lg ${item.bgLight} border ${item.borderLight} backdrop-blur-sm`}
                >
                  <p className={`text-xs font-semibold ${item.textDark} mb-1`}>{item.label}</p>
                  <p className={`text-xs ${item.textDark} mb-2`}>{item.description}</p>
                  {item.examples.length > 0 && (
                    <div className="text-xs">
                      <p className={`font-semibold ${item.textDark} mb-1`}>Examples:</p>
                      <ul className={`${item.textDark} space-y-0.5`}>
                        {item.examples.map((ex, i) => (
                          <li key={i}>• {ex}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className="bg-white border-slate-200">
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600" />
          Calendar Color Guide
        </h3>
        <div className="space-y-2">
          {CALENDAR_LEGEND.map(item => (
            <motion.div key={item.id}>
              <button
                onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${item.bgLight} border ${item.borderLight} hover:shadow-sm`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded ${item.color}`} />
                    <span className={`font-medium text-sm ${item.textDark}`}>{item.label}</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${expandedItem === item.id ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              <AnimatePresence>
                {expandedItem === item.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`mt-1 p-3 ml-3 border-l-2 ${item.borderLight}`}
                  >
                    <p className={`text-xs ${item.textDark} mb-2`}>{item.description}</p>
                    {item.examples.length > 0 && (
                      <div>
                        <p className={`text-xs font-semibold ${item.textDark} mb-1`}>Examples:</p>
                        <ul className={`text-xs space-y-0.5 ${item.textDark}`}>
                          {item.examples.map((ex, i) => (
                            <li key={i}>• {ex}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </Card>
  );
}