import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, TrendingUp, Crown } from 'lucide-react';

export default function LeaderboardPanel() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      // Get all gamification points
      const allPoints = await base44.entities.GamificationPoints.list('-total_points', 50);
      
      // Fetch user details for each
      const withUsers = await Promise.all(
        allPoints.map(async (points, index) => {
          // Get user by email from created_by
          const users = await base44.entities.User.filter({ email: points.created_by });
          return {
            ...points,
            rank: index + 1,
            user: users[0] || { full_name: 'Anonymous', email: points.created_by }
          };
        })
      );
      
      return withUsers;
    },
    enabled: !!user
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading leaderboard...</div>;
  }

  const userRank = leaderboard.find(entry => entry.created_by === user?.email);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Global Leaderboard</h2>
          <p className="text-slate-600">Top players ranked by total points</p>
        </div>
        {userRank && (
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-teal-600" />
              <div>
                <p className="text-sm text-slate-500">Your Rank</p>
                <p className="text-2xl font-bold text-slate-800">#{userRank.rank}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Top 50 Players
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {leaderboard.map((entry) => {
              const isCurrentUser = entry.created_by === user?.email;
              const initials = entry.user.full_name?.split(' ').map(n => n[0]).join('') || 'U';
              
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                    isCurrentUser ? 'bg-teal-50 border-2 border-teal-200' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-12 text-center">
                    {entry.rank === 1 && <Crown className="w-8 h-8 text-yellow-500 mx-auto" />}
                    {entry.rank === 2 && <Medal className="w-7 h-7 text-slate-400 mx-auto" />}
                    {entry.rank === 3 && <Medal className="w-7 h-7 text-amber-700 mx-auto" />}
                    {entry.rank > 3 && (
                      <span className="text-xl font-bold text-slate-600">#{entry.rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar>
                    <AvatarFallback className="bg-teal-100 text-teal-700 font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800">
                        {entry.user.full_name || entry.user.email}
                      </p>
                      {isCurrentUser && (
                        <Badge variant="secondary" className="text-xs">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <span>Level {entry.current_level}</span>
                      <span>•</span>
                      <span>{entry.rank} {entry.rank}</span>
                      {entry.current_streak > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            🔥 {entry.current_streak} day streak
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-800">
                      {entry.total_points.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">XP</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}