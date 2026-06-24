import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Circle, Users } from 'lucide-react';
import { PRAYERS } from '../FamilyPrayerHub';
import { cn } from '@/lib/utils';

export default function FamilyPrayerGrid({ familyMembers, logs, today, user, isPrayerDone, memberScore, onUpdate }) {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: async ({ memberEmail, prayer }) => {
      const existing = logs.find(
        l => l.user_email === memberEmail && l.prayer_name?.toLowerCase() === prayer
      );
      if (existing) {
        await base44.entities.PrayerLog.delete(existing.id);
      } else {
        await base44.entities.PrayerLog.create({
          user_email: memberEmail,
          prayer_name: prayer,
          date: today,
          completed: true,
          completed_at: new Date().toISOString()
        });
      }
    },
    onSuccess: onUpdate
  });

  if (familyMembers.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No family members yet. Add one to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Prayer grid table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header row */}
        <div
          className="grid bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700"
          style={{ gridTemplateColumns: '1fr repeat(5, minmax(52px, 1fr))' }}
        >
          <div className="p-3 text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Member
          </div>
          {PRAYERS.map(p => (
            <div key={p.key} className="py-2 text-center">
              <div className="text-sm">{p.emoji}</div>
              <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{p.name}</div>
            </div>
          ))}
        </div>

        {/* Member rows */}
        {familyMembers.map(member => {
          const score = memberScore(member.email);
          const isComplete = score === 5;
          return (
            <div
              key={member.email}
              className={cn(
                'grid border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors',
                isComplete
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20'
                  : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
              )}
              style={{ gridTemplateColumns: '1fr repeat(5, minmax(52px, 1fr))' }}
            >
              {/* Member info */}
              <div className="p-3 flex items-center gap-2">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                  isComplete
                    ? 'bg-gradient-to-br from-emerald-400 to-green-500'
                    : 'bg-gradient-to-br from-rose-400 to-pink-500'
                )}>
                  {member.name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {member.name}{member.isMe && <span className="text-slate-400 font-normal"> (you)</span>}
                  </p>
                  <p className={cn('text-[10px] font-medium', isComplete ? 'text-emerald-600' : 'text-slate-400')}>
                    {score}/5 {isComplete ? '✓ Complete!' : 'today'}
                  </p>
                </div>
              </div>

              {/* Prayer checkboxes */}
              {PRAYERS.map(p => {
                const done = isPrayerDone(member.email, p.key);
                const canToggle = member.isMe;
                return (
                  <div key={p.key} className="flex items-center justify-center py-2">
                    <button
                      onClick={() => canToggle && toggleMutation.mutate({ memberEmail: member.email, prayer: p.key })}
                      disabled={!canToggle || toggleMutation.isPending}
                      className={cn(
                        'transition-all duration-150 rounded-full',
                        canToggle ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default opacity-70'
                      )}
                      title={canToggle ? `${done ? 'Unmark' : 'Mark'} ${p.name}` : `${member.name}'s prayer`}
                    >
                      {done
                        ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        : <Circle className={cn('w-6 h-6', canToggle ? 'text-slate-300 dark:text-slate-600 hover:text-rose-300' : 'text-slate-200 dark:text-slate-700')} />
                      }
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'All 5 prayed', filter: m => memberScore(m.email) === 5, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
          { label: '3–4 prayers', filter: m => memberScore(m.email) >= 3 && memberScore(m.email) < 5, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
          { label: 'Needs support', filter: m => memberScore(m.email) < 3, color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
            <p className="text-2xl font-black">{familyMembers.filter(s.filter).length}</p>
            <p className="text-[10px] font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}