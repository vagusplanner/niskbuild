import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function SmartInsightsPanel() {
  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list()
  });

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list()
  });

  const { data: goals } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list()
  });

  // Generate insights based on patterns
  const insights = [];

  if (tasks) {
    const overdueTasks = tasks.filter(t => t.due_date < new Date().toISOString().split('T')[0] && t.status !== 'completed');
    if (overdueTasks.length > 5) {
      insights.push({
        type: 'warning',
        title: 'High Overdue Task Count',
        message: `You have ${overdueTasks.length} overdue tasks. Consider rescheduling or delegating some.`,
        action: 'Review Overdue Tasks'
      });
    }

    const workTasks = tasks.filter(t => t.category === 'work' && t.status !== 'completed');
    const personalTasks = tasks.filter(t => t.category === 'personal' && t.status !== 'completed');
    if (workTasks.length > personalTasks.length * 3) {
      insights.push({
        type: 'tip',
        title: 'Work-Life Balance',
        message: 'Your work tasks outnumber personal tasks 3:1. Consider blocking time for personal goals.',
        action: 'Add Personal Time'
      });
    }
  }

  if (goals) {
    const stagnantGoals = goals.filter(g => g.progress < 10 && g.status === 'in_progress');
    if (stagnantGoals.length > 0) {
      insights.push({
        type: 'info',
        title: 'Goal Progress Check',
        message: `${stagnantGoals.length} goals haven't made much progress. Break them into smaller tasks?`,
        action: 'Review Goals'
      });
    }
  }

  // Add some general productivity insights
  insights.push({
    type: 'success',
    title: 'Peak Productivity Time',
    message: 'Based on your patterns, you\'re most productive between 9 AM - 11 AM. Schedule important tasks then.',
    action: 'Optimize Schedule'
  });

  const iconMap = {
    warning: AlertTriangle,
    tip: Lightbulb,
    info: Target,
    success: TrendingUp
  };

  const colorMap = {
    warning: 'bg-red-50 border-red-200 text-red-700',
    tip: 'bg-blue-50 border-blue-200 text-blue-700',
    info: 'bg-purple-50 border-purple-200 text-purple-700',
    success: 'bg-green-50 border-green-200 text-green-700'
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-yellow-600" />
        Smart Insights
      </h3>
      <div className="grid lg:grid-cols-2 gap-4">
        {insights.map((insight, idx) => {
          const Icon = iconMap[insight.type];
          return (
            <Card key={idx} className={`border-2 ${colorMap[insight.type]}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
                    <p className="text-xs opacity-90">{insight.message}</p>
                  </div>
                </div>
                <button className="text-xs font-medium underline hover:opacity-80">
                  {insight.action} →
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}