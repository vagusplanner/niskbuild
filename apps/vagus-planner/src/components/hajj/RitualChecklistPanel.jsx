import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Circle, Book, Calendar, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const HAJJ_CHECKLIST = [
  {
    day: 1,
    title: '8th Dhul Hijjah - Day of Tarwiyah',
    rituals: [
      { id: 'ihram', name: 'Enter state of Ihram', description: 'Make intention and wear Ihram garments' },
      { id: 'miqat', name: 'Pass through Miqat', description: 'Boundary for entering Ihram' },
      { id: 'talbiyah', name: 'Recite Talbiyah', description: 'Labbayk Allahumma Labbayk' },
      { id: 'mina_arrival', name: 'Arrive in Mina', description: 'Spend the day and night in Mina' },
      { id: 'mina_prayers', name: 'Perform 5 prayers in Mina', description: 'Dhuhr, Asr, Maghrib, Isha, Fajr' }
    ]
  },
  {
    day: 2,
    title: '9th Dhul Hijjah - Day of Arafah',
    rituals: [
      { id: 'arafat_departure', name: 'Depart to Arafat after sunrise', description: 'Leave Mina for Mount Arafat' },
      { id: 'arafat_stay', name: 'Stand at Arafat (Wuquf)', description: 'Most important pillar of Hajj - from noon to sunset' },
      { id: 'arafat_dua', name: 'Make extensive Dua', description: 'Seek forgiveness and make supplications' },
      { id: 'muzdalifah_departure', name: 'Depart to Muzdalifah after sunset', description: 'Leave for Muzdalifah after Maghrib' },
      { id: 'muzdalifah_prayers', name: 'Pray Maghrib & Isha combined', description: 'At Muzdalifah' },
      { id: 'muzdalifah_rest', name: 'Rest at Muzdalifah', description: 'Spend the night under the open sky' },
      { id: 'pebbles', name: 'Collect pebbles for stoning', description: 'Gather 49 or 70 small pebbles' }
    ]
  },
  {
    day: 3,
    title: '10th Dhul Hijjah - Eid Day',
    rituals: [
      { id: 'jamarat_aqaba', name: 'Stone Jamarat al-Aqaba', description: 'Throw 7 pebbles at the largest pillar' },
      { id: 'sacrifice', name: 'Perform sacrifice (Qurbani)', description: 'Slaughter an animal or arrange sacrifice' },
      { id: 'haircut', name: 'Cut/shave hair', description: 'Men shave head, women cut a fingertip length' },
      { id: 'partial_tahalul', name: 'First Tahallul', description: 'Partial release from Ihram restrictions' },
      { id: 'tawaf_ifadah', name: 'Tawaf al-Ifadah', description: 'Circumambulate the Kaaba 7 times' },
      { id: 'sai', name: 'Perform Sa\'i', description: 'Walk between Safa and Marwah 7 times' },
      { id: 'complete_tahalul', name: 'Complete Tahallul', description: 'Full release from Ihram' }
    ]
  },
  {
    day: 4,
    title: '11th Dhul Hijjah - Ayyam al-Tashriq Day 1',
    rituals: [
      { id: 'stay_mina_11', name: 'Stay in Mina', description: 'Remain in Mina during these days' },
      { id: 'stone_all_jamarats_11', name: 'Stone all 3 Jamarats', description: 'Throw 7 pebbles at each pillar after Zawaal' },
      { id: 'dhikr_11', name: 'Make Dhikr & Takbir', description: 'Remember Allah abundantly' }
    ]
  },
  {
    day: 5,
    title: '12th Dhul Hijjah - Ayyam al-Tashriq Day 2',
    rituals: [
      { id: 'stone_all_jamarats_12', name: 'Stone all 3 Jamarats', description: 'Throw 7 pebbles at each pillar after Zawaal' },
      { id: 'dhikr_12', name: 'Make Dhikr & Takbir', description: 'Continue remembrance' },
      { id: 'optional_stay', name: 'Choose to stay or leave', description: 'Can depart before sunset or stay for 13th' }
    ]
  },
  {
    day: 6,
    title: '13th Dhul Hijjah - Ayyam al-Tashriq Day 3 (Optional)',
    rituals: [
      { id: 'stone_all_jamarats_13', name: 'Stone all 3 Jamarats', description: 'If staying, throw 7 pebbles at each pillar' },
      { id: 'depart_mina', name: 'Depart from Mina', description: 'Leave for Makkah' }
    ]
  },
  {
    day: 7,
    title: 'Farewell',
    rituals: [
      { id: 'tawaf_wada', name: 'Tawaf al-Wada (Farewell Tawaf)', description: 'Final circumambulation before leaving Makkah' },
      { id: 'final_dua', name: 'Make final supplications', description: 'Pray for acceptance of Hajj' }
    ]
  }
];

