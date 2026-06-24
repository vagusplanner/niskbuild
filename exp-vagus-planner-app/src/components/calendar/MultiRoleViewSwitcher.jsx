import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Briefcase, Home, Coffee, Moon, Users } from 'lucide-react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';

const ROLE_MODES = [
  {
    id: 'family',
    name: 'Family Mode',
    icon: Home,
    color: 'from-pink-500 to-rose-600',
    categories: ['family', 'personal', 'prayer', 'health'],
    description: 'Focus on family time, prayers, and personal well-being'
  },
  {
    id: 'work',
    name: 'Work Mode',
    icon: Briefcase,
    color: 'from-blue-500 to-indigo-600',
    categories: ['work'],
    description: 'Professional tasks and meetings'
  },
  {
    id: 'freelance',
    name: 'Freelance Mode',
    icon: Coffee,
    color: 'from-purple-500 to-violet-600',
    categories: ['work'],
    description: 'Client projects and billable hours'
  },
  {
    id: 'spiritual',
    name: 'Spiritual Mode',
    icon: Moon,
    color: 'from-emerald-500 to-teal-600',
    categories: ['prayer'],
    description: 'Prayer times, Quran reading, Islamic activities'
  },
  {
    id: 'all',
    name: 'All',
    icon: Users,
    color: 'from-slate-500 to-gray-600',
    categories: [],
    description: 'See everything'
  }
];

export default function MultiRoleViewSwitcher({ currentMode, onModeChange }) {
  const [expanded, setExpanded] = useState(false);

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });

  const activeMode = ROLE_MODES.find(m => m.id === currentMode) || ROLE_MODES[4];

  const handleModeChange = async (mode) => {
    onModeChange(mode.id);
    setExpanded(false);
    
    // Save preference
    if (settings.length > 0) {
      await SDK.entities.UserSettings.update(settings[0].id, {
        ...settings[0],
        default_view_mode: mode.id
      });
    }
  };

  return (
    <div className="relative">
      {/* Active Mode Button */}
      <Button
        onClick={() => setExpanded(!expanded)}
        className={`bg-gradient-to-r ${activeMode.color} text-white hover:opacity-90 shadow-lg`}
      >
        <activeMode.icon className="w-4 h-4 mr-2" />
        {activeMode.name}
      </Button>

      {/* Expanded Mode Selector */}
      {expanded && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setExpanded(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full mt-2 right-0 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden min-w-80"
          >
            <div className="p-3 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-slate-200">
              <p className="text-sm font-semibold text-slate-800">Switch View Mode</p>
            </div>
            <div className="p-2 space-y-1">
              {ROLE_MODES.map((mode) => {
                const Icon = mode.icon;
                const isActive = mode.id === currentMode;
                
                return (
                  <button
                    key={mode.id}
                    onClick={() => handleModeChange(mode)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      isActive 
                        ? `bg-gradient-to-r ${mode.color} text-white shadow-md`
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        isActive ? 'bg-white/20' : `bg-gradient-to-br ${mode.color}`
                      }`}>
                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-white'}`} />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${isActive ? 'text-white' : 'text-slate-800'}`}>
                          {mode.name}
                        </p>
                        <p className={`text-xs mt-0.5 ${
                          isActive ? 'text-white/80' : 'text-slate-500'
                        }`}>
                          {mode.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}

export { ROLE_MODES };