import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MIQAT_POINTS } from './data/hajjData';
import { MapPin, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function MiqatGuide() {
  const [expanded, setExpanded] = useState(null);

  const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };

  return (
    <div className="space-y-3">
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800">
        <h3 className="font-black text-amber-800 dark:text-amber-200 text-sm mb-1">🗺️ The 5 Miqat Points</h3>
        <p className="text-xs text-amber-700 dark:text-amber-300">Sacred boundaries where you must enter Ihram. Passing them without Ihram (if intending Hajj/Umrah) requires a dam (penalty sacrifice).</p>
      </div>

      {MIQAT_POINTS.map((m, i) => (
        <div key={m.id} className="rounded-2xl border border-amber-100 dark:border-amber-900 bg-white dark:bg-slate-900 overflow-hidden">
          <button onClick={() => setExpanded(expanded === m.id ? null : m.id)}
            className="w-full flex items-center gap-3 p-4 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-black text-slate-800 dark:text-slate-100">{m.name}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">{m.for}</p>
            </div>
            <span className="text-xs text-slate-400 mr-2 hidden sm:block">{m.distance}</span>
            {expanded === m.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          <AnimatePresence>
            {expanded === m.id && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="px-4 pb-4 space-y-3 border-t border-amber-100 dark:border-amber-900 pt-3">
                  {/* Niyyah */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">🤲 Niyyah (Intention)</p>
                    <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl space-y-2">
                      <p className="text-lg font-bold text-white text-right leading-loose" dir="rtl">{m.niyyah_umrah}</p>
                      <p className="text-xs text-emerald-100 italic">{m.niyyah_transliteration}</p>
                      <p className="text-sm text-white">{m.niyyah_translation}</p>
                    </div>
                    <button onClick={() => copy(m.niyyah_umrah)} className="mt-1 text-xs text-teal-600 flex items-center gap-1 hover:underline"><Copy className="w-3 h-3" /> Copy Arabic</button>
                  </div>
                  {/* Talbiyah */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">📢 Talbiyah (Begin immediately after)</p>
                    <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl space-y-1">
                      <p className="text-base font-bold text-white text-right leading-loose" dir="rtl">{m.talbiyah}</p>
                      <p className="text-xs text-indigo-100">Labbayk Allahumma labbayk, labbayk la sharika laka labbayk, innal hamda wan-ni'mata laka wal-mulk, la sharika lak</p>
                      <p className="text-xs text-white/80">Here I am O Allah, here I am. Here I am, You have no partner, here I am. Verily all praise, grace and sovereignty belong to You.</p>
                    </div>
                    <button onClick={() => copy(m.talbiyah)} className="mt-1 text-xs text-indigo-600 flex items-center gap-1 hover:underline"><Copy className="w-3 h-3" /> Copy Talbiyah</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}