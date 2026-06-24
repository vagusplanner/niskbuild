import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Target, TrendingUp, CheckCircle2 } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const COLORS = ['#14b8a6', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'];

export default function GoalProgressSummary({ goals }) {
  const total = goals.length;
  const completed = goals.filter(g => g.status === 'completed').length;
  const inProgress = goals.filter(g => g.status === 'in_progress').length;
  const avgProgress = total > 0
    ? Math.round(goals.reduce((sum, g) => {
        const steps = g.action_steps || [];
        const p = steps.length ? Math.round((steps.filter(s => s.completed).length / steps.length) * 100) : (g.progress || 0);
        return sum + p;
      }, 0) / total)
    : 0;

  const categoryData = Object.entries(
    goals.reduce((acc, g) => { acc[g.category] = (acc[g.category] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  if (!total) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
      <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
        <CardContent className="p-4 text-center">
          <Target className="w-6 h-6 text-teal-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-teal-700">{total}</p>
          <p className="text-xs text-teal-600">Total Goals</p>
        </CardContent>
      </Card>
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4 text-center">
          <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-blue-700">{inProgress}</p>
          <p className="text-xs text-blue-600">In Progress</p>
        </CardContent>
      </Card>
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-4 text-center">
          <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-700">{completed}</p>
          <p className="text-xs text-green-600">Completed</p>
        </CardContent>
      </Card>
      <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
        <CardContent className="p-4 text-center">
          <Trophy className="w-6 h-6 text-amber-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-amber-700">{avgProgress}%</p>
          <p className="text-xs text-amber-600">Avg Progress</p>
        </CardContent>
      </Card>
    </div>
  );
}