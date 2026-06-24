import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Plus, Star } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const SUNNAH_NAFL_PRAYERS = [
  { value: 'tahajjud',        label: 'Tahajjud (Night Prayer)',         type: 'nafl',             points: 30, rakaat: '2-8' },
  { value: 'duha',            label: 'Duha (Forenoon)',                 type: 'nafl',             points: 20, rakaat: '2-12' },
  { value: 'rawatib_fajr',    label: 'Rawatib Fajr (2 before Fajr)',   type: 'sunnah_muakkadah', points: 15, rakaat: '2' },
  { value: 'rawatib_dhuhr_before', label: 'Rawatib Dhuhr (4 before)', type: 'sunnah_muakkadah', points: 12, rakaat: '4' },
  { value: 'rawatib_dhuhr_after',  label: 'Rawatib Dhuhr (2 after)',  type: 'sunnah_muakkadah', points: 10, rakaat: '2' },
  { value: 'rawatib_maghrib', label: 'Rawatib Maghrib (2 after)',       type: 'sunnah_muakkadah', points: 12, rakaat: '2' },
  { value: 'rawatib_isha',    label: 'Rawatib Isha (2 after)',          type: 'sunnah_muakkadah', points: 10, rakaat: '2' },
  { value: 'witr',            label: 'Witr',                            type: 'witr',             points: 15, rakaat: '1-11' },
  { value: 'tarawih',         label: 'Tarawih',                         type: 'nafl',             points: 25, rakaat: '8-20' },
  { value: 'ishraq',          label: 'Ishraq (Post-sunrise)',           type: 'nafl',             points: 15, rakaat: '2-4' },
  { value: 'awwabin',         label: "Awwabin (After Maghrib)",          type: 'nafl',             points: 15, rakaat: '6' },
  { value: 'tahiyyat_wudu',   label: 'Tahiyyat al-Wudu',               type: 'nafl',             points: 8,  rakaat: '2' },
  { value: 'tahiyyat_masjid', label: 'Tahiyyat al-Masjid',             type: 'nafl',             points: 8,  rakaat: '2' },
  { value: 'other_nafl',      label: 'Other Nafl Prayer',              type: 'nafl',             points: 5,  rakaat: '2+' },
];

const TYPE_COLORS = {
  sunnah_muakkadah: 'bg-amber-100 text-amber-800 border-amber-200',
  witr:             'bg-purple-100 text-purple-800 border-purple-200',
  nafl:             'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const TYPE_LABELS = {
  sunnah_muakkadah: 'Sunnah Muakkadah',
  witr:             'Witr',
  nafl:             'Nafl',
};

export default function SunnahNaflLogger() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPrayer, setSelectedPrayer] = useState('');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: todayLogs = [] } = useQuery({
    queryKey: ['sunnah-logs', today],
    queryFn: () => SDK.entities.PrayerLog.filter({ date: today }),
  });

  const loggedKeys = new Set(
    todayLogs.filter(l => l.prayer_type !== 'fard').map(l => l.prayer_name)
  );

  const mutation = useMutation({
    mutationFn: (data) => SDK.entities.PrayerLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sunnah-logs', today] });
      queryClient.invalidateQueries({ queryKey: ['prayer-logs'] });
      toast.success('Prayer logged! 🤲');
      setShowDialog(false);
      setSelectedPrayer('');
      setNotes('');
    },
    onError: () => toast.error('Failed to log prayer'),
  });

  const handleLog = () => {
    if (!selectedPrayer) return;
    const prayer = SUNNAH_NAFL_PRAYERS.find(p => p.value === selectedPrayer);
    mutation.mutate({
      date: today,
      prayer_name: prayer.value,
      prayer_type: prayer.type,
      prayer_time: format(new Date(), 'HH:mm'),
      status: 'performed',
      performed_at: format(new Date(), 'HH:mm'),
      notes: notes || null,
    });
  };

  const sunnahToday = todayLogs.filter(l => l.prayer_type !== 'fard');
  const pointsToday = sunnahToday.reduce((sum, l) => {
    const p = SUNNAH_NAFL_PRAYERS.find(x => x.value === l.prayer_name);
    return sum + (p?.points || 5);
  }, 0);

  return (
    <>
      <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base">
              <Star className="w-5 h-5 text-amber-500" />
              Sunnah &amp; Nafl Prayers
            </div>
            <div className="flex items-center gap-2">
              {pointsToday > 0 && (
                <Badge className="bg-amber-500 text-white text-xs">+{pointsToday} pts today</Badge>
              )}
              <Button size="sm" onClick={() => setShowDialog(true)} className="bg-amber-600 hover:bg-amber-700 h-8">
                <Plus className="w-3 h-3 mr-1" /> Log
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {sunnahToday.length === 0 ? (
            <p className="text-sm text-amber-700/70 text-center py-2">No Sunnah/Nafl prayers logged today</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sunnahToday.map(log => {
                const p = SUNNAH_NAFL_PRAYERS.find(x => x.value === log.prayer_name);
                return (
                  <div key={log.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium ${TYPE_COLORS[log.prayer_type] || 'bg-slate-100 text-slate-700'}`}>
                    <CheckCircle className="w-3 h-3" />
                    {p?.label || log.prayer_name}
                    <span className="opacity-60">+{p?.points || 5}pts</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="z-[200] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Log Sunnah / Nafl Prayer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Prayer</Label>
              <Select value={selectedPrayer} onValueChange={setSelectedPrayer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select prayer..." />
                </SelectTrigger>
                <SelectContent className="z-[210]">
                  {['sunnah_muakkadah', 'witr', 'nafl'].map(type => (
                    <React.Fragment key={type}>
                      <div className="px-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">
                        {TYPE_LABELS[type]}
                      </div>
                      {SUNNAH_NAFL_PRAYERS.filter(p => p.type === type).map(p => (
                        <SelectItem key={p.value} value={p.value} disabled={loggedKeys.has(p.value)}>
                          {p.label} — {p.rakaat} raka'at (+{p.points} pts)
                          {loggedKeys.has(p.value) ? ' ✓' : ''}
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPrayer && (() => {
              const p = SUNNAH_NAFL_PRAYERS.find(x => x.value === selectedPrayer);
              return (
                <div className={`text-sm px-3 py-2 rounded-lg border ${TYPE_COLORS[p.type]}`}>
                  <strong>{p.label}</strong> · {p.rakaat} raka'at · <strong>+{p.points} points</strong>
                </div>
              );
            })()}

            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. time, quality of concentration..." rows={2} />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleLog} disabled={!selectedPrayer || mutation.isPending} className="flex-1 bg-amber-600 hover:bg-amber-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                {mutation.isPending ? 'Logging...' : 'Log Prayer'}
              </Button>
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}