import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function OneClickReschedule() {
  const [delayMinutes, setDelayMinutes] = useState(30);
  const [rescheduling, setRescheduling] = useState(false);
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => SDK.entities.Event.list()
  });

  const upcomingEvents = React.useMemo(() => {
    const now = new Date();
    return events
      .filter(e => new Date(e.start_date) >= now && new Date(e.start_date) <= new Date(now.getTime() + 24 * 60 * 60 * 1000))
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
      .slice(0, 5);
  }, [events]);

  const handleReschedule = async () => {
    if (upcomingEvents.length === 0) {
      toast.info('No upcoming events to reschedule');
      return;
    }

    setRescheduling(true);
    try {
      const delayMs = delayMinutes * 60 * 1000;

      for (const event of upcomingEvents) {
        const newStart = new Date(new Date(event.start_date).getTime() + delayMs);
        const newEnd = new Date(new Date(event.end_date).getTime() + delayMs);

        await SDK.entities.Event.update(event.id, {
          start_date: newStart.toISOString(),
          end_date: newEnd.toISOString()
        });
      }

      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(`Pushed ${upcomingEvents.length} events by ${delayMinutes} minutes`);
    } catch (err) {
      toast.error('Failed to reschedule events');
      console.error(err);
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="bg-gradient-to-br from-blue-50 dark:from-blue-950 to-indigo-50 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            One-Click Reschedule
          </CardTitle>
          <CardDescription>When running late: push everything back at once</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="delay" className="text-sm">Delay by (minutes)</Label>
            <Input
              id="delay"
              type="number"
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(Math.max(5, Number(e.target.value)))}
              className="mt-1"
              min="5"
              step="5"
            />
          </div>

          {upcomingEvents.length > 0 && (
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-700">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                Will reschedule {upcomingEvents.length} upcoming events:
              </p>
              <div className="space-y-1">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="text-xs text-slate-600 dark:text-slate-400 flex justify-between">
                    <span>{event.title}</span>
                    <span>{new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button 
            onClick={handleReschedule}
            disabled={rescheduling || upcomingEvents.length === 0}
            className="w-full"
          >
            <Play className="w-4 h-4 mr-2" />
            {rescheduling ? 'Rescheduling...' : `Push Everything ${delayMinutes}min`}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}