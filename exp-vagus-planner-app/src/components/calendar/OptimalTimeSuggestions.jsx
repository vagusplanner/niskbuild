import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Clock, Calendar, TrendingUp, Loader2, RefreshCw } from 'lucide-react';
import { SDK } from '@/lib/custom-sdk.js';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function OptimalTimeSuggestions({ 
  eventDuration = 60, 
  eventCategory = 'personal',
  onTimeSelect,
  triggerRefresh = 0
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data } = await SDK.functions.invoke('suggestOptimalEventTimes', {
        event_duration: eventDuration,
        event_category: eventCategory,
        days_ahead: 7
      });

      if (data.suggestions) {
        setSuggestions(data.suggestions);
        setAnalysis(data.analysis);
      }
    } catch (error) {
      console.error('Error fetching optimal times:', error);
      toast.error('Failed to fetch time suggestions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [eventDuration, eventCategory, triggerRefresh]);

  const getScoreColor = (score) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-teal-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getScoreBadge = (score) => {
    if (score >= 90) return { label: 'Excellent', variant: 'default', color: 'bg-green-100 text-green-700 border-green-300' };
    if (score >= 75) return { label: 'Good', variant: 'secondary', color: 'bg-teal-100 text-teal-700 border-teal-300' };
    if (score >= 60) return { label: 'Fair', variant: 'outline', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' };
    return { label: 'Available', variant: 'outline', color: 'bg-orange-100 text-orange-700 border-orange-300' };
  };

  return (
    <Card className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">AI Time Suggestions</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchSuggestions}
          disabled={loading}
          className="h-8 w-8"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {analysis && (
        <div className="mb-4 p-3 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-purple-100 dark:border-purple-800">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span>
              Analyzed {analysis.total_events} events • 
              Working hours: {analysis.working_hours.start}:00 - {analysis.working_hours.end}:00
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2 max-h-96 overflow-y-auto"
          >
            {suggestions.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                No available time slots found. Try adjusting the duration or date range.
              </p>
            ) : (
              suggestions.map((slot, idx) => {
                const scoreBadge = getScoreBadge(slot.score);
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => onTimeSelect(slot.date, slot.time)}
                    className="p-3 bg-white dark:bg-slate-900 rounded-lg border-2 border-purple-100 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-600 cursor-pointer transition-all group hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-purple-600 flex-shrink-0" />
                          <span className="font-medium text-sm text-slate-800 dark:text-slate-100">
                            {slot.dayOfWeek}, {format(parseISO(slot.date), 'MMM d')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {slot.time} ({eventDuration} min)
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {slot.reason}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={`${scoreBadge.color} text-xs`}>
                          {scoreBadge.label}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getScoreColor(slot.score)} transition-all`}
                              style={{ width: `${slot.score}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {slot.score}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800">
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          💡 Suggestions based on your schedule patterns, work style, and preferences
        </p>
      </div>
    </Card>
  );
}