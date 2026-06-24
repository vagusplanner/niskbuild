import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, Target, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProductivityScoreCard({ data, isLoading, period, expanded = false }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.success) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-6">
          <p className="text-amber-700 text-center">Unable to analyze productivity</p>
        </CardContent>
      </Card>
    );
  }

  const trendIcons = {
    improving: TrendingUp,
    stable: Minus,
    declining: TrendingDown
  };

  const trendColors = {
    improving: 'text-green-600 bg-green-100',
    stable: 'text-blue-600 bg-blue-100',
    declining: 'text-red-600 bg-red-100'
  };

  const TrendIcon = trendIcons[data.trend] || Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Productivity Analysis
            </CardTitle>
            <Badge className={trendColors[data.trend]}>
              <TrendIcon className="w-3 h-3 mr-1" />
              {data.trend}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score */}
          <div className="text-center py-4">
            <div className="relative inline-block">
              <svg className="w-32 h-32">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="8"
                  strokeDasharray={`${(data.productivity_score / 100) * 351.86} 351.86`}
                  strokeLinecap="round"
                  transform="rotate(-90 64 64)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold text-purple-600">{data.productivity_score}</span>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-2">Productivity Score</p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-slate-500">Completion Rate</p>
              <p className="text-lg font-bold text-green-600">{data.metrics?.completion_rate}%</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-slate-500">Overdue Rate</p>
              <p className="text-lg font-bold text-red-600">{data.metrics?.overdue_rate}%</p>
            </div>
          </div>

          {/* Key Strengths */}
          {data.key_strengths?.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                Key Strengths
              </h4>
              <ul className="space-y-1">
                {data.key_strengths.slice(0, expanded ? undefined : 3).map((strength, idx) => (
                  <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {data.recommendations?.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Top Recommendations</h4>
              {data.recommendations.slice(0, expanded ? undefined : 3).map((rec, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{rec.title}</p>
                    <Badge variant="outline" className={
                      rec.impact === 'high' ? 'bg-red-50 text-red-700' :
                      rec.impact === 'medium' ? 'bg-amber-50 text-amber-700' :
                      'bg-blue-50 text-blue-700'
                    }>
                      {rec.impact} impact
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">{rec.action}</p>
                </div>
              ))}
            </div>
          )}

          {/* Category Breakdown */}
          {expanded && data.metrics?.category_breakdown && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Task Distribution</h4>
              {Object.entries(data.metrics.category_breakdown).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-slate-600">{category}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}