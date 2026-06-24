import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Calendar, Clock, Award, Target, Flame,
  CheckCircle2, XCircle, AlertCircle, MapPin, Users,
  Moon, Sun, Sunrise, Sunset, TrendingDown, Info
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Area, AreaChart
} from 'recharts';

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const COLORS = ['#14B8A6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AdvancedPrayerAnalytics() {
  const [timeRange, setTimeRange] = useState('30');
  const [selectedPrayer, setSelectedPrayer] = useState(null);

  const { data: prayerLogs = [] } = useQuery({
    queryKey: ['advancedPrayerAnalytics'],
    queryFn: async () => {
      const logs = await base44.entities.PrayerLog.list('-date', 365);
      return logs;
    }
  });

  const analytics = useMemo(() => {
    const days = parseInt(timeRange);
    const startDate = subDays(new Date(), days);
    const relevantLogs = prayerLogs.filter(log => 
      new Date(log.date) >= startDate
    );

    // Core metrics
    const totalExpected = days * 5;
    const performedLogs = relevantLogs.filter(l => l.status === 'performed');
    const missedLogs = relevantLogs.filter(l => l.status === 'missed');
    const qadaLogs = relevantLogs.filter(l => l.status === 'qada');
    
    const completionRate = ((performedLogs.length / totalExpected) * 100).toFixed(1);
    const missedRate = ((missedLogs.length / totalExpected) * 100).toFixed(1);
    
    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    for (let i = 0; i < 365; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayLogs = prayerLogs.filter(l => l.date === date && l.status === 'performed');
      
      if (dayLogs.length === 5) {
        if (i === currentStreak) currentStreak++;
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Prayer-specific analysis
    const prayerAnalysis = PRAYERS.map(prayer => {
      const prayerLogs = relevantLogs.filter(l => l.prayer_name === prayer);
      const performed = prayerLogs.filter(l => l.status === 'performed').length;
      const missed = prayerLogs.filter(l => l.status === 'missed').length;
      const inCongregation = prayerLogs.filter(l => l.in_congregation).length;
      
      return {
        name: prayer,
        performed,
        missed,
        rate: ((performed / days) * 100).toFixed(1),
        congregationRate: performed > 0 ? ((inCongregation / performed) * 100).toFixed(0) : 0,
        inCongregation
      };
    });

    // Monthly trend
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subDays(new Date(), i * 30));
      const monthEnd = endOfMonth(monthStart);
      const monthLogs = prayerLogs.filter(l => {
        const date = new Date(l.date);
        return date >= monthStart && date <= monthEnd;
      });
      
      const performed = monthLogs.filter(l => l.status === 'performed').length;
      const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
      
      monthlyData.push({
        month: format(monthStart, 'MMM'),
        rate: ((performed / (daysInMonth * 5)) * 100).toFixed(0),
        count: performed
      });
    }

    // Weekly heatmap
    const last4Weeks = eachDayOfInterval({
      start: subDays(new Date(), 27),
      end: new Date()
    });

    const weeklyHeatmap = last4Weeks.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayLogs = prayerLogs.filter(l => l.date === dateStr && l.status === 'performed');
      
      return {
        date: format(date, 'dd'),
        day: format(date, 'EEE'),
        count: dayLogs.length,
        percentage: (dayLogs.length / 5) * 100
      };
    });

    // Location analysis
    const locationStats = {};
    performedLogs.forEach(log => {
      const loc = log.location || 'home';
      locationStats[loc] = (locationStats[loc] || 0) + 1;
    });

    const locationData = Object.entries(locationStats).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      percentage: ((value / performedLogs.length) * 100).toFixed(0)
    }));

    // Missed reasons analysis
    const missedReasons = {};
    missedLogs.forEach(log => {
      if (log.missed_reason) {
        missedReasons[log.missed_reason] = (missedReasons[log.missed_reason] || 0) + 1;
      }
    });

    // Congregation rate over time
    const congregationTrend = last4Weeks.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayLogs = prayerLogs.filter(l => l.date === dateStr && l.status === 'performed');
      const congregation = dayLogs.filter(l => l.in_congregation).length;
      
      return {
        date: format(date, 'dd MMM'),
        rate: dayLogs.length > 0 ? ((congregation / dayLogs.length) * 100).toFixed(0) : 0
      };
    });

    // Time of day performance
    const performedWithTime = performedLogs.filter(l => l.performed_at);
    const avgDelays = PRAYERS.map(prayer => {
      const prayerPerformed = performedWithTime.filter(l => 
        l.prayer_name === prayer && l.prayer_time && l.performed_at
      );
      
      let totalDelay = 0;
      prayerPerformed.forEach(log => {
        const [schedHour, schedMin] = log.prayer_time.split(':').map(Number);
        const [perfHour, perfMin] = log.performed_at.split(':').map(Number);
        const delay = (perfHour * 60 + perfMin) - (schedHour * 60 + schedMin);
        totalDelay += Math.max(0, delay);
      });
      
      return {
        prayer,
        avgDelay: prayerPerformed.length > 0 ? Math.round(totalDelay / prayerPerformed.length) : 0
      };
    });

    // Generate insights
    const insights = [];
    
    if (completionRate >= 90) {
      insights.push({ type: 'success', message: '🎉 Excellent consistency! You\'re in the top tier of prayer discipline.' });
    } else if (completionRate >= 70) {
      insights.push({ type: 'good', message: '👍 Good progress! Focus on consistency to reach 90%+.' });
    } else {
      insights.push({ type: 'warning', message: '⚠️ There\'s room for improvement. Set prayer reminders 15 mins early.' });
    }

    const lowestPrayer = prayerAnalysis.reduce((min, p) => 
      parseFloat(p.rate) < parseFloat(min.rate) ? p : min
    );
    
    if (parseFloat(lowestPrayer.rate) < 70) {
      insights.push({ 
        type: 'info', 
        message: `📊 ${lowestPrayer.name} is your most missed prayer (${lowestPrayer.rate}%). Consider setting specific reminders.` 
      });
    }

    const topMissedReason = Object.entries(missedReasons).sort((a, b) => b[1] - a[1])[0];
    if (topMissedReason) {
      const [reason, count] = topMissedReason;
      insights.push({ 
        type: 'info', 
        message: `🔍 Main challenge: "${reason}" (${count} times). Address this to improve consistency.` 
      });
    }

    if (currentStreak > 0) {
      insights.push({ 
        type: 'success', 
        message: `🔥 ${currentStreak} day streak! Keep the momentum going.` 
      });
    }

    const congregationTotal = performedLogs.filter(l => l.in_congregation).length;
    const congregationRate = performedLogs.length > 0 ? 
      ((congregationTotal / performedLogs.length) * 100).toFixed(0) : 0;
    
    if (parseFloat(congregationRate) < 30 && performedLogs.length > 10) {
      insights.push({ 
        type: 'info', 
        message: `🕌 Only ${congregationRate}% in congregation. Try to increase masjid attendance.` 
      });
    }

    return {
      completionRate,
      missedRate,
      currentStreak,
      longestStreak,
      performedCount: performedLogs.length,
      missedCount: missedLogs.length,
      qadaCount: qadaLogs.length,
      prayerAnalysis,
      monthlyData,
      weeklyHeatmap,
      locationData,
      missedReasons,
      congregationTrend,
      avgDelays,
      insights,
      congregationRate,
      totalExpected
    };
  }, [prayerLogs, timeRange]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Prayer Analytics Dashboard</h1>
          <p className="text-slate-600 mt-1">Track patterns, identify areas for growth, and strengthen your practice</p>
        </div>
        <Tabs value={timeRange} onValueChange={setTimeRange}>
          <TabsList>
            <TabsTrigger value="7">7 Days</TabsTrigger>
            <TabsTrigger value="30">30 Days</TabsTrigger>
            <TabsTrigger value="90">90 Days</TabsTrigger>
            <TabsTrigger value="180">6 Months</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <motion.div whileHover={{ scale: 1.02 }}>
          <Card className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white border-0">
            <CardContent className="p-5">
              <Target className="w-8 h-8 opacity-80 mb-2" />
              <span className="text-3xl font-bold block mb-1">{analytics.completionRate}%</span>
              <p className="text-sm text-teal-100">Completion Rate</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }}>
          <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-0">
            <CardContent className="p-5">
              <Flame className="w-8 h-8 opacity-80 mb-2" />
              <span className="text-3xl font-bold block mb-1">{analytics.currentStreak}</span>
              <p className="text-sm text-orange-100">Current Streak</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }}>
          <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-0">
            <CardContent className="p-5">
              <Award className="w-8 h-8 opacity-80 mb-2" />
              <span className="text-3xl font-bold block mb-1">{analytics.longestStreak}</span>
              <p className="text-sm text-purple-100">Best Streak</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }}>
          <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-0">
            <CardContent className="p-5">
              <Users className="w-8 h-8 opacity-80 mb-2" />
              <span className="text-3xl font-bold block mb-1">{analytics.congregationRate}%</span>
              <p className="text-sm text-blue-100">In Congregation</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }}>
          <Card className="bg-gradient-to-br from-slate-500 to-slate-700 text-white border-0">
            <CardContent className="p-5">
              <CheckCircle2 className="w-8 h-8 opacity-80 mb-2" />
              <span className="text-3xl font-bold block mb-1">{analytics.performedCount}/{analytics.totalExpected}</span>
              <p className="text-sm text-slate-200">Prayers</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Insights */}
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-amber-600" />
            AI-Powered Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {analytics.insights.map((insight, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-3 rounded-lg ${
                insight.type === 'success' ? 'bg-green-100 text-green-800' :
                insight.type === 'warning' ? 'bg-red-100 text-red-800' :
                insight.type === 'good' ? 'bg-blue-100 text-blue-800' :
                'bg-purple-100 text-purple-800'
              }`}
            >
              <p className="text-sm font-medium">{insight.message}</p>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            6-Month Consistency Trend
          </CardTitle>
          <CardDescription>Track your prayer consistency over the past 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.monthlyData}>
              <defs>
                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#14B8A6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis domain={[0, 100]} stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                formatter={(value) => [`${value}%`, 'Completion']}
              />
              <Area 
                type="monotone" 
                dataKey="rate" 
                stroke="#14B8A6" 
                fillOpacity={1} 
                fill="url(#colorRate)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Prayer Performance Comparison */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Prayer-Specific Performance
            </CardTitle>
            <CardDescription>Compare consistency across different prayers</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.prayerAnalysis}>
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="performed" fill="#10B981" name="Performed" radius={[8, 8, 0, 0]} />
                <Bar dataKey="missed" fill="#EF4444" name="Missed" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Average Delay by Prayer
            </CardTitle>
            <CardDescription>Minutes delayed from scheduled time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.avgDelays}>
                <XAxis dataKey="prayer" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  formatter={(value) => [`${value} min`, 'Avg Delay']}
                />
                <Bar dataKey="avgDelay" fill="#F59E0B" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 28-Day Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Last 28 Days Heatmap
          </CardTitle>
          <CardDescription>Daily prayer completion visualization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {analytics.weeklyHeatmap.map((day, idx) => (
              <motion.div
                key={idx}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: idx * 0.02 }}
                className="aspect-square rounded-lg flex flex-col items-center justify-center text-xs"
                style={{
                  backgroundColor: 
                    day.percentage === 100 ? '#10B981' :
                    day.percentage >= 80 ? '#22C55E' :
                    day.percentage >= 60 ? '#F59E0B' :
                    day.percentage >= 40 ? '#FB923C' :
                    day.percentage > 0 ? '#EF4444' :
                    '#E2E8F0'
                }}
              >
                <span className={day.percentage >= 60 ? 'text-white' : 'text-slate-700'}>
                  {day.date}
                </span>
                <span className={`text-[10px] ${day.percentage >= 60 ? 'text-white' : 'text-slate-600'}`}>
                  {day.count}/5
                </span>
              </motion.div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-slate-200" />
              <span>None</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span>1-2</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500" />
              <span>3-4</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span>All 5</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location & Congregation Analysis */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-600" />
              Prayer Locations
            </CardTitle>
            <CardDescription>Where you pray most often</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.locationData.map((loc, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">{loc.name}</span>
                      <span className="text-sm font-bold text-slate-800">{loc.percentage}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${loc.percentage}%` }}
                        transition={{ delay: idx * 0.1 }}
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-600"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Congregation Trend (4 Weeks)
            </CardTitle>
            <CardDescription>Percentage of prayers in congregation</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analytics.congregationTrend}>
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis domain={[0, 100]} stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  formatter={(value) => [`${value}%`, 'Congregation']}
                />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Missed Prayers Analysis */}
      {Object.keys(analytics.missedReasons).length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Missed Prayer Analysis
            </CardTitle>
            <CardDescription>Understanding patterns to improve consistency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(analytics.missedReasons).map(([reason, count]) => (
                <div key={reason} className="bg-white rounded-lg p-4 text-center border border-red-200">
                  <p className="text-2xl font-bold text-red-600">{count}</p>
                  <p className="text-xs text-slate-600 capitalize mt-1">{reason}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}