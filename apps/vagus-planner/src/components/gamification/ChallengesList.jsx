import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, Clock, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-orange-100 text-orange-700',
  expert: 'bg-red-100 text-red-700'
};

const CATEGORY_ICONS = {
  productivity: Target,
  health: Trophy,
  social: Sparkles,
  spiritual: Clock,
  learning: Trophy
};

export default function ChallengesList() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: userChallenges = [], isLoading } = useQuery({
    queryKey: ['user-challenges'],
    queryFn: async () => {
      const challenges = await base44.entities.UserChallenge.filter({ 
        created_by: user?.email,
        status: 'active'
      });
      
      // Fetch full challenge details
      const withDetails = await Promise.all(
        challenges.map(async (uc) => {
          const [challenge] = await base44.entities.Challenge.filter({ id: uc.challenge_id });
          return { ...uc, challenge };
        })
      );
      
      return withDetails;
    },
    enabled: !!user
  });

  const generateChallengesMutation = useMutation({
    mutationFn: () => base44.functions.invoke('generatePersonalizedChallenges', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] });
      toast.success('New personalized challenges generated!');
    },
    onError: () => {
      toast.error('Failed to generate challenges');
    }
  });

  const completeChallengeMutation = useMutation({
    mutationFn: async (userChallenge) => {
      // Update challenge status
      await base44.entities.UserChallenge.update(userChallenge.id, {
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        points_earned: userChallenge.challenge.points_reward
      });

      // Award points
      await base44.functions.invoke('awardPoints', {
        action: 'challenge_completed',
        points: userChallenge.challenge.points_reward,
        metadata: {
          challenge_id: userChallenge.challenge_id,
          difficulty: userChallenge.challenge.difficulty
        }
      });
    },
    onSuccess: (_, userChallenge) => {
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['gamification-points'] });
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      toast.success(`Challenge completed! +${userChallenge.challenge.points_reward} XP`);
    }
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading challenges...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Your Active Challenges</h2>
          <p className="text-slate-600">Complete challenges to earn points and level up</p>
        </div>
        <Button
          onClick={() => generateChallengesMutation.mutate()}
          disabled={generateChallengesMutation.isPending}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate New Challenges
        </Button>
      </div>

      {/* Challenges Grid */}
      {userChallenges.length === 0 ? (
        <Card className="p-12 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-semibold text-slate-800 mb-2">No Active Challenges</h3>
          <p className="text-slate-600 mb-4">Generate personalized challenges based on your activity!</p>
          <Button
            onClick={() => generateChallengesMutation.mutate()}
            disabled={generateChallengesMutation.isPending}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Get Started
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {userChallenges.map((uc) => {
            const challenge = uc.challenge;
            if (!challenge) return null;

            const Icon = CATEGORY_ICONS[challenge.category] || Target;
            const daysLeft = Math.ceil((new Date(challenge.end_date) - new Date()) / (1000 * 60 * 60 * 24));

            return (
              <Card key={uc.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-teal-100 rounded-lg">
                        <Icon className="w-6 h-6 text-teal-600" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{challenge.title}</CardTitle>
                        <p className="text-sm text-slate-600 mt-1">{challenge.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Badge variant="secondary" className={DIFFICULTY_COLORS[challenge.difficulty]}>
                      {challenge.difficulty}
                    </Badge>
                    <Badge variant="outline">{challenge.type}</Badge>
                    <Badge variant="outline" className="text-amber-700">
                      <Trophy className="w-3 h-3 mr-1" />
                      {challenge.points_reward} XP
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600">Progress</span>
                        <span className="font-semibold">{uc.current_count} / {uc.target_count}</span>
                      </div>
                      <Progress value={uc.progress} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-slate-500 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {daysLeft > 0 ? `${daysLeft} days left` : 'Expires today'}
                      </span>
                      {uc.progress >= 100 && uc.status === 'active' && (
                        <Button
                          size="sm"
                          onClick={() => completeChallengeMutation.mutate(uc)}
                          disabled={completeChallengeMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Claim Reward
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}