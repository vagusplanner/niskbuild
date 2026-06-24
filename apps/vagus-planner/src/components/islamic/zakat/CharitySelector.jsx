import React from 'react';
import { CheckCircle2, Globe, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const CHARITIES = [
  {
    id: 'mosque_general',
    name: 'Local Mosque Fund',
    description: 'Support your local mosque — maintenance, education & community services',
    emoji: '🕌',
    category: 'Mosque',
    verified: true,
  },
  {
    id: 'zakat_fund',
    name: 'Zakat Distribution Fund',
    description: "Direct Zakat to those who qualify — distributed to the 8 asnaf",
    emoji: '🤲',
    category: 'Zakat',
    verified: true,
  },
  {
    id: 'orphan_care',
    name: 'Orphan Care Programme',
    description: 'Sponsor an orphan with food, shelter, education and Islamic upbringing',
    emoji: '❤️',
    category: 'Sadaqah',
    verified: true,
  },
  {
    id: 'quran_education',
    name: 'Quran Education Fund',
    description: "Fund Quran teachers & Islamic schools in underserved communities",
    emoji: '📖',
    category: 'Education',
    verified: true,
  },
  {
    id: 'water_well',
    name: 'Water Well Project',
    description: 'Build fresh water wells in Africa & Asia — ongoing Sadaqah Jariyah',
    emoji: '💧',
    category: 'Sadaqah',
    verified: true,
  },
  {
    id: 'hajj_assistance',
    name: 'Hajj Assistance Fund',
    description: "Help Muslims who can't afford Hajj fulfil their obligation",
    emoji: '🕋',
    category: 'Hajj',
    verified: true,
  },
];

export default function CharitySelector({ selected, onSelect }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Choose a Cause</h3>
        <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
          <Shield className="w-3 h-3" /> All verified
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CHARITIES.map(charity => {
          const isSelected = selected?.id === charity.id;
          return (
            <button
              key={charity.id}
              onClick={() => onSelect(charity)}
              className={cn(
                'flex items-start gap-3 p-4 rounded-2xl border text-left transition-all',
                isSelected
                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 shadow-md shadow-amber-200/30 dark:shadow-amber-900/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/30'
              )}
            >
              <span className="text-2xl flex-shrink-0 mt-0.5">{charity.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{charity.name}</p>
                  <Badge className="text-[9px] px-1.5 py-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-0">{charity.category}</Badge>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{charity.description}</p>
              </div>
              {isSelected && (
                <CheckCircle2 className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}