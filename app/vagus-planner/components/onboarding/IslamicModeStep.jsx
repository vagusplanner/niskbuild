import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Moon, Calendar, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function IslamicModeStep({ onNext, onBack, formData, setFormData }) {
  const selected = formData.islamic_mode;

  const options = [
    {
      value: false,
      icon: Calendar,
      gradient: 'from-teal-500 to-cyan-500',
      title: 'Vagus Planner',
      subtitle: 'Standard Edition',
      description: 'Smart calendar, tasks, health tracking, habit builder, travel planning & AI assistant.',
      tags: ['Calendar', 'Tasks', 'Health', 'Travel', 'AI Assistant']
    },
    {
      value: true,
      icon: Moon,
      gradient: 'from-indigo-600 to-purple-600',
      title: 'Vagus Planner',
      subtitle: 'Islamic Edition',
      description: 'Everything in Standard plus Prayer times, Quran reader, Ramadan tracker, Zakat calculator, Hajj/Umrah planner & more.',
      tags: ['Prayer Times', 'Quran', 'Ramadan', 'Zakat', 'Hajj/Umrah'],
      badge: 'Full Islamic Suite'
    }
  ];

  return (
    <div className="space-y-6 py-2">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Choose your edition</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm">You can change this anytime in Settings</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.value;
          return (
            <motion.button
              key={String(option.value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setFormData({ ...formData, islamic_mode: option.value })}
              className={`relative text-left p-5 rounded-2xl border-2 transition-all ${
                isSelected
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 shadow-lg'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800/40'
              }`}
            >
              {option.badge && (
                <span className="absolute -top-3 left-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {option.badge}
                </span>
              )}

              {isSelected && (
                <span className="absolute top-3 right-3 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-white" />
                </span>
              )}

              <div className={`w-12 h-12 bg-gradient-to-br ${option.gradient} rounded-xl flex items-center justify-center mb-4 shadow-md`}>
                <Icon className="w-6 h-6 text-white" />
              </div>

              <p className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight">{option.title}</p>
              <p className={`text-xs font-semibold mb-2 ${option.value ? 'text-purple-600' : 'text-teal-600'}`}>{option.subtitle}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">{option.description}</p>

              <div className="flex flex-wrap gap-1.5">
                {option.tags.map(tag => (
                  <span key={tag} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={onBack} variant="outline" className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={selected === undefined || selected === null}
          className="flex-1 bg-teal-600 hover:bg-teal-700"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}