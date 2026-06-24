import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BookOpen, X, ChevronLeft, ChevronRight, 
  CheckCircle, Clock, ExternalLink, Target,
  Flame, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SURAHS = [
  { number: 1, name: "Al-Fatihah", verses: 7 },
  { number: 2, name: "Al-Baqarah", verses: 286 },
  { number: 3, name: "Ali 'Imran", verses: 200 },
  { number: 4, name: "An-Nisa", verses: 176 },
  { number: 5, name: "Al-Ma'idah", verses: 120 },
  // Add more as needed - this is just a sample
];

export default function QuranReader({ initialSurah = 1, initialVerse = 1, onClose = () => {} }) {
  const [currentSurah, setCurrentSurah] = useState(initialSurah);
  const [currentVerse, setCurrentVerse] = useState(initialVerse);
  const [startTime] = useState(Date.now());
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [readingNotes, setReadingNotes] = useState('');
  const [versesRead, setVersesRead] = useState(1);

  const queryClient = useQueryClient();

  // Fetch active goal
  const { data: goals = [] } = useQuery({
    queryKey: ['quran-goals'],
    queryFn: () => SDK.entities.QuranGoal.filter({ status: 'active' }),
    initialData: []
  });

  const activeGoal = goals[0];

  // Fetch today's readings
  const { data: todayReadings = [] } = useQuery({
    queryKey: ['quran-readings', format(new Date(), 'yyyy-MM-dd')],
    queryFn: () => SDK.entities.QuranReading.filter({ 
      date: format(new Date(), 'yyyy-MM-dd')
    }),
    initialData: []
  });

  const logReadingMutation = useMutation({
    mutationFn: async (data) => {
      const reading = await SDK.entities.QuranReading.create(data);
      
      // Update goal progress if exists
      if (activeGoal) {
        const newTotalVerses = (activeGoal.total_verses_read || 0) + data.verses_count;
        const today = format(new Date(), 'yyyy-MM-dd');
        const lastRead = activeGoal.last_read_date;
        
        // Calculate streak
        let newStreak = activeGoal.streak || 0;
        if (lastRead) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
          
          if (lastRead === yesterdayStr) {
            newStreak += 1;
          } else if (lastRead !== today) {
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }
        
        await SDK.entities.QuranGoal.update(activeGoal.id, {
          total_verses_read: newTotalVerses,
          current_surah: data.surah_number,
          current_verse: data.to_verse,
          last_read_date: today,
          streak: newStreak,
          best_streak: Math.max(newStreak, activeGoal.best_streak || 0)
        });
      }
      
      return reading;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quran-readings'] });
      queryClient.invalidateQueries({ queryKey: ['quran-goals'] });
      toast.success('Reading logged successfully! 📖');
      setShowLogDialog(false);
      onClose();
    }
  });

  const handleLogReading = () => {
    const duration = Math.floor((Date.now() - startTime) / 60000);
    const surah = SURAHS.find(s => s.number === currentSurah);
    
    logReadingMutation.mutate({
      date: format(new Date(), 'yyyy-MM-dd'),
      surah_number: currentSurah,
      surah_name: surah?.name || `Surah ${currentSurah}`,
      from_verse: currentVerse,
      to_verse: currentVerse + versesRead - 1,
      verses_count: versesRead,
      duration_minutes: duration,
      completed: true,
      notes: readingNotes,
      source: 'app'
    });
  };

  const todayVersesCount = todayReadings.reduce((sum, r) => sum + (r.verses_count || 0), 0);
  const goalProgress = activeGoal ? (todayVersesCount / (activeGoal.target_verses_per_day || 1)) * 100 : 0;

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              Quran Reader
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            {/* Progress Card */}
            {activeGoal && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-emerald-900">{activeGoal.title}</h3>
                    <p className="text-sm text-emerald-700">
                      {todayVersesCount} / {activeGoal.target_verses_per_day || 0} verses today
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-orange-600">
                        <Flame className="w-4 h-4" />
                        <span className="font-bold">{activeGoal.streak || 0}</span>
                      </div>
                      <p className="text-xs text-slate-600">streak</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-emerald-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-bold">{activeGoal.total_verses_read || 0}</span>
                      </div>
                      <p className="text-xs text-slate-600">total</p>
                    </div>
                  </div>
                </div>
                <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                    style={{ width: `${Math.min(goalProgress, 100)}%` }}
                  />
                </div>
              </motion.div>
            )}

            {/* Surah Selector */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Surah</Label>
                <Select value={String(currentSurah)} onValueChange={(v) => setCurrentSurah(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SURAHS.map(surah => (
                      <SelectItem key={surah.number} value={String(surah.number)}>
                        {surah.number}. {surah.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Starting Verse</Label>
                <Input
                  type="number"
                  min="1"
                  value={currentVerse}
                  onChange={(e) => setCurrentVerse(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Quranly Integration */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-purple-900 mb-1">Read on Quranly</h4>
                  <p className="text-sm text-purple-700 mb-3">
                    Open Surah {SURAHS.find(s => s.number === currentSurah)?.name} in the Quranly app for a better reading experience
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => window.open(`https://quranly.com/${currentSurah}/${currentVerse}`, '_blank')}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Quranly
                </Button>
                <Button
                  onClick={() => setShowLogDialog(true)}
                  variant="outline"
                  className="flex-1 border-purple-300 text-purple-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Log Reading
                </Button>
              </div>
            </div>

            {/* Reading Tips */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">💡 Reading Tips</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Start with Bismillah and make a sincere intention</li>
                <li>• Read at your own pace with reflection</li>
                <li>• Come back here to log your progress when done</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Reading Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Your Reading</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>How many verses did you read?</Label>
              <Input
                type="number"
                min="1"
                value={versesRead}
                onChange={(e) => setVersesRead(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Notes or Reflections (optional)</Label>
              <Textarea
                placeholder="What did you learn or reflect on?"
                value={readingNotes}
                onChange={(e) => setReadingNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleLogReading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Log Reading
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowLogDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}