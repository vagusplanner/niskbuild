import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Target, Search, Sparkles } from 'lucide-react';
import QuranProgressTracker from './QuranProgressTracker';
import HadithBrowser from './HadithBrowser';
import QuranGoalManager from './QuranGoalManager';
import DailyInspiration from './DailyInspiration';

export default function QuranModule() {
  return (
    <div className="space-y-4">
      <DailyInspiration />

      <Tabs defaultValue="progress">
        <TabsList className="w-full bg-white/80 border border-emerald-100">
          <TabsTrigger value="progress" className="flex-1 gap-1.5 text-xs sm:text-sm data-[state=active]:text-emerald-700">
            <BookOpen className="w-3.5 h-3.5" /> Progress
          </TabsTrigger>
          <TabsTrigger value="hadith" className="flex-1 gap-1.5 text-xs sm:text-sm data-[state=active]:text-emerald-700">
            <Search className="w-3.5 h-3.5" /> Hadith
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex-1 gap-1.5 text-xs sm:text-sm data-[state=active]:text-emerald-700">
            <Target className="w-3.5 h-3.5" /> Goals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="mt-4">
          <QuranProgressTracker />
        </TabsContent>
        <TabsContent value="hadith" className="mt-4">
          <HadithBrowser />
        </TabsContent>
        <TabsContent value="goals" className="mt-4">
          <QuranGoalManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}