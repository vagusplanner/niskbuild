import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, ChevronDown, Plane, Map, TrendingUp } from 'lucide-react';
import AIHolidaySuggestions from '@/components/holiday/AIHolidaySuggestions';
import PersonalizedTravelInsights from '@/components/holiday/PersonalizedTravelInsights';
import BudgetInsights from '@/components/holiday/BudgetInsights';
import AIItinerarySuggestions from '@/components/holiday/AIItinerarySuggestions';
import AITravelAlertsMonitor from '@/components/holiday/AITravelAlertsMonitor';
import AIPackingListGenerator from '@/components/holiday/AIPackingListGenerator';

export default function UnifiedHolidayAIPanel({ onCreateHoliday }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('suggestions');

  return (
    <Card className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-950/30 dark:to-teal-950/30 border-teal-200 dark:border-teal-800 overflow-hidden shadow-lg">
      <div 
        className="p-4 cursor-pointer hover:bg-white/50 dark:hover:bg-slate-900/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
              <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Travel AI Assistant</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {isExpanded ? 'Tap to collapse' : 'Tap to access all travel AI features'}
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
                <TabsList className="w-full grid grid-cols-3 lg:grid-cols-6 bg-white/50 dark:bg-slate-800/50 h-auto p-1">
                  <TabsTrigger value="itinerary" className="text-xs">
                    <Map className="w-3 h-3 mr-1" />
                    Itinerary
                  </TabsTrigger>
                  <TabsTrigger value="alerts" className="text-xs">
                    🔔
                    Alerts
                  </TabsTrigger>
                  <TabsTrigger value="packing" className="text-xs">
                    🎒
                    Packing
                  </TabsTrigger>
                  <TabsTrigger value="suggestions" className="text-xs">
                    <Plane className="w-3 h-3 mr-1" />
                    Ideas
                  </TabsTrigger>
                  <TabsTrigger value="insights" className="text-xs">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Insights
                  </TabsTrigger>
                  <TabsTrigger value="budget" className="text-xs">
                    💰
                    Budget
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="itinerary" className="p-4 pt-0">
                <AIItinerarySuggestions onCreateTrip={onCreateHoliday} />
              </TabsContent>

              <TabsContent value="alerts" className="p-4 pt-0">
                <AITravelAlertsMonitor />
              </TabsContent>

              <TabsContent value="packing" className="p-4 pt-0">
                <AIPackingListGenerator />
              </TabsContent>

              <TabsContent value="suggestions" className="p-4 pt-0">
                <AIHolidaySuggestions onCreateHoliday={onCreateHoliday} />
              </TabsContent>

              <TabsContent value="insights" className="p-4 pt-0">
                <PersonalizedTravelInsights />
              </TabsContent>

              <TabsContent value="budget" className="p-4 pt-0">
                <BudgetInsights />
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}