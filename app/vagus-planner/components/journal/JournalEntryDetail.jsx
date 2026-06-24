import React from 'react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, X } from 'lucide-react';

const MOOD_EMOJI = {
  joyful: '😄', grateful: '🙏', peaceful: '😌', hopeful: '✨',
  reflective: '🤔', motivated: '💪', anxious: '😰', sad: '😢',
  frustrated: '😤', tired: '😴',
};
const MOOD_BAR_COLOR = (r) => r >= 8 ? 'bg-green-400' : r >= 5 ? 'bg-amber-400' : 'bg-red-400';

function Section({ title, children }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{title}</p>
      {children}
    </div>
  );
}

export default function JournalEntryDetail({ entry, onEdit, onClose }) {
  if (!entry) return null;
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400 mb-1">{format(parseISO(entry.date), 'EEEE, MMMM d, yyyy')}</p>
          {entry.title && <h2 className="text-xl font-bold text-slate-800">{entry.title}</h2>}
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <Badge className="text-[10px] capitalize px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{entry.category}</Badge>
            {entry.mood && <span className="text-lg">{MOOD_EMOJI[entry.mood]}</span>}
            {entry.mood_rating && (
              <div className="flex items-center gap-1.5">
                <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${MOOD_BAR_COLOR(entry.mood_rating)}`} style={{ width: `${entry.mood_rating * 10}%` }} />
                </div>
                <span className="text-xs text-slate-500">{entry.mood_rating}/10</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5 border-sky-200 text-sky-700 hover:bg-sky-50">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      {entry.content && (
        <div className="bg-white border border-sky-50 rounded-xl p-4 text-sm text-slate-700 leading-7 whitespace-pre-wrap">
          {entry.content}
        </div>
      )}

      {/* Structured fields */}
      <div className="grid sm:grid-cols-2 gap-3">
        {entry.gratitude_items?.length > 0 && (
          <Section title="🙏 Gratitude">
            <ul className="space-y-1">{entry.gratitude_items.map((g, i) => <li key={i} className="text-sm text-slate-600 flex gap-2"><span className="text-amber-400">•</span>{g}</li>)}</ul>
          </Section>
        )}
        {entry.wins?.length > 0 && (
          <Section title="🏆 Wins">
            <ul className="space-y-1">{entry.wins.map((w, i) => <li key={i} className="text-sm text-slate-600 flex gap-2"><span className="text-green-400">•</span>{w}</li>)}</ul>
          </Section>
        )}
        {entry.challenges?.length > 0 && (
          <Section title="😤 Challenges">
            <ul className="space-y-1">{entry.challenges.map((c, i) => <li key={i} className="text-sm text-slate-600 flex gap-2"><span className="text-red-400">•</span>{c}</li>)}</ul>
          </Section>
        )}
        {entry.tomorrow_focus?.length > 0 && (
          <Section title="🎯 Tomorrow's Focus">
            <ul className="space-y-1">{entry.tomorrow_focus.map((f, i) => <li key={i} className="text-sm text-slate-600 flex gap-2"><span className="text-blue-400">•</span>{f}</li>)}</ul>
          </Section>
        )}
      </div>

      {entry.lessons_learned && (
        <Section title="📖 Lessons Learned">
          <p className="text-sm text-slate-600 leading-relaxed">{entry.lessons_learned}</p>
        </Section>
      )}

      {/* Tags */}
      {entry.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.tags.map(t => (
            <span key={t} className="text-xs bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full border border-sky-100">#{t}</span>
          ))}
        </div>
      )}

      {entry.word_count > 0 && (
        <p className="text-[11px] text-slate-400 text-right">{entry.word_count} words</p>
      )}
    </div>
  );
}