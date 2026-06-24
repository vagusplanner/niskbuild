import React from 'react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, BookOpen } from 'lucide-react';

const MOOD_EMOJI = {
  joyful: '😄', grateful: '🙏', peaceful: '😌', hopeful: '✨',
  reflective: '🤔', motivated: '💪', anxious: '😰', sad: '😢',
  frustrated: '😤', tired: '😴',
};

const CATEGORY_COLORS = {
  daily:      'bg-blue-100 text-blue-700',
  gratitude:  'bg-amber-100 text-amber-700',
  spiritual:  'bg-purple-100 text-purple-700',
  goals:      'bg-green-100 text-green-700',
  challenges: 'bg-red-100 text-red-700',
  decisions:  'bg-indigo-100 text-indigo-700',
  prayer:     'bg-teal-100 text-teal-700',
  learning:   'bg-orange-100 text-orange-700',
};

const MOOD_BAR_COLOR = (r) => {
  if (r >= 8) return 'bg-green-400';
  if (r >= 5) return 'bg-amber-400';
  return 'bg-red-400';
};

export default function JournalEntryCard({ entry, onClick, onEdit, onDelete }) {
  const snippet = entry.content?.slice(0, 160) || '';

  return (
    <div
      className="group bg-white rounded-2xl border border-slate-100 hover:border-sky-200 shadow-sm hover:shadow-md transition-all duration-200 p-4 cursor-pointer"
      onClick={() => onClick(entry)}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Date */}
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
            {format(parseISO(entry.date), 'EEE, MMM d yyyy')}
          </span>
          {/* Category */}
          <Badge className={`text-[10px] px-2 py-0.5 rounded-full ${CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.daily}`}>
            {entry.category}
          </Badge>
          {/* Mood */}
          {entry.mood && (
            <span className="text-base" title={entry.mood}>{MOOD_EMOJI[entry.mood]}</span>
          )}
        </div>
        {/* Mood rating bar */}
        {entry.mood_rating && (
          <div className="flex-shrink-0 flex items-center gap-1">
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${MOOD_BAR_COLOR(entry.mood_rating)}`}
                style={{ width: `${entry.mood_rating * 10}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400">{entry.mood_rating}/10</span>
          </div>
        )}
      </div>

      {entry.title && (
        <h3 className="font-semibold text-slate-800 text-sm mb-1 truncate">{entry.title}</h3>
      )}

      {snippet && (
        <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-3">{snippet}{entry.content?.length > 160 ? '…' : ''}</p>
      )}

      {/* Tags */}
      {entry.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {entry.tags.slice(0, 5).map(t => (
            <span key={t} className="text-[10px] bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded-full border border-sky-100">#{t}</span>
          ))}
          {entry.tags.length > 5 && <span className="text-[10px] text-slate-400">+{entry.tags.length - 5}</span>}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-[10px] text-slate-400">
          {entry.word_count > 0 && <span>{entry.word_count} words</span>}
          {entry.gratitude_items?.length > 0 && <span>🙏 {entry.gratitude_items.length}</span>}
          {entry.wins?.length > 0 && <span>🏆 {entry.wins.length}</span>}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); onEdit(entry); }}
            className="p-1.5 rounded-lg hover:bg-sky-50 text-slate-400 hover:text-sky-600"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(entry); }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}