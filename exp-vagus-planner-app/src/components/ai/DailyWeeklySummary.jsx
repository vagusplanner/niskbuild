import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { 
  Calendar, TrendingUp, Award, Lightbulb, 
  Loader2, RefreshCw, CheckCircle, AlertCircle, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SENTIMENT_CONFIG = {
  positive: { icon: CheckCircle, color: 'text-green-600' },
  neutral: { icon: Info, color: 'text-blue-600' },
  concern: { icon: AlertCircle, color: 'text-amber-600' }
};

export default function DailyWeeklySummary() {
  const [period, setPeriod] = useState('daily');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['healthProductivitySummary', period],
    queryFn: async () => {
      const response = await SDK.functions.invoke('generateHealthProductivitySummary', { period });
      return response.data?.data || null;
    },
    staleTime: period === 'daily' ? 1000 * 60 * 30 : 1000 * 60 * 60, // 30 min for daily, 1 hour for weekly
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
            Generating your {period} summary...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            AI Summary
          </CardTitle>
          <div className="flex items-center gap-2">
            <Tabs value={period} onValueChange={setPeriod}>
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {summary ? (
          <>
            {/* Headline */}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                {summary.headline}
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                {summary.overview}
              </p>
            </div>

            {/* Scores */}
            {summary.score && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(summary.score).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-2">
                      <svg className="w-20 h-20 transform -rotate-90">
                        <circle
                          cx="40"
                          cy="40"
                          r="35"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-slate-200 dark:text-slate-700"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r="35"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 35}`}
                          strokeDashoffset={`${2 * Math.PI * 35 * (1 - value / 100)}`}
                          className={cn(
                            value >= 75 ? 'text-green-500' :
                            value >= 50 ? 'text-amber-500' :
                            'text-red-500'
                          )}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold">{value}</span>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 capitalize">
                      {key}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Highlights */}
            {summary.highlights && summary.highlights.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  Highlights
                </h4>
                <div className="space-y-2">
                  {summary.highlights.map((highlight, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      {highlight}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Insights */}
            {summary.insights && summary.insights.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Insights
                </h4>
                <div className="space-y-3">
                  {summary.insights.map((insight, index) => {
                    const SentimentIcon = SENTIMENT_CONFIG[insight.sentiment]?.icon || Info;
                    const iconColor = SENTIMENT_CONFIG[insight.sentiment]?.color || 'text-slate-600';
                    
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex items-start gap-3">
                          <SentimentIcon className={cn("w-5 h-5 mt-0.5 shrink-0", iconColor)} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-medium text-sm">{insight.title}</h5>
                              <Badge variant="outline" className="text-xs">
                                {insight.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {insight.description}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {summary.recommendations && summary.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  Recommendations
                </h4>
                <ul className="space-y-2">
                  {summary.recommendations.map((rec, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <span className="text-amber-600 shrink-0">•</span>
                      {rec}
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">
              No summary available yet. Keep tracking your activities!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}