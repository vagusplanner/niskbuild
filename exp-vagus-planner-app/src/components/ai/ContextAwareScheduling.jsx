import React, { useEffect, useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, TrendingUp, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ContextAwareScheduling() {
  const [scheduling, setScheduling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchScheduling = async () => {
      try {
        const response = await SDK.functions.invoke('contextAwareScheduling', {});
        setScheduling(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchScheduling();
  }, []);

  if (loading) return <div className="p-4 text-slate-500">Analyzing your patterns...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!scheduling) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <Card className="bg-gradient-to-br from-amber-50 dark:from-amber-950 to-orange-50 dark:to-orange-950 border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            Peak Productivity Hours
          </CardTitle>
          <CardDescription>{scheduling.recommendation}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {scheduling.peakProductivityHours.map((hour) => (
              <div
                key={hour}
                className="px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border-2 border-amber-200 dark:border-amber-700 font-semibold text-amber-700 dark:text-amber-400"
              >
                {hour}:00
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {scheduling.upcomingEvents?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scheduling.upcomingEvents.slice(0, 3).map((event, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{event.title}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {new Date(event.start).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}