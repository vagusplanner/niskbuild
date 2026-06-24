import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, ShieldAlert, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function FocusTimeGuardian() {
  const [focusBlocks, setFocusBlocks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState(120);
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => SDK.entities.Event.list()
  });

  const conflicts = useMemo(() => {
    return focusBlocks.map((block, idx) => {
      const blockStart = new Date(`2024-01-01T${block.startTime}`);
      const blockEnd = new Date(blockStart.getTime() + block.duration * 60000);

      const conflicting = events.filter(event => {
        const eventStart = new Date(event.start_date);
        const eventEnd = new Date(event.end_date);
        return eventStart < blockEnd && eventEnd > blockStart;
      });

      return {
        ...block,
        conflicts: conflicting,
        hasConflicts: conflicting.length > 0
      };
    });
  }, [focusBlocks, events]);

  const createFocusBlock = async () => {
    if (!startTime || !duration) {
      toast.error('Please fill in all fields');
      return;
    }

    const newBlock = {
      id: Date.now(),
      startTime,
      duration,
      label: `Focus Block (${duration}m)`
    };

    setFocusBlocks([...focusBlocks, newBlock]);
    
    // Reset form
    setStartTime('09:00');
    setDuration(120);
    setShowForm(false);
    
    toast.success('Focus block created');
  };

  const handleConflict = async (block, conflictingEvent) => {
    toast.info('Suggestion: Move meeting or reschedule focus block');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <Card className="bg-gradient-to-br from-purple-50 dark:from-purple-950 to-blue-50 dark:to-blue-950 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Focus Time Guardian
          </CardTitle>
          <CardDescription>Protect deep work blocks from meeting conflicts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AnimatePresence>
            {showForm ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
                <div>
                  <Label htmlFor="start-time" className="text-sm">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="duration" className="text-sm">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={createFocusBlock} className="flex-1" size="sm">Create</Button>
                  <Button onClick={() => setShowForm(false)} variant="outline" size="sm" className="flex-1">Cancel</Button>
                </div>
              </motion.div>
            ) : (
              <Button onClick={() => setShowForm(true)} className="w-full" variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Add Focus Block
              </Button>
            )}
          </AnimatePresence>

          {conflicts.length > 0 && (
            <div className="space-y-2">
              {conflicts.map((block) => (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-3 rounded-lg ${
                    block.hasConflicts
                      ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
                      : 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{block.label}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{block.startTime}</p>
                      {block.hasConflicts && (
                        <div className="mt-2 space-y-1">
                          {block.conflicts.map((conflict, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                              <AlertCircle className="w-3 h-3" />
                              <span>{conflict.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {block.hasConflicts && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleConflict(block, block.conflicts[0])}
                      >
                        Resolve
                      </Button>
                    )}
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