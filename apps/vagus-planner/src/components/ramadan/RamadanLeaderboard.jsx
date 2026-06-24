import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Medal, Flame, Trophy } from 'lucide-react';

const getMedalIcon = (rank) => {
  if (rank === 1) return <Medal className="w-6 h-6 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-slate-400" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-orange-600" />;
  return null;
};

export default function RamadanLeaderboard() {
  const { data: leaderboard = [] } = useQuery({
    queryKey: ['ramadan-leaderboard'],
    queryFn: () => base44.entities.RamadanLeaderboard.list()
  });

  const sorted = [...leaderboard].sort((a, b) => b.total_points - a.total_points);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl p-6">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8" />
          <div>
            <h3 className="text-2xl font-bold">Ramadan Leaderboard</h3>
            <p className="text-amber-100">Compete with your friends spiritually</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map((entry, idx) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className={idx < 3 ? 'border-2 border-amber-200 bg-amber-50' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 font-bold text-lg min-w-12">
                    {getMedalIcon(idx + 1) || `#${idx + 1}`}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{entry.friend_name}</h4>
                    <p className="text-sm text-slate-600">{entry.challenges_completed} challenges</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="font-bold text-lg">{entry.streak}</span>
                    </div>
                    <p className="text-sm font-bold text-amber-600">{Math.floor(entry.total_points)} pts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}