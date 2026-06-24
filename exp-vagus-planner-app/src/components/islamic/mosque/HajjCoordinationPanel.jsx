/**
 * HajjCoordinationPanel
 * Shown in the Hajj channel — displays a coordination overview card above the chat.
 */
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Users, CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react';

const HAJJ_RITUALS = [
  { id: 'ihram',    name: 'Enter Ihram',       desc: 'Miqat — Day 1' },
  { id: 'tawaf',   name: 'Tawaf al-Qudum',    desc: 'Arrival Tawaf' },
  { id: 'mina',    name: 'Day of Mina',        desc: '8th Dhul Hijjah' },
  { id: 'arafat',  name: 'Day of Arafat',      desc: '9th Dhul Hijjah — Wuquf' },
  { id: 'muzdalifah', name: 'Muzdalifah',      desc: 'Night of 9th-10th' },
  { id: 'rami',    name: 'Rami al-Jamarat',    desc: 'Stoning — 10th-13th' },
  { id: 'tawaf-ifada', name: 'Tawaf al-Ifada', desc: 'Obligatory Tawaf' },
  { id: 'sai',     name: "Sa'i",               desc: 'Safa & Marwa' },
  { id: 'halq',    name: 'Halq / Taqsir',      desc: 'Hair cutting' },
];

export default function HajjCoordinationPanel() {
  const [expanded, setExpanded] = useState(false);
  const [checked, setChecked] = useState({});

  const toggle = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  const doneCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="mx-4 mt-3 rounded-2xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-950/20 overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <span className="text-2xl">🕋</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-indigo-900 dark:text-indigo-100">Group Hajj Coordination</p>
          <p className="text-[11px] text-indigo-600 dark:text-indigo-400">
            Rituals: {doneCount}/{HAJJ_RITUALS.length} complete
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 bg-indigo-200 dark:bg-indigo-800 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-indigo-500 transition-all"
              style={{ width: `${(doneCount / HAJJ_RITUALS.length) * 100}%` }}
            />
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-indigo-500" /> : <ChevronDown className="w-4 h-4 text-indigo-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-indigo-200 dark:border-indigo-800/40">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3">
            {HAJJ_RITUALS.map(r => (
              <button
                key={r.id}
                onClick={() => toggle(r.id)}
                className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
              >
                {checked[r.id]
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <Circle className="w-4 h-4 text-indigo-300 dark:text-indigo-600 flex-shrink-0" />
                }
                <div className="min-w-0">
                  <p className={`text-xs font-medium truncate ${checked[r.id] ? 'line-through text-slate-400' : 'text-indigo-900 dark:text-indigo-100'}`}>{r.name}</p>
                  <p className="text-[10px] text-indigo-500 dark:text-indigo-400">{r.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Key info */}
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-xs text-indigo-700 dark:text-indigo-300">
              <MapPin className="w-3 h-3" /> Makkah · Madinah
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-xs text-indigo-700 dark:text-indigo-300">
              <Calendar className="w-3 h-3" /> 8–13 Dhul Hijjah
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-xs text-indigo-700 dark:text-indigo-300">
              <Users className="w-3 h-3" /> Group Pilgrimage
            </div>
          </div>
        </div>
      )}
    </div>
  );
}