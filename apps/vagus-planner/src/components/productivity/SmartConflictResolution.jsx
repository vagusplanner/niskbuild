import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Zap, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function SmartConflictResolution() {
  const [resolving, setResolving] = useState(false);
  const [proposals, setProposals] = useState([]);

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list()
  });

  const conflicts = useMemo(() => {
    const conflicts = [];
    
    for (let i = 0; i < events.length - 1; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];
        
        const start1 = new Date(event1.start_date);
        const end1 = new Date(event1.end_date);
        const start2 = new Date(event2.start_date);
        const end2 = new Date(event2.end_date);
        
        if (start1 < end2 && start2 < end1) {
          conflicts.push({ event1, event2 });
        }
      }
    }
    
    return conflicts;
  }, [events]);

  const handleAIResolve = async () => {
    if (conflicts.length === 0) {
      toast.info('No conflicts found');
      return;
    }

    setResolving(true);
    try {
      const response = await base44.functions.invoke('smartConflictResolution', {
        conflicts: conflicts.map(c => ({
          title1: c.event1.title,
          title2: c.event2.title,
          start1: c.event1.start_date,
          end1: c.event1.end_date,
          start2: c.event2.start_date,
          end2: c.event2.end_date
        }))
      });

      setProposals(response.data.proposals || []);
      toast.success('AI generated reschedule proposals');
    } catch (err) {
      toast.error('Failed to generate proposals');
      console.error(err);
    } finally {
      setResolving(false);
    }
  };

  const handleAccept = async (proposal) => {
    try {
      // Update events with proposed times
      if (proposal.meetingId) {
        await base44.entities.Event.update(proposal.meetingId, {
          start_date: proposal.newStart,
          end_date: proposal.newEnd
        });
      }
      
      toast.success('Meeting rescheduled');
      setProposals(proposals.filter(p => p.id !== proposal.id));
    } catch (err) {
      toast.error('Failed to update meeting');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="bg-gradient-to-br from-red-50 dark:from-red-950 to-orange-50 dark:to-orange-950 border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            Smart Conflict Resolution
          </CardTitle>
          <CardDescription>AI automatically finds optimal meeting times to resolve conflicts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {conflicts.length > 0 && (
            <>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-red-200 dark:border-red-700">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Found {conflicts.length} scheduling conflict{conflicts.length !== 1 ? 's' : ''}
                </p>
                <div className="mt-2 space-y-1">
                  {conflicts.slice(0, 3).map((c, idx) => (
                    <p key={idx} className="text-xs text-slate-600 dark:text-slate-400">
                      • {c.event1.title} overlaps with {c.event2.title}
                    </p>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleAIResolve} 
                disabled={resolving}
                className="w-full"
              >
                <Zap className="w-4 h-4 mr-2" />
                {resolving ? 'Analyzing conflicts...' : 'Let AI Resolve'}
              </Button>
            </>
          )}

          <AnimatePresence>
            {proposals.length > 0 && (
              <div className="space-y-2">
                {proposals.map((proposal, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-700"
                  >
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">Proposal {idx + 1}</p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">{proposal.suggestion}</p>
                    <Button 
                      size="sm" 
                      onClick={() => handleAccept(proposal)}
                      className="mt-2 w-full"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Accept
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          {conflicts.length === 0 && proposals.length === 0 && (
            <p className="text-sm text-slate-600 dark:text-slate-400">No conflicts detected ✓</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}