const UMRAH_CHECKLIST = [
  {
    day: 1,
    title: 'Umrah Rituals',
    rituals: [
      { id: 'ihram_umrah', name: 'Enter Ihram at Miqat', description: 'Make intention for Umrah and wear Ihram' },
      { id: 'talbiyah_umrah', name: 'Recite Talbiyah', description: 'Continue until you see the Kaaba' },
      { id: 'tawaf_umrah', name: 'Tawaf (7 circuits)', description: 'Circumambulate the Kaaba 7 times' },
      { id: 'maqam_ibrahim', name: 'Pray 2 Rakah at Maqam Ibrahim', description: 'After completing Tawaf' },
      { id: 'zamzam', name: 'Drink Zamzam water', description: 'Make Dua while drinking' },
      { id: 'sai_umrah', name: 'Sa\'i between Safa and Marwah', description: 'Walk/run 7 times' },
      { id: 'haircut_umrah', name: 'Cut/shave hair', description: 'Men shave, women cut fingertip length' },
      { id: 'umrah_complete', name: 'Umrah completed', description: 'Exit Ihram state' }
    ]
  }
];

export default function RitualChecklistPanel({ tripId, tripType = 'hajj' }) {
  const queryClient = useQueryClient();
  const [expandedDay, setExpandedDay] = useState(null);
  
  const checklist = tripType === 'hajj' ? HAJJ_CHECKLIST : UMRAH_CHECKLIST;

  // Fetch completed rituals
  const { data: completedRituals = [] } = useQuery({
    queryKey: ['ritualProgress', tripId],
    queryFn: async () => {
      const progress = await base44.entities.HajjRitual.filter({ trip_id: tripId });
      return progress;
    },
    enabled: !!tripId
  });

  // Mark ritual as complete
  const toggleRitual = useMutation({
    mutationFn: async ({ ritualId, completed }) => {
      const existing = completedRituals.find(r => r.ritual_id === ritualId);
      if (existing) {
        if (!completed) {
          await base44.entities.HajjRitual.delete(existing.id);
        }
      } else {
        await base44.entities.HajjRitual.create({
          trip_id: tripId,
          ritual_id: ritualId,
          completed_at: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ritualProgress', tripId] });
      toast.success('Progress updated');
    }
  });

  const isCompleted = (ritualId) => {
    return completedRituals.some(r => r.ritual_id === ritualId);
  };

  const totalRituals = checklist.reduce((sum, day) => sum + day.rituals.length, 0);
  const completedCount = completedRituals.length;
  const progressPercentage = totalRituals > 0 ? (completedCount / totalRituals) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Book className="w-5 h-5 text-purple-600" />
            {tripType === 'hajj' ? 'Hajj' : 'Umrah'} Ritual Checklist
          </CardTitle>
          <Badge className="bg-purple-600 text-white">
            {completedCount}/{totalRituals}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Overall Progress */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-xl border border-purple-200 dark:border-purple-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-purple-800 dark:text-purple-200">Overall Progress</span>
            <span className="text-2xl font-black text-purple-700 dark:text-purple-300">{progressPercentage.toFixed(0)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" indicatorClassName="bg-purple-600" />
        </div>

        {/* Daily Checklists */}
        <div className="space-y-2">
          {checklist.map((day) => {
            const dayCompleted = day.rituals.filter(r => isCompleted(r.id)).length;
            const dayTotal = day.rituals.length;
            const isExpanded = expandedDay === day.day;

            return (
              <div key={day.day} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        dayCompleted === dayTotal ? 'bg-green-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        {dayCompleted === dayTotal ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <span className="font-bold text-sm">{day.day}</span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100">{day.title}</h4>
                        <p className="text-xs text-slate-500">{dayCompleted}/{dayTotal} completed</p>
                      </div>
                    </div>
                    <Calendar className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 space-y-3 bg-white dark:bg-slate-950">
                        {day.rituals.map((ritual) => {
                          const completed = isCompleted(ritual.id);
                          return (
                            <div
                              key={ritual.id}
                              className={`p-3 rounded-lg border transition-all ${
                                completed 
                                  ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900' 
                                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={completed}
                                  onCheckedChange={(checked) => toggleRitual.mutate({ ritualId: ritual.id, completed: checked })}
                                  className="mt-0.5"
                                />
                                <div className="flex-1">
                                  <h5 className={`font-semibold text-sm mb-1 ${completed ? 'text-green-700 dark:text-green-300 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
                                    {ritual.name}
                                  </h5>
                                  <p className="text-xs text-slate-600 dark:text-slate-400">{ritual.description}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>This checklist is a general guide. Please consult with your group leader or scholar for specific guidance during your pilgrimage.</p>
        </div>
      </CardContent>
    </Card>
  );
}