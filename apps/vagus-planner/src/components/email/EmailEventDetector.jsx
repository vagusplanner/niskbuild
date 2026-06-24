import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Calendar, Plus, Loader2, CheckCircle2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function EmailEventDetector() {
  const [scanning, setScanning] = useState(false);
  const queryClient = useQueryClient();

  const { data: detectedEvents, isLoading, refetch } = useQuery({
    queryKey: ['emailEvents'],
    queryFn: async () => {
      const response = await base44.functions.invoke('scanEmailForEvents', {});
      return response.data.events || [];
    },
    enabled: false // Only fetch when manually triggered
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData) => {
      const startDate = new Date(eventData.date);
      if (eventData.time) {
        const [hours, minutes] = eventData.time.split(':');
        startDate.setHours(parseInt(hours), parseInt(minutes));
      }
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);

      return base44.entities.Event.create({
        title: eventData.title,
        description: eventData.description,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        location: eventData.location,
        category: 'work',
        source: 'email'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
      toast.success('Event added to calendar');
    }
  });

  const handleScan = async () => {
    setScanning(true);
    try {
      await refetch();
      toast.success('Email scan complete');
    } catch (error) {
      toast.error('Failed to scan emails');
    } finally {
      setScanning(false);
    }
  };

  const dismissEvent = (index) => {
    // Remove from local state
    queryClient.setQueryData(['emailEvents'], (old) => 
      old.filter((_, i) => i !== index)
    );
  };

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-600" />
          Email Event Detector
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          Automatically scan your emails for meetings, appointments, and deadlines.
        </p>

        <Button
          onClick={handleScan}
          disabled={scanning || isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {scanning || isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Scanning Emails...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Scan Recent Emails
            </>
          )}
        </Button>

        <AnimatePresence>
          {detectedEvents && detectedEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  Found {detectedEvents.length} potential event{detectedEvents.length !== 1 ? 's' : ''}
                </p>
                <Badge variant="secondary" className="text-xs">
                  {detectedEvents.length}
                </Badge>
              </div>

              {detectedEvents.map((event, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-4 bg-white border-blue-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800 text-sm mb-1">
                          {event.title}
                        </h4>
                        <p className="text-xs text-slate-600 mb-2">
                          From: {event.from}
                        </p>
                        {event.date && (
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Calendar className="w-3 h-3" />
                            <span>{event.date} {event.time && `at ${event.time}`}</span>
                          </div>
                        )}
                        {event.location && (
                          <p className="text-xs text-slate-600 mt-1">
                            📍 {event.location}
                          </p>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => dismissEvent(index)}
                        className="h-6 w-6"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {event.description && (
                      <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                      >
                        {Math.round(event.confidence * 100)}% confidence
                      </Badge>

                      <Button
                        size="sm"
                        onClick={() => createEventMutation.mutate(event)}
                        disabled={createEventMutation.isLoading}
                        className="bg-blue-600 hover:bg-blue-700 h-7 text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add to Calendar
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {detectedEvents && detectedEvents.length === 0 && !scanning && !isLoading && (
          <div className="text-center py-4 text-sm text-slate-500">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-600" />
            No new events detected in recent emails
          </div>
        )}
      </CardContent>
    </Card>
  );
}