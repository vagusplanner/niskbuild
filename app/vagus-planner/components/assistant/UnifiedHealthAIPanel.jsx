import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, ChevronDown, Brain, Activity, TrendingUp } from 'lucide-react';
import AIHealthCoach from '@/components/health/AIHealthCoach';
import AIHealthInsights from '@/components/health/AIHealthInsights';
import AIDietPlanner from '@/components/health/AIDietPlanner';

export default function UnifiedHealthAIPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('coach');

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-purple-200 dark:border-purple-800 overflow-hidden shadow-lg">
      <div 
        className="p-4 cursor-pointer hover:bg-white/50 dark:hover:bg-slate-900/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Health AI Assistant</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {isExpanded ? 'Tap to collapse' : 'Tap to access all health AI features'}
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
                <TabsList className="w-full grid grid-cols-3 bg-white/50 dark:bg-slate-800/50 h-10 p-1">
                  <TabsTrigger value="coach" className="text-xs">
                    <Brain className="w-3 h-3 mr-1" />
                    Coach
                  </TabsTrigger>
                  <TabsTrigger value="insights" className="text-xs">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Insights
                  </TabsTrigger>
                  <TabsTrigger value="nutrition" className="text-xs">
                    <Activity className="w-3 h-3 mr-1" />
                    Nutrition
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="coach" className="p-4 pt-0">
                <AIHealthCoach />
              </TabsContent>

              <TabsContent value="insights" className="p-4 pt-0">
                <AIHealthInsights />
              </TabsContent>

              <TabsContent value="nutrition" className="p-4 pt-0">
                <AIDietPlanner />
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}