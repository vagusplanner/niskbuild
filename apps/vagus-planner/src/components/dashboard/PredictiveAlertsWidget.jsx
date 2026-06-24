import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, AlertCircle } from 'lucide-react';

export default function PredictiveAlertsWidget() {
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-start_date', 50)
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list()
  });

  const alerts = [];
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Detect potential conflicts
  const todayEvents = events.filter(e => e.start_date?.startsWith(today));
  if (todayEvents.length > 5) {
    alerts.push({
      type: 'warning',
      message: `Busy day ahead with ${todayEvents.length} events scheduled`,
      icon: Calendar
    });
  }

  // Task deadline alerts
  const dueTomorrow = tasks.filter(t => t.due_date === tomorrow && t.status !== 'completed');
  if (dueTomorrow.length > 0) {
    alerts.push({
      type: 'info',
      message: `${dueTomorrow.length} task(s) due tomorrow`,
      icon: AlertCircle
    });
  }

  // Back-to-back meetings
  const backToBack = todayEvents.filter((event, idx) => {
    if (idx === 0) return false;
    const prevEnd = new Date(todayEvents[idx - 1].end_date);
    const currStart = new Date(event.start_date);
    return currStart - prevEnd < 900000; // Less than 15 min
  });

  if (backToBack.length > 0) {
    alerts.push({
      type: 'warning',
      message: `${backToBack.length} back-to-back meetings today - consider adding breaks`,
      icon: Bell
    });
  }

  if (alerts.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <Bell className="w-5 h-5" />
          Predictive Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert, idx) => {
          const Icon = alert.icon;
          return (
            <div key={idx} className="flex items-start gap-3 bg-white rounded-lg p-3">
              <Icon className="w-5 h-5 text-amber-600 mt-0.5" />
              <p className="text-sm text-slate-700 flex-1">{alert.message}</p>
              <Badge variant="outline" className={
                alert.type === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
              }>
                {alert.type}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}