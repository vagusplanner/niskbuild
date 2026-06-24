import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, TrendingUp, AlertCircle, CheckCircle, 
  RefreshCw, Loader2, Apple, Dumbbell, Moon, Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  nutrition: Apple,
  exercise: Dumbbell,
  sleep: Moon,
  mood: Heart,
  general: Sparkles
};

const PRIORITY_COLORS = {
  high: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200',
  medium: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200',
  low: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200'
};

export default function ProactiveHealthInsights() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: recommendations, isLoading, refetch } = useQuery({
    queryKey: ['healthRecommendations'],
    queryFn: async () => {
      const response = await SDK.functions.invoke('generateHealthRecommendations', {});
      return response.data?.data || [];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            Analyzing your health data...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950 border-teal-200 dark:border-teal-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            AI Health Insights
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence mode="popLayout">
          {recommendations && recommendations.length > 0 ? (
            recommendations.map((rec, index) => {
              const Icon = ICON_MAP[rec.category] || Sparkles;
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "p-4 rounded-lg border",
                    PRIORITY_COLORS[rec.priority] || PRIORITY_COLORS.low
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{rec.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {rec.category}
                        </Badge>
                      </div>
                      <p className="text-sm opacity-90">
                        {rec.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-teal-500 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">
                You're doing great! Keep tracking your health data for personalized insights.
              </p>
            </div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}