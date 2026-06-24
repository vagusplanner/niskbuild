import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UMRAH_STEPS, HAJJ_DAYS } from './data/hajjData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Copy, ChevronDown, ChevronUp, CheckCircle2, Circle, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function RitualStepsGuide() {
  const [type, setType] = useState('umrah');
  const [expanded, setExpanded] = useState(null);
  const [completed, setCompleted] = useState({});
  const queryClient = useQueryClient();

  const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };

  const addToCalendar = useMutation({
    mutationFn: async (step) => {
      const date = new Date();
      date.setHours(8, 0, 0, 0);
      const end = new Date(date);
      end.setHours(10, 0, 0, 0);
      return base44.entities.Event.create({
        title: `🕌 ${step.name}`,
        description: `${step.description}\n\nDu'a: ${step.dua_translation || ''}`,
        start_date: date.toISOString(),
        end_date: end.toISOString(),
        category: 'prayer',
        location: step.location || 'Makkah, Saudi Arabia',
        color: '#8b5cf6',
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['events'] }); toast.success('Added to Calendar!'); },
  });

  const steps = type === 'umrah' ? UMRAH_STEPS : HAJJ_DAYS;
  const completedCount = Object.values(completed).filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Type selector */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        {[{ id: 'umrah', label: '🕌 Umrah' }, { id: 'hajj', label: '🕋 Hajj (5 Days)' }].map(t => (
          <button key={t.id} onClick={() => { setType(t.id); setExpanded(null); }}
            className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all",
              type === t.id ? "bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800">
        <div className="flex-1">
          <p className="text-xs font-bold text-purple-700 dark:text-purple-300">{completedCount} / {steps.length} steps completed</p>
          <div className="h-1.5 bg-purple-100 dark:bg-purple-900 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all" style={{ width: `${steps.length > 0 ? (completedCount / steps.length) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      {steps.map((step, i) => {
        const isExpanded = expanded === step.id;
        const isDone = completed[step.id];

        return (
          <motion.div key={step.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className={cn("rounded-2xl border overflow-hidden transition-all",
              isDone ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20" : "border-purple-100 dark:border-purple-900 bg-white dark:bg-slate-900"
            )}>
            {/* Header */}
            <div className="flex items-start gap-3 p-4">
              {/* Step check */}
              <button onClick={() => setCompleted(prev => ({ ...prev, [step.id]: !isDone }))} className="flex-shrink-0 mt-0.5">
                {isDone
                  ? <CheckCircle2 className="w-6 h-6 text-green-500" />
                  : <Circle className="w-6 h-6 text-purple-300 dark:text-purple-700" />
                }
              </button>
              <button onClick={() => setExpanded(isExpanded ? null : step.id)} className="flex-1 text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg">{step.emoji}</span>
                  <p className={cn("text-sm font-black", isDone ? "text-green-700 dark:text-green-300 line-through" : "text-slate-800 dark:text-slate-100")}>
                    {type === 'hajj' && step.day ? `Day ${step.day}: ` : `Step ${step.id}: `}{step.name}
                  </p>
                  {type === 'hajj' && step.hijri && (
                    <Badge className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{step.hijri}</Badge>
                  )}
                  {step.type && (
                    <Badge className={cn("text-[9px]", step.type === 'obligatory' ? 'bg-red-100 text-red-700' : 'bg-sky-100 text-sky-700')}>
                      {step.type}
                    </Badge>
                  )}
                </div>
                {step.location && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{step.location}
                  </p>
                )}
              </button>
              <button onClick={() => setExpanded(isExpanded ? null : step.id)} className="flex-shrink-0 mt-0.5">
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="px-4 pb-4 space-y-3 border-t border-purple-100 dark:border-purple-900/50 pt-3">

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{step.description}</p>

                    {/* Attire (Umrah step 1) */}
                    {step.attire_men && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">👔 Men's Ihram Attire</p>
                        <ul className="space-y-1">{step.attire_men.map((a, i) => <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-1.5"><span className="text-purple-400 mt-0.5">•</span>{a}</li>)}</ul>
                      </div>
                    )}
                    {step.attire_women && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">👗 Women's Attire</p>
                        <ul className="space-y-1">{step.attire_women.map((a, i) => <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-1.5"><span className="text-rose-400 mt-0.5">•</span>{a}</li>)}</ul>
                      </div>
                    )}

                    {/* Prohibitions */}
                    {step.prohibitions && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900">
                        <p className="text-xs font-bold text-red-700 dark:text-red-300 mb-1.5">⚠️ Ihram Prohibitions</p>
                        <ul className="space-y-1">{step.prohibitions.map((p, i) => <li key={i} className="text-xs text-red-800 dark:text-red-200">• {p}</li>)}</ul>
                      </div>
                    )}

                    {/* Sub-steps */}
                    {step.steps && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">📋 Step by Step</p>
                        <ol className="space-y-1.5">
                          {step.steps.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                              <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0 font-bold text-purple-700 dark:text-purple-300 text-[10px]">{i + 1}</span>
                              {s}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Du'a */}
                    {step.dua_arabic && (
                      <div>
                        <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">🤲 Du'a</p>
                        <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl space-y-1.5">
                          <p className="text-base text-white font-bold text-right leading-loose" dir="rtl">{step.dua_arabic}</p>
                          {step.dua_transliteration && <p className="text-xs text-emerald-100 italic">{step.dua_transliteration}</p>}
                          <p className="text-xs text-white/90">{step.dua_translation}</p>
                        </div>
                        <button onClick={() => copy(step.dua_arabic)} className="mt-1 text-xs text-teal-600 flex items-center gap-1 hover:underline">
                          <Copy className="w-3 h-3" />Copy Arabic
                        </button>
                      </div>
                    )}

                    {/* Tips */}
                    {step.tips?.length > 0 && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900">
                        <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-1.5">💡 Tips</p>
                        <ul className="space-y-1">{step.tips.map((tip, i) => <li key={i} className="text-xs text-blue-800 dark:text-blue-200">• {tip}</li>)}</ul>
                      </div>
                    )}

                    <Button size="sm" variant="outline" onClick={() => addToCalendar.mutate(step)}
                      className="w-full text-xs border-purple-200 text-purple-700 dark:text-purple-400">
                      <Calendar className="w-3 h-3 mr-1.5" />Add to Calendar
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}