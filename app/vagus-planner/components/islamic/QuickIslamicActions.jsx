import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  BookOpen, Navigation, Sunrise, Calendar, Heart,
  Plus, Sparkles
} from 'lucide-react';
import IslamicPracticeLogger from './IslamicPracticeLogger';
import DhikrScheduler from './DhikrScheduler';
import QiblaFinder from './QiblaFinder';
import EnhancedDailyInspiration from './EnhancedDailyInspiration';

const QUICK_ACTIONS = [
  {
    id: 'log-practice',
    label: 'Log Practice',
    icon: Plus,
    color: 'teal',
    description: 'Record Quran, prayers, charity'
  },
  {
    id: 'schedule-dhikr',
    label: 'Schedule Dhikr',
    icon: Calendar,
    color: 'rose',
    description: 'Add recurring dhikr sessions'
  },
  {
    id: 'qibla',
    label: 'Find Qibla',
    icon: Navigation,
    color: 'purple',
    description: 'Get prayer direction'
  },
  {
    id: 'inspiration',
    label: 'Daily Inspiration',
    icon: Sparkles,
    color: 'amber',
    description: 'Verse & hadith of the day'
  }
];

export default function QuickIslamicActions({ compact = false }) {
  const [activeModal, setActiveModal] = useState(null);

  const renderModal = () => {
    switch (activeModal) {
      case 'log-practice':
        return (
          <IslamicPracticeLogger
            isOpen={true}
            onClose={() => setActiveModal(null)}
          />
        );
      case 'schedule-dhikr':
        return (
          <DhikrScheduler
            isOpen={true}
            onClose={() => setActiveModal(null)}
          />
        );
      case 'qibla':
        return (
          <QiblaFinder
            isOpen={true}
            onClose={() => setActiveModal(null)}
          />
        );
      case 'inspiration':
        return (
          <EnhancedDailyInspiration
            isOpen={true}
            onClose={() => setActiveModal(null)}
          />
        );
      default:
        return null;
    }
  };

  if (compact) {
    return (
      <>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                onClick={() => setActiveModal(action.id)}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <Icon className={`w-4 h-4 text-${action.color}-600`} />
                {action.label}
              </Button>
            );
          })}
        </div>
        {renderModal()}
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <motion.div
              key={action.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                onClick={() => setActiveModal(action.id)}
                className={`p-4 cursor-pointer hover:shadow-lg transition-all border-${action.color}-200 bg-gradient-to-br from-${action.color}-50 to-white hover:from-${action.color}-100`}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className={`p-3 rounded-full bg-${action.color}-100`}>
                    <Icon className={`w-6 h-6 text-${action.color}-600`} />
                  </div>
                  <h3 className="font-semibold text-slate-800">{action.label}</h3>
                  <p className="text-xs text-slate-500">{action.description}</p>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
      {renderModal()}
    </>
  );
}