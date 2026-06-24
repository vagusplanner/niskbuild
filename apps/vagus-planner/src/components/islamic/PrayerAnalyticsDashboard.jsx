import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  Award, 
  Target,
  Flame,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const COLORS = ['#14B8A6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function PrayerAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('30'); // 7, 30, 90 days

  const { data: prayerLogs = [] } = useQuery({
    queryKey: ['prayerAnalytics'],
    queryFn: async () => {
      const logs = await base44.entities.PrayerLog.filter({});
      return logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  });

  const analytics = useMemo(() => {
    const days = parseInt(timeRange);
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
    const relevantLogs = prayerLogs.filter(log => log.date >= startDate);

    // Calculate metrics
    const totalPrayers = relevantLogs.length;
    const prayedCount = relevantLogs.filter(log => log.status === 'prayed').length;
    const onTimeCount = relevantLogs.filter(log => log.prayed_on_time).length;
    const missedCount = relevantLogs.filter(log => log.status === 'missed').length;
    
    const completionRate = totalPrayers > 0 ? ((prayedCount / (days * 5)) * 100).toFixed(1) : 0;
    const onTimeRate = prayedCount > 0 ? ((onTimeCount / prayedCount) * 100).toFixed(1) : 0;

    // Current streak
    let currentStreak = 0;
    let currentDate = new Date();
    while (true) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayLogs = prayerLogs.filter(log => log.date === dateStr);
      const dayPrayed = dayLogs.filter(log => log.status === 'prayed').length;
      
      if (dayPrayed === 5) {
        currentStreak++;
        currentDate = subDays(currentDate, 1);
      } else {
        break;
      }
    }

    // Longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    const allDates = [...new Set(prayerLogs.map(log => log.date))].sort();
    
    allDates.forEach(date => {
      const dayLogs = prayerLogs.filter(log => log.date === date);
      const dayPrayed = dayLogs.filter(log => log.status === 'prayed').length;
      
      if (dayPrayed === 5) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    });

    // Prayer distribution
    const prayerDistribution = PRAYERS.map(prayer => ({
      name: prayer,
      prayed: relevantLogs.filter(log => log.prayer_name === prayer && log.status === 'prayed').length,
      missed: relevantLogs.filter(log => log.prayer_name === prayer && log.status === 'missed').length
    }));

    // Weekly trend (last 7 days)
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date()
    });

    const weeklyTrend = last7Days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayLogs = relevantLogs.filter(log => log.date === dateStr);
      const prayed = dayLogs.filter(log => log.status === 'prayed').length;
      
      return {
        date: format(date, 'EEE'),
        prayers: prayed,
        percentage: (prayed / 5) * 100
      };
    });

    // On-time distribution
    const onTimeDistribution = [
      { name: 'On Time', value: onTimeCount, color: '#10B981' },
      { name: 'Late', value: prayedCount - onTimeCount, color: '#F59E0B' },
      { name: 'Missed', value: missedCount, color: '#EF4444' }
    ].filter(item => item.value > 0);

    return {
      completionRate,
      onTimeRate,
      currentStreak,
      longestStreak,
      prayedCount,
      missedCount,
      onTimeCount,
      prayerDistribution,
      weeklyTrend,
      onTimeDistribution
    };
  }, [prayerLogs, timeRange]);

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Prayer Analytics</h2>
        <Tabs value={timeRange} onValueChange={setTimeRange}>
          <TabsList>
            <TabsTrigger value="7">7 Days</TabsTrigger>
            <TabsTrigger value="30">30 Days</TabsTrigger>
            <TabsTrigger value="90">90 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }}>
          <Card className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white border-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-8 h-8 opacity-80" />
                <span className="text-3xl font-bold">{analytics.completionRate}%</span>
              </div>
              <p className="text-sm text-teal-100">Completion Rate</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }}>
          <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <Flame className="w-8 h-8 opacity-80" />
                <span className="text-3xl font-bold">{analytics.currentStreak}</span>
              </div>
              <p className="text-sm text-orange-100">Current Streak</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }}>
          <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-8 h-8 opacity-80" />
                <span className="text-3xl font-bold">{analytics.longestStreak}</span>
              </div>
              <p className="text-sm text-purple-100">Best Streak</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }}>
          <Card className="bg-gradient-to-br from-green-500 to-teal-600 text-white border-0">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 opacity-80" />
                <span className="text-3xl font-bold">{analytics.onTimeRate}%</span>
              </div>
              <p className="text-sm text-green-100">On Time Rate</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Weekly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            Weekly Prayer Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics.weeklyTrend}>
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis domain={[0, 5]} stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                formatter={(value) => [`${value} prayers`, 'Count']}
              />
              <Bar dataKey="prayers" fill="#14B8A6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Prayer Distribution */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Prayer Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.prayerDistribution} layout="horizontal">
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="prayed" fill="#10B981" name="Prayed" />
                <Bar dataKey="missed" fill="#EF4444" name="Missed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Timeliness Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics.onTimeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.onTimeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card className="bg-slate-50">
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold text-slate-800">{analytics.prayedCount}</span>
              </div>
              <p className="text-sm text-slate-600">Prayers Completed</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="text-2xl font-bold text-slate-800">{analytics.onTimeCount}</span>
              </div>
              <p className="text-sm text-slate-600">Prayed On Time</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-2xl font-bold text-slate-800">{analytics.missedCount}</span>
              </div>
              <p className="text-sm text-slate-600">Prayers Missed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}