import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Users, Activity, Clock, Zap, TrendingUp, Calendar,
  Moon, Heart, Plane, CheckSquare, Target, Star
} from 'lucide-react';
import { format, subDays, differenceInDays } from 'date-fns';

const COLORS = ['#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

const MetricCard = ({ icon: Icon, label, value, sub, color = 'teal', trend }) => {
  const colorMap = {
    teal: 'from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/20 border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400',
    blue: 'from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
    purple: 'from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/20 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400',
    amber: 'from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400',
    emerald: 'from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400',
    rose: 'from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/20 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`bg-gradient-to-br ${colorMap[color]} border p-5`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">{value}</p>
            {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-xl bg-white/60 dark:bg-slate-800/60`}>
            <Icon className={`w-5 h-5 ${colorMap[color].split(' ').find(c => c.startsWith('text-'))}`} />
          </div>
        </div>
        {trend !== undefined && (
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <TrendingUp className={`w-3 h-3 ${trend >= 0 ? 'text-emerald-500' : 'text-red-400 rotate-180'}`} />
            <span className={trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>
              {Math.abs(trend)}% vs last 7 days
            </span>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default function UserActivityDashboard() {
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => SDK.entities.User.list()
  });

  const { data: events = [] } = useQuery({
    queryKey: ['allEvents'],
    queryFn: () => SDK.entities.Event.list('-created_date', 200)
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['allTasks'],
    queryFn: () => SDK.entities.Task.list('-created_date', 200)
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['allGoals'],
    queryFn: () => SDK.entities.Goal.list('-created_date', 200)
  });

  const { data: prayerLogs = [] } = useQuery({
    queryKey: ['allPrayerLogs'],
    queryFn: () => SDK.entities.PrayerLog.list('-created_date', 200)
  });

  const { data: ramadanActivities = [] } = useQuery({
    queryKey: ['allRamadanActivities'],
    queryFn: () => SDK.entities.RamadanActivity.list('-created_date', 200)
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['allUserSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });

  const now = new Date();
  const last7 = subDays(now, 7);
  const last14 = subDays(now, 14);
  const last30 = subDays(now, 30);

  // ── Active users (created any record in last 7 days)
  const activeUserEmails = useMemo(() => {
    const recent = [...events, ...tasks, ...goals, ...prayerLogs]
      .filter(r => r.created_date && new Date(r.created_date) >= last7);
    return new Set(recent.map(r => r.created_by).filter(Boolean));
  }, [events, tasks, goals, prayerLogs]);

  const activeUsersLast14 = useMemo(() => {
    const recent = [...events, ...tasks, ...goals, ...prayerLogs]
      .filter(r => r.created_date && new Date(r.created_date) >= last14 && new Date(r.created_date) < last7);
    return new Set(recent.map(r => r.created_by).filter(Boolean)).size;
  }, [events, tasks, goals, prayerLogs]);

  const activeTrend = activeUsersLast14 === 0 ? 0
    : Math.round(((activeUserEmails.size - activeUsersLast14) / Math.max(activeUsersLast14, 1)) * 100);

  // ── Feature usage breakdown
  const featureUsage = useMemo(() => [
    { name: 'Calendar Events', count: events.length, icon: Calendar, color: '#14b8a6' },
    { name: 'Tasks', count: tasks.length, icon: CheckSquare, color: '#3b82f6' },
    { name: 'Goals', count: goals.length, icon: Target, color: '#8b5cf6' },
    { name: 'Prayer Logs', count: prayerLogs.length, icon: Moon, color: '#06b6d4' },
    { name: 'Ramadan Tracker', count: ramadanActivities.length, icon: Star, color: '#f59e0b' },
  ].sort((a, b) => b.count - a.count), [events, tasks, goals, prayerLogs, ramadanActivities]);

  const totalActions = featureUsage.reduce((s, f) => s + f.count, 0);

  // ── Daily activity (last 14 days)
  const dailyActivity = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(now, 13 - i);
      return { date: format(d, 'MMM d'), dateObj: d, events: 0, tasks: 0, prayers: 0 };
    });

    const addToDay = (record, field) => {
      if (!record.created_date) return;
      const d = new Date(record.created_date);
      const idx = days.findIndex(day => format(day.dateObj, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd'));
      if (idx !== -1) days[idx][field] += 1;
    };

    events.forEach(r => addToDay(r, 'events'));
    tasks.forEach(r => addToDay(r, 'tasks'));
    prayerLogs.forEach(r => addToDay(r, 'prayers'));

    return days;
  }, [events, tasks, prayerLogs]);

  // ── Engagement score per user (0-100)
  const userEngagement = useMemo(() => {
    if (!users.length) return [];

    const scoreMap = {};
    users.forEach(u => { scoreMap[u.email] = { name: u.full_name || u.email, email: u.email, score: 0, actions: 0, features: new Set() }; });

    const addScore = (records, feature, weight) => {
      records.forEach(r => {
        if (r.created_by && scoreMap[r.created_by]) {
          scoreMap[r.created_by].score += weight;
          scoreMap[r.created_by].actions += 1;
          scoreMap[r.created_by].features.add(feature);
        }
      });
    };

    addScore(events, 'calendar', 2);
    addScore(tasks, 'tasks', 2);
    addScore(goals, 'goals', 3);
    addScore(prayerLogs, 'prayer', 2);
    addScore(ramadanActivities, 'ramadan', 3);

    return Object.values(scoreMap)
      .map(u => ({
        ...u,
        featuresCount: u.features.size,
        engagement: Math.min(100, Math.round(u.score / Math.max(1, Object.values(scoreMap).reduce((m, x) => Math.max(m, x.score), 1)) * 100)),
        level: u.score > 50 ? 'High' : u.score > 15 ? 'Medium' : 'Low'
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [users, events, tasks, goals, prayerLogs, ramadanActivities]);

  // ── Islamic mode adoption
  const islamicModeCount = settings.filter(s => s.islamic_mode).length;

  // ── New users in last 30 days
  const newUsersLast30 = users.filter(u => u.created_date && new Date(u.created_date) >= last30).length;

  const isLoading = usersLoading;

  const engagementColors = { High: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', Low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };

  return (
    <div className="space-y-6">
      {/* Top Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard icon={Users} label="Total Users" value={users.length} sub={`+${newUsersLast30} last 30d`} color="teal" />
        <MetricCard icon={Activity} label="Active (7d)" value={activeUserEmails.size} sub="created at least 1 record" color="blue" trend={activeTrend} />
        <MetricCard icon={Zap} label="Total Actions" value={totalActions.toLocaleString()} sub="events + tasks + goals + more" color="purple" />
        <MetricCard icon={Calendar} label="Events Created" value={events.length} color="amber" />
        <MetricCard icon={CheckSquare} label="Tasks Created" value={tasks.length} color="emerald" />
        <MetricCard icon={Moon} label="Islamic Mode" value={`${islamicModeCount}/${settings.length}`} sub="users with Islamic mode on" color="rose" />
      </div>

      {/* Activity Chart + Feature Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-5">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              Daily Activity — Last 14 Days
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dailyActivity} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="events" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Events" />
                <Bar dataKey="tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Tasks" />
                <Bar dataKey="prayers" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Prayers" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="p-5">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-600" />
              Feature Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={featureUsage.filter(f => f.count > 0)} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={60} paddingAngle={3}>
                  {featureUsage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-2">
              {featureUsage.map((f, i) => (
                <div key={f.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-600 dark:text-slate-400">{f.name}</span>
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{f.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Engagement Table */}
      <Card className="p-5">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            User Engagement Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">Loading…</div>
          ) : userEngagement.length === 0 ? (
            <div className="py-12 text-center text-slate-400">No user data yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">#</th>
                    <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">User</th>
                    <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Engagement</th>
                    <th className="text-center py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Score</th>
                    <th className="text-center py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Actions</th>
                    <th className="text-center py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Features Used</th>
                    <th className="text-center py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {userEngagement.map((u, i) => (
                    <tr key={u.email} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800 dark:text-slate-100">{u.name}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </td>
                      <td className="py-3 px-3 w-32">
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-teal-500 to-cyan-400"
                            style={{ width: `${u.engagement}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 mt-0.5 block">{u.engagement}%</span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800 dark:text-slate-100">{u.score}</td>
                      <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400">{u.actions}</td>
                      <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400">{u.featuresCount} / 5</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${engagementColors[u.level]}`}>
                          {u.level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}