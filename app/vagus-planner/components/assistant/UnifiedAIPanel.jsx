import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, MessageSquare, Brain, Calendar, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import UnifiedAIAssistant from './UnifiedAIAssistant';
import ProactiveSuggestionsPanel from './ProactiveSuggestionsPanel';
import CalendarVoiceInterface from '@/components/calendar/CalendarVoiceInterface';
import ProactiveEventSuggestions from '@/components/calendar/ProactiveEventSuggestions';
import AICalendarSummaryCard from '@/components/calendar/AICalendarSummaryCard';
import AIScheduleSuggestions from '@/components/calendar/AIScheduleSuggestions';
import PredictiveAlertsPanel from '@/components/predictive/PredictiveAlertsPanel';
import InsightsPanel from '@/components/analytics/InsightsPanel';
import SmartFastingSuggestions from '@/components/calendar/SmartFastingSuggestions';
import AITimeBlocker from '@/components/calendar/AITimeBlocker';

export default function UnifiedAIPanel({ 
  events = [], 
  tasks = [], 
  settings = {},
  onCreateEvent,
  onApplySuggestion,
  islamicMode = false,
  mode = 'calendar' // 'calendar' or 'chat'
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('assistant');

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-purple-200 dark:border-purple-800 overflow-hidden shadow-lg">
      {/* Header - Always Visible */}
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
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">AI Assistant</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {isExpanded ? 'Tap to collapse' : 'Tap to access all AI features'}
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

      {/* Expandable Content */}
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
                  <TabsTrigger value="assistant" className="text-xs">
                    <Brain className="w-3 h-3 mr-1" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="voice" className="text-xs">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Voice
                  </TabsTrigger>
                  <TabsTrigger value="insights" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Insights
                  </TabsTrigger>
                  <TabsTrigger value="planner" className="text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    Plan
                  </TabsTrigger>
                  <TabsTrigger value="fasting" className="text-xs">
                    🌙
                    Fasting
                  </TabsTrigger>
                  <TabsTrigger value="timeblock" className="text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    Block
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="assistant" className="p-4 pt-0">
                <UnifiedAIAssistant
                  events={events}
                  tasks={tasks}
                  settings={settings}
                  onCreateEvent={onCreateEvent}
                  onApplySuggestion={onApplySuggestion}
                />
              </TabsContent>

              <TabsContent value="voice" className="p-4 pt-0">
                <CalendarVoiceInterface />
              </TabsContent>

              <TabsContent value="insights" className="p-4 pt-0 space-y-4">
                <AICalendarSummaryCard />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <PredictiveAlertsPanel />
                  <InsightsPanel />
                </div>
                <AIScheduleSuggestions onAddEvent={onCreateEvent} />
              </TabsContent>

              <TabsContent value="planner" className="p-4 pt-0 space-y-4">
                <ProactiveEventSuggestions 
                  onEventCreated={() => {
                    onApplySuggestion?.();
                  }}
                />
              </TabsContent>

              <TabsContent value="fasting" className="p-4 pt-0">
                <SmartFastingSuggestions />
              </TabsContent>
              <TabsContent value="timeblock" className="p-4 pt-0">
                <AITimeBlocker onEventCreated={onCreateEvent} islamicMode={islamicMode} />
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}