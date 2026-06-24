import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  RotateCcw, 
  Settings, 
  Star, 
  Plus, 
  Check, 
  Sparkles,
  Volume2,
  VolumeX,
  Trophy,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const PRESET_DHIKR = [
  { 
    phrase: 'سُبْحَانَ اللهِ', 
    transliteration: 'SubhanAllah', 
    translation: 'Glory be to Allah',
    target: 33
  },
  { 
    phrase: 'الْحَمْدُ لِلَّهِ', 
    transliteration: 'Alhamdulillah', 
    translation: 'All praise is due to Allah',
    target: 33
  },
  { 
    phrase: 'اللهُ أَكْبَرُ', 
    transliteration: 'Allahu Akbar', 
    translation: 'Allah is the Greatest',
    target: 34
  },
  { 
    phrase: 'لَا إِلٰهَ إِلَّا اللهُ', 
    transliteration: 'La ilaha illallah', 
    translation: 'There is no god but Allah',
    target: 100
  },
  { 
    phrase: 'أَسْتَغْفِرُ اللهَ', 
    transliteration: 'Astaghfirullah', 
    translation: 'I seek forgiveness from Allah',
    target: 100
  },
  { 
    phrase: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ', 
    transliteration: 'SubhanAllahi wa bihamdihi', 
    translation: 'Glory and praise be to Allah',
    target: 100
  }
];

const BEAD_COUNTS = [33, 99, 100, 500, 1000];

