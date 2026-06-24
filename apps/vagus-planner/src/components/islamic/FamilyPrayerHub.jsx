/**
 * FamilyPrayerHub — Main orchestrator
 * Tabs: Today's Prayers | Leaderboard | Encouragement
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Trophy, MessageCircle, Users } from 'lucide-react';
import { format } from 'date-fns';

import FamilyPrayerGrid from './family/FamilyPrayerGrid';
import FamilyLeaderboard from './family/FamilyLeaderboard';
import FamilyEncouragement from './family/FamilyEncouragement';
import AddFamilyMember from './family/AddFamilyMember';

const PRAYERS = [
  { key: 'fajr',    name: 'Fajr',    emoji: '🌅', time: 'Dawn' },
  { key: 'dhuhr',   name: 'Dhuhr',   emoji: '☀️', time: 'Midday' },
  { key: 'asr',     name: 'Asr',     emoji: '🌤️', time: 'Afternoon' },
  { key: 'maghrib', name: 'Maghrib', emoji: '🌆', time: 'Sunset' },
  { key: 'isha',    name: 'Isha',    emoji: '🌙', time: 'Night' },
];

export { PRAYERS };

export default function FamilyPrayerHub() {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me()
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['familyPrayers', today],
    queryFn: () => base44.entities.PrayerLog.filter({ date: today }),
    refetchInterval: 8000
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.SocialConnection.list()
  });

  const familyMembers = [
    { email: user?.email, name: user?.full_name || 'You', isMe: true },
    ...connections
      .filter(c => c.status === 'family')
      .slice(0, 9)
      .map(c => ({
        email: c.connected_user_email || c.id,
        name: c.friend_name || c.connected_user_email,
        isMe: false
      }))
  ].filter(m => m.email);

  const isPrayerDone = (memberEmail, prayer) =>
    logs.some(l => l.user_email === memberEmail && l.prayer_name?.toLowerCase() === prayer);

  const memberScore = (memberEmail) =>
    PRAYERS.filter(p => isPrayerDone(memberEmail, p.key)).length;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['familyPrayers', today] });
    queryClient.invalidateQueries({ queryKey: ['familyMembers'] });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-lg">
            <Heart className="w-5 h-5 text-rose-500" />
            Family Prayer Hub
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {format(new Date(), 'EEEE, d MMMM')} · {familyMembers.length} member{familyMembers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <AddFamilyMember onAdded={invalidate} />
      </div>

      <Tabs defaultValue="today">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="today" className="gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" /> Prayers
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-1.5 text-xs">
            <Trophy className="w-3.5 h-3.5" /> Leaderboard
          </TabsTrigger>
          <TabsTrigger value="encourage" className="gap-1.5 text-xs">
            <MessageCircle className="w-3.5 h-3.5" /> Encourage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4">
          <FamilyPrayerGrid
            familyMembers={familyMembers}
            logs={logs}
            today={today}
            user={user}
            isPrayerDone={isPrayerDone}
            memberScore={memberScore}
            onUpdate={invalidate}
          />
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-4">
          <FamilyLeaderboard
            familyMembers={familyMembers}
            memberScore={memberScore}
            logs={logs}
            today={today}
            user={user}
          />
        </TabsContent>

        <TabsContent value="encourage" className="mt-4">
          <FamilyEncouragement
            familyMembers={familyMembers}
            memberScore={memberScore}
            user={user}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}