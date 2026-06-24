import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Plus, Calendar, CheckSquare, Plane, MessageSquare, 
  Moon, X, Zap, Target, Heart, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { FloatingButton, useFloatingManager } from '@/components/ui/floating-manager';

const QUICK_ACTIONS = [
  {
    id: 'new-event',
    label: 'New Event',
    icon: Calendar,
    color: 'from-blue-500 to-cyan-500',
    page: 'Calendar',
    action: 'create-event'
  },
  {
    id: 'new-task',
    label: 'New Task',
    icon: CheckSquare,
    color: 'from-amber-500 to-orange-500',
    page: 'Profile',
    action: 'create-task'
  },
  {
    id: 'log-prayer',
    label: 'Log Prayer',
    icon: Moon,
    color: 'from-purple-500 to-indigo-500',
    page: 'Wellness',
    action: 'log-prayer'
  },
  {
    id: 'plan-trip',
    label: 'Plan Trip',
    icon: Plane,
    color: 'from-teal-500 to-emerald-500',
    page: 'Holidays',
    action: 'new-holiday'
  },
  {
    id: 'new-goal',
    label: 'New Goal',
    icon: Target,
    color: 'from-pink-500 to-rose-500',
    page: 'Profile',
    action: 'create-goal'
  },
  {
    id: 'track-health',
    label: 'Log Health',
    icon: Heart,
    color: 'from-red-500 to-pink-500',
    page: 'Health',
    action: 'log-health'
  },
  {
    id: 'start-chat',
    label: 'New Chat',
    icon: MessageSquare,
    color: 'from-green-500 to-teal-500',
    page: 'Chat',
    action: 'new-chat'
  },
  {
    id: 'quick-note',
    label: 'Quick Note',
    icon: Clock,
    color: 'from-slate-500 to-gray-500',
    page: 'Calendar',
    action: 'quick-note'
  }
];

export default function QuickActionsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { openFloating, closeFloating } = useFloatingManager();

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (newState) {
      openFloating('quick-actions');
    } else {
      closeFloating();
    }
  };

  const handleAction = (action) => {
    setIsOpen(false);
    closeFloating();
    
    // Navigate to the correct page
    const pageMapping = {
      'Holidays': 'Travel',
      'Health': 'Wellness',
      'Chat': 'Connect'
    };
    
    const targetPage = pageMapping[action.page] || action.page;
    navigate(`${createPageUrl(targetPage)}?action=${action.action}`);
  };

  return (
    <>
      <FloatingButton id="quick-actions" position="bottom-left" stackOrder={0}>
        <Button
          size="lg"
          onClick={handleToggle}
          data-tour="quick-actions"
          className={cn(
            "w-14 h-14 rounded-full shadow-2xl transition-all relative no-select touch-manipulation",
            isOpen
              ? "bg-slate-600 hover:bg-slate-700"
              : "bg-gradient-to-br from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
          )}
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Plus className="w-6 h-6 text-white" />
          </motion.div>
        </Button>
      </FloatingButton>

      {/* Actions Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsOpen(false);
                closeFloating();
              }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[35]"
            />

            {/* Actions Grid */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed bottom-24 left-4 right-4 z-[36] lg:bottom-20 lg:left-6 lg:right-auto max-w-sm mx-auto lg:mx-0"
            >
              <Card className="p-4 shadow-2xl max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-teal-600" />
                    Quick Actions
                  </h3>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsOpen(false)}
                    className="h-6 w-6"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <motion.button
                        key={action.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleAction(action)}
                        className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-teal-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all group text-left"
                      >
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-100">
                          {action.label}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}