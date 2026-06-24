import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy, Flame, Star, TrendingUp } from 'lucide-react';
import { format, subDays, startOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { PRAYERS } from '../FamilyPrayerHub';

const RANK_STYLES = [
  { bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800', icon: '🥇', label: '1st', badge: 'bg-amber-400 text-white' },
  { bg: 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700', icon: '🥈', label: '2nd', badge: 'bg-slate-400 text-white' },
  { bg: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800', icon: '🥉', label: '3rd', badge: 'bg-orange-400 text-white' },
];

export default function FamilyLeaderboard({ familyMembers, memberScore, logs, today, user }) {
  const [period, setPeriod] = useState('today');

  // Weekly logs
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const { data: weekLogs = [] } = useQuery({
    queryKey: ['familyPrayersWeek', weekStart],
    queryFn: () => base44.entities.PrayerLog.list('-created_date', 500),
    enabled: period === 'week'
  });

  const weeklyScore = (memberEmail) => {
    const days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd'));
    return weekLogs.filter(l =>
      l.user_email === memberEmail &&
      days.includes(l.date) &&
      l.completed
    ).length;
  };

  const getScore = (memberEmail) =>
    period === 'today' ? memberScore(memberEmail) : weeklyScore(memberEmail);

  const maxPossible = period === 'today' ? 5 : 35;

  const ranked = [...familyMembers]
    .map(m => ({ ...m, score: getScore(m.email) }))
    .sort((a, b) => b.score - a.score);

  // Streak for today
  const todayComplete = (memberEmail) => memberScore(memberEmail) === 5;

  return (
    <div className="space-y-4">
      {/* Period toggle */}
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        {['today', 'week'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all',
              period === p
                ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {p === 'today' ? "Today" : "This Week"}
          </button>
        ))}
      </div>

      {/* Top 3 podium */}
      {ranked.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {ranked.slice(0, 3).map((member, i) => {
            const style = RANK_STYLES[i] || RANK_STYLES[2];
            const pct = maxPossible > 0 ? Math.round((member.score / maxPossible) * 100) : 0;
            return (
              <div key={member.email} className={cn('rounded-2xl border p-4 text-center', style.bg)}>
                <div className="text-2xl mb-1">{style.icon}</div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-sm font-bold mx-auto mb-2">
                  {member.name?.[0]?.toUpperCase()}
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{member.name}</p>
                {member.isMe && <p className="text-[10px] text-slate-400">you</p>}
                <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold mt-2', style.badge)}>
                  <Trophy className="w-3 h-3" />
                  {member.score}/{maxPossible}
                </div>
                <div className="mt-2 w-full bg-white/60 dark:bg-slate-700/60 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-emerald-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full ranked list */}
      {ranked.length > 3 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {ranked.slice(3).map((member, i) => {
            const rank = i + 4;
            const pct = maxPossible > 0 ? Math.round((member.score / maxPossible) * 100) : 0;
            return (
              <div key={member.email} className="flex items-center gap-3 p-3 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/20">
                <span className="text-xs font-bold text-slate-400 w-5 text-center">#{rank}</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {member.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {member.name} {member.isMe && <span className="text-slate-400 font-normal">(you)</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{member.score}/{maxPossible}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Motivational footer */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800">
        <Flame className="w-4 h-4 text-indigo-500 flex-shrink-0" />
        <p className="text-xs text-indigo-700 dark:text-indigo-300">
          {ranked.filter(m => todayComplete(m.email)).length === ranked.length && ranked.length > 0
            ? '🎉 Amazing! Every family member prayed all 5 today!'
            : `${ranked.filter(m => todayComplete(m.email)).length} of ${ranked.length} members completed all prayers today. Keep going!`}
        </p>
      </div>
    </div>
  );
}