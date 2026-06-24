import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Info, Plus, Minus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import HajjFeedbackButton from './HajjFeedbackButton';

const UMRAH_RITUALS = [
  {
    id: 'ihram',
    title: 'Ihram',
    description: 'Enter state of Ihram before Miqat',
    steps: [
      'Perform Ghusl (ritual bath)',
      'Wear Ihram clothing (2 white sheets for men)',
      'Make intention (Niyyah) for Umrah',
      'Recite Talbiyah: "Labbayka Allahumma Labbayk"'
    ],
    dua: 'Labbayka Allahumma bi-Umrah (Here I am O Allah, for Umrah)'
  },
  {
    id: 'tawaf',
    title: 'Tawaf',
    description: 'Circle Kaaba 7 times counter-clockwise',
    counter: 7,
    steps: [
      'Start from Black Stone, raise hands and say "Bismillah Allahu Akbar"',
      'Keep Kaaba on your left',
      'Touch/kiss Black Stone if possible',
      'Recite personal duas and prayers',
      'Complete 7 circuits',
      'Pray 2 rakats behind Maqam Ibrahim'
    ],
    dua: 'Subhan Allah, Alhamdulillah, Allahu Akbar'
  },
  {
    id: 'sai',
    title: 'Sa\'i',
    description: 'Walk between Safa and Marwa 7 times',
    counter: 7,
    steps: [
      'Start at Safa hill',
      'Walk to Marwa (count as 1)',
      'Return to Safa (count as 2)',
      'Continue until 7 rounds complete',
      'Make dua during Sa\'i',
      'End at Marwa hill'
    ],
    dua: 'Rabbana atina fid-dunya hasanah...'
  },
  {
    id: 'halq',
    title: 'Halq/Taqsir',
    description: 'Shave or trim hair',
    steps: [
      'Men: Shave head completely or trim hair',
      'Women: Trim hair length of fingertip',
      'Make dua of completion',
      'Umrah is now complete'
    ],
    dua: 'Alhamdulillah (All praise is due to Allah)'
  }
];

const HAJJ_RITUALS = [
  ...UMRAH_RITUALS,
  {
    id: 'mina',
    title: 'Day in Mina',
    description: '8th Dhul Hijjah - Stay in Mina',
    steps: [
      'Travel to Mina',
      'Pray Dhuhr, Asr, Maghrib, Isha, and Fajr',
      'Engage in dhikr and dua',
      'Prepare for Arafat'
    ]
  },
  {
    id: 'arafat',
    title: 'Day of Arafat',
    description: '9th Dhul Hijjah - The most important day',
    steps: [
      'Travel to Arafat after Fajr',
      'Stay within boundaries until sunset',
      'Listen to Khutbah',
      'Pray Dhuhr and Asr combined',
      'Make abundant dua',
      'Stay until sunset'
    ],
    dua: 'La ilaha illallah wahdahu la sharika lah...'
  },
  {
    id: 'muzdalifah',
    title: 'Night in Muzdalifah',
    description: 'Collect pebbles, pray, and rest',
    steps: [
      'Travel to Muzdalifah after sunset',
      'Pray Maghrib and Isha combined',
      'Collect 49-70 pebbles',
      'Rest and make dua',
      'Leave before Fajr (or after for weak)'
    ]
  },
  {
    id: 'rami',
    title: 'Stoning Jamarat',
    description: 'Stone the pillars for 3-4 days',
    counter: 49,
    steps: [
      '10th: Stone large pillar (Jamrat al-Aqaba) 7 times',
      '11th-13th: Stone all three pillars 7 times each',
      'Stone in order: small, middle, large',
      'Say "Bismillah Allahu Akbar" with each throw'
    ]
  },
  {
    id: 'sacrifice',
    title: 'Qurbani (Sacrifice)',
    description: 'Offer animal sacrifice',
    steps: [
      'Arrange sacrifice on 10th Dhul Hijjah',
      'Can be done until 13th',
      'Distribute meat to poor',
      'Thank Allah for provision'
    ]
  },
  {
    id: 'tawaf_ifadah',
    title: 'Tawaf al-Ifadah',
    description: 'Main Tawaf of Hajj',
    counter: 7,
    steps: [
      'Perform after stoning on 10th',
      'Same as Umrah Tawaf',
      'Complete 7 circuits',
      'Pray 2 rakats'
    ]
  },
  {
    id: 'tawaf_wida',
    title: 'Farewell Tawaf',
    description: 'Final Tawaf before leaving Mecca',
    counter: 7,
    steps: [
      'Last ritual before departure',
      'Make final duas',
      'Express gratitude',
      'Leave Haram backward facing Kaaba'
    ]
  }
];

