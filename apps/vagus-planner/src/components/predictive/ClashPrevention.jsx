import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function ClashPrevention() {
  const [suggestions, setSuggestions] = useState([]);
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list()
  });

  useEffect(() => {
    detectClashes();
  }, [events]);

  const detectClashes = () => {
    const newSuggestions = [];

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];

        const end1 = new Date(event1.end_date);
        const start2 = new Date(event2.start_date);

        // If end of first event is within 30 minutes of start of second
        const minutesBetween = (start2 - end1) / 60000;

        if (minutesBetween > 0 && minutesBetween < 30) {
          newSuggestions.push({
            id: `${event1.id}-${event2.id}`,
            event1,
            event2,
            minutesBetween: Math.round(minutesBetween),
            suggestion: minutesBetween < 15 
              ? `Consider making "${event2.title}" a video call to save travel time`
              : `Only ${Math.round(minutesBetween)}min between meetings - add travel buffer?`
          });
        }
      }
    }

    setSuggestions(newSuggestions);
  };

  const handleConvertToVideo = async (eventId) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (event) {
        await base44.entities.Event.update(eventId, {
          location: 'Zoom / Video Call',
          notes: (event.notes || '') + ' [Converted to video call for travel time]'
        });
        queryClient.invalidateQueries({ queryKey: ['events'] });
        setSuggestions(suggestions.filter(s => s.id !== eventId));
        toast.success('Meeting converted to video call');
      }
    } catch (err) {
      toast.error('Failed to update meeting');
    }
  };

  const handleDismiss = (id) => {
    setSuggestions(suggestions.filter(s => s.id !== id));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="bg-gradient-to-br from-orange-50 dark:from-orange-950 to-red-50 dark:to-red-950 border-orange-200 dark:border-orange-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            Clash Prevention
          </CardTitle>
          <CardDescription>Smart suggestions for back-to-back meetings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map(suggestion => (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-orange-200 dark:border-orange-700"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {suggestion.event1.title} → {suggestion.event2.title}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {suggestion.suggestion}
                      </p>
                      <div className="text-xs text-orange-600 dark:text-orange-400 font-medium mt-2">
                        ⏱️ {suggestion.minutesBetween} minutes between meetings
                      </div>
                    </div>
                  </div>

                  {suggestion.minutesBetween < 15 && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleConvertToVideo(suggestion.event2.id)}
                      >
                        Convert to Video
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleDismiss(suggestion.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                ✓ No back-to-back meeting issues detected
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}