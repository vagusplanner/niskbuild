import React, { useEffect, useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Plus, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function EmailEventDetection() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState(new Set());

  useEffect(() => {
    const detectEvents = async () => {
      try {
        const response = await SDK.functions.invoke('emailToEventDetection', {});
        setEvents(response.data.detectedEvents || []);
      } catch (err) {
        console.error('Error detecting events:', err);
      } finally {
        setLoading(false);
      }
    };

    detectEvents();
  }, []);

  const handleAddEvent = async (event) => {
    try {
      // Create event in calendar
      await SDK.entities.Event.create({
        title: event.title,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        category: 'work',
        source: 'app',
        description: `Detected from email from ${event.from}`
      });

      setAddedIds(prev => new Set(prev).add(event.messageId));
      toast.success('Event added to calendar');
    } catch (err) {
      toast.error('Failed to add event');
    }
  };

  if (loading) return <div className="p-4 text-slate-500">Scanning emails...</div>;
  if (events.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="bg-gradient-to-br from-blue-50 dark:from-blue-950 to-indigo-50 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Events Detected in Emails
          </CardTitle>
          <CardDescription>Add detected events to your calendar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {events.map((event) => (
              <motion.div
                key={event.messageId}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="p-3 bg-white dark:bg-slate-800 rounded-lg flex items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{event.title}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{event.from}</p>
                </div>
                <Button
                  size="sm"
                  variant={addedIds.has(event.messageId) ? 'outline' : 'default'}
                  onClick={() => handleAddEvent(event)}
                  disabled={addedIds.has(event.messageId)}
                  className="shrink-0"
                >
                  {addedIds.has(event.messageId) ? (
                    <>
                      <Check className="w-4 h-4 mr-1" /> Added
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </>
                  )}
                </Button>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}