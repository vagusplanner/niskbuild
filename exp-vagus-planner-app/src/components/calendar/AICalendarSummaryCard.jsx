import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SDK } from '@/lib/custom-sdk.js';
import { Sparkles, Loader2, Calendar, TrendingUp, Clock, Lightbulb } from 'lucide-react';
import UpgradeGate from '@/components/billing/UpgradeGate';
import { toast } from 'sonner';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format } from 'date-fns';

export default function AICalendarSummaryCard() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [period, setPeriod] = useState('daily');

  // Soft gate: free users see one summary then get upgrade nudge
  const [usageCount, setUsageCount] = useState(() =>
    parseInt(localStorage.getItem('ai_summary_uses') || '0', 10)
  );

  const generateSummary = async (selectedPeriod) => {
    setLoading(true);
    try {
      const today = new Date();
      const start_date = selectedPeriod === 'daily' 
        ? startOfDay(today).toISOString()
        : startOfWeek(today, { weekStartsOn: 1 }).toISOString();
      
      const end_date = selectedPeriod === 'daily'
        ? endOfDay(today).toISOString()
        : endOfWeek(today, { weekStartsOn: 1 }).toISOString();

      const { data } = await SDK.functions.invoke('aiEventSummary', {
        period: selectedPeriod,
        start_date,
        end_date
      });

      if (data.success) {
        setSummary(data.summary);
        const n = usageCount + 1;
        setUsageCount(n);
        localStorage.setItem('ai_summary_uses', String(n));
      }
    } catch (error) {
      toast.error('Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateSummary(period);
  }, [period]);

  const workloadColors = {
    light: 'bg-emerald-100 text-emerald-800',
    moderate: 'bg-blue-100 text-blue-800',
    busy: 'bg-amber-100 text-amber-800',
    very_busy: 'bg-red-100 text-red-800'
  };

  return (
    <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-teal-600" />
          AI Calendar Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={period} onValueChange={(val) => setPeriod(val)}>
          <TabsList className="w-full">
            <TabsTrigger value="daily" className="flex-1">Today</TabsTrigger>
            <TabsTrigger value="weekly" className="flex-1">This Week</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
           <div className="flex items-center justify-center py-8">
             <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
           </div>
         ) : summary && typeof summary === 'object' && Object.keys(summary).length > 0 ? (
           <div className="space-y-4">
            {/* Overview */}
            {summary.overview && (
              <div className="p-4 bg-white rounded-lg border border-teal-200">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <h4 className="font-semibold text-slate-800">Overview</h4>
                </div>
                <p className="text-sm text-slate-600">
                  {typeof summary.overview === 'string' 
                    ? summary.overview 
                    : JSON.stringify(summary.overview)}
                </p>
              </div>
            )}

            {/* Workload */}
            {summary.workload && (
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-600">Workload:</span>
                <Badge className={workloadColors[summary.workload] || 'bg-slate-100 text-slate-800'}>
                  {typeof summary.workload === 'string' 
                    ? summary.workload.replace('_', ' ').toUpperCase()
                    : 'MODERATE'}
                </Badge>
              </div>
            )}

            {/* Statistics */}
            {summary.statistics && typeof summary.statistics === 'object' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500">Total Events</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {summary.statistics.total_events || 0}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500">High Priority</p>
                  <p className="text-2xl font-bold text-red-600">
                    {summary.statistics.high_priority || 0}
                  </p>
                </div>
              </div>
            )}

            {/* Key Events */}
            {summary.key_events && Array.isArray(summary.key_events) && summary.key_events.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Key Events
                </h4>
                {summary.key_events.map((event, idx) => {
                  if (typeof event === 'string') {
                    return (
                      <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200">
                        <p className="font-medium text-slate-800 text-sm">{event}</p>
                      </div>
                    );
                  }
                  
                  if (typeof event === 'object' && event !== null) {
                    return (
                      <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-slate-800 text-sm">
                              {event.title || 'Event'}
                            </p>
                            {event.time && typeof event.time === 'string' && (
                              <p className="text-xs text-slate-500">{event.time}</p>
                            )}
                          </div>
                          {event.importance && typeof event.importance === 'string' && (
                            <Badge variant="outline" className="text-xs">
                              {event.importance}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  }
                  
                  return null;
                })}
              </div>
            )}

            {/* AI Advice */}
            {summary.advice && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-purple-900 text-sm mb-1">AI Tip</h4>
                    <p className="text-xs text-slate-700">
                      {typeof summary.advice === 'string' 
                        ? summary.advice 
                        : Array.isArray(summary.advice) 
                          ? summary.advice.join(', ')
                          : JSON.stringify(summary.advice)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {usageCount >= 2 ? (
              <UpgradeGate
                locked={true}
                minimal={true}
                feature="AI Calendar Summary"
                requiredPlan="Pro"
                description="Upgrade to refresh summaries unlimited times with real-time AI insights."
              >
                <span />
              </UpgradeGate>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateSummary(period)}
                className="w-full"
              >
                Refresh Summary
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center text-slate-500 py-8">
            <p className="text-sm">No summary available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}