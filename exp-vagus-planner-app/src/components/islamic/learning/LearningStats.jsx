import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Target, Clock, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LearningStats() {
  const { data: progress = [] } = useQuery({
    queryKey: ['learning-progress'],
    queryFn: () => SDK.entities.LearningProgress.list()
  });

  const stats = {
    totalCompleted: progress.filter(p => p.completed).length,
    quizzesCompleted: progress.filter(p => p.module_type === 'quiz' && p.completed).length,
    averageScore: progress.filter(p => p.quiz_score).reduce((acc, p) => acc + p.quiz_score, 0) / 
                  progress.filter(p => p.quiz_score).length || 0,
    totalTimeSpent: progress.reduce((acc, p) => acc + (p.time_spent_minutes || 0), 0)
  };

  const statCards = [
    { 
      icon: CheckCircle, 
      label: 'Completed', 
      value: stats.totalCompleted,
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    { 
      icon: Trophy, 
      label: 'Quizzes', 
      value: stats.quizzesCompleted,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    },
    { 
      icon: Target, 
      label: 'Avg Score', 
      value: `${Math.round(stats.averageScore)}%`,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50'
    },
    { 
      icon: Clock, 
      label: 'Time Spent', 
      value: `${stats.totalTimeSpent}m`,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">
                    {stat.value}
                  </div>
                  <div className="text-xs text-slate-600">{stat.label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}