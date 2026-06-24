import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function AIPlanRecommendation({ currentPlan, usageData, onUpgrade }) {
  const [recommendation, setRecommendation] = useState(null);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('recommendUpgradePlan', {
        usageData,
        currentPlan,
        planLimits: {
          free: { ai_requests: 100, events: 20, storage_mb: 500 },
          basic: { ai_requests: 1000, events: 50, storage_mb: 2000 },
          pro: { ai_requests: 5000, events: 200, storage_mb: 10000 },
          enterprise: { ai_requests: -1, events: -1, storage_mb: 50000 }
        }
      });
      return data.recommendation;
    },
    onSuccess: (data) => {
      setRecommendation(data);
      toast.success('AI analysis complete');
    },
    onError: (error) => {
      toast.error('Failed to analyze usage');
      console.error('Analysis error:', error);
    }
  });

  const urgencyConfig = {
    low: { color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
    medium: { color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
    high: { color: 'bg-red-100 text-red-700', icon: AlertCircle }
  };

  const confidenceConfig = {
    low: { color: 'bg-slate-100 text-slate-700', label: 'Low Confidence' },
    medium: { color: 'bg-blue-100 text-blue-700', label: 'Medium Confidence' },
    high: { color: 'bg-teal-100 text-teal-700', label: 'High Confidence' }
  };

  if (currentPlan === 'enterprise') {
    return null; // No recommendations for enterprise users
  }

  return (
    <Card className="border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            <CardTitle>AI-Powered Plan Recommendation</CardTitle>
          </div>
          {!recommendation && (
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              size="sm"
              className="bg-teal-600 hover:bg-teal-700"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Analyze My Usage
                </>
              )}
            </Button>
          )}
        </div>
        <CardDescription>
          Let AI analyze your usage patterns and recommend the perfect plan for your needs
        </CardDescription>
      </CardHeader>

      {recommendation && (
        <CardContent className="space-y-4">
          {/* Recommendation Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 capitalize">
                {recommendation.recommended_plan} Plan
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Recommended for you
              </p>
            </div>
            <div className="flex gap-2">
              <Badge className={confidenceConfig[recommendation.confidence]?.color}>
                {confidenceConfig[recommendation.confidence]?.label}
              </Badge>
              {recommendation.urgency && (
                <Badge className={urgencyConfig[recommendation.urgency]?.color}>
                  {recommendation.urgency.toUpperCase()} Priority
                </Badge>
              )}
            </div>
          </div>

          {/* Personalized Message */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-teal-200">
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              {recommendation.personalized_message}
            </p>
          </div>

          {/* Key Reasons */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Why {recommendation.recommended_plan} Plan?
            </h4>
            <div className="space-y-2">
              {recommendation.key_reasons?.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-700 dark:text-slate-300">{reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Estimated Benefits */}
          {recommendation.estimated_benefits && (
            <div className="bg-teal-100 dark:bg-teal-900 p-3 rounded-lg">
              <h4 className="font-semibold text-teal-900 dark:text-teal-100 mb-1 text-sm">
                Expected Benefits
              </h4>
              <p className="text-sm text-teal-800 dark:text-teal-200">
                {recommendation.estimated_benefits}
              </p>
            </div>
          )}

          {/* Usage Insights */}
          {recommendation.usage_insights && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {recommendation.usage_insights.current_usage_percentage !== undefined && (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Current Usage</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {Math.round(recommendation.usage_insights.current_usage_percentage)}%
                  </p>
                </div>
              )}
              {recommendation.usage_insights.bottlenecks?.length > 0 && (
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Bottlenecks</p>
                  <p className="text-sm font-semibold text-red-600">
                    {recommendation.usage_insights.bottlenecks.join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => onUpgrade(recommendation.recommended_plan)}
              className={cn(
                "flex-1",
                recommendation.urgency === 'high' && "bg-red-600 hover:bg-red-700",
                recommendation.urgency === 'medium' && "bg-yellow-600 hover:bg-yellow-700",
                recommendation.urgency === 'low' && "bg-teal-600 hover:bg-teal-700"
              )}
            >
              Upgrade to {recommendation.recommended_plan}
            </Button>
            <Button
              onClick={() => analyzeMutation.mutate()}
              variant="outline"
              disabled={analyzeMutation.isPending}
            >
              Re-analyze
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}