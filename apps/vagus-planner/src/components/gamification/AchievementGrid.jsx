import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

const ACHIEVEMENT_DEFINITIONS = [
  { id: 'first_task', title: 'First Steps', description: 'Complete your first task', icon: '🎯', tier: 'bronze', category: 'productivity', points: 10 },
  { id: 'task_master_10', title: 'Task Master', description: 'Complete 10 tasks', icon: '⚡', tier: 'silver', category: 'productivity', points: 50 },
  { id: 'task_master_50', title: 'Task Legend', description: 'Complete 50 tasks', icon: '🏆', tier: 'gold', category: 'productivity', points: 200 },
  { id: 'streak_7', title: 'Week Warrior', description: '7-day active streak', icon: '🔥', tier: 'silver', category: 'consistency', points: 100 },
  { id: 'streak_30', title: 'Consistency Champion', description: '30-day active streak', icon: '💪', tier: 'gold', category: 'consistency', points: 500 },
  { id: 'level_10', title: 'Rising Star', description: 'Reach Level 10', icon: '⭐', tier: 'silver', category: 'progression', points: 150 },
  { id: 'level_25', title: 'Elite Player', description: 'Reach Level 25', icon: '👑', tier: 'gold', category: 'progression', points: 400 },
  { id: 'early_bird', title: 'Early Bird', description: 'Login before 7am', icon: '🌅', tier: 'bronze', category: 'consistency', points: 25 }
];

const TIER_COLORS = {
  bronze: 'from-amber-700 to-amber-900',
  silver: 'from-slate-400 to-slate-600',
  gold: 'from-yellow-400 to-yellow-600',
  platinum: 'from-cyan-400 to-blue-600',
  diamond: 'from-purple-400 to-pink-600'
};

export default function AchievementGrid() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: userAchievements = [], isLoading } = useQuery({
    queryKey: ['user-achievements'],
    queryFn: () => base44.entities.UserAchievement.filter({ created_by: user?.email }),
    enabled: !!user
  });

  const unlockedIds = userAchievements.map(ua => ua.achievement_id);

  if (isLoading) {
    return <div className="text-center py-8">Loading achievements...</div>;
  }

  const grouped = ACHIEVEMENT_DEFINITIONS.reduce((acc, achievement) => {
    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    acc[achievement.category].push(achievement);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Achievements</h2>
          <p className="text-slate-600">{unlockedIds.length} of {ACHIEVEMENT_DEFINITIONS.length} unlocked</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Trophy className="w-5 h-5 mr-2 text-amber-500" />
          {unlockedIds.length}/{ACHIEVEMENT_DEFINITIONS.length}
        </Badge>
      </div>

      {Object.entries(grouped).map(([category, achievements]) => (
        <div key={category}>
          <h3 className="text-lg font-semibold text-slate-700 mb-3 capitalize">{category}</h3>
          <div className="grid md:grid-cols-4 gap-4">
            {achievements.map((achievement, idx) => {
              const isUnlocked = unlockedIds.includes(achievement.id);
              
              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className={`relative overflow-hidden ${isUnlocked ? 'border-teal-200' : 'opacity-60'}`}>
                    {isUnlocked && (
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${TIER_COLORS[achievement.tier]}`} />
                    )}
                    <CardContent className="p-4 text-center">
                      <div className="relative inline-block mb-3">
                        <div className={`text-5xl ${!isUnlocked && 'grayscale blur-sm'}`}>
                          {achievement.icon}
                        </div>
                        {!isUnlocked && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Lock className="w-8 h-8 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <h4 className={`font-semibold mb-1 ${!isUnlocked && 'text-slate-400'}`}>
                        {achievement.title}
                      </h4>
                      <p className={`text-xs mb-2 ${!isUnlocked ? 'text-slate-400' : 'text-slate-600'}`}>
                        {achievement.description}
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <Badge variant="outline" className={`text-xs ${TIER_COLORS[achievement.tier]}`}>
                          {achievement.tier}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          +{achievement.points} XP
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}