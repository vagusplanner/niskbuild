import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, TrendingUp, Heart, Clock, Target, 
  ArrowRight, RefreshCw, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProactiveSuggestionsPanel() {
  const [expanded, setExpanded] = useState(true);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['proactive-suggestions'],
    queryFn: async () => {
      const response = await base44.functions.invoke('generateProactiveSuggestions', {});
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  const suggestions = data?.suggestions || [];

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'productivity': return Target;
      case 'goals': return Target;
      case 'wellness': return Heart;
      case 'islamic': return Sparkles;
      case 'time-management': return Clock;
      default: return TrendingUp;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'productivity': return 'bg-blue-100 text-blue-700';
      case 'goals': return 'bg-indigo-100 text-indigo-700';
      case 'wellness': return 'bg-green-100 text-green-700';
      case 'islamic': return 'bg-teal-100 text-teal-700';
      case 'time-management': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-l-4 border-red-500';
      case 'medium': return 'border-l-4 border-amber-500';
      case 'low': return 'border-l-4 border-green-500';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-teal-50 via-white to-cyan-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            AI Suggestions for You
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="space-y-3">
              {suggestions.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No suggestions right now</p>
                  <p className="text-sm text-slate-400">Check back later for personalized insights</p>
                </div>
              ) : (
                suggestions.map((suggestion, index) => {
                  const Icon = getCategoryIcon(suggestion.category);
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className={`hover:shadow-md transition-all ${getPriorityColor(suggestion.priority)}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${getCategoryColor(suggestion.category)}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4 className="font-semibold text-slate-800">{suggestion.title}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {suggestion.priority}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-600 mb-3">{suggestion.description}</p>
                              {suggestion.action_url && (
                                <Link to={createPageUrl(suggestion.action_url.replace('/', ''))}>
                                  <Button variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700 -ml-2">
                                    Take Action
                                    <ArrowRight className="w-4 h-4 ml-1" />
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              )}

              {data?.context && (
                <div className="mt-4 p-3 bg-gradient-to-r from-slate-50 to-teal-50 rounded-lg border border-teal-100">
                  <p className="text-xs font-medium text-slate-700 mb-2">Analysis Summary:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>✓ {data.context.activeGoalsCount} active goals</div>
                    <div>✓ {data.context.pendingTasksCount} pending tasks</div>
                    {data.context.overdueTasksCount > 0 && (
                      <div className="text-red-600">⚠️ {data.context.overdueTasksCount} overdue</div>
                    )}
                    {data.context.timeConflictsCount > 0 && (
                      <div className="text-amber-600">⚠️ {data.context.timeConflictsCount} conflicts</div>
                    )}
                    {data.context.stalledGoalsCount > 0 && (
                      <div className="text-orange-600">⏸️ {data.context.stalledGoalsCount} stalled</div>
                    )}
                    {data.context.nearCompletionGoalsCount > 0 && (
                      <div className="text-green-600">🎯 {data.context.nearCompletionGoalsCount} almost done</div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}