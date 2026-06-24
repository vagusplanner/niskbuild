import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, TrendingUp, Award, Zap, Target, Heart, Plane, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

const CATEGORY_CONFIG = {
  health: { icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  islamic: { icon: Star, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  travel: { icon: Plane, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  productivity: { icon: Calendar, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }
};

export default function UnifiedGamificationTracker({ compact = false }) {
  const queryClient = useQueryClient();

  const { data: points = [] } = useQuery({
    queryKey: ['gamificationPoints'],
    queryFn: () => base44.entities.GamificationPoints.list('-created_date', 100)
  });

  const { data: achievements = [] } = useQuery({
    queryKey: ['userAchievements'],
    queryFn: () => base44.entities.UserAchievement.list('-earned_date')
  });

  // Calculate stats
  const totalPoints = points.reduce((sum, p) => sum + (p.points_earned || 0), 0);
  const recentPoints = points.slice(0, 5);
  
  const categoryStats = Object.keys(CATEGORY_CONFIG).map(category => {
    const categoryPoints = points.filter(p => p.category === category);
    const total = categoryPoints.reduce((sum, p) => sum + (p.points_earned || 0), 0);
    return { category, total, activities: categoryPoints.length };
  });

  const todayPoints = points.filter(p => {
    const today = new Date().toDateString();
    return new Date(p.created_date).toDateString() === today;
  }).reduce((sum, p) => sum + (p.points_earned || 0), 0);

  // Listen for new achievements
  useEffect(() => {
    const unsubscribe = base44.entities.UserAchievement.subscribe((event) => {
      if (event.type === 'create') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        toast.success(`🏆 New Badge Unlocked: ${event.data.title}!`, {
          description: event.data.description,
          duration: 5000
        });
        queryClient.invalidateQueries({ queryKey: ['userAchievements'] });
      }
    });

    return unsubscribe;
  }, [queryClient]);

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500 rounded-lg">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{totalPoints.toLocaleString()}</p>
                <p className="text-xs text-slate-600">Total Points</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-orange-600">+{todayPoints}</p>
              <p className="text-xs text-slate-600">Today</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Points Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-slate-800">{totalPoints.toLocaleString()}</p>
                <p className="text-sm text-slate-600">Total Points</p>
              </div>
              <Trophy className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-slate-800">{todayPoints}</p>
                <p className="text-sm text-slate-600">Points Today</p>
              </div>
              <Zap className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-slate-800">{achievements.length}</p>
                <p className="text-sm text-slate-600">Badges Earned</p>
              </div>
              <Award className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-slate-800">{points.length}</p>
                <p className="text-sm text-slate-600">Activities</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-slate-700" />
            Points by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryStats.map(({ category, total, activities }) => {
              const config = CATEGORY_CONFIG[category];
              const Icon = config.icon;
              const percentage = totalPoints > 0 ? (total / totalPoints) * 100 : 0;
              
              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${config.color}`} />
                      <span className="font-medium text-slate-800 capitalize">{category}</span>
                      <Badge variant="outline" className="text-xs">{activities} activities</Badge>
                    </div>
                    <span className="font-bold text-slate-800">{total.toLocaleString()}</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-slate-700" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentPoints.map((point, idx) => {
              const config = CATEGORY_CONFIG[point.category] || CATEGORY_CONFIG.productivity;
              const Icon = config.icon;
              
              return (
                <motion.div
                  key={point.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex items-center justify-between p-3 rounded-lg ${config.bg} ${config.border} border`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{point.description}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(point.created_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-yellow-500 text-white">+{point.points_earned}</Badge>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      {achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-slate-700" />
              Your Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {achievements.map((badge, idx) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-4 rounded-lg bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-yellow-500 rounded-lg">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800 text-sm">{badge.title}</h4>
                      <p className="text-xs text-slate-600 mt-1">{badge.description}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        {new Date(badge.earned_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}