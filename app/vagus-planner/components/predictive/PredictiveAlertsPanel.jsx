import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Heart, Navigation, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PredictiveAlertsPanel() {
  const [alerts, setAlerts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-start_date')
  });

  const { data: sleepData = [] } = useQuery({
    queryKey: ['sleepLogs'],
    queryFn: () => base44.entities.Sleep?.list?.('-created_date', 7) ?? Promise.resolve([])
  });

  const { data: healthData = [] } = useQuery({
    queryKey: ['health'],
    queryFn: () => base44.entities.EnergyLog?.list?.('-created_date', 7) ?? Promise.resolve([])
  });

  // Generate predictive alerts
  useEffect(() => {
    const newAlerts = [];

    // Sick Day Predictor
    if (sleepData.length > 0) {
      const avgSleep = sleepData.reduce((sum, s) => sum + (s.hours || 0), 0) / sleepData.length;
      if (avgSleep < 6) {
        newAlerts.push({
          id: 'sick-predictor',
          type: 'health',
          icon: Heart,
          title: 'Lighter Schedule Recommended',
          description: `You've been getting ${Math.round(avgSleep)}h of sleep. Consider a lighter schedule today.`,
          severity: 'warning',
          action: 'Review Schedule'
        });
      }
    }

    // Clash Prevention
    const upcomingEvents = events.filter(e => new Date(e.start_date) > new Date() && new Date(e.start_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    
    for (let i = 0; i < upcomingEvents.length - 1; i++) {
      const current = upcomingEvents[i];
      const next = upcomingEvents[i + 1];
      const endTime = new Date(current.end_date || current.start_date);
      const nextStart = new Date(next.start_date);
      const gapMinutes = (nextStart - endTime) / (1000 * 60);

      if (gapMinutes > 0 && gapMinutes <= 30) {
        newAlerts.push({
          id: `clash-${i}`,
          type: 'schedule',
          icon: Clock,
          title: 'Back-to-Back Meetings',
          description: `Only ${Math.round(gapMinutes)}min between "${current.title}" and "${next.title}". Consider a video call?`,
          severity: 'info',
          action: 'View Details'
        });
      }
    }

    setAlerts(newAlerts.filter(a => !dismissedAlerts.has(a.id)));
  }, [events, sleepData, dismissedAlerts]);

  const handleDismiss = (alertId) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'health': return 'from-red-50 to-pink-50 dark:from-slate-900 dark:to-slate-800 border-red-200 dark:border-slate-700';
      case 'schedule': return 'from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800 border-amber-200 dark:border-slate-700';
      case 'traffic': return 'from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border-blue-200 dark:border-slate-700';
      default: return 'from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    };
    return colors[severity] || colors.info;
  };

  if (alerts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-amber-600" />
        Predictive Alerts & Recommendations
      </h3>

      <AnimatePresence mode="popLayout">
        {alerts.map((alert) => {
          const IconComponent = alert.icon;
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`bg-gradient-to-br ${getAlertColor(alert.type)} border rounded-lg p-4 flex items-start gap-4 relative`}
            >
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white dark:bg-slate-700">
                  <IconComponent className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-100">{alert.title}</h4>
                  <Badge className={getSeverityBadge(alert.severity)}>
                    {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{alert.description}</p>
                {alert.action && (
                  <Button size="sm" variant="outline" className="text-xs">
                    {alert.action}
                  </Button>
                )}
              </div>

              <button
                onClick={() => handleDismiss(alert.id)}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}