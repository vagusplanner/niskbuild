import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, Target, Award, Zap, Star, Crown, Medal } from 'lucide-react';
import AchievementGrid from './AchievementGrid';
import LeaderboardPanel from './LeaderboardPanel';
import ChallengesList from './ChallengesList';

const RANK_COLORS = {
  'Novice': 'bg-slate-100 text-slate-700',
  'Explorer': 'bg-blue-100 text-blue-700',
  'Achiever': 'bg-purple-100 text-purple-700',
  'Master': 'bg-amber-100 text-amber-700',
  'Legend': 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
};

const RANK_ICONS = {
  'Novice': Star,
  'Explorer': Target,
  'Achiever': Award,
  'Master': Medal,
  'Legend': Crown
};

export default function GamificationDashboard() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => SDK.auth.me()
  });

  const { data: userPoints, isLoading } = useQuery({
    queryKey: ['gamification-points'],
    queryFn: async () => {
      const points = await SDK.entities.GamificationPoints.filter({ created_by: user?.email });
      return points[0] || {
        total_points: 0,
        current_level: 1,
        points_to_next_level: 100,
        current_streak: 0,
        longest_streak: 0,
        achievements_unlocked: 0,
        challenges_completed: 0,
        rank: 'Novice'
      };
    },
    enabled: !!user
  });

  if (isLoading || !userPoints) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const RankIcon = RANK_ICONS[userPoints.rank];
  const progressToNextLevel = ((userPoints.total_points - (userPoints.points_to_next_level)) / (100 * Math.pow(1.2, userPoints.current_level - 1))) * 100;

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="col-span-2 bg-gradient-to-br from-teal-500 to-cyan-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-teal-100 text-sm mb-1">Your Rank</p>
                <h2 className="text-3xl font-bold flex items-center gap-2">
                  <RankIcon className="w-8 h-8" />
                  {userPoints.rank}
                </h2>
              </div>
              <Badge className="bg-white/20 text-white border-0">
                Level {userPoints.current_level}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-teal-100">Progress to Level {userPoints.current_level + 1}</span>
                <span className="font-semibold">{userPoints.total_points} / {userPoints.total_points + userPoints.points_to_next_level} XP</span>
              </div>
              <Progress value={progressToNextLevel} className="h-2 bg-white/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Trophy className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Points</p>
                <p className="text-2xl font-bold text-slate-800">{userPoints.total_points}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Zap className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Current Streak</p>
                <p className="text-2xl font-bold text-slate-800">{userPoints.current_streak} days</p>
                <p className="text-xs text-slate-400">Best: {userPoints.longest_streak} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Achievements</p>
              <p className="text-xl font-bold text-slate-800">{userPoints.achievements_unlocked}</p>
            </div>
            <Award className="w-8 h-8 text-purple-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Challenges Done</p>
              <p className="text-xl font-bold text-slate-800">{userPoints.challenges_completed}</p>
            </div>
            <Target className="w-8 h-8 text-blue-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Next Level In</p>
              <p className="text-xl font-bold text-slate-800">{userPoints.points_to_next_level} XP</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="challenges" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="challenges">Active Challenges</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="challenges" className="mt-6">
          <ChallengesList />
        </TabsContent>

        <TabsContent value="achievements" className="mt-6">
          <AchievementGrid />
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-6">
          <LeaderboardPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}