import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Trophy, Star, Flame, Heart, Target } from 'lucide-react';

const badgeIcons = {
  taraweeh_master: Trophy,
  laylat_qadr_warrior: Flame,
  dua_master: Heart,
  hafiz_journey: Target,
  quran_completer: Star,
  qiyam_champion: Flame,
  consistency_king: Trophy,
  last_ten_legend: Star
};

const rarityColors = {
  common: 'from-slate-200 to-slate-300',
  uncommon: 'from-green-200 to-emerald-300',
  rare: 'from-blue-200 to-cyan-300',
  epic: 'from-purple-200 to-violet-300',
  legendary: 'from-yellow-200 to-orange-300'
};

export default function RamadanBadges() {
  const { data: badges = [] } = useQuery({
    queryKey: ['ramadan-badges'],
    queryFn: () => base44.entities.RamadanBadge.list()
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-4">Your Ramadan Badges</h3>
        <p className="text-slate-600 mb-6">Earn badges by completing challenges and milestones</p>
      </div>

      {badges.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-12 text-center">
            <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No badges earned yet. Start completing challenges!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map((badge, idx) => {
            const Icon = badgeIcons[badge.badge_type] || Trophy;
            const colorClass = rarityColors[badge.rarity] || rarityColors.common;

            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center mx-auto mb-3`}>
                      <Icon className="w-8 h-8" />
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{badge.title}</h4>
                    <p className="text-xs text-slate-600 capitalize mb-3">{badge.rarity}</p>
                    <p className="text-xs text-slate-500">{new Date(badge.earned_date).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Available Badges */}
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4">Available Badges to Earn</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { type: 'taraweeh_master', title: 'Taraweeh Master', desc: 'Complete all Taraweeh prayers' },
            { type: 'laylat_qadr_warrior', title: 'Laylat al-Qadr Warrior', desc: 'Perfect all 10 nights' },
            { type: 'dua_master', title: 'Du\'a Master', desc: 'Master 30 Du\'as' },
            { type: 'hafiz_journey', title: 'Hafiz Journey', desc: 'Memorize full Quran' },
            { type: 'quran_completer', title: 'Quran Completer', desc: 'Read entire Quran' },
            { type: 'qiyam_champion', title: 'Qiyam Champion', desc: 'Qiyam all 30 nights' },
            { type: 'consistency_king', title: 'Consistency King', desc: '30-day streak' },
            { type: 'last_ten_legend', title: 'Last 10 Legend', desc: 'Max points in last 10 days' }
          ].map((badge, idx) => (
            <motion.div
              key={badge.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="opacity-60">
                <CardContent className="pt-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">🔒</span>
                  </div>
                  <h4 className="font-semibold text-sm mb-1">{badge.title}</h4>
                  <p className="text-xs text-slate-600">{badge.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}