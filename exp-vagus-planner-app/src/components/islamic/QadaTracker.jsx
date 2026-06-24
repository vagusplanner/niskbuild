import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Calendar, CheckCircle, Plus, Clock, ExternalLink } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const MISSED_REASONS = [
  { value: 'overslept',  label: '😴 Overslept' },
  { value: 'work',       label: '💼 Work' },
  { value: 'travel',     label: '✈️ Travel' },
  { value: 'forgot',     label: '🤔 Forgot' },
  { value: 'ill',        label: '🤒 Illness' },
  { value: 'other',      label: '📝 Other' },
];

export default function QadaTracker() {
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedQada, setSelectedQada] = useState(null);

  // Log missed prayer form
  const [missedPrayer, setMissedPrayer] = useState('Fajr');
  const [missedDate, setMissedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [missedReason, setMissedReason] = useState('');
  const [missedNotes, setMissedNotes] = useState('');

  // Schedule makeup form
  const [scheduleDate, setScheduleDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [scheduleTime, setScheduleTime] = useState('06:00');

  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Load all unresolved missed prayers (status = 'missed', no makeup)
  const { data: missedLogs = [] } = useQuery({
    queryKey: ['qada-missed'],
    queryFn: async () => {
      const logs = await SDK.entities.PrayerLog.filter({ status: 'missed' });
      // Only show ones not yet made up
      const madeUp = await SDK.entities.PrayerLog.filter({ is_makeup_prayer: true });
      const madeUpKeys = new Set(madeUp.map(l => `${l.makeup_for_date}_${l.prayer_name}`));
      return logs.filter(l => !madeUpKeys.has(`${l.date}_${l.prayer_name}`));
    },
  });

  const logMissedMutation = useMutation({
    mutationFn: (data) => SDK.entities.PrayerLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qada-missed'] });
      queryClient.invalidateQueries({ queryKey: ['prayer-logs'] });
      toast.success('Missed prayer logged');
      setShowLogDialog(false);
      setMissedReason('');
      setMissedNotes('');
    },
    onError: () => toast.error('Failed to log missed prayer'),
  });

  const markMadeUpMutation = useMutation({
    mutationFn: async ({ qada, scheduleDate, scheduleTime }) => {
      // Create a Qada (makeup) prayer log entry
      await SDK.entities.PrayerLog.create({
        date: scheduleDate,
        prayer_name: qada.prayer_name,
        prayer_type: 'fard',
        prayer_time: scheduleTime,
        status: 'performed',
        performed_at: scheduleTime,
        is_makeup_prayer: true,
        makeup_for_date: qada.date,
        notes: `Qada for ${qada.prayer_name} missed on ${qada.date}`,
      });
      // Also create a calendar event as a reminder
      const startDt = new Date(`${scheduleDate}T${scheduleTime}:00`);
      const endDt = new Date(startDt.getTime() + 15 * 60000);
      await SDK.entities.Event.create({
        title: `🕐 Qada: ${qada.prayer_name}`,
        description: `Makeup prayer for ${qada.prayer_name} missed on ${qada.date}`,
        start_date: startDt.toISOString(),
        end_date: endDt.toISOString(),
        category: 'prayer',
        is_all_day: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qada-missed'] });
      queryClient.invalidateQueries({ queryKey: ['prayer-logs'] });
      toast.success('Makeup prayer scheduled & logged! 📅');
      setShowScheduleDialog(false);
      setSelectedQada(null);
    },
    onError: () => toast.error('Failed to schedule makeup prayer'),
  });

  const handleLogMissed = () => {
    if (!missedReason) { toast.error('Please select a reason'); return; }
    logMissedMutation.mutate({
      date: missedDate,
      prayer_name: missedPrayer,
      prayer_type: 'fard',
      prayer_time: '--:--',
      status: 'missed',
      missed_reason: missedReason,
      notes: missedNotes || null,
    });
  };

  const openSchedule = (qada) => {
    setSelectedQada(qada);
    setScheduleDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    setScheduleTime('06:00');
    setShowScheduleDialog(true);
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Missed Prayers (Qada)
            </div>
            <div className="flex items-center gap-2">
              {missedLogs.length > 0 && (
                <Badge className="bg-red-500 text-white text-xs">{missedLogs.length} outstanding</Badge>
              )}
              <Link to={createPageUrl('Calendar')}>
                <Button size="sm" variant="outline" className="h-8 text-xs border-teal-300 text-teal-700 hover:bg-teal-50">
                  <Calendar className="w-3 h-3 mr-1" /> Calendar
                </Button>
              </Link>
              <Button size="sm" onClick={() => setShowLogDialog(true)} className="bg-red-600 hover:bg-red-700 h-8">
                <Plus className="w-3 h-3 mr-1" /> Log Missed
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {missedLogs.length === 0 ? (
            <p className="text-sm text-red-700/70 text-center py-2">No outstanding missed prayers 🎉</p>
          ) : (
            <div className="space-y-2">
              {missedLogs.slice(0, 10).map(log => (
                <div key={log.id} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border border-red-100">
                  <div>
                    <span className="font-medium text-slate-800 text-sm">{log.prayer_name}</span>
                    <span className="text-xs text-slate-500 ml-2">{log.date}</span>
                    {log.missed_reason && (
                      <span className="text-xs text-red-600 ml-2">· {log.missed_reason}</span>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openSchedule(log)}
                    className="h-7 text-xs border-teal-300 text-teal-700 hover:bg-teal-50">
                    <Clock className="w-3 h-3 mr-1" /> Make Up
                  </Button>
                </div>
              ))}
              {missedLogs.length > 10 && (
                <p className="text-xs text-center text-slate-500">+{missedLogs.length - 10} more</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Missed Prayer Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="z-[200] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Log Missed Prayer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Prayer</Label>
              <Select value={missedPrayer} onValueChange={setMissedPrayer}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[210]">
                  {PRAYERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date Missed</Label>
              <Input type="date" value={missedDate} onChange={e => setMissedDate(e.target.value)} max={today} />
            </div>
            <div>
              <Label>Reason</Label>
              <Select value={missedReason} onValueChange={setMissedReason}>
                <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
                <SelectContent className="z-[210]">
                  {MISSED_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={missedNotes} onChange={e => setMissedNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleLogMissed} disabled={logMissedMutation.isPending} className="flex-1 bg-red-600 hover:bg-red-700">
                {logMissedMutation.isPending ? 'Logging...' : 'Log Missed Prayer'}
              </Button>
              <Button variant="outline" onClick={() => setShowLogDialog(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Makeup Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="z-[200] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              Schedule Makeup Prayer (Qada)
            </DialogTitle>
          </DialogHeader>
          {selectedQada && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
                Making up <strong>{selectedQada.prayer_name}</strong> missed on <strong>{selectedQada.date}</strong>
              </div>
              <div>
                <Label>Date to Pray Qada</Label>
                <Input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} min={today} />
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
              </div>
              <p className="text-xs text-slate-500">
                This will log the makeup prayer and add it to your <strong>Calendar</strong> as a scheduled event so you can see and manage it there.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => markMadeUpMutation.mutate({ qada: selectedQada, scheduleDate, scheduleTime })}
                  disabled={markMadeUpMutation.isPending}
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {markMadeUpMutation.isPending ? 'Scheduling...' : 'Add to Calendar'}
                </Button>
                <Button variant="outline" onClick={() => setShowScheduleDialog(false)} className="flex-1">Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}