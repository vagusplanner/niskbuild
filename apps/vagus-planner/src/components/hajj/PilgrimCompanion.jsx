/**
 * PilgrimCompanion — unified guided digital companion for pilgrims.
 * Tabs: Ritual Checklist | Location Duas | Offline Guide | AI Guide
 *
 * Merges: RitualChecklistPanel, HajjAIGuide, PilgrimageConcierge, OfflineContentManager
 * Adds:   GeofencedDuaSuggester (new)
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, MapPin, WifiOff, Sparkles, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

import RitualChecklistPanel from '@/components/hajj/RitualChecklistPanel';
import GeofencedDuaSuggester from '@/components/hajj/GeofencedDuaSuggester';
import OfflineContentManager from '@/components/pilgrimage/OfflineContentManager';
import HajjAIGuide from '@/components/islamic/HajjAIGuide';

const TABS = [
  { id: 'checklist', label: 'Rituals', icon: CheckSquare, color: 'text-purple-500' },
  { id: 'duas',     label: 'Duas',    icon: MapPin,      color: 'text-emerald-500' },
  { id: 'offline',  label: 'Offline', icon: WifiOff,     color: 'text-blue-500' },
  { id: 'ai',       label: 'AI Guide',icon: Sparkles,    color: 'text-amber-500' },
];

export default function PilgrimCompanion({ tripId, tripType = 'hajj' }) {
  const [tab, setTab] = useState('checklist');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-600 via-orange-500 to-amber-500 p-5 shadow-lg">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='0.4'%3E%3Cpath d='M30 30m-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0'/%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-amber-200" />
            <span className="text-xs font-bold text-amber-200 uppercase tracking-widest">Pilgrim Companion</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            {tripType === 'hajj' ? '🕋 Hajj' : '🤍 Umrah'} Guide
          </h2>
          <p className="text-sm text-orange-100 mt-1">Step-by-step rituals · Location duas · Offline access · AI answers</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        {TABS.map(({ id, label, icon: Icon, color }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-lg transition-all text-xs font-semibold',
              tab === id
                ? 'bg-white dark:bg-slate-700 shadow'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}>
            <Icon className={cn('w-4 h-4', tab === id ? color : 'text-current')} />
            <span className={tab === id ? color : ''}>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {tab === 'checklist' && (
            <RitualChecklistPanel tripId={tripId} tripType={tripType} />
          )}
          {tab === 'duas' && (
            <GeofencedDuaSuggester />
          )}
          {tab === 'offline' && (
            <OfflineContentManager />
          )}
          {tab === 'ai' && (
            <HajjAIGuide />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}