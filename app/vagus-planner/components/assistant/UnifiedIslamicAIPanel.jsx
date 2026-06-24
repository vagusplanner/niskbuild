import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, ChevronDown, Moon, Brain, BookOpen, Heart, Calculator } from 'lucide-react';
import AIHadithGenerator from '@/components/islamic/AIHadithGenerator';
import AIContextualDuaSuggester from '@/components/islamic/AIContextualDuaSuggester';
import AIPrayerCoach from '@/components/islamic/AIPrayerCoach';
import PrayerAIInsights from '@/components/islamic/PrayerAIInsights';
import PersonalizedIslamicAI from '@/components/islamic/PersonalizedIslamicAI';
import AIZakatRecommendations from '@/components/islamic/AIZakatRecommendations';
import AISadaqahTracker from '@/components/islamic/AISadaqahTracker';

export default function UnifiedIslamicAIPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('insights');

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-emerald-50 dark:from-purple-950/30 dark:to-emerald-950/30 border-emerald-200 dark:border-emerald-800 overflow-hidden shadow-lg">
      <div 
        className="p-4 cursor-pointer hover:bg-white/50 dark:hover:bg-slate-900/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
              <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Islamic AI Assistant</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {isExpanded ? 'Tap to collapse' : 'Tap to access all Islamic AI features'}
              </p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-4 pb-2">
                <TabsList className="w-full grid grid-cols-5 bg-white/50 dark:bg-slate-800/50 h-10 p-1">
                  <TabsTrigger value="insights" className="text-xs">
                    <Brain className="w-3 h-3 mr-1" />
                    Insights
                  </TabsTrigger>
                  <TabsTrigger value="prayer" className="text-xs">
                    <Moon className="w-3 h-3 mr-1" />
                    Prayer
                  </TabsTrigger>
                  <TabsTrigger value="learning" className="text-xs">
                    <BookOpen className="w-3 h-3 mr-1" />
                    Learn
                  </TabsTrigger>
                  <TabsTrigger value="dua" className="text-xs">
                    <Heart className="w-3 h-3 mr-1" />
                    Du'a
                  </TabsTrigger>
                  <TabsTrigger value="charity" className="text-xs">
                    <Calculator className="w-3 h-3 mr-1" />
                    Charity
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="insights" className="p-4 pt-0">
                <PersonalizedIslamicAI />
              </TabsContent>

              <TabsContent value="prayer" className="p-4 pt-0 space-y-4">
                <AIPrayerCoach />
                <PrayerAIInsights />
              </TabsContent>

              <TabsContent value="learning" className="p-4 pt-0 space-y-4">
                <AIHadithGenerator />
              </TabsContent>

              <TabsContent value="dua" className="p-4 pt-0">
                <AIContextualDuaSuggester />
              </TabsContent>

              <TabsContent value="charity" className="p-4 pt-0 space-y-4">
                <AIZakatRecommendations />
                <AISadaqahTracker />
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}