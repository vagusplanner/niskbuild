import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle, XCircle, Clock, MapPin, Users, 
  Moon, Sun, Sunrise, Sunset, AlertCircle, BookOpen
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PrayerReflectionJournal from './PrayerReflectionJournal';

const PRAYERS = [
  { name: 'Fajr', icon: Sunrise, color: 'from-indigo-500 to-purple-600' },
  { name: 'Dhuhr', icon: Sun, color: 'from-amber-400 to-orange-500' },
  { name: 'Asr', icon: Sun, color: 'from-orange-400 to-red-500' },
  { name: 'Maghrib', icon: Sunset, color: 'from-rose-400 to-pink-600' },
  { name: 'Isha', icon: Moon, color: 'from-violet-500 to-indigo-700' }
];

const PRAYER_TYPES = [
  { value: 'fard', label: 'Fard (Obligatory)', points: 15 },
  { value: 'sunnah_muakkadah', label: 'Sunnah Muakkadah', points: 10 },
  { value: 'sunnah_ghair_muakkadah', label: 'Sunnah', points: 5 },
  { value: 'nafl', label: 'Nafl (Voluntary)', points: 5 },
  { value: 'witr', label: 'Witr', points: 8 }
];

export default function PrayerTracker({ settings: propSettings, compact = false }) {
  const { data: userSettings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });
  
  const settings = propSettings || userSettings[0];
  const [selectedPrayer, setSelectedPrayer] = useState(null);
  const [logStatus, setLogStatus] = useState('performed');
  const [prayerType, setPrayerType] = useState('fard');
  const [location, setLocation] = useState('home');
  const [inCongregation, setInCongregation] = useState(false);
  const [prayedOnTime, setPrayedOnTime] = useState(true);
  const [isMakeupPrayer, setIsMakeupPrayer] = useState(false);
  const [makeupForDate, setMakeupForDate] = useState('');
  const [missedReason, setMissedReason] = useState('');
  const [notes, setNotes] = useState('');

  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: todayLogs = [] } = useQuery({
    queryKey: ['prayer-logs', today],
    queryFn: () => SDK.entities.PrayerLog.filter({ date: today }),
    initialData: []
  });

  const logPrayerMutation = useMutation({
    mutationFn: (data) => SDK.entities.PrayerLog.create(data),
    onMutate: async (newLog) => {
      await queryClient.cancelQueries({ queryKey: ['prayer-logs', today] });
      const previousLogs = queryClient.getQueryData(['prayer-logs', today]);
      
      queryClient.setQueryData(['prayer-logs', today], (old = []) => [
        ...old,
        { ...newLog, id: 'temp-' + Date.now(), created_date: new Date().toISOString() }
      ]);
      
      return { previousLogs };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(['prayer-logs', today], context.previousLogs);
      toast.error('Failed to log prayer');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-logs'] });
      toast.success('Prayer logged! 🤲');
      setSelectedPrayer(null);
      resetForm();
    }
  });

  const resetForm = () => {
    setLogStatus('performed');
    setPrayerType('fard');
    setLocation('home');
    setInCongregation(false);
    setPrayedOnTime(true);
    setIsMakeupPrayer(false);
    setMakeupForDate('');
    setMissedReason('');
    setNotes('');
  };

  const handleLogPrayer = () => {
    if (!selectedPrayer) return;
    if (logStatus === 'missed' && !missedReason) {
      toast.error('Please select a reason for missing the prayer');
      return;
    }

    logPrayerMutation.mutate({
      date: today,
      prayer_name: selectedPrayer.name,
      prayer_type: prayerType,
      prayer_time: '--:--',
      status: logStatus,
      performed_at: logStatus === 'performed' ? format(new Date(), 'HH:mm') : null,
      location: logStatus === 'performed' ? location : null,
      in_congregation: logStatus === 'performed' ? inCongregation : false,
      prayed_on_time: logStatus === 'performed' ? prayedOnTime : false,
      is_makeup_prayer: isMakeupPrayer,
      makeup_for_date: isMakeupPrayer ? makeupForDate : null,
      missed_reason: logStatus === 'missed' ? missedReason : null,
      notes: notes || null
    });
  };

  const getPrayerStatus = (prayerName) => {
    const log = todayLogs.find(l => l.prayer_name === prayerName);
    return log?.status || null;
  };

  if (compact) {
    const performedCount = todayLogs.filter(l => l.status === 'performed').length;
    
    return (
      <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-semibold text-teal-900">
                {performedCount}/5 Prayers
              </span>
            </div>
            <div className="flex gap-1">
              {PRAYERS.map(prayer => {
                const status = getPrayerStatus(prayer.name);
                return (
                  <div
                    key={prayer.name}
                    className={`w-2 h-2 rounded-full ${
                      status === 'performed' ? 'bg-emerald-500' :
                      status === 'missed' ? 'bg-red-500' :
                      'bg-slate-300'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-teal-600" />
            Prayer Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {PRAYERS.map((prayer, index) => {
            const Icon = prayer.icon;
            const status = getPrayerStatus(prayer.name);
            const log = todayLogs.find(l => l.prayer_name === prayer.name);

            return (
              <motion.div
                key={prayer.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-xl border-2 transition-all ${
                  status === 'performed' ? 'bg-emerald-50 border-emerald-300' :
                  status === 'missed' ? 'bg-red-50 border-red-300' :
                  'bg-white/60 border-slate-200 hover:border-teal-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${
                      status === 'performed' ? 'text-emerald-600' :
                      status === 'missed' ? 'text-red-600' :
                      'text-slate-400'
                    }`} />
                    <div>
                      <p className="font-semibold text-slate-800">{prayer.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {status === 'performed' && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs text-emerald-700">
                          {log?.in_congregation && <Users className="w-3 h-3" />}
                          {log?.location && <MapPin className="w-3 h-3" />}
                          <CheckCircle className="w-4 h-4" />
                        </div>
                        <PrayerReflectionJournal
                          prayerLog={log}
                          prayerName={prayer.name}
                          date={today}
                        />
                      </div>
                    )}
                    {status === 'missed' && (
                      <div className="flex items-center gap-1 text-xs text-red-700">
                        <AlertCircle className="w-4 h-4" />
                        <span>{log?.missed_reason}</span>
                      </div>
                    )}
                    {!status && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedPrayer(prayer)}
                        className="bg-teal-600 hover:bg-teal-700 h-8"
                      >
                        Log
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
          {/* Daily reflection entry */}
          <div className="pt-2 border-t border-slate-100">
            <PrayerReflectionJournal
              prayerName="Daily"
              date={today}
              trigger={
                <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 text-sm font-medium transition-all">
                  <BookOpen className="w-4 h-4" />
                  Daily Reflection Journal
                </button>
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Log Prayer Dialog */}
      <Dialog open={!!selectedPrayer} onOpenChange={() => setSelectedPrayer(null)}>
        <DialogContent className="z-[200] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPrayer && React.createElement(selectedPrayer.icon, { className: "w-5 h-5" })}
              Log {selectedPrayer?.name} Prayer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={logStatus} onValueChange={setLogStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[210]">
                  <SelectItem value="performed">✅ Performed</SelectItem>
                  <SelectItem value="missed">❌ Missed</SelectItem>
                  <SelectItem value="qada">🕐 Made up (Qada)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {logStatus === 'performed' && (
              <>
                <div>
                  <Label>Prayer Type</Label>
                  <Select value={prayerType} onValueChange={setPrayerType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[210]">
                      {PRAYER_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label} (+{type.points} pts)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Location</Label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[210]">
                      <SelectItem value="home">🏠 Home</SelectItem>
                      <SelectItem value="masjid">🕌 Masjid</SelectItem>
                      <SelectItem value="work">💼 Work</SelectItem>
                      <SelectItem value="travel">✈️ Travel</SelectItem>
                      <SelectItem value="other">📍 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ontime"
                    checked={prayedOnTime}
                    onChange={(e) => setPrayedOnTime(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="ontime">Prayed on time (+5 pts)</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="congregation"
                    checked={inCongregation}
                    onChange={(e) => setInCongregation(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="congregation">In congregation (Jama'ah) (+10 pts)</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="makeup"
                    checked={isMakeupPrayer}
                    onChange={(e) => setIsMakeupPrayer(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="makeup">This is a makeup prayer (Qada)</Label>
                </div>
                
                {isMakeupPrayer && (
                  <div>
                    <Label>Original Date of Missed Prayer</Label>
                    <Input
                      type="date"
                      value={makeupForDate}
                      onChange={(e) => setMakeupForDate(e.target.value)}
                      max={today}
                      className="mt-1"
                    />
                  </div>
                )}
              </>
            )}

            {logStatus === 'missed' && (
              <div>
                <Label>Reason</Label>
                <Select value={missedReason} onValueChange={setMissedReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent className="z-[210]">
                     <SelectItem value="overslept">😴 Overslept</SelectItem>
                    <SelectItem value="work">💼 Work</SelectItem>
                    <SelectItem value="travel">✈️ Travel</SelectItem>
                    <SelectItem value="forgot">🤔 Forgot</SelectItem>
                    <SelectItem value="ill">🤒 Ill</SelectItem>
                    <SelectItem value="other">📝 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes..."
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleLogPrayer}
                disabled={logPrayerMutation.isPending}
                className="flex-1 bg-teal-600 hover:bg-teal-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {logPrayerMutation.isPending ? 'Logging...' : 'Log Prayer'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedPrayer(null)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
            
            {logStatus === 'performed' && (
              <p className="text-xs text-center text-slate-500 mt-2">
                Earn bonus points: On time (+5), Congregation (+10)
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}