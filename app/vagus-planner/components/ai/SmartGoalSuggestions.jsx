import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, Loader2, Sparkles, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  challenging: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
};

export default function SmartGoalSuggestions() {
  const queryClient = useQueryClient();

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['goalSuggestions'],
    queryFn: async () => {
      const response = await base44.functions.invoke('generateGoalSuggestions', {});
      return response.data?.data || [];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const createGoalMutation = useMutation({
    mutationFn: (goalData) => base44.entities.Goal.create(goalData),
    onSuccess: () => {
      toast.success('Goal created successfully!');
      queryClient.invalidateQueries(['goals']);
    }
  });

  const handleCreateGoal = (suggestion) => {
    createGoalMutation.mutate({
      title: suggestion.title,
      description: suggestion.description,
      category: suggestion.category,
      status: 'not_started',
      target_date: getTargetDate(suggestion.timeframe)
    });
  };

  const getTargetDate = (timeframe) => {
    const date = new Date();
    const timeMap = {
      '1 week': 7,
      '1 month': 30,
      '3 months': 90,
      '6 months': 180,
      '1 year': 365
    };
    date.setDate(date.getDate() + (timeMap[timeframe] || 30));
    return date.toISOString().split('T')[0];
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            Generating personalized goal suggestions...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-600" />
          AI Goal Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence mode="popLayout">
          {suggestions && suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                        {suggestion.title}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {suggestion.description}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCreateGoal(suggestion)}
                      disabled={createGoalMutation.isPending}
                      className="gap-2 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      Add Goal
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {suggestion.category}
                    </Badge>
                    <Badge variant="outline" className="text-xs gap-1">
                      <Clock className="w-3 h-3" />
                      {suggestion.timeframe}
                    </Badge>
                    <Badge className={cn("text-xs", DIFFICULTY_COLORS[suggestion.difficulty])}>
                      {suggestion.difficulty}
                    </Badge>
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded p-2">
                    <span className="font-medium">Why this goal: </span>
                    {suggestion.reasoning}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">
                No suggestions yet. Add more goals and activities to get personalized recommendations.
              </p>
            </div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}