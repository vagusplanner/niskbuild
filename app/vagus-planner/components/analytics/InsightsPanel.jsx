import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Clock, Target, AlertCircle } from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

export default function InsightsPanel() {
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-start_date')
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => base44.entities.Meeting.list('-created_date', 50)
  });

  const { data: insights } = useQuery({
    queryKey: ['meetingInsights'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('analyzeWeeklyInsights', {
        timeframe: 'week'
      });
      return data;
    },
    staleTime: 1000 * 60 * 60 // 1 hour
  });

  // Weekly meetings data
  const weeklyData = React.useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = days.map(day => ({ name: day, meetings: 0, duration: 0 }));
    
    events.forEach(event => {
      const date = new Date(event.start_date);
      const dayIndex = (date.getDay() + 6) % 7;
      const duration = event.end_date ? (new Date(event.end_date) - new Date(event.start_date)) / 60000 : 0;
      
      if (dayIndex < 7) {
        data[dayIndex].meetings += 1;
        data[dayIndex].duration += duration;
      }
    });
    
    return data;
  }, [events]);

  // Meeting effectiveness
  const meetingStats = React.useMemo(() => {
    const under30 = meetings.filter(m => m.duration_minutes < 30).length;
    const over60 = meetings.filter(m => m.duration_minutes >= 60).length;
    const effectiveness = meetings.length > 0 ? Math.round((under30 / meetings.length) * 100) : 0;
    
    return { under30, over60, effectiveness, total: meetings.length };
  }, [meetings]);

  // Time ROI analysis
  const timeROI = React.useMemo(() => {
    const categories = {};
    events.forEach(event => {
      const cat = event.category || 'other';
      if (!categories[cat]) categories[cat] = { duration: 0, count: 0 };
      categories[cat].count += 1;
      categories[cat].duration += event.end_date ? (new Date(event.end_date) - new Date(event.start_date)) / 3600000 : 0;
    });
    
    return Object.entries(categories).map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: data.count,
      hours: Math.round(data.duration * 10) / 10
    })).sort((a, b) => b.value - a.value);
  }, [events]);

  const colors = ['#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Weekly Report */}
      <Card className="p-5 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800 border-teal-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Weekly Report</h3>
          <Badge variant="secondary">This Week</Badge>
        </div>
        
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-teal-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-teal-600">{meetings.length}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">meetings</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-blue-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-blue-600">{meetingStats.effectiveness}%</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">under 30min</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-purple-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-purple-600">{Math.round(weeklyData.reduce((sum, d) => sum + d.duration, 0))}h</div>
            <div className="text-xs text-slate-600 dark:text-slate-400">total time</div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }} />
            <Bar dataKey="meetings" fill="#14b8a6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Meeting Effectiveness */}
      <Card className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border-blue-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Meeting Effectiveness</h3>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600 dark:text-slate-400">Duration Distribution</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{meetingStats.total} meetings</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Under 30 minutes (Efficient)</span>
                  <span className="text-green-600">{meetingStats.under30}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${meetingStats.total > 0 ? (meetingStats.under30 / meetingStats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Over 60 minutes (Long)</span>
                  <span className="text-orange-600">{meetingStats.over60}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full" 
                    style={{ width: `${meetingStats.total > 0 ? (meetingStats.over60 / meetingStats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-3">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              💡 <strong>{meetingStats.effectiveness}%</strong> of your meetings are under 30 minutes, which is great for efficiency!
            </p>
          </div>
        </div>
      </Card>

      {/* Time ROI Tracker */}
      <Card className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-800 border-emerald-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Time ROI by Category</h3>
        </div>

        {timeROI.length > 0 ? (
          <div className="space-y-3">
            {timeROI.map((item, idx) => (
              <div key={idx} className="flex items-between justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-200 dark:border-slate-700">
                <div className="flex-1">
                  <div className="font-medium text-slate-800 dark:text-slate-100">{item.name}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">{item.value} events • {item.hours}h total</div>
                </div>
                <div className="w-32">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full" 
                      style={{ width: `${(item.value / timeROI[0].value) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 text-sm">No events yet</p>
        )}
      </Card>
    </motion.div>
  );
}