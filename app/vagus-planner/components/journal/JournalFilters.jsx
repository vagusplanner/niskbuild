import React from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

const CATEGORIES = ['daily', 'gratitude', 'spiritual', 'goals', 'challenges', 'decisions', 'prayer', 'learning'];
const MOODS = ['joyful', 'grateful', 'peaceful', 'hopeful', 'reflective', 'motivated', 'anxious', 'sad', 'frustrated', 'tired'];
const MOOD_EMOJI = {
  joyful: '😄', grateful: '🙏', peaceful: '😌', hopeful: '✨',
  reflective: '🤔', motivated: '💪', anxious: '😰', sad: '😢',
  frustrated: '😤', tired: '😴',
};

export default function JournalFilters({ filters, onChange }) {
  const set = (key, val) => onChange({ ...filters, [key]: val });
  const clear = () => onChange({ search: '', category: '', mood: '', dateFrom: '', dateTo: '', tag: '' });
  const hasFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search entries by keyword or tag…"
          value={filters.search}
          onChange={e => set('search', e.target.value)}
          className="pl-9 pr-9 border-sky-100 focus:border-sky-300 text-sm"
        />
        {filters.search && (
          <button onClick={() => set('search', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Date range */}
      <div className="flex gap-2 items-center">
        <Input type="date" value={filters.dateFrom} onChange={e => set('dateFrom', e.target.value)} className="border-sky-100 text-sm text-slate-600 h-9 flex-1" placeholder="From" />
        <span className="text-slate-400 text-sm">–</span>
        <Input type="date" value={filters.dateTo} onChange={e => set('dateTo', e.target.value)} className="border-sky-100 text-sm text-slate-600 h-9 flex-1" placeholder="To" />
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => set('category', filters.category === c ? '' : c)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all capitalize ${
              filters.category === c
                ? 'bg-[#1a5a9a] text-white border-[#1a5a9a]'
                : 'bg-white text-slate-500 border-slate-200 hover:border-sky-300'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Mood chips */}
      <div className="flex flex-wrap gap-1.5">
        {MOODS.map(m => (
          <button
            key={m}
            onClick={() => set('mood', filters.mood === m ? '' : m)}
            className={`px-2.5 py-1 rounded-full text-xs border transition-all flex items-center gap-1 ${
              filters.mood === m
                ? 'bg-[#1a5a9a] text-white border-[#1a5a9a]'
                : 'bg-white text-slate-500 border-slate-200 hover:border-sky-300'
            }`}
          >
            <span>{MOOD_EMOJI[m]}</span>{m}
          </button>
        ))}
      </div>

      {hasFilters && (
        <button onClick={clear} className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
          <X className="w-3 h-3" /> Clear all filters
        </button>
      )}
    </div>
  );
}