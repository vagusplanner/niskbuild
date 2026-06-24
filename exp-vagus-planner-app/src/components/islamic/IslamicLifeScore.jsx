import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { motion } from 'framer-motion';
import { Star, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const SCORE_WEIGHTS = {
  prayers: 40,     // max 40 pts (5 prayers × 8pts each)
  quran: 20,       // max 20 pts (any reading = 20)
  dhikr: 15,       // max 15 pts (any dhikr = 15)
  sadaqa: 15,      // max 15 pts (any charity = 15)
  fasting: 10,     // max 10 pts (fasting = 10)
};

function ScoreRing({ score, size = 120 }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - score / 100);
  
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Work';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={8} />
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none">{score}</p>
        <p className="text-[10px] font-semibold leading-tight mt-0.5" style={{ color }}>{label}</p>
      </div>
    </div>
  );
}

export default function IslamicLifeScore({ compact = false }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'));

  const { data: prayerLogs = [] } = useQuery({
    queryKey: ['prayerLogs7', today],
    queryFn: () => SDK.entities.PrayerLog.filter({ date: { $gte: last7[0], $lte: today } }),
    staleTime: 30000,
  });

  const { data: quranReadings = [] } = useQuery({
    queryKey: ['quranReadings7', today],
    queryFn: () => SDK.entities.QuranReading.filter({ created_date: { $gte: `${last7[0]}T00:00:00` } }),
    staleTime: 30000,
  });

  const { data: fastingRecords = [] } = useQuery({
    queryKey: ['fastingRecords7', today],
    queryFn: () => SDK.entities.FastingRecord.filter({ date: { $gte: last7[0], $lte: today } }),
    staleTime: 30000,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses7', today],
    queryFn: () => SDK.entities.Expense.filter({ date: { $gte: last7[0], $lte: today }, type: { $in: ['sadaqa', 'zakat'] } }),
    staleTime: 30000,
  });

  const { data: dhikrLogs = [] } = useQuery({
    queryKey: ['dhikrLogs7', today],
    queryFn: () => SDK.entities.PrayerLog.filter({ date: { $gte: last7[0], $lte: today }, prayer_name: { $regex: 'dhikr' } }),
    staleTime: 30000,
  });

  const weekData = useMemo(() => {
    return last7.map(date => {
      const dayPrayers = prayerLogs.filter(p => p.date === date && ['fajr','dhuhr','asr','maghrib','isha'].includes(p.prayer_name?.toLowerCase()) && p.status === 'prayed');
      const prayerScore = Math.min(40, dayPrayers.length * 8);
      const quranScore = quranReadings.some(r => r.created_date?.startsWith(date)) ? 20 : 0;
      const dhikrScore = dhikrLogs.some(d => d.date === date) ? 15 : 0;
      const sadaqaScore = expenses.some(e => e.date === date) ? 15 : 0;
      const fastingScore = fastingRecords.some(f => f.date === date && f.completed) ? 10 : 0;
      const total = prayerScore + quranScore + dhikrScore + sadaqaScore + fastingScore;
      return {
        date: format(new Date(date), 'EEE'),
        score: total,
        prayers: dayPrayers.length,
        quran: quranScore > 0 ? 1 : 0,
        fasting: fastingScore > 0 ? 1 : 0,
      };
    });
  }, [prayerLogs, quranReadings, fastingRecords, expenses, dhikrLogs]);

  const todayScore = weekData[weekData.length - 1]?.score || 0;
  const yesterdayScore = weekData[weekData.length - 2]?.score || 0;
  const trend = todayScore - yesterdayScore;
  const avgScore = Math.round(weekData.reduce((s, d) => s + d.score, 0) / 7);

  // Today's breakdown
  const todayPrayers = prayerLogs.filter(p => p.date === today && ['fajr','dhuhr','asr','maghrib','isha'].includes(p.prayer_name?.toLowerCase()) && p.status === 'prayed').length;
  const todayQuran = quranReadings.some(r => r.created_date?.startsWith(today));
  const todayFasting = fastingRecords.some(f => f.date === today && f.completed);
  const todaySadaqa = expenses.some(e => e.date === today);

  if (compact) {
    const color = todayScore >= 80 ? 'text-emerald-600' : todayScore >= 60 ? 'text-amber-600' : 'text-orange-600';
    return (
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 px-4 py-3">
        <Star className={`w-5 h-5 ${color}`} />
        <div className="flex-1">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Islamic Life Score</p>
          <p className={`text-xl font-black ${color}`}>{todayScore}/100</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">7-day avg</p>
          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{avgScore}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Score ring + breakdown */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-200 dark:border-indigo-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" /> Islamic Life Score
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{format(new Date(), 'EEEE, MMMM d')}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {trend > 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : trend < 0 ? <TrendingDown className="w-4 h-4 text-red-500" /> : <Minus className="w-4 h-4 text-slate-400" />}
            <span className={`text-xs font-bold ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-slate-400'}`}>
              {trend > 0 ? '+' : ''}{trend} vs yesterday
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <ScoreRing score={todayScore} />
          <div className="flex-1 space-y-2.5">
            {[
              { label: 'Prayers', value: todayPrayers, max: 5, score: Math.min(40, todayPrayers * 8), maxScore: 40, icon: '🕌' },
              { label: 'Quran', value: todayQuran ? 1 : 0, max: 1, score: todayQuran ? 20 : 0, maxScore: 20, icon: '📖' },
              { label: 'Dhikr', value: 0, max: 1, score: 0, maxScore: 15, icon: '📿' },
              { label: 'Sadaqa', value: todaySadaqa ? 1 : 0, max: 1, score: todaySadaqa ? 15 : 0, maxScore: 15, icon: '💝' },
              { label: 'Fasting', value: todayFasting ? 1 : 0, max: 1, score: todayFasting ? 10 : 0, maxScore: 10, icon: '🌙' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{item.icon} {item.label}</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.score}/{item.maxScore}</span>
                </div>
                <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.maxScore > 0 ? (item.score / item.maxScore) * 100 : 0}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7-day trend chart */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">7-Day Trend</p>
          <span className="text-xs text-slate-400">Avg: <span className="font-bold text-slate-600 dark:text-slate-300">{avgScore}/100</span></span>
        </div>
        <ResponsiveContainer width="100%" height={80}>
          <AreaChart data={weekData}>
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px' }}
              formatter={(v) => [`${v}/100`, 'Score']}
            />
            <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} fill="url(#scoreGrad)" dot={{ fill: '#6366f1', r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly breakdown grid */}
      <div className="grid grid-cols-7 gap-1">
        {weekData.map((day, i) => {
          const isToday = i === 6;
          const pct = day.score / 100;
          const bg = pct >= 0.8 ? 'bg-emerald-500' : pct >= 0.6 ? 'bg-amber-500' : pct >= 0.4 ? 'bg-orange-400' : 'bg-red-400';
          return (
            <div key={day.date} className={`rounded-xl p-2 text-center ${isToday ? 'ring-2 ring-indigo-500' : ''} bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800`}>
              <p className="text-[9px] text-slate-400 mb-1">{day.date}</p>
              <div className={`w-full rounded-full h-1.5 ${bg} mb-1`} style={{ opacity: 0.3 + pct * 0.7 }} />
              <p className={`text-xs font-black ${isToday ? 'text-indigo-600' : 'text-slate-600 dark:text-slate-400'}`}>{day.score}</p>
              <p className="text-[9px] text-slate-400">{day.prayers}/5 🕌</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}