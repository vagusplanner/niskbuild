import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Briefcase, 
  Stethoscope, 
  Sparkles, 
  Car, 
  Scissors,
  Heart,
  Calendar,
  ShoppingBag,
  Users,
  Home,
  Phone,
  CheckSquare,
  FileText,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

const EVENT_TEMPLATES = [
  {
    id: 'meeting',
    label: 'Meeting',
    icon: Briefcase,
    color: 'from-blue-500 to-blue-600',
    category: 'work',
    duration: 60,
    description: 'Professional meeting'
  },
  {
    id: 'doctor',
    label: 'Doctor',
    icon: Stethoscope,
    color: 'from-red-500 to-pink-600',
    category: 'health',
    duration: 30,
    description: 'Medical appointment'
  },
  {
    id: 'hospital',
    label: 'Hospital',
    icon: Heart,
    color: 'from-red-600 to-rose-700',
    category: 'health',
    duration: 60,
    description: 'Hospital visit'
  },
  {
    id: 'beauty',
    label: 'Beauty',
    icon: Sparkles,
    color: 'from-pink-500 to-purple-600',
    category: 'personal',
    duration: 90,
    description: 'Beauty salon appointment'
  },
  {
    id: 'haircut',
    label: 'Haircut',
    icon: Scissors,
    color: 'from-purple-500 to-indigo-600',
    category: 'personal',
    duration: 45,
    description: 'Hair salon'
  },
  {
    id: 'dealer',
    label: 'Dealer',
    icon: Car,
    color: 'from-slate-500 to-slate-700',
    category: 'other',
    duration: 60,
    description: 'Car dealer/service'
  },
  {
    id: 'shopping',
    label: 'Shopping',
    icon: ShoppingBag,
    color: 'from-amber-500 to-orange-600',
    category: 'personal',
    duration: 120,
    description: 'Shopping trip'
  },
  {
    id: 'family',
    label: 'Family',
    icon: Users,
    color: 'from-emerald-500 to-teal-600',
    category: 'family',
    duration: 120,
    description: 'Family event'
  },
  {
    id: 'home',
    label: 'Home Service',
    icon: Home,
    color: 'from-cyan-500 to-blue-600',
    category: 'other',
    duration: 60,
    description: 'Home maintenance/service'
  },
  {
    id: 'call',
    label: 'Call',
    icon: Phone,
    color: 'from-violet-500 to-purple-600',
    category: 'work',
    duration: 30,
    description: 'Scheduled call'
  },
  {
    id: 'task',
    label: 'Task',
    icon: CheckSquare,
    color: 'from-indigo-500 to-blue-600',
    category: 'work',
    duration: 30,
    description: 'Task with deadline'
  },
  {
    id: 'note',
    label: 'Note',
    icon: FileText,
    color: 'from-slate-400 to-slate-600',
    category: 'other',
    duration: 0,
    description: 'Calendar note'
  }
];

export default function QuickEventTemplates({ selectedDate, onCreateEvent, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleTemplateClick = (template) => {
    onCreateEvent({
      template: template.id,
      category: template.category,
      duration: template.duration,
      title: template.description,
      date: selectedDate
    });
    setIsOpen(false);
  };

  if (compact) {
    return (
      <div className="relative">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-lg"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Quick Add
        </Button>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute top-full mt-2 right-0 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 w-80"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">Quick Create</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-6 w-6"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                  {EVENT_TEMPLATES.map((template) => {
                    const Icon = template.icon;
                    return (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateClick(template)}
                        className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow",
                          template.color
                        )}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center">
                          {template.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {EVENT_TEMPLATES.map((template) => {
        const Icon = template.icon;
        return (
          <motion.button
            key={template.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleTemplateClick(template)}
            className="flex flex-col items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all bg-white dark:bg-slate-900 group"
          >
            <div className={cn(
              "w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow",
              template.color
            )}>
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                {template.label}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {template.duration > 0 ? `${template.duration} min` : 'All day'}
              </p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}