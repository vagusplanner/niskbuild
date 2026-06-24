import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, ListChecks, Calendar, Zap, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import VoiceTaskCapture from '@/components/voice/VoiceTaskCapture';

export default function VoiceErrands() {
  const [saveCount, setSaveCount] = useState({ tasks: 0, events: 0 });
  const [sessionTotal, setSessionTotal] = useState({ tasks: 0, events: 0 });

  const { data: recentTasks = [] } = useQuery({
    queryKey: ['activeTasks'],
    queryFn: () => base44.entities.Task.filter({ status: { $in: ['todo', 'in_progress'] } }, '-created_date', 8),
    staleTime: 20000,
  });

  const { data: todayEvents = [] } = useQuery({
    queryKey: ['todayEvents'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      return base44.entities.Event.filter({
        start_date: { $gte: `${today}T00:00:00Z`, $lte: `${today}T23:59:59Z` }
      });
    },
    staleTime: 20000,
  });

  const handleSaved = ({ savedTasks, savedEvents }) => {
    setSessionTotal(prev => ({ tasks: prev.tasks + savedTasks, events: prev.events + savedEvents }));
  };

  const tips = [
    'Try: "Buy groceries on Saturday, call mum tomorrow, dentist appointment Friday at 3pm"',
    'Try: "Morning run Monday 7am, finish project report by Thursday, pick up dry cleaning"',
    'Try: "Team meeting Wednesday 2 to 3pm, pay electricity bill, read 20 pages tonight"',
  ];
  const tip = tips[Math.floor(Date.now() / 86400000) % tips.length];

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-2xl mx-auto px-3 sm:px-5 py-4 lg:py-8 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 p-6 text-white shadow-xl">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Mic className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight">Voice Errands</h1>
                  <p className="text-teal-100 text-sm">Speak or type — AI captures everything</p>
                </div>
              </div>
              {(sessionTotal.tasks > 0 || sessionTotal.events > 0) && (
                <div className="mt-3 flex gap-3">
                  {sessionTotal.tasks > 0 && (
                    <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold">
                      ✅ {sessionTotal.tasks} task{sessionTotal.tasks !== 1 ? 's' : ''} saved this session
                    </div>
                  )}
                  {sessionTotal.events > 0 && (
                    <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold">
                      📅 {sessionTotal.events} event{sessionTotal.events !== 1 ? 's' : ''} added
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tip */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl">
          <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">{tip}</p>
        </motion.div>

        {/* Main capture widget */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <VoiceTaskCapture onItemsSaved={handleSaved} />
        </motion.div>

        {/* Today's snapshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Pending tasks */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <ListChecks className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Pending Tasks</span>
            </div>
            {recentTasks.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No pending tasks — all clear!</p>
            ) : (
              <div className="space-y-2">
                {recentTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      task.priority === 'urgent' ? 'bg-red-500' :
                      task.priority === 'high' ? 'bg-orange-400' :
                      task.priority === 'medium' ? 'bg-blue-400' : 'bg-slate-300'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{task.title}</p>
                      {task.due_date && <p className="text-[10px] text-slate-400">{task.due_date}</p>}
                    </div>
                  </div>
                ))}
                {recentTasks.length > 5 && (
                  <p className="text-[10px] text-slate-400 text-center pt-1">+{recentTasks.length - 5} more</p>
                )}
              </div>
            )}
          </motion.div>

          {/* Today's events */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-teal-500" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Today, {format(new Date(), 'MMM d')}
              </span>
            </div>
            {todayEvents.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Nothing scheduled today yet.</p>
            ) : (
              <div className="space-y-2">
                {todayEvents.slice(0, 5).map(event => {
                  const start = event.start_date ? new Date(event.start_date) : null;
                  return (
                    <div key={event.id} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-teal-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{event.title}</p>
                        {start && !isNaN(start) && <p className="text-[10px] text-slate-400">{format(start, 'h:mm a')}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* How it works */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.24 }}
          className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800/50 dark:to-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">How it works</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { step: '1', label: 'Speak or type', icon: '🎙️' },
              { step: '2', label: 'AI extracts tasks & events', icon: '🤖' },
              { step: '3', label: 'Review & save', icon: '✅' },
            ].map(s => (
              <div key={s.step} className="flex flex-col items-center gap-1">
                <span className="text-xl">{s.icon}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{s.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}