import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Battery, TrendingUp, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function EnergyBasedScheduling() {
  const [energyMap, setEnergyMap] = useState({});

  // Fetch mood/sleep logs to estimate energy
  const { data: moods = [] } = useQuery({
    queryKey: ['moods'],
    queryFn: () => base44.entities.Mood?.list?.() || Promise.resolve([])
  });

  const { data: sleeps = [] } = useQuery({
    queryKey: ['sleeps'],
    queryFn: () => base44.entities.Sleep?.list?.() || Promise.resolve([])
  });

  useEffect(() => {
    // Estimate energy levels by hour based on sleep and mood patterns
    const hourlyEnergy = Array(24).fill(50); // Default 50%

    sleeps.forEach(sleep => {
      if (sleep.duration) {
        const score = Math.min(100, (sleep.duration / 8) * 100);
        // High sleep boosts early morning energy
        for (let i = 6; i < 12; i++) {
          hourlyEnergy[i] = Math.min(100, hourlyEnergy[i] + score * 0.3);
        }
      }
    });

    moods.forEach(mood => {
      if (mood.energy_level) {
        const hour = new Date(mood.created_date).getHours();
        hourlyEnergy[hour] = mood.energy_level * 10;
      }
    });

    // Create data for chart
    const data = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      energy: Math.round(hourlyEnergy[i]),
      recommended: i >= 9 && i <= 11 ? 'High' : i >= 14 && i <= 16 ? 'Medium' : 'Low'
    }));

    setEnergyMap(data);
  }, [moods, sleeps]);

  if (energyMap.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Battery className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            Energy-Based Scheduling
          </CardTitle>
          <CardDescription>Track sleep and mood to optimize task scheduling</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-400">Log your sleep and mood data to see energy patterns</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            Your Energy Pattern
          </CardTitle>
          <CardDescription>Schedule deep work during high energy hours (9-11am)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={energyMap}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
              <XAxis dataKey="hour" angle={-45} textAnchor="end" height={80} />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.8)', 
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Bar dataKey="energy" fill="#14b8a6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <p className="text-xs font-semibold text-green-700 dark:text-green-300">PEAK ENERGY</p>
              <p className="text-lg font-bold text-green-900 dark:text-green-100">9-11 AM</p>
              <p className="text-xs text-green-600 dark:text-green-400">Deep work, important tasks</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">MEDIUM ENERGY</p>
              <p className="text-lg font-bold text-amber-900 dark:text-amber-100">2-4 PM</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Meetings, collaboration</p>
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">LOW ENERGY</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">After 5 PM</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Admin, planning</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}