export default function HajjRitualTracker({ pilgrimageType }) {
  const [completedRituals, setCompletedRituals] = useState({});
  const [counters, setCounters] = useState({});

  const rituals = pilgrimageType === 'hajj' ? HAJJ_RITUALS : UMRAH_RITUALS;
  const totalRituals = rituals.length;
  const completedCount = Object.keys(completedRituals).filter(k => completedRituals[k]).length;
  const progress = (completedCount / totalRituals) * 100;

  const toggleRitual = async (ritualId) => {
    const newStatus = !completedRituals[ritualId];
    setCompletedRituals(prev => ({ ...prev, [ritualId]: newStatus }));

    if (newStatus) {
      toast.success('Ritual completed! Alhamdulillah');
      
      // Award points
      await base44.functions.invoke('awardActivityPoints', {
        activity_type: `${pilgrimageType}_ritual_${ritualId}`,
        points: 200,
        category: 'islamic'
      });
    }
  };

  const incrementCounter = (ritualId) => {
    setCounters(prev => ({
      ...prev,
      [ritualId]: (prev[ritualId] || 0) + 1
    }));
  };

  const decrementCounter = (ritualId) => {
    setCounters(prev => ({
      ...prev,
      [ritualId]: Math.max(0, (prev[ritualId] || 0) - 1)
    }));
  };

  return (
    <div className="space-y-6">
      <Card className="border-emerald-200 bg-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{pilgrimageType === 'hajj' ? 'Hajj' : 'Umrah'} Progress</span>
            <Badge className="bg-emerald-600">{completedCount}/{totalRituals} Complete</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {rituals.map((ritual, idx) => {
          const isCompleted = completedRituals[ritual.id];
          const currentCount = counters[ritual.id] || 0;
          const hasCounter = ritual.counter;

          return (
            <Card key={ritual.id} className={isCompleted ? 'border-emerald-400 bg-emerald-50' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleRitual(ritual.id)}
                      className="mt-1"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-400" />
                      )}
                    </button>
                    <div>
                      <CardTitle className="text-lg">{idx + 1}. {ritual.title}</CardTitle>
                      <p className="text-sm text-slate-600 mt-1">{ritual.description}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasCounter && (
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-700">Counter: {currentCount} / {ritual.counter}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => decrementCounter(ritual.id)}
                        disabled={currentCount === 0}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => incrementCounter(ritual.id)}
                        disabled={currentCount >= ritual.counter}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Steps:
                  </p>
                  <ul className="space-y-1.5 ml-6">
                    {ritual.steps.map((step, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-emerald-600 mt-0.5">•</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                {ritual.dua && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-xs font-semibold text-purple-900 mb-1">Recommended Dua:</p>
                    <p className="text-sm text-purple-800 italic">{ritual.dua}</p>
                  </div>
                )}

                {isCompleted && (
                  <div className="pt-3 border-t">
                    <HajjFeedbackButton
                      feedbackType="ritual_guidance"
                      context={{ ritual_id: ritual.id, ritual_title: ritual.title }}
                      pilgrimageType={pilgrimageType}
                      compact
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}