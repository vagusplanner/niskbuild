import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Lock, Share2, Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { differenceInCalendarDays, startOfDay } from 'date-fns';
import DeepLinkShare from '@/components/shared/DeepLinkShare';

const BADGES = [
  { id: 'first_prayer',    title: 'First Step',        emoji: '🌱', desc: 'Log your first prayer',          threshold: 1,   color: 'from-green-400 to-emerald-500',  rarity: 'Common' },
  { id: 'streak_7',        title: 'One Week Warrior',  emoji: '🔥', desc: '7-day prayer streak',            threshold: 7,   color: 'from-orange-400 to-red-500',     rarity: 'Uncommon' },
  { id: 'streak_30',       title: 'Monthly Devotee',   emoji: '🌙', desc: '30-day prayer streak',           threshold: 30,  color: 'from-blue-400 to-indigo-500',    rarity: 'Rare' },
  { id: 'streak_100',      title: 'Century of Faith',  emoji: '💎', desc: '100-day prayer streak',          threshold: 100, color: 'from-purple-400 to-violet-600',  rarity: 'Epic' },
  { id: 'fajr_master',     title: 'Fajr Champion',     emoji: '🌅', desc: 'Fajr logged 30 days',            threshold: 30,  color: 'from-amber-400 to-yellow-500',   rarity: 'Rare', prayerName: 'fajr' },
  { id: 'all_5_day',       title: 'Full Day Devotion',  emoji: '⭐', desc: 'All 5 prayers in one day',      threshold: 1,   color: 'from-teal-400 to-cyan-500',      rarity: 'Uncommon', requireAll5: true },
  { id: 'streak_365',      title: 'Year of Surrender',  emoji: '🕋', desc: '365-day streak — SubhanAllah!', threshold: 365, color: 'from-yellow-400 to-amber-600',   rarity: 'Legendary' },
  { id: 'quran_combo',     title: 'Quran & Prayer',    emoji: '📖', desc: 'Pray + read Quran same day',     threshold: 7,   color: 'from-emerald-400 to-teal-600',   rarity: 'Rare' },
];

const RARITY_COLORS = {
  Common: 'text-slate-500', Uncommon: 'text-green-600', Rare: 'text-blue-600',
  Epic: 'text-purple-600', Legendary: 'text-amber-600',
};

function computeStreak(logs = []) {
  const completedDates = [...new Set(logs.filter(l=>l.completed).map(l=>l.date))].sort().reverse();
  if (!completedDates.length) return 0;
  let streak = 0;
  let check = startOfDay(new Date());
  for (const d of completedDates) {
    const day = startOfDay(new Date(d));
    const diff = differenceInCalendarDays(check, day);
    if (diff === 0 || diff === 1) { streak++; check = day; } else break;
  }
  return streak;
}

