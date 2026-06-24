import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LinkIcon, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function HabitStacking() {
  const [stacks, setStacks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [habitName, setHabitName] = useState('');
  const [duration, setDuration] = useState(10);
  const [linkedEvent, setLinkedEvent] = useState('');
  const queryClient = useQueryClient();

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: () => base44.entities.Habit?.list?.() || Promise.resolve([])
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list()
  });

  const workEvents = events.filter(e => ['work', 'meeting'].includes(e.category?.toLowerCase()));

  const handleCreateStack = async () => {
    if (!habitName || !linkedEvent) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // Create habit
      const habit = await base44.entities.Habit?.create?.({
        title: habitName,
        duration_minutes: duration,
        linked_event_id: linkedEvent,
        frequency: 'daily',
        is_active: true
      });

      const newStack = {
        id: Date.now(),
        habitName,
        duration,
        linkedEvent: workEvents.find(e => e.id === linkedEvent)?.title || linkedEvent,
        linkedEventId: linkedEvent
      };

      setStacks([...stacks, newStack]);
      setHabitName('');
      setDuration(10);
      setLinkedEvent('');
      setShowForm(false);
      toast.success('Habit stacked successfully');
    } catch (err) {
      toast.error('Failed to create habit stack');
    }
  };

  const handleDeleteStack = (id) => {
    setStacks(stacks.filter(s => s.id !== id));
    toast.success('Habit stack removed');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="bg-gradient-to-br from-purple-50 dark:from-purple-950 to-pink-50 dark:to-pink-950 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Habit Stacking
          </CardTitle>
          <CardDescription>Anchor new habits to existing events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AnimatePresence>
            {showForm ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
                <div>
                  <Label htmlFor="habit-name" className="text-sm">Habit (e.g., "Meditate")</Label>
                  <Input
                    id="habit-name"
                    value={habitName}
                    onChange={(e) => setHabitName(e.target.value)}
                    className="mt-1"
                    placeholder="Morning exercise, journaling, etc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="duration" className="text-sm">Duration (min)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="mt-1"
                      min="1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="event" className="text-sm">Link to Event</Label>
                    <select
                      id="event"
                      value={linkedEvent}
                      onChange={(e) => setLinkedEvent(e.target.value)}
                      className="w-full mt-1 px-2 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-sm"
                    >
                      <option value="">Select event...</option>
                      {workEvents.map(e => (
                        <option key={e.id} value={e.id}>{e.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreateStack} className="flex-1" size="sm">Create Stack</Button>
                  <Button onClick={() => setShowForm(false)} variant="outline" size="sm" className="flex-1">Cancel</Button>
                </div>
              </motion.div>
            ) : (
              <Button onClick={() => setShowForm(true)} className="w-full" variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Create Habit Stack
              </Button>
            )}
          </AnimatePresence>

          {stacks.length > 0 && (
            <div className="space-y-2">
              {stacks.map(stack => (
                <motion.div
                  key={stack.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-purple-200 dark:border-purple-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{stack.habitName}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {stack.duration} min before "{stack.linkedEvent}"
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteStack(stack.id)}
                      className="shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}