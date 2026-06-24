import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Clock, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const COLORS = ['#14b8a6', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function TimeAuditDashboard() {
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => SDK.entities.Event.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => SDK.entities.Task.list()
  });

  const timeBreakdown = useMemo(() => {
    const breakdown = {};
    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));

    // Count hours by category for the week
    events.forEach(event => {
      const eventDate = new Date(event.start_date);
      if (eventDate >= weekStart) {
        const duration = (new Date(event.end_date) - new Date(event.start_date)) / (1000 * 60 * 60);
        const category = event.category || 'other';
        breakdown[category] = (breakdown[category] || 0) + duration;
      }
    });

    return Object.entries(breakdown)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: Math.round(value * 10) / 10 }))
      .sort((a, b) => b.value - a.value);
  }, [events]);

  const dailyBreakdown = useMemo(() => {
    const daily = Array(7).fill(0);
    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));

    events.forEach(event => {
      const eventDate = new Date(event.start_date);
      if (eventDate >= weekStart) {
        const dayIndex = eventDate.getDay();
        const duration = (new Date(event.end_date) - new Date(event.start_date)) / (1000 * 60 * 60);
        daily[dayIndex] += duration;
      }
    });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map((name, idx) => ({ name, hours: Math.round(daily[idx] * 10) / 10 }));
  }, [events]);

  const avgMeetingTime = useMemo(() => {
    const meetings = events.filter(e => ['work', 'social'].includes(e.category));
    if (meetings.length === 0) return 0;
    const totalMinutes = meetings.reduce((sum, e) => {
      return sum + (new Date(e.end_date) - new Date(e.start_date)) / (1000 * 60);
    }, 0);
    return Math.round(totalMinutes / meetings.length);
  }, [events]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Calendar Hours</p>
              <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                {Math.round(timeBreakdown.reduce((sum, item) => sum + item.value, 0))}h
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">Avg Meeting Length</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{avgMeetingTime}m</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">Weekly Events</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{events.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Time by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={timeBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}h`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {timeBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Hours per Day
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="#14b8a6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}