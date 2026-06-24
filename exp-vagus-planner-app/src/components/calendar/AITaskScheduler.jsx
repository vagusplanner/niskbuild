import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Sparkles, 
  Calendar,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';

export default function AITaskScheduler({ isOpen, onClose, tasks = [], events = [] }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => SDK.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated successfully');
    }
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => SDK.entities.Event.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event created from task');
    }
  });

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const uncompletedTasks = tasks.filter(t => t.status !== 'completed');
      
      // Call AI backend function for smart scheduling
      const { data } = await SDK.functions.invoke('aiSchedulingSuggestions', {
        tasks: uncompletedTasks,
        events: events,
        current_date: new Date().toISOString()
      });

      setSuggestions(data);
    } catch (error) {
      console.error('AI scheduling error:', error);
      toast.error('Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && !suggestions) {
      generateSuggestions();
    }
  }, [isOpen]);

  const applySuggestion = async (suggestion) => {
    if (suggestion.action === 'schedule_event') {
      // Convert task to event
      await createEventMutation.mutateAsync({
        title: suggestion.task.title,
        description: suggestion.task.description,
        start_date: suggestion.recommended_date,
        end_date: suggestion.recommended_date,
        category: suggestion.task.category || 'work',
        is_all_day: false,
        start_time: suggestion.recommended_time || '09:00'
      });
      
      // Link task to event
      await updateTaskMutation.mutateAsync({
        id: suggestion.task.id,
        data: { 
          due_date: suggestion.recommended_date,
          due_time: suggestion.recommended_time
        }
      });
    } else if (suggestion.action === 'update_priority') {
      await updateTaskMutation.mutateAsync({
        id: suggestion.task.id,
        data: { priority: suggestion.recommended_priority }
      });
    } else if (suggestion.action === 'set_deadline') {
      await updateTaskMutation.mutateAsync({
        id: suggestion.task.id,
        data: { due_date: suggestion.recommended_date }
      });
    }
  };

  const priorityIcons = {
    urgent: <AlertTriangle className="w-4 h-4 text-red-600" />,
    high: <TrendingUp className="w-4 h-4 text-orange-600" />,
    medium: <Clock className="w-4 h-4 text-yellow-600" />,
    low: <CheckCircle2 className="w-4 h-4 text-blue-600" />
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-violet-600" />
            AI Task Scheduler
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <Zap className="w-12 h-12 text-violet-600 animate-pulse" />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-violet-600"
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Analyzing your tasks and schedule...
              </p>
            </div>
          </div>
        ) : suggestions ? (
          <div className="space-y-4">
            {suggestions.summary && (
              <Card className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950 border-violet-200 dark:border-violet-800">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {suggestions.summary}
                </p>
              </Card>
            )}

            <div className="space-y-3">
              {suggestions.suggestions?.map((suggestion, idx) => {
                if (!suggestion.task) return null;
                
                return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900">
                        {priorityIcons[suggestion.recommended_priority || 'medium']}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
                          {suggestion.task?.title || 'Untitled Task'}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          {suggestion.reasoning || 'No details available'}
                        </p>
                        
                        <div className="flex items-center gap-3 text-xs">
                          {suggestion.recommended_date && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(suggestion.recommended_date), 'MMM d')}
                            </Badge>
                          )}
                          {suggestion.recommended_time && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {suggestion.recommended_time}
                            </Badge>
                          )}
                          {suggestion.recommended_priority && (
                            <Badge variant="outline" className="capitalize">
                              {suggestion.recommended_priority} priority
                            </Badge>
                          )}
                          {suggestion.estimated_duration && (
                            <Badge variant="outline">
                              {suggestion.estimated_duration} min
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => applySuggestion(suggestion)}
                        className="bg-violet-600 hover:bg-violet-700"
                      >
                        Apply
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
              })}
            </div>

            {(!suggestions.suggestions || suggestions.suggestions.length === 0) && (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400">
                  Your tasks are well organized! No suggestions at this time.
                </p>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={generateSuggestions}>
                Regenerate
              </Button>
              <Button onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}