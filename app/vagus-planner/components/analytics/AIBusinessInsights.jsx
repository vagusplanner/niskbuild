import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, Sparkles, DollarSign, Target, AlertCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function AIBusinessInsights({ section }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    enabled: section === 'billing'
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
    enabled: section === 'holidays'
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events-insights'],
    queryFn: () => base44.entities.Event.list(),
    enabled: section === 'dashboard'
  });

  const { data: sleep = [] } = useQuery({
    queryKey: ['sleep-insights'],
    queryFn: () => base44.entities.Sleep.list('-date', 30),
    enabled: section === 'health'
  });

  const { data: prayerLogs = [] } = useQuery({
    queryKey: ['prayer-logs'],
    queryFn: () => base44.entities.PrayerLog.list('-date', 30),
    enabled: section === 'islamic'
  });

  const analyzeData = async () => {
    setLoading(true);
    try {
      let prompt = '';
      let data = {};

      switch (section) {
        case 'billing':
          const totalSpent = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
          const avgMonthly = invoices.length > 0 ? totalSpent / invoices.length : 0;
          prompt = `Analyze billing and spending patterns:

Total Invoices: ${invoices.length}
Total Spent: $${totalSpent.toFixed(2)}
Average Monthly: $${avgMonthly.toFixed(2)}
Recent Invoices: ${invoices.slice(0, 3).map(i => `$${i.amount} (${i.plan})`).join(', ')}

Provide:
1. Spending trend analysis
2. Cost optimization suggestions
3. Plan upgrade/downgrade recommendation
4. Budget forecast for next 3 months`;
          break;

        case 'holidays':
          const totalBudget = holidays.reduce((sum, h) => sum + (h.budget || 0), 0);
          const avgBudget = holidays.length > 0 ? totalBudget / holidays.length : 0;
          prompt = `Analyze holiday spending and travel patterns:

Total Trips: ${holidays.length}
Total Budget: $${totalBudget.toFixed(2)}
Average Budget: $${avgBudget.toFixed(2)}
Destinations: ${holidays.map(h => h.destination).join(', ')}
Status: ${holidays.map(h => h.status).join(', ')}

Provide:
1. Spending pattern analysis
2. Cost optimization strategies for future trips
3. Best time to book recommendations
4. Budget allocation tips`;
          break;

        case 'dashboard':
          const eventsByCategory = events.reduce((acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + 1;
            return acc;
          }, {});
          prompt = `Analyze user engagement and activity patterns:

Total Events: ${events.length}
Events by Category: ${Object.entries(eventsByCategory).map(([cat, count]) => `${cat}: ${count}`).join(', ')}
Most Active Category: ${Object.entries(eventsByCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}

Provide:
1. Engagement trend analysis
2. Most/least used features
3. Productivity patterns
4. Recommendations to maximize app value`;
          break;

        case 'health':
          const avgSleep = sleep.length > 0 ? sleep.reduce((sum, s) => sum + (s.hours || 0), 0) / sleep.length : 0;
          prompt = `Analyze health and wellness patterns:

Sleep Logs (30 days): ${sleep.length}
Average Sleep: ${avgSleep.toFixed(1)} hours
Sleep Quality Trend: ${sleep.slice(0, 5).map(s => s.quality).join(', ')}

Provide:
1. Sleep pattern analysis
2. Health trend insights
3. Personalized wellness recommendations
4. Areas for improvement`;
          break;

        case 'islamic':
          const prayerRate = prayerLogs.length > 0 ? (prayerLogs.filter(p => p.prayed).length / prayerLogs.length * 100) : 0;
          prompt = `Analyze Islamic practice patterns:

Prayer Logs (30 days): ${prayerLogs.length}
Prayer Completion Rate: ${prayerRate.toFixed(1)}%
Most Consistent: ${prayerLogs.filter(p => p.prayed).slice(0, 3).map(p => p.prayer_name).join(', ')}

Provide:
1. Practice consistency analysis
2. Progress trends
3. Personalized spiritual growth recommendations
4. Actionable improvement steps`;
          break;
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            trend: { type: "string" },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  impact: { type: "string" }
                }
              }
            },
            forecast: { type: "string" },
            action_items: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setInsights(response);
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const sectionConfig = {
    billing: { icon: DollarSign, title: 'Billing Insights', color: 'text-green-600', bg: 'bg-green-50' },
    holidays: { icon: Target, title: 'Travel Insights', color: 'text-blue-600', bg: 'bg-blue-50' },
    dashboard: { icon: TrendingUp, title: 'Engagement Insights', color: 'text-purple-600', bg: 'bg-purple-50' },
    health: { icon: AlertCircle, title: 'Wellness Insights', color: 'text-red-600', bg: 'bg-red-50' },
    islamic: { icon: Sparkles, title: 'Spiritual Insights', color: 'text-indigo-600', bg: 'bg-indigo-50' }
  };

  const config = sectionConfig[section] || sectionConfig.dashboard;
  const Icon = config.icon;

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${config.color}`} />
            {config.title}
          </CardTitle>
          <Button 
            onClick={analyzeData} 
            disabled={loading}
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      {insights && (
        <CardContent className="space-y-4">
          <div className={`p-4 ${config.bg} rounded-lg`}>
            <h4 className="font-semibold text-sm text-slate-800 mb-2">Summary</h4>
            <p className="text-sm text-slate-700">{insights.summary}</p>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-slate-800 mb-2">Trend Analysis</h4>
            <p className="text-sm text-slate-600">{insights.trend}</p>
          </div>

          {insights.recommendations && insights.recommendations.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-slate-800 mb-3">Recommendations</h4>
              <div className="space-y-2">
                {insights.recommendations.map((rec, idx) => (
                  <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-slate-800">{rec.title}</p>
                        <p className="text-xs text-slate-600 mt-1">{rec.description}</p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {rec.impact}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.forecast && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="font-semibold text-sm text-amber-900 mb-1">Forecast</h4>
              <p className="text-sm text-amber-800">{insights.forecast}</p>
            </div>
          )}

          {insights.action_items && insights.action_items.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-slate-800 mb-2">Action Items</h4>
              <ul className="space-y-1">
                {insights.action_items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className={`${config.color} mt-1`}>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}