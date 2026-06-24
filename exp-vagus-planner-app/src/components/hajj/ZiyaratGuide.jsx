import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZIYARAT_MAKKAH, ZIYARAT_MADINAH } from './data/hajjData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, ChevronDown, ChevronUp, Calendar, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const TYPE_STYLES = {
  obligatory_visit: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  highly_recommended: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  recommended: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  hajj_only: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  tourist: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
};

const TYPE_LABELS = {
  obligatory_visit: 'Must Visit',
  highly_recommended: 'Highly Recommended',
  recommended: 'Recommended',
  hajj_only: 'Hajj Only',
  tourist: 'Cultural',
};

function SiteCard({ site, addToCalendar }) {
  const [expanded, setExpanded] = useState(false);
  const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left">
        <span className="text-2xl flex-shrink-0 mt-0.5">{site.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <p className="font-black text-slate-800 dark:text-slate-100 text-sm">{site.name}</p>
            <Badge className={cn("text-[9px] flex-shrink-0", TYPE_STYLES[site.type])}>{TYPE_LABELS[site.type]}</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{site.description}</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">

              {/* What to do */}
              {site.what_to_do?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">📋 What to Do</p>
                  <ul className="space-y-1.5">
                    {site.what_to_do.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <span className="text-teal-500 font-bold mt-0.5 flex-shrink-0">→</span>{a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Du'a */}
              {site.dua_arabic && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">🤲 Du'a</p>
                  <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl space-y-1.5">
                    <p className="text-base text-white font-bold text-right leading-loose" dir="rtl">{site.dua_arabic}</p>
                    <p className="text-xs text-white/80 italic">{site.dua_translation}</p>
                  </div>
                  <button onClick={() => copy(site.dua_arabic)} className="mt-1 text-xs text-teal-600 flex items-center gap-1 hover:underline">
                    <Copy className="w-3 h-3" /> Copy Arabic
                  </button>
                </div>
              )}

              {/* Special du'as */}
              {site.grave_greeting && (
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-800">
                  <p className="text-xs font-bold text-green-800 dark:text-green-300 mb-1">Greeting at the Grave</p>
                  <p className="text-sm text-green-800 dark:text-green-200 text-right font-bold" dir="rtl">{site.grave_greeting}</p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-1 italic">{site.grave_greeting_translation}</p>
                </div>
              )}

              {/* Historical */}
              {site.historical && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">📜 Historical Context</p>
                  <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">{site.historical}</p>
                </div>
              )}

              {/* Hadith */}
              {site.hadith && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900">
                  <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">📖 Hadith</p>
                  <p className="text-xs text-indigo-800 dark:text-indigo-200 italic">"{site.hadith}"</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => addToCalendar(site)}
                  className="flex-1 text-xs border-teal-200 text-teal-700 dark:text-teal-400">
                  <Calendar className="w-3 h-3 mr-1" />Add to Calendar
                </Button>
                {site.lat && (
                  <Button size="sm" variant="outline" asChild className="text-xs border-blue-200 text-blue-700">
                    <a href={`https://www.google.com/maps?q=${site.lat},${site.lng}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3 mr-1" />Map
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ZiyaratGuide({ cityTab = 'makkah' }) {
  const [tab, setTab] = useState(cityTab);
  const queryClient = useQueryClient();

  const addToCalendar = useMutation({
    mutationFn: async (site) => {
      const date = new Date();
      date.setHours(9, 0, 0, 0);
      const end = new Date(date);
      end.setHours(11, 0, 0, 0);
      return SDK.entities.Event.create({
        title: `🕌 Visit: ${site.name}`,
        description: `${site.description}\n\nWhat to do:\n${site.what_to_do?.join('\n') || ''}\n\nDu'a: ${site.dua_translation || ''}`,
        start_date: date.toISOString(),
        end_date: end.toISOString(),
        category: 'personal',
        location: `${site.name}, ${tab === 'makkah' ? 'Makkah' : 'Madinah'}, Saudi Arabia`,
        color: '#10b981',
      });
    },
    onSuccess: (_, site) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(`"${site.name}" added to your Calendar!`);
    },
  });

  const sites = tab === 'makkah' ? ZIYARAT_MAKKAH : ZIYARAT_MADINAH;

  return (
    <div className="space-y-3">
      {/* City Tab Selector */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        {[{ id: 'makkah', label: '🕋 Makkah' }, { id: 'madinah', label: '💚 Madinah' }].map(c => (
          <button key={c.id} onClick={() => setTab(c.id)}
            className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all",
              tab === c.id ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}>
            {c.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500">Tap any site to see what to do, du'a, history & add to calendar.</p>

      {sites.map(site => (
        <SiteCard key={site.id} site={site} addToCalendar={(s) => addToCalendar.mutate(s)} />
      ))}
    </div>
  );
}