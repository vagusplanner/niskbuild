import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Moon, Sun, Calendar, CheckCircle, Circle, 
  Sparkles, ChevronLeft, ChevronRight, Info, Flame, Target, Trophy, Play, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';
import { toHijri } from '@/components/utils/hijriUtils';

const FASTING_TYPES = {
  ramadan: { 
    label: 'Ramadan', 
    color: 'bg-emerald-500', 
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    description: 'Obligatory fasting during Ramadan'
  },
  mondayThursday: { 
    label: 'Mon/Thu', 
    color: 'bg-blue-500', 
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    description: 'Sunnah fasting on Mondays & Thursdays'
  },
  whiteDays: { 
    label: 'White Days', 
    color: 'bg-purple-500', 
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700',
    description: 'Ayyam al-Beed: 13th, 14th, 15th of each Hijri month'
  }
};

export default function FastingTracker({ compact = false }) {
  const [viewMonth, setViewMonth] = useState(new Date());
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [goalType, setGoalType] = useState('mondayThursday');
  const [suhoorTime, setSuhoorTime] = useState('04:30');
  const [creatingChallenge, setCreatingChallenge] = useState(false);

  const queryClient = useQueryClient();

  // Fetch active fasting goals
  const { data: goals = [] } = useQuery({
    queryKey: ['fasting-goals'],
    queryFn: () => base44.entities.FastingGoal.filter({ status: 'active' }),
    initialData: []
  });

  const activeGoal = goals[0];

  // Fetch fasting records
  const { data: records = [] } = useQuery({
    queryKey: ['fasting-records'],
    queryFn: () => base44.entities.FastingRecord.list('-date', 100),
    initialData: []
  });

  const createChallengeMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.FastingGoal.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fasting-goals'] });
      toast.success('Fasting challenge started! 🎯');
      setShowChallengeForm(false);
      setCreatingChallenge(false);
    }
  });

  const completeFastMutation = useMutation({
    mutationFn: async ({ recordId, goalId }) => {
      await base44.entities.FastingRecord.update(recordId, { completed: true });
      
      if (goalId) {
        const goal = goals.find(g => g.id === goalId);
        if (goal) {
          const newCount = (goal.current_count || 0) + 1;
          const newStreak = (goal.streak || 0) + 1;
          await base44.entities.FastingGoal.update(goalId, {
            current_count: newCount,
            streak: newStreak,
            best_streak: Math.max(newStreak, goal.best_streak || 0),
            status: newCount >= goal.target_count ? 'completed' : 'active'
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fasting-records'] });
      queryClient.invalidateQueries({ queryKey: ['fasting-goals'] });
      toast.success('Fast completed! Keep it up! 🌙');
    }
  });

  const handleStartChallenge = () => {
    setCreatingChallenge(true);
    const targetCount = goalType === 'mondayThursday' ? 52 : goalType === 'whiteDays' ? 36 : 30;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 365);

    createChallengeMutation.mutate({
      title: `${goalType === 'mondayThursday' ? 'Monday & Thursday' : goalType === 'whiteDays' ? 'White Days (13-15)' : 'Custom'} Fasting Challenge`,
      type: goalType,
      target_count: targetCount,
      current_count: 0,
      start_date: new Date().toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      status: 'active',
      streak: 0,
      best_streak: 0,
      auto_schedule: true,
      reminder_enabled: true,
      suhoor_reminder_time: suhoorTime,
      iftar_reminder_minutes: 30
    });
  };

  const todayRecord = records.find(r => r.date === format(new Date(), 'yyyy-MM-dd'));
  const completedToday = todayRecord?.completed;

  const monthDays = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const getFastingType = (date) => {
    const hijri = toHijri(date);
    const dayOfWeek = getDay(date); // 0 = Sunday, 1 = Monday, etc.
    const types = [];

    // Check if Ramadan (month 9)
    if (hijri.month === 9) {
      types.push('ramadan');
    }

    // Check Monday (1) or Thursday (4)
    if (dayOfWeek === 1 || dayOfWeek === 4) {
      types.push('mondayThursday');
    }

    // Check White Days (13, 14, 15 of Hijri month)
    if (hijri.day === 13 || hijri.day === 14 || hijri.day === 15) {
      types.push('whiteDays');
    }

    return types;
  };

  const upcomingFasts = useMemo(() => {
    const today = new Date();
    const next30Days = Array.from({ length: 30 }, (_, i) => addDays(today, i));
    
    return next30Days
      .map(date => ({
        date,
        types: getFastingType(date),
        hijri: toHijri(date)
      }))
      .filter(d => d.types.length > 0)
      .slice(0, 7);
  }, []);

  const currentMonthStats = useMemo(() => {
    let ramadanDays = 0;
    let mondayThursdayDays = 0;
    let whiteDays = 0;

    monthDays.forEach(date => {
      const types = getFastingType(date);
      if (types.includes('ramadan')) ramadanDays++;
      if (types.includes('mondayThursday')) mondayThursdayDays++;
      if (types.includes('whiteDays')) whiteDays++;
    });

    return { ramadanDays, mondayThursdayDays, whiteDays };
  }, [monthDays]);

  const hijriInfo = toHijri(viewMonth);

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500 rounded-lg">
                <Sun className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-semibold text-amber-900">Fasting Challenge</h3>
            </div>
            {activeGoal && activeGoal.streak > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-lg">
                <Flame className="w-3 h-3 text-orange-600" />
                <span className="text-xs font-bold text-orange-600">{activeGoal.streak}</span>
              </div>
            )}
          </div>
          
          {activeGoal ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-600">Progress</span>
                <span className="font-semibold text-amber-700">
                  {activeGoal.current_count || 0} / {activeGoal.target_count}
                </span>
              </div>
              <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
                  style={{ width: `${Math.min(((activeGoal.current_count || 0) / activeGoal.target_count) * 100, 100)}%` }}
                />
              </div>
              {todayRecord && !completedToday && (
                <Button
                  size="sm"
                  onClick={() => completeFastMutation.mutate({ recordId: todayRecord.id, goalId: activeGoal.id })}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Mark Today Complete
                </Button>
              )}
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => setShowChallengeForm(true)}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              <Play className="w-3 h-3 mr-1" />
              Start Challenge
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg">
              <Sun className="w-5 h-5 text-white" />
            </div>
            Smart Fasting Challenge
          </CardTitle>
          {activeGoal && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-100 rounded-xl">
                <Flame className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-xl font-bold text-orange-600">{activeGoal.streak || 0}</p>
                  <p className="text-xs text-orange-700">streak</p>
                </div>
              </div>
            </div>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Info className="w-4 h-4 text-amber-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold mb-1">Fasting Types:</p>
                <ul className="text-xs space-y-1">
                  <li><span className="text-emerald-600">●</span> Ramadan - Obligatory</li>
                  <li><span className="text-blue-600">●</span> Monday/Thursday - Sunnah</li>
                  <li><span className="text-purple-600">●</span> White Days (13-15 Hijri) - Sunnah</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Challenge Setup or Progress */}
        {!activeGoal ? (
          <AnimatePresence>
            {!showChallengeForm ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 bg-white/60 rounded-lg text-center space-y-3"
              >
                <Trophy className="w-12 h-12 text-amber-600 mx-auto" />
                <h3 className="font-semibold text-slate-800">Start Your Fasting Journey</h3>
                <p className="text-sm text-slate-600">
                  Set a fasting challenge with automatic calendar scheduling and daily reminders
                </p>
                <Button
                  onClick={() => setShowChallengeForm(true)}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Create Challenge
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-white/80 rounded-lg space-y-4"
              >
                <h3 className="font-semibold text-slate-800">Setup Your Challenge</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Challenge Type</Label>
                    <Select value={goalType} onValueChange={setGoalType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mondayThursday">Monday & Thursday (52 days/year)</SelectItem>
                        <SelectItem value="whiteDays">White Days 13-15 (36 days/year)</SelectItem>
                        <SelectItem value="custom">Custom Schedule</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Suhoor Reminder Time</Label>
                    <Input
                      type="time"
                      value={suhoorTime}
                      onChange={(e) => setSuhoorTime(e.target.value)}
                    />
                    <p className="text-xs text-slate-500 mt-1">We'll remind you 30 min before</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleStartChallenge}
                    disabled={creatingChallenge}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {creatingChallenge ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Target className="w-4 h-4 mr-2" />
                    )}
                    Start Challenge
                  </Button>
                  <Button variant="outline" onClick={() => setShowChallengeForm(false)}>
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-emerald-900">{activeGoal.title}</h3>
              <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/60 rounded-lg p-2 text-center">
                <p className="text-2xl font-bold text-emerald-700">{activeGoal.current_count || 0}</p>
                <p className="text-xs text-slate-600">Completed</p>
              </div>
              <div className="bg-white/60 rounded-lg p-2 text-center">
                <p className="text-2xl font-bold text-orange-600">{activeGoal.streak || 0}</p>
                <p className="text-xs text-slate-600">Streak</p>
              </div>
              <div className="bg-white/60 rounded-lg p-2 text-center">
                <p className="text-2xl font-bold text-blue-600">{activeGoal.best_streak || 0}</p>
                <p className="text-xs text-slate-600">Best</p>
              </div>
            </div>
            {todayRecord && !completedToday && (
              <Button
                onClick={() => completeFastMutation.mutate({ recordId: todayRecord.id, goalId: activeGoal.id })}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete Today's Fast
              </Button>
            )}
            {completedToday && (
              <div className="flex items-center gap-2 p-3 bg-green-100 rounded-lg text-green-700">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Today's fast completed! 🎉</span>
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(FASTING_TYPES).map(([key, type]) => (
            <Badge 
              key={key} 
              variant="outline" 
              className={`${type.bgColor} ${type.borderColor} ${type.textColor}`}
            >
              <div className={`w-2 h-2 rounded-full ${type.color} mr-1.5`} />
              {type.label}
            </Badge>
          ))}
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between bg-white/60 rounded-xl p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMonth(prev => subMonths(prev, 1))}
            className="h-8 w-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <p className="font-semibold text-slate-800">
              {format(viewMonth, 'MMMM yyyy')}
            </p>
            <p className="text-xs text-amber-600">
              {hijriInfo.monthName} {hijriInfo.year} AH
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMonth(prev => addMonths(prev, 1))}
            className="h-8 w-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white/60 rounded-xl p-3">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-slate-500 py-1">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: getDay(startOfMonth(viewMonth)) }).map((_, i) => (
              <div key={`empty-${i}`} className="h-9" />
            ))}
            
            {monthDays.map(date => {
              const types = getFastingType(date);
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              const hijri = toHijri(date);
              
              return (
                <TooltipProvider key={date.toISOString()}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className={`
                          relative h-9 flex flex-col items-center justify-center rounded-lg cursor-pointer transition-colors
                          ${isToday ? 'ring-2 ring-amber-400' : ''}
                          ${types.length > 0 ? 'bg-amber-100/80' : 'hover:bg-amber-50'}
                        `}
                      >
                        <span className={`text-sm ${isToday ? 'font-bold text-amber-700' : 'text-slate-700'}`}>
                          {format(date, 'd')}
                        </span>
                        {types.length > 0 && (
                          <div className="absolute bottom-0.5 flex gap-0.5">
                            {types.map(type => (
                              <div 
                                key={type}
                                className={`w-1.5 h-1.5 rounded-full ${FASTING_TYPES[type].color}`}
                              />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">{format(date, 'EEEE, MMM d')}</p>
                      <p className="text-xs text-slate-500">
                        {hijri.day} {hijri.monthName} {hijri.year}
                      </p>
                      {types.length > 0 ? (
                        <div className="mt-1 space-y-0.5">
                          {types.map(type => (
                            <p key={type} className="text-xs">
                              • {FASTING_TYPES[type].description}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 mt-1">No fasting recommended</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-emerald-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-emerald-700">{currentMonthStats.ramadanDays}</p>
            <p className="text-xs text-emerald-600">Ramadan Days</p>
          </div>
          <div className="bg-blue-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{currentMonthStats.mondayThursdayDays}</p>
            <p className="text-xs text-blue-600">Mon/Thu</p>
          </div>
          <div className="bg-purple-100 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-purple-700">{currentMonthStats.whiteDays}</p>
            <p className="text-xs text-purple-600">White Days</p>
          </div>
        </div>

        {/* Upcoming Fasts */}
        <div>
          <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Upcoming Fasting Days
          </h4>
          <div className="space-y-2 max-h-48 overflow-auto">
            <AnimatePresence>
              {upcomingFasts.map((fast, idx) => (
                <motion.div
                  key={fast.date.toISOString()}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between p-3 bg-white/70 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-slate-800">
                      {format(fast.date, 'EEEE, MMM d')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {fast.hijri.day} {fast.hijri.monthName}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {fast.types.map(type => (
                      <Badge 
                        key={type}
                        variant="outline"
                        className={`text-xs ${FASTING_TYPES[type].bgColor} ${FASTING_TYPES[type].borderColor} ${FASTING_TYPES[type].textColor}`}
                      >
                        {FASTING_TYPES[type].label}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {upcomingFasts.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">
                No fasting days in the next 30 days
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}