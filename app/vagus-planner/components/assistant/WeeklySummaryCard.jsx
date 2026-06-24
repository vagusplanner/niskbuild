import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, Target, Zap, Calendar, 
  CheckCircle, AlertCircle, Clock, RefreshCw, Sparkles
} from 'lucide-react';

export default function WeeklySummaryCard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWeeklySummary();
  }, []);

  const loadWeeklySummary = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('analyzeUserWeek', {});
      if (response.data.success) {
        setSummary(response.data);
      }
    } catch (error) {
      console.error('Failed to load weekly summary');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !summary) {
    return (
      <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-100">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2" />
          <p className="text-sm text-slate-600">Analyzing your week...</p>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  return (
    <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-100 overflow-hidden">
      <CardHeader className="border-b bg-gradient-to-r from-teal-100/50 to-cyan-100/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            Weekly Summary
          </CardTitle>
          <Button
            onClick={loadWeeklySummary}
            disabled={loading}
            size="sm"
            variant="ghost"
            className="h-8"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <Calendar className="w-5 h-5 text-teal-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-800">{summary.stats.events_this_week}</p>
            <p className="text-xs text-slate-600">Events</p>
          </div>
          <div className="text-center">
            <Target className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-800">{summary.stats.pending_tasks}</p>
            <p className="text-xs text-slate-600">Tasks</p>
          </div>
          <div className="text-center">
            <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-800">{summary.stats.completed_this_week}</p>
            <p className="text-xs text-slate-600">Done</p>
          </div>
          <div className="text-center">
            <Zap className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-800">{summary.stats.current_streak}</p>
            <p className="text-xs text-slate-600">Streak</p>
          </div>
        </div>

        {/* AI Summary */}
        {summary.analysis.summary && (
          <div className="p-4 bg-white rounded-xl border border-teal-100">
            <p className="text-sm text-slate-700 leading-relaxed">{summary.analysis.summary}</p>
          </div>
        )}

        {/* Achievements */}
        {summary.analysis.achievements?.length > 0 && (
          <div>
            <h5 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              This Week's Wins
            </h5>
            <div className="space-y-1.5">
              {summary.analysis.achievements.map((achievement, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-2"
                >
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-600">{achievement}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Priorities */}
        {summary.analysis.priorities?.length > 0 && (
          <div>
            <h5 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              Top Priorities
            </h5>
            <div className="space-y-1.5">
              {summary.analysis.priorities.map((priority, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <span className="text-sm text-slate-600">{priority}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time Suggestions */}
        {summary.analysis.time_suggestions?.length > 0 && (
          <div>
            <h5 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              Optimal Times
            </h5>
            <div className="space-y-2">
              {summary.analysis.time_suggestions.slice(0, 3).map((suggestion, idx) => (
                <div key={idx} className="p-3 bg-white rounded-lg border border-teal-100">
                  <p className="text-sm font-medium text-slate-800">{suggestion.task}</p>
                  <p className="text-xs text-teal-700 mt-1">
                    {suggestion.suggested_day} at {suggestion.suggested_time}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{suggestion.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conflicts */}
        {summary.conflicts?.length > 0 && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">
                  {summary.conflicts.length} Scheduling Conflict{summary.conflicts.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {summary.conflicts[0].event1} vs {summary.conflicts[0].event2}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Motivation */}
        {summary.analysis.motivation && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
            <p className="text-sm text-slate-700 italic">"{summary.analysis.motivation}"</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}