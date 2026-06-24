import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const FEATURE_ICONS = {
  events_created: '📅',
  ai_requests: '🤖',
  storage_gb: '💾',
  team_members: '👥',
  integrations: '🔗',
  api_calls: '⚙️'
};

const FEATURE_NAMES = {
  events_created: 'Events Created',
  ai_requests: 'AI Requests',
  storage_gb: 'Storage',
  team_members: 'Team Members',
  integrations: 'Integrations',
  api_calls: 'API Calls'
};

export default function UsageTracker({ usageData, plan }) {
  if (!usageData || usageData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage & Limits</CardTitle>
          <CardDescription>{plan.charAt(0).toUpperCase() + plan.slice(1)} Plan</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">No usage data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage & Limits</CardTitle>
        <CardDescription>
          Billing period: {new Date().toLocaleDateString()} – {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {usageData.map(usage => {
          const isWarning = usage.percentage >= 80;
          const isOverage = usage.percentage > 100;

          return (
            <div key={usage.feature} className={cn(
              'p-3 rounded-lg border',
              isOverage && 'bg-red-50 border-red-200',
              isWarning && !isOverage && 'bg-amber-50 border-amber-200',
              !isWarning && 'bg-slate-50 border-slate-200'
            )}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    <span>{FEATURE_ICONS[usage.feature]}</span>
                    {FEATURE_NAMES[usage.feature]}
                  </p>
                  <p className="text-sm text-slate-600">
                    {usage.count} / {usage.limit}{usage.feature === 'storage_gb' ? ' GB' : ''}
                  </p>
                </div>
                <div className="text-right">
                  {isOverage && (
                    <div className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-semibold">Over limit</span>
                    </div>
                  )}
                  {isWarning && !isOverage && (
                    <div className="flex items-center gap-1 text-amber-600">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm font-semibold">{Math.round(usage.percentage)}%</span>
                    </div>
                  )}
                  {!isWarning && (
                    <span className="text-sm text-slate-600">{Math.round(usage.percentage)}%</span>
                  )}
                </div>
              </div>

              <Progress
                value={Math.min(usage.percentage, 100)}
                className={cn(
                  'h-2',
                  isOverage && '[&>div]:bg-red-600',
                  isWarning && !isOverage && '[&>div]:bg-amber-500'
                )}
              />

              {isWarning && (
                <p className="text-xs mt-2 text-slate-600">
                  {isOverage 
                    ? 'You have exceeded your limit. Consider upgrading your plan.'
                    : 'You are close to your limit. Consider upgrading soon.'}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}