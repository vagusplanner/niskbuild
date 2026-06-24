import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const MOOD_COLORS = {
  joyful: '#22c55e', grateful: '#f59e0b', peaceful: '#38bdf8', hopeful: '#a78bfa',
  anxious: '#f97316', sad: '#94a3b8', frustrated: '#ef4444', reflective: '#8b5cf6',
  motivated: '#10b981', tired: '#6b7280'
};

// Returns a lookup map: { 'YYYY-MM-DD': {mood, hasEntry} }
export function useJournalDots(currentDate) {
  const monthStart = startOfMonth(currentDate).toISOString().split('T')[0];
  const monthEnd = endOfMonth(currentDate).toISOString().split('T')[0];

  const { data: entries = [] } = useQuery({
    queryKey: ['reflections-dots', monthStart],
    queryFn: () => base44.entities.Reflection.list('-date', 100),
    staleTime: 60_000,
    select: (all) => all.filter(e => e.date >= monthStart && e.date <= monthEnd),
  });

  const dotMap = {};
  entries.forEach(e => {
    dotMap[e.date] = { mood: e.mood, hasEntry: true };
  });
  return dotMap;
}

// Tiny dot indicator rendered inside a calendar cell
export default function JournalDot({ date }) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const { data: entries = [] } = useQuery({
    queryKey: ['reflections'],
    staleTime: 60_000,
  });
  
  const entry = entries.find(e => e.date === dateStr);
  if (!entry) return null;

  const color = MOOD_COLORS[entry.mood] || '#E8B84B';

  return (
    <div
      title={`Journal: ${entry.mood || 'entry'}`}
      style={{ background: color }}
      className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm"
    />
  );
}