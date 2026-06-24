import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Moon, Book, Heart, Star, CheckCircle2, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function RamadanDashboard() {
  const [selectedDay, setSelectedDay] = useState(null);
  const queryClient = useQueryClient();

  const { data: activities = [] } = useQuery({
    queryKey: ['ramadanActivities'],
    queryFn: () => base44.entities.RamadanActivity.list()
  });

  // Ramadan 1447H started Feb 18, 2026
  const RAMADAN_START = new Date('2026-02-18');
  const todayStr = new Date().toISOString().split('T')[0];
  const ramadanDayNum = Math.floor((new Date(todayStr) - RAMADAN_START) / 86400000) + 1;
  const isRamadan = ramadanDayNum >= 1 && ramadanDayNum <= 30;

  const currentDay = activities.find(a => a.date === todayStr);

  const updateActivityMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RamadanActivity.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramadanActivities'] });
      toast.success('Updated!');
    }
  });

  const quranProgress = activities.reduce((acc, a) => acc + (a.quran_pages_read || 0), 0);
  const totalQuranPages = 604;
  const quranPercentage = Math.min((quranProgress / totalQuranPages) * 100, 100);

  const totalCharity = activities.reduce((acc, a) => acc + (a.charity_amount || 0), 0);
  const completedDays = activities.filter(a => a.fasted).length;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border-purple-200 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-blue-950/20 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Moon className="w-6 h-6 text-purple-600" />
              Ramadan 1447H Dashboard
            </div>
            {isRamadan && (
              <span className="text-sm font-bold text-purple-600 bg-purple-100 dark:bg-purple-900/40 px-3 py-1 rounded-full">
                Day {ramadanDayNum} / 30
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-xl border-2 border-purple-200 text-center">
              <div className="text-3xl font-bold text-purple-600">{completedDays}</div>
              <p className="text-sm text-slate-600 mt-1">Days Fasted</p>
            </div>
            <div className="p-4 bg-white rounded-xl border-2 border-blue-200 text-center">
              <div className="text-3xl font-bold text-blue-600">{quranProgress}</div>
              <p className="text-sm text-slate-600 mt-1">Pages Read</p>
            </div>
            <div className="p-4 bg-white rounded-xl border-2 border-green-200 text-center">
              <div className="text-3xl font-bold text-green-600">${totalCharity}</div>
              <p className="text-sm text-slate-600 mt-1">Charity Given</p>
            </div>
            <div className="p-4 bg-white rounded-xl border-2 border-amber-200 text-center">
              <div className="text-3xl font-bold text-amber-600">
                {activities.filter(a => a.taraweeh_completed).length}
              </div>
              <p className="text-sm text-slate-600 mt-1">Taraweeh</p>
            </div>
          </div>

          {/* Quran Progress */}
          <div className="p-4 bg-white rounded-xl border-2 border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Book className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-slate-800">Quran Completion</span>
              </div>
              <span className="text-sm text-slate-600">{Math.round(quranPercentage)}%</span>
            </div>
            <Progress value={quranPercentage} className="h-3 bg-purple-100" />
            <p className="text-xs text-slate-500 mt-2">
              {quranProgress} of {totalQuranPages} pages • {Math.ceil((totalQuranPages - quranProgress) / 20)} days to complete
            </p>
          </div>

          {/* Today's Checklist */}
          {currentDay && (
            <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl text-white">
              <h4 className="font-bold mb-3 flex items-center gap-2">
                <Star className="w-5 h-5" />
                Day {currentDay.day_number} Checklist
              </h4>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/10">
                  <input
                    type="checkbox"
                    checked={currentDay.fasted}
                    onChange={(e) => updateActivityMutation.mutate({
                      id: currentDay.id,
                      data: { ...currentDay, fasted: e.target.checked }
                    })}
                    className="w-5 h-5"
                  />
                  <span>Completed Fast</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/10">
                  <input
                    type="checkbox"
                    checked={currentDay.taraweeh_completed}
                    onChange={(e) => updateActivityMutation.mutate({
                      id: currentDay.id,
                      data: { ...currentDay, taraweeh_completed: e.target.checked }
                    })}
                    className="w-5 h-5"
                  />
                  <span>Prayed Taraweeh</span>
                </label>
                <div className="flex items-center gap-3 p-2">
                  <Book className="w-5 h-5" />
                  <input
                    type="number"
                    value={currentDay.quran_pages_read || 0}
                    onChange={(e) => updateActivityMutation.mutate({
                      id: currentDay.id,
                      data: { ...currentDay, quran_pages_read: parseInt(e.target.value) || 0 }
                    })}
                    className="w-20 px-2 py-1 rounded bg-white/20 text-white"
                  />
                  <span>Pages Read</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}