export default function PrayerStreakBadges() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [minting, setMinting] = useState(false);

  const { data: prayerLogs = [] } = useQuery({
    queryKey: ['prayerLogs'],
    queryFn: () => base44.entities.PrayerLog.list('-date', 400),
  });
  const { data: quranReadings = [] } = useQuery({
    queryKey: ['quranReadings'],
    queryFn: () => base44.entities.QuranReading.list('-date', 100).catch(() => []),
  });
  const { data: userBadges = [] } = useQuery({
    queryKey: ['userAchievements'],
    queryFn: () => base44.entities.UserAchievement.list('-created_date', 100).catch(() => []),
  });

  const streak = computeStreak(prayerLogs);
  const totalLogged = prayerLogs.filter(l=>l.completed).length;
  const fajrCount = prayerLogs.filter(l=>l.completed && l.prayer_name === 'fajr').length;

  // Check days where all 5 were logged
  const byDate = {};
  prayerLogs.filter(l=>l.completed).forEach(l => {
    if (!byDate[l.date]) byDate[l.date] = new Set();
    byDate[l.date].add(l.prayer_name?.toLowerCase());
  });
  const all5Days = Object.values(byDate).filter(s => ['fajr','dhuhr','asr','maghrib','isha'].every(p => s.has(p))).length;

  // Quran + prayer same day
  const quranDates = new Set(quranReadings.map(r => r.date));
  const comboDays = Object.keys(byDate).filter(d => quranDates.has(d)).length;

  function isUnlocked(badge) {
    if (badge.requireAll5) return all5Days >= badge.threshold;
    if (badge.prayerName === 'fajr') return fajrCount >= badge.threshold;
    if (badge.id === 'quran_combo') return comboDays >= badge.threshold;
    if (badge.id === 'first_prayer') return totalLogged >= badge.threshold;
    return streak >= badge.threshold;
  }

  function getProgress(badge) {
    if (badge.requireAll5) return Math.min(all5Days / badge.threshold, 1);
    if (badge.prayerName === 'fajr') return Math.min(fajrCount / badge.threshold, 1);
    if (badge.id === 'quran_combo') return Math.min(comboDays / badge.threshold, 1);
    if (badge.id === 'first_prayer') return Math.min(totalLogged / badge.threshold, 1);
    return Math.min(streak / badge.threshold, 1);
  }

  const isMinted = (badge) => userBadges.some(b => b.achievement_id === badge.id || b.notes?.includes(badge.id));

  const mint = async (badge) => {
    if (!isUnlocked(badge)) return toast.error('Complete the challenge first!');
    if (isMinted(badge)) return toast('Already minted!');
    setMinting(true);
    await base44.entities.UserAchievement.create({
      achievement_id: badge.id,
      title: badge.title,
      emoji: badge.emoji,
      rarity: badge.rarity,
      notes: JSON.stringify({ badge_id: badge.id, streak, minted_at: new Date().toISOString() }),
    }).catch(() => {});
    // Award gamification points
    await base44.entities.GamificationPoints.create({
      points: badge.rarity === 'Legendary' ? 500 : badge.rarity === 'Epic' ? 200 : badge.rarity === 'Rare' ? 100 : 50,
      reason: `Badge minted: ${badge.title}`,
      category: 'spiritual',
    }).catch(() => {});
    qc.invalidateQueries(['userAchievements']);
    toast.success(`🏆 Badge "${badge.title}" minted! Points awarded.`);
    setMinting(false);
    setSelected(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h3 className="font-black text-slate-800 dark:text-slate-100">Prayer Streak Badges</h3>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800/40">
          <Zap className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-xs font-black text-orange-600 dark:text-orange-400">{streak} day streak</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BADGES.map(badge => {
          const unlocked = isUnlocked(badge);
          const minted = isMinted(badge);
          const progress = getProgress(badge);
          return (
            <motion.button key={badge.id} whileHover={{ y: -2, scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setSelected(badge)}
              className={`relative rounded-2xl p-3 text-center border-2 transition-all ${
                minted ? 'border-amber-400 bg-gradient-to-br ' + badge.color + ' shadow-md' :
                unlocked ? 'border-teal-400 bg-white dark:bg-slate-800 shadow-sm' :
                'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-60'
              }`}>
              {minted && <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center shadow"><Check className="w-3 h-3 text-white" /></div>}
              {!unlocked && <Lock className="absolute top-2 right-2 w-3 h-3 text-slate-300" />}
              <div className="text-3xl mb-1.5">{badge.emoji}</div>
              <p className={`text-[10px] font-black leading-tight ${minted ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>{badge.title}</p>
              <p className={`text-[9px] mt-0.5 ${RARITY_COLORS[badge.rarity]}`}>{badge.rarity}</p>
              {!minted && (
                <div className="mt-2 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setSelected(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-auto md:left-1/2 md:-translate-x-1/2 md:w-80 z-50 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 text-center">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${selected.color} flex items-center justify-center mx-auto mb-4 shadow-lg text-4xl`}>
                {selected.emoji}
              </div>
              <h3 className="font-black text-lg text-slate-800 dark:text-slate-100">{selected.title}</h3>
              <p className={`text-xs font-bold mt-1 ${RARITY_COLORS[selected.rarity]}`}>{selected.rarity}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{selected.desc}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
                <span>Progress</span>
                <span className="font-bold text-teal-600 dark:text-teal-400">{Math.round(getProgress(selected) * 100)}%</span>
              </div>
              <div className="mt-4 space-y-2">
                {isUnlocked(selected) && !isMinted(selected) ? (
                  <Button onClick={() => mint(selected)} disabled={minting}
                    className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold hover:opacity-90">
                    {minting ? '⏳ Minting...' : '🏆 Mint Badge & Earn Points'}
                  </Button>
                ) : isMinted(selected) ? (
                  <div className="flex gap-2">
                    <div className="flex-1 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-sm font-bold text-emerald-600 dark:text-emerald-400">✓ Minted</div>
                    <DeepLinkShare path="/Goals" title={`I earned the "${selected.title}" badge on Vagus Planner! 🏆`} compact />
                  </div>
                ) : (
                  <div className="py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm text-slate-400">🔒 Keep going — you're {Math.round(getProgress(selected)*100)}% there</div>
                )}
                <Button variant="outline" onClick={() => setSelected(null)} className="w-full">Close</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}