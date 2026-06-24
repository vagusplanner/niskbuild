import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Clock } from 'lucide-react';

const COLORS = {
  work: '#3b82f6',
  personal: '#8b5cf6',
  health: '#ec4899',
  shopping: '#f59e0b',
  learning: '#10b981',
  home: '#06b6d4',
  other: '#64748b'
};

export default function TimeAllocationChart({ period }) {
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => SDK.entities.Task.list()
  });

  const categoryData = Object.entries(
    tasks.reduce((acc, task) => {
      const category = task.category || 'other';
      const time = task.estimated_minutes || 30;
      acc[category] = (acc[category] || 0) + time;
      return acc;
    }, {})
  ).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    hours: (value / 60).toFixed(1)
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-600" />
          Time Allocation by Category
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase()] || COLORS.other} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name, props) => [`${props.payload.hours}h`, name]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}