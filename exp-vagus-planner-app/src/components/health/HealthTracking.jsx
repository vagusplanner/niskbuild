import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Apple, Dumbbell, Moon, Smile, Brain, Activity, Heart, Sparkles } from 'lucide-react';
import NutritionTracker from './NutritionTracker';
import ExerciseTracker from './ExerciseTracker';
import MoodTracker from './MoodTracker';
import AIHealthInsights from './AIHealthInsights';
import PeriodTracker from './PeriodTracker';
import HealthTrendsAnalysis from './HealthTrendsAnalysis';
import AIHealthCoach from './AIHealthCoach';
import InteractiveAIHealthCoach from './InteractiveAIHealthCoach';
import AIDietPlanner from './AIDietPlanner';
import FertilityTracker from './FertilityTracker';
import WearableDeviceManager from './WearableDeviceManager';
import BodyMetricsTracker from './BodyMetricsTracker';

// Import existing sleep/energy tracking
import SleepTracker from './SleepTracker';
import EnergyLevelTracker from './EnergyLevelTracker';

// Compact section card for the overview
function SectionCard({ icon: Icon, title, desc, color, onClick }) {
  return (
    <button onClick={onClick} className="group w-full text-left p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md hover:border-rose-200 dark:hover:border-rose-800 transition-all flex items-center gap-3">
      <div className={`p-2 rounded-xl flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-slate-800 dark:text-slate-100">{title}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{desc}</div>
      </div>
    </button>
  );
}

export default function HealthTracking() {
  const [activeSection, setActiveSection] = useState(null);

  const sections = [
    { id: 'coach',     icon: Sparkles,  title: 'AI Coach',        desc: 'Personalised guidance & chat',             color: 'bg-violet-500' },
    { id: 'nutrition', icon: Apple,     title: 'Nutrition',        desc: 'Meals, calories & diet planning',          color: 'bg-green-500' },
    { id: 'exercise',  icon: Dumbbell,  title: 'Exercise',         desc: 'Workouts, steps & activity log',           color: 'bg-blue-500' },
    { id: 'body',      icon: Activity,  title: 'Body Metrics',     desc: 'Weight, BMI & water intake tracker',       color: 'bg-cyan-500' },
    { id: 'sleep',     icon: Moon,      title: 'Sleep',            desc: 'Sleep quality & recovery tracking',        color: 'bg-indigo-500' },
    { id: 'mood',      icon: Smile,     title: 'Mood & Energy',    desc: 'Emotions, energy levels & wellbeing',      color: 'bg-pink-500' },
    { id: 'womens',    icon: Heart,     title: "Women's Health",   desc: 'Period tracking & fertility insights',      color: 'bg-rose-500' },
    { id: 'insights',  icon: Brain,     title: 'AI Insights',      desc: 'Trends, patterns & smart reports',         color: 'bg-amber-500' },
  ];

  if (activeSection) {
    const section = sections.find(s => s.id === activeSection);
    const Icon = section.icon;
    return (
      <div className="space-y-4">
        <button onClick={() => setActiveSection(null)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
          <span>←</span> Back to Health Overview
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className={`p-2 rounded-xl ${section.color}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{section.title}</h2>
        </div>

        {activeSection === 'coach'     && <InteractiveAIHealthCoach />}
        {activeSection === 'nutrition' && <><AIDietPlanner /><NutritionTracker /></>}
        {activeSection === 'exercise'  && <ExerciseTracker />}
        {activeSection === 'body'      && <BodyMetricsTracker />}
        {activeSection === 'sleep'     && <SleepTracker />}
        {activeSection === 'mood'      && <><MoodTracker /><EnergyLevelTracker /></>}
        {activeSection === 'womens'    && <><PeriodTracker /><FertilityTracker /></>}
        {activeSection === 'insights'  && <><AIHealthInsights /><HealthTrendsAnalysis /></>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Daily Summary — always visible */}
      <AIHealthInsights compact />

      {/* Section grid */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Health Sections</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sections.map(s => (
            <SectionCard key={s.id} {...s} onClick={() => setActiveSection(s.id)} />
          ))}
        </div>
      </div>

      {/* Today's quick log */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NutritionTracker />
        <ExerciseTracker />
      </div>
    </div>
  );
}