/**
 * HijriEventsCalendar
 * - Loads all major Islamic dates for the current Hijri year
 * - Lets users attach devotional goals + Sadaqah plans to each event
 * - One-click import to the main calendar (Event entity)
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Import, CheckCircle2, ChevronDown, ChevronRight,
  Target, Heart, Sparkles, X, Check, Loader2, ChevronLeft,
  Star, Moon, BookOpen, Hand
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const MONTH_NAMES = [
  'Muharram','Safar',"Rabi' al-Awwal","Rabi' al-Thani",
  "Jumada al-Awwal","Jumada al-Thani",'Rajab',"Sha'ban",
  'Ramadan','Shawwal',"Dhul Qa'dah",'Dhul Hijjah'
];

function formatDate(iso) {
  try { return format(parseISO(iso), 'dd MMM yyyy'); } catch { return iso; }
}

function EventCard({ event, onAttachGoal, imported }) {
  const [expanded, setExpanded] = useState(false);
  const [goalDraft, setGoalDraft] = useState(event.devotional_goal || '');
  const [sadaqahDraft, setSadaqahDraft] = useState(event.sadaqah_plan || '');
  const [editing, setEditing] = useState(false);

  const handleSave = () => {
    onAttachGoal(event.key, goalDraft, sadaqahDraft);
    setEditing(false);
    toast.success('Goals attached!');
  };

  const isPast = new Date(event.start) < new Date();
  const isToday = event.start === new Date().toISOString().split('T')[0];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl border overflow-hidden transition-all',
        isToday ? 'border-amber-400 shadow-md shadow-amber-100 dark:shadow-amber-900/20' :
        isPast ? 'border-slate-200 dark:border-slate-700/60 opacity-70' :
        'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
        'bg-white dark:bg-slate-800/60'
      )}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        {/* Color strip */}
        <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />

        <span className="text-2xl flex-shrink-0">{event.emoji}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{event.name}</p>
            {isToday && <Badge className="bg-amber-400 text-amber-900 border-0 text-[10px]">TODAY</Badge>}
            {imported && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] flex items-center gap-0.5"><Check className="w-2.5 h-2.5" /> In Calendar</Badge>}
            {event.is_fasting_day && <Badge className="bg-cyan-100 text-cyan-700 border-0 text-[10px]">Fasting</Badge>}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(event.start)}{event.is_multi_day ? ` → ${formatDate(event.end)}` : ''}</p>
          <p className="text-[10px] text-slate-400 font-arabic" dir="rtl">{event.arabic}</p>
        </div>

        {(event.devotional_goal || event.sadaqah_plan) && (
          <div className="flex gap-1 flex-shrink-0">
            {event.devotional_goal && <Target className="w-3.5 h-3.5 text-violet-500" />}
            {event.sadaqah_plan && <Heart className="w-3.5 h-3.5 text-rose-500" />}
          </div>
        )}

        {expanded ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-slate-100 dark:border-slate-700 pt-3">

              {/* Description */}
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{event.description}</p>

              {/* Hijri date */}
              <p className="text-[11px] text-slate-400 italic">📅 {event.hijri}</p>

              {/* Devotional suggestions */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide flex items-center gap-1">
                  <Target className="w-3 h-3" /> Suggested Devotional Acts
                </p>
                <div className="space-y-1">
                  {event.devotional_suggestions.map((s, i) => (
                    <button key={i} onClick={() => { setGoalDraft(s); setEditing(true); }}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors border border-violet-100 dark:border-violet-800/40 flex items-center justify-between group">
                      {s}
                      <span className="text-[10px] text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">Use →</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sadaqah suggestions */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide flex items-center gap-1">
                  <Heart className="w-3 h-3" /> Suggested Sadaqah Plans
                </p>
                <div className="space-y-1">
                  {event.sadaqah_suggestions.map((s, i) => (
                    <button key={i} onClick={() => { setSadaqahDraft(s); setEditing(true); }}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors border border-rose-100 dark:border-rose-800/40 flex items-center justify-between group">
                      {s}
                      <span className="text-[10px] text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">Use →</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Attached goals display / edit */}
              {(event.devotional_goal || event.sadaqah_plan || editing) && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3 space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Your Plan for this Event</p>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold flex items-center gap-1 mb-1">
                        <Target className="w-3 h-3" /> Devotional Goal
                      </label>
                      <textarea
                        value={goalDraft}
                        onChange={e => setGoalDraft(e.target.value)}
                        rows={2}
                        placeholder="What do you intend to do on this day?"
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 mb-1">
                        <Heart className="w-3 h-3" /> Sadaqah Plan
                      </label>
                      <textarea
                        value={sadaqahDraft}
                        onChange={e => setSadaqahDraft(e.target.value)}
                        rows={2}
                        placeholder="How will you give charity on this occasion?"
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-rose-300"
                      />
                    </div>
                  </div>

                  <Button size="sm" onClick={handleSave}
                    className="h-7 text-xs w-full bg-gradient-to-r from-violet-500 to-rose-500 text-white hover:opacity-90">
                    <Check className="w-3 h-3 mr-1" /> Save Goals
                  </Button>
                </div>
              )}

              {!event.devotional_goal && !event.sadaqah_plan && !editing && (
                <button onClick={() => setEditing(true)}
                  className="w-full text-xs py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 hover:text-violet-600 hover:border-violet-300 transition-colors flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Attach your devotional goal & Sadaqah plan
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function HijriEventsCalendar() {
  const queryClient = useQueryClient();
  const [localGoals, setLocalGoals] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hijri_goals') || '{}'); } catch { return {}; }
  });
  const [importedKeys, setImportedKeys] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hijri_imported') || '[]'); } catch { return []; }
  });
  const [selectAll, setSelectAll] = useState(false);
  const [selected, setSelected] = useState([]);
  const [importing, setImporting] = useState(false);
  const [filterPast, setFilterPast] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['hijriEvents'],
    queryFn: async () => {
      const res = await SDK.functions.invoke('generateHijriEvents', { action: 'get_events' });
      return res.data;
    },
    staleTime: 24 * 60 * 60 * 1000,
  });

  const rawEvents = data?.events || [];
  const hijriYear = data?.hijri_year;

  // Merge local goals into events
  const events = useMemo(() => rawEvents.map(ev => ({
    ...ev,
    devotional_goal: localGoals[ev.key]?.goal || '',
    sadaqah_plan: localGoals[ev.key]?.sadaqah || '',
  })), [rawEvents, localGoals]);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter(e => e.end >= today || !filterPast);
  const displayEvents = filterPast ? events : upcoming;

  const attachGoal = (key, goal, sadaqah) => {
    const updated = { ...localGoals, [key]: { goal, sadaqah } };
    setLocalGoals(updated);
    localStorage.setItem('hijri_goals', JSON.stringify(updated));
  };

  const toggleSelect = (key) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const importSelected = async () => {
    const toImport = events
      .filter(ev => selected.includes(ev.key))
      .map(ev => ({
        ...ev,
        devotional_goal: localGoals[ev.key]?.goal || '',
        sadaqah_plan: localGoals[ev.key]?.sadaqah || '',
      }));

    if (!toImport.length) { toast.info('Select events to import first'); return; }
    setImporting(true);
    try {
      await SDK.functions.invoke('generateHijriEvents', {
        action: 'import_to_calendar',
        events_to_import: toImport,
      });
      const newImported = [...new Set([...importedKeys, ...selected])];
      setImportedKeys(newImported);
      localStorage.setItem('hijri_imported', JSON.stringify(newImported));
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(`${toImport.length} Islamic event${toImport.length > 1 ? 's' : ''} imported to your calendar!`);
      setSelected([]);
    } catch (e) {
      toast.error('Import failed: ' + e.message);
    }
    setImporting(false);
  };

  const importAll = async () => {
    const notImported = events.filter(ev => !importedKeys.includes(ev.key));
    if (!notImported.length) { toast.info('All events already imported!'); return; }
    setSelected(notImported.map(e => e.key));
  };

  const hasGoal = (key) => !!(localGoals[key]?.goal || localGoals[key]?.sadaqah);
  const goalsCount = Object.keys(localGoals).filter(k => localGoals[k]?.goal || localGoals[k]?.sadaqah).length;

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 px-5 py-4 border-b border-amber-100 dark:border-amber-800/30">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow">
              <Moon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm">Hijri Events Calendar</h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                {hijriYear ? `${hijriYear}H · ` : ''}{rawEvents.length} major Islamic dates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Stats pills */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/40">
              <Target className="w-3 h-3 text-violet-500" />
              <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400">{goalsCount} goals</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{importedKeys.length} imported</span>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFilterPast(v => !v)}
            className={cn('h-7 text-xs', filterPast ? 'bg-slate-100 dark:bg-slate-800' : '')}
          >
            {filterPast ? 'Show all' : 'Upcoming only'}
          </Button>

          {selected.length > 0 ? (
            <Button size="sm" onClick={importSelected} disabled={importing}
              className="h-7 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90">
              {importing
                ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Importing…</>
                : <><Import className="w-3 h-3 mr-1" />Import {selected.length} to Calendar</>}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={importAll}
              className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300">
              <Import className="w-3 h-3 mr-1" /> Import All
            </Button>
          )}

          {selected.length > 0 && (
            <button onClick={() => setSelected([])} className="text-xs text-slate-400 hover:text-slate-600">
              Clear selection
            </button>
          )}
        </div>
      </div>

      {/* Event list */}
      <div className="p-4 space-y-2.5 max-h-[70vh] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : displayEvents.length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-sm">No events to show.</p>
        ) : (
          displayEvents.map(ev => (
            <div key={ev.key} className="flex items-start gap-2">
              {/* Checkbox */}
              <button
                onClick={() => toggleSelect(ev.key)}
                className={cn(
                  'mt-4 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors',
                  selected.includes(ev.key)
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : importedKeys.includes(ev.key)
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                    : 'border-slate-300 dark:border-slate-600 hover:border-amber-400'
                )}
              >
                {selected.includes(ev.key) && <Check className="w-3 h-3" />}
                {!selected.includes(ev.key) && importedKeys.includes(ev.key) && (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <EventCard
                  event={ev}
                  onAttachGoal={attachGoal}
                  imported={importedKeys.includes(ev.key)}
                />
              </div>
            </div>
          ))
        )}

        {/* Legend */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] text-slate-400 text-center leading-relaxed">
            Dates calculated using Umm al-Qura calendar approximation · {hijriYear}H<br />
            Moon sighting may vary by 1-2 days depending on your location
          </p>
        </div>
      </div>
    </div>
  );
}