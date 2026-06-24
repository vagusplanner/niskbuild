import React, { useMemo } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, Flame, Target, Calendar, 
  MapPin, Users, AlertTriangle
} from 'lucide-react';
import { format, subDays, differenceInDays } from 'date-fns';

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export default function PrayerAnalytics() {
  const { data: logs = [] } = useQuery({
    queryKey: ['prayer-logs-month'],
    queryFn: () => SDK.entities.PrayerLog.list('-date', 200),
    initialData: []
  });

  const analytics = useMemo(() => {
    const last30Days = logs.filter(log => {
      const days = differenceInDays(new Date(), new Date(log.date));
      return days >= 0 && days < 30;
    });

    const last7Days = logs.filter(log => {
      const days = differenceInDays(new Date(), new Date(log.date));
      return days >= 0 && days < 7;
    });

    const performed = last30Days.filter(l => l.status === 'performed');
    const missed = last30Days.filter(l => l.status === 'missed');
    const inCongregation = performed.filter(l => l.in_congregation);

    // Calculate streak
    let currentStreak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const date = format(subDays(today, i), 'yyyy-MM-dd');
      const dayLogs = logs.filter(l => l.date === date);
      const performedCount = dayLogs.filter(l => l.status === 'performed').length;
      
      if (performedCount === 5) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Missed reasons breakdown
    const missedReasons = {};
    missed.forEach(log => {
      missedReasons[log.missed_reason] = (missedReasons[log.missed_reason] || 0) + 1;
    });

    // Prayer-specific stats
    const prayerStats = {};
    PRAYERS.forEach(prayer => {
      const prayerLogs = last30Days.filter(l => l.prayer_name === prayer);
      const prayerPerformed = prayerLogs.filter(l => l.status === 'performed').length;
      prayerStats[prayer] = {
        performed: prayerPerformed,
        total: 30,
        percentage: ((prayerPerformed / 30) * 100).toFixed(0)
      };
    });

    return {
      totalPerformed: performed.length,
      totalMissed: missed.length,
      totalPossible: 30 * 5,
      consistency: ((performed.length / (30 * 5)) * 100).toFixed(0),
      weekConsistency: ((last7Days.filter(l => l.status === 'performed').length / (7 * 5)) * 100).toFixed(0),
      inCongregation: inCongregation.length,
      congregationRate: performed.length > 0 ? ((inCongregation.length / performed.length) * 100).toFixed(0) : 0,
      currentStreak,
      missedReasons,
      prayerStats,
      mostMissedPrayer: Object.entries(prayerStats).reduce((a, b) => 
        parseInt(a[1].percentage) < parseInt(b[1].percentage) ? a : b
      )[0]
    };
  }, [logs]);

  return (
    <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-teal-600" />
          Prayer Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/60 rounded-lg p-3 text-center">
            <Target className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-emerald-700">{analytics.consistency}%</p>
            <p className="text-xs text-slate-600">30-Day Consistency</p>
          </div>
          <div className="bg-white/60 rounded-lg p-3 text-center">
            <Flame className="w-5 h-5 text-orange-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-orange-600">{analytics.currentStreak}</p>
            <p className="text-xs text-slate-600">Perfect Days Streak</p>
          </div>
          <div className="bg-white/60 rounded-lg p-3 text-center">
            <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-600">{analytics.congregationRate}%</p>
            <p className="text-xs text-slate-600">In Congregation</p>
          </div>
          <div className="bg-white/60 rounded-lg p-3 text-center">
            <Calendar className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-purple-600">{analytics.weekConsistency}%</p>
            <p className="text-xs text-slate-600">This Week</p>
          </div>
        </div>

        {/* Prayer Breakdown */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Prayer-Specific (Last 30 Days)</h4>
          <div className="space-y-2">
            {PRAYERS.map(prayer => {
              const stats = analytics.prayerStats[prayer];
              return (
                <div key={prayer} className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 w-16">{prayer}</span>
                  <div className="flex-1 h-2 bg-white/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                      style={{ width: `${stats.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 w-12 text-right">
                    {stats.percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Missed Reasons */}
        {analytics.totalMissed > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Missed Prayer Reasons
            </h4>
            <div className="space-y-1">
              {Object.entries(analytics.missedReasons).map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 capitalize">{reason}</span>
                  <span className="font-semibold text-slate-700">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <p className="text-xs text-blue-900 font-medium mb-1">💡 Insights</p>
          <p className="text-xs text-blue-700">
            {analytics.consistency >= 90 ? 
              '🎉 Excellent consistency! Keep it up!' :
              analytics.consistency >= 70 ?
              `Focus on ${analytics.mostMissedPrayer} prayer to improve consistency.` :
              'Consider setting earlier reminders for missed prayers.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}