export default function DigitalTasbih({ compact = false }) {
  const queryClient = useQueryClient();
  const [count, setCount] = useState(0);
  const [selectedDhikr, setSelectedDhikr] = useState(PRESET_DHIKR[0]);
  const [customPhrase, setCustomPhrase] = useState('');
  const [customTranslation, setCustomTranslation] = useState('');
  const [targetCount, setTargetCount] = useState(33);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [totalToday, setTotalToday] = useState(0);
  const [completedSets, setCompletedSets] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  // Fetch today's progress
  const { data: todayProgress } = useQuery({
    queryKey: ['tasbihProgress', new Date().toISOString().split('T')[0]],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const results = await base44.entities.QuranReading.filter({
        date: today,
        reading_type: 'dhikr'
      });
      const total = results.reduce((sum, r) => sum + (r.verses_read || 0), 0);
      return total;
    },
    initialData: 0
  });

  useEffect(() => {
    setTotalToday(todayProgress || 0);
  }, [todayProgress]);

  const saveDhikrProgress = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.QuranReading.create({
        date: new Date().toISOString().split('T')[0],
        reading_type: 'dhikr',
        verses_read: data.count,
        notes: `${data.phrase} - ${data.translation}`
      });
    },
    onMutate: async (data) => {
      const today = new Date().toISOString().split('T')[0];
      await queryClient.cancelQueries({ queryKey: ['tasbihProgress', today] });
      const previousProgress = queryClient.getQueryData(['tasbihProgress', today]);
      
      queryClient.setQueryData(['tasbihProgress', today], (old = 0) => old + data.count);
      
      return { previousProgress };
    },
    onError: (error, variables, context) => {
      const today = new Date().toISOString().split('T')[0];
      queryClient.setQueryData(['tasbihProgress', today], context.previousProgress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasbihProgress'] });
    }
  });

  const handleIncrement = () => {
    const newCount = count + 1;
    setCount(newCount);
    setTotalToday(totalToday + 1);

    if (!sessionStartTime) {
      setSessionStartTime(new Date());
    }

    // Haptic feedback
    if (vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate(20);
    }

    // Sound feedback
    if (soundEnabled) {
      const audio = new Audio('data:audio/wav;base64,UklGRhQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }

    // Goal reached
    if (newCount === targetCount) {
      handleGoalReached();
    }

    // Multiple of 33
    if (newCount % 33 === 0 && newCount > 0) {
      const sets = Math.floor(newCount / 33);
      setCompletedSets(sets);
      
      if (soundEnabled) {
        const celebrationAudio = new Audio('data:audio/wav;base64,UklGRhQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==');
        celebrationAudio.volume = 0.5;
        celebrationAudio.play().catch(() => {});
      }
      
      toast.success(`Completed ${sets} set${sets > 1 ? 's' : ''} of 33!`, {
        icon: '✨'
      });
    }
  };

  const handleGoalReached = () => {
    // Save progress
    saveDhikrProgress.mutate({
      count: targetCount,
      phrase: isCustomMode ? customPhrase : selectedDhikr.phrase,
      translation: isCustomMode ? customTranslation : selectedDhikr.translation
    });

    // Celebration animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#14b8a6', '#06b6d4', '#0ea5e9']
    });

    // Vibration pattern
    if (vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }

    toast.success(`🎉 Goal reached! ${targetCount} times completed`, {
      duration: 5000
    });

    // Award points
    base44.integrations.Core.InvokeLLM({
      prompt: `Award gamification points for completing ${targetCount} dhikr repetitions`,
      response_json_schema: { type: "object", properties: {} }
    }).catch(() => {});
  };

  const handleReset = () => {
    if (count > 0 && count !== targetCount) {
      if (confirm(`You've counted ${count} times. Reset counter?`)) {
        setCount(0);
        setCompletedSets(0);
        setSessionStartTime(null);
      }
    } else {
      setCount(0);
      setCompletedSets(0);
      setSessionStartTime(null);
    }
  };

  const handleDhikrChange = (dhikr) => {
    setSelectedDhikr(dhikr);
    setTargetCount(dhikr.target);
    setIsCustomMode(false);
    setCount(0);
    setCompletedSets(0);
    setSessionStartTime(null);
  };

  const handleCustomDhikr = () => {
    if (!customPhrase.trim()) {
      toast.error('Please enter a dhikr phrase');
      return;
    }
    setIsCustomMode(true);
    setCount(0);
    setCompletedSets(0);
    setSessionStartTime(null);
    setShowSettings(false);
    toast.success('Custom dhikr set!');
  };

  const progress = Math.min((count / targetCount) * 100, 100);
  const currentDhikr = isCustomMode 
    ? { phrase: customPhrase, transliteration: '', translation: customTranslation }
    : selectedDhikr;

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-teal-900">Digital Tasbih</p>
              <p className="text-xs text-teal-600">{totalToday} today</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                  Open
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Digital Tasbih Counter</DialogTitle>
                </DialogHeader>
                <DigitalTasbih />
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
          <CardContent className="p-3 text-center">
            <Trophy className="w-5 h-5 text-teal-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-teal-900">{totalToday}</div>
            <p className="text-xs text-teal-600">Today's Total</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-3 text-center">
            <Sparkles className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-emerald-900">{completedSets}</div>
            <p className="text-xs text-emerald-600">Sets of 33</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200">
          <CardContent className="p-3 text-center">
            <Star className="w-5 h-5 text-cyan-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-cyan-900">{targetCount}</div>
            <p className="text-xs text-cyan-600">Target</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Counter Card */}
      <Card className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white border-0 shadow-2xl">
        <CardContent className="p-8">
          {/* Dhikr Text */}
          <div className="text-center mb-8">
            <motion.p 
              key={currentDhikr.phrase}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-4xl font-arabic leading-loose mb-3"
              dir="rtl"
            >
              {currentDhikr.phrase}
            </motion.p>
            {currentDhikr.transliteration && (
              <p className="text-teal-100 italic mb-2">{currentDhikr.transliteration}</p>
            )}
            <p className="text-cyan-100">{currentDhikr.translation}</p>
          </div>

          {/* Counter Display */}
          <div className="relative mb-8">
            <motion.div 
              className="text-center"
              animate={{ scale: count % 33 === 0 && count > 0 ? [1, 1.1, 1] : 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-8xl font-bold mb-2">{count}</div>
              <div className="text-teal-100">
                {count} / {targetCount}
              </div>
            </motion.div>
            
            {/* Progress Ring */}
            <svg className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 -z-10">
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="8"
              />
              <motion.circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 120}`}
                strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
                transform="rotate(-90 128 128)"
                initial={{ strokeDashoffset: 2 * Math.PI * 120 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 120 * (1 - progress / 100) }}
              />
            </svg>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleIncrement}
              size="lg"
              className="flex-1 h-20 text-2xl bg-white text-teal-600 hover:bg-teal-50 shadow-xl"
            >
              <Plus className="w-8 h-8 mr-2" />
              Count
            </Button>
            <Button
              onClick={handleReset}
              size="lg"
              variant="outline"
              className="h-20 px-6 bg-white/10 border-white/30 hover:bg-white/20 text-white"
            >
              <RotateCcw className="w-6 h-6" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-4 h-4 text-teal-600" />
            Select Dhikr
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {PRESET_DHIKR.map((dhikr, idx) => (
              <Button
                key={idx}
                onClick={() => handleDhikrChange(dhikr)}
                variant={!isCustomMode && selectedDhikr.phrase === dhikr.phrase ? "default" : "outline"}
                className={`h-auto py-3 flex flex-col items-start ${
                  !isCustomMode && selectedDhikr.phrase === dhikr.phrase 
                    ? 'bg-teal-600 hover:bg-teal-700' 
                    : ''
                }`}
              >
                <span className="text-sm font-arabic">{dhikr.phrase}</span>
                <span className="text-xs opacity-80">{dhikr.transliteration}</span>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {dhikr.target}x
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Settings className="w-4 h-4 mr-2" />
            Settings & Custom Dhikr
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tasbih Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Sound & Haptics */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-teal-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                  <Label>Sound Feedback</Label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                >
                  {soundEnabled ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <Label>Vibration</Label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVibrationEnabled(!vibrationEnabled)}
                >
                  {vibrationEnabled ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Target Count */}
            <div className="space-y-2">
              <Label>Target Count</Label>
              <Select
                value={targetCount.toString()}
                onValueChange={(val) => setTargetCount(parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BEAD_COUNTS.map(count => (
                    <SelectItem key={count} value={count.toString()}>
                      {count} times
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Dhikr */}
            <div className="space-y-3 pt-3 border-t">
              <h4 className="font-semibold text-sm">Custom Dhikr</h4>
              <div className="space-y-2">
                <Label>Arabic Phrase (optional)</Label>
                <Input
                  placeholder="Enter Arabic text"
                  value={customPhrase}
                  onChange={(e) => setCustomPhrase(e.target.value)}
                  dir="rtl"
                  className="font-arabic text-right"
                />
              </div>
              <div className="space-y-2">
                <Label>Translation/Meaning</Label>
                <Input
                  placeholder="Enter meaning"
                  value={customTranslation}
                  onChange={(e) => setCustomTranslation(e.target.value)}
                />
              </div>
              <Button
                onClick={handleCustomDhikr}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                Use Custom Dhikr
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session Info */}
      {sessionStartTime && count > 0 && (
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <History className="w-4 h-4" />
              <span>Session started {Math.floor((new Date() - sessionStartTime) / 60000)} min ago</span>
            </div>
            <Badge variant="outline">{count} counted</Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}