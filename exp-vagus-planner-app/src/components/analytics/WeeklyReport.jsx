import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const COLORS = ['#06b6d4', '#0ea5e9', '#8b5cf6', '#ec4899'];

export default function WeeklyReport() {
  const [stats, setStats] = useState(null);

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => SDK.entities.Event.list()
  });

  useEffect(() => {
    if (events.length === 0) return;

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - today.getDay());

    const weekEvents = events.filter(e => {
      const eventDate = new Date(e.start_date);
      return eventDate >= weekStart && eventDate <= today;
    });

    // Calculate stats
    let totalMeetings = 0;
    let underThirty = 0;
    let totalMinutes = 0;
    const categoryBreakdown = {};
    const dailyCount = {};

    weekEvents.forEach(event => {
      if (['work', 'meeting', 'social'].includes(event.category)) {
        totalMeetings++;
        const duration = (new Date(event.end_date) - new Date(event.start_date)) / 60000;
        totalMinutes += duration;

        if (duration < 30) underThirty++;

        const category = event.category;
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;

        const day = new Date(event.start_date).toLocaleDateString([], { weekday: 'short' });
        dailyCount[day] = (dailyCount[day] || 0) + 1;
      }
    });

    const dailyData = Object.entries(dailyCount).map(([day, count]) => ({
      day,
      meetings: count
    }));

    const categoryData = Object.entries(categoryBreakdown).map(([name, value]) => ({
      name,
      value
    }));

    setStats({
      totalMeetings,
      underThirty,
      totalMinutes,
      underThirtyPercent: ((underThirty / totalMeetings) * 100).toFixed(0),
      dailyData,
      categoryData
    });
  }, [events]);

  if (!stats) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            This Week's Report
          </CardTitle>
          <CardDescription>Your meeting analytics for this week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-slate-600 dark:text-slate-400">Total Meetings</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalMeetings}</p>
            </div>

            <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-xs text-slate-600 dark:text-slate-400">Time in Meetings</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{(stats.totalMinutes / 60).toFixed(1)}h</p>
            </div>

            <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-slate-600 dark:text-slate-400">Under 30 min</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.underThirtyPercent}%</p>
            </div>

            <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-xs text-slate-600 dark:text-slate-400">Avg per Day</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{(stats.totalMeetings / 7).toFixed(1)}</p>
            </div>
          </div>

          {/* Daily Breakdown */}
          {stats.dailyData.length > 0 && (
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="meetings" fill="#06b6d4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Category Breakdown */}
          {stats.categoryData.length > 0 && (
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Insights */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">💡 Insights</p>
            <ul className="text-xs space-y-1 text-blue-800 dark:text-blue-200">
              <li>• You had <strong>{stats.totalMeetings} meetings</strong> this week</li>
              <li>• <strong>{stats.underThirtyPercent}%</strong> were under 30 minutes (quick syncs)</li>
              <li>• Total meeting time: <strong>{(stats.totalMinutes / 60).toFixed(1)} hours</strong></li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}