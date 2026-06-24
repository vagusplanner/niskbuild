import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { CheckCircle2, Zap, BookOpen, Heart, Moon } from 'lucide-react';
import { toast } from 'sonner';

const challengeIcons = {
  quran_juz: BookOpen,
  hadith_reflection: Heart,
  dua_mastery: Zap,
  qiyam_challenge: Moon,
  fasting_excellence: CheckCircle2
};

export default function RamadanChallenges() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: challenges = [] } = useQuery({
    queryKey: ['ramadan-challenges'],
    queryFn: () => SDK.entities.RamadanChallenge.list()
  });

  const completeMutation = useMutation({
    mutationFn: (id) => SDK.entities.RamadanChallenge.update(id, { completed: true, completed_date: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramadan-challenges'] });
      toast.success('Challenge completed! 🎉');
    }
  });

  const filtered = filter === 'all' ? challenges : challenges.filter(c => c.completed === (filter === 'completed'));
  const sorted = [...filtered].sort((a, b) => a.day - b.day);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['all', 'active', 'completed'].map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f)}
            size="sm"
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      <div className="grid gap-4">
        {sorted.map((challenge, idx) => {
          const Icon = challengeIcons[challenge.challenge_type] || Zap;
          const progress = (challenge.current_progress / challenge.target) * 100;
          const isBonus = challenge.is_last_ten_days ? 2 : 1;

          return (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className={challenge.completed ? 'bg-slate-50 border-slate-200' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{challenge.title}</CardTitle>
                          {challenge.is_last_ten_days && (
                            <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full font-semibold">
                              2X Rewards
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">Day {challenge.day}</p>
                      </div>
                    </div>
                    {challenge.completed && <CheckCircle2 className="w-6 h-6 text-green-600" />}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-600">{challenge.description}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">{challenge.current_progress} / {challenge.target}</span>
                      <span className="text-slate-500">{Math.floor(progress)}%</span>
                    </div>
                    <Progress value={Math.min(progress, 100)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{challenge.reward_points * isBonus} pts</span>
                      {challenge.is_last_ten_days && <Zap className="w-4 h-4 text-orange-500" />}
                    </div>
                    {!challenge.completed && (
                      <Button
                        size="sm"
                        onClick={() => completeMutation.mutate(challenge.id)}
                        disabled={challenge.current_progress < challenge.target}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}