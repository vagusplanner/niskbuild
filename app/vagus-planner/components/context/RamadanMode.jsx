import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Moon, Sun, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function RamadanMode() {
  const [ramadanEnabled, setRamadanEnabled] = useState(false);
  const [suhoorTime, setSuhoorTime] = useState('05:30');
  const [iftarTime, setIftarTime] = useState('18:45');
  const [taraweehTime, setTaraweehTime] = useState('21:00');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list()
  });

  useEffect(() => {
    if (settings?.length > 0 && settings[0].ramadan_mode_enabled) {
      setRamadanEnabled(settings[0].ramadan_mode_enabled);
      setSuhoorTime(settings[0].suhoor_time || '05:30');
      setIftarTime(settings[0].iftar_time || '18:45');
      setTaraweehTime(settings[0].taraweeh_time || '21:00');
    }
  }, [settings]);

  const handleToggleRamadan = async (enabled) => {
    setSaving(true);
    try {
      if (settings?.length > 0) {
        await base44.entities.UserSettings.update(settings[0].id, {
          ramadan_mode_enabled: enabled,
          suhoor_time: suhoorTime,
          iftar_time: iftarTime,
          taraweeh_time: taraweehTime
        });
      }
      setRamadanEnabled(enabled);
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      toast.success(enabled ? 'Ramadan Mode activated' : 'Ramadan Mode deactivated');
    } catch (err) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const ramadanEvents = events.filter(e => 
    ['personal', 'prayer', 'holiday'].includes(e.category) &&
    e.title?.toLowerCase().includes('ramadan')
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="bg-gradient-to-br from-purple-50 dark:from-purple-950 to-indigo-50 dark:to-indigo-950 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Ramadan Mode
          </CardTitle>
          <CardDescription>Auto-adjust schedule for Ramadan fasting and worship</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-purple-200 dark:border-purple-700">
            <Label htmlFor="ramadan-toggle" className="font-medium cursor-pointer">Enable Ramadan Mode</Label>
            <Switch
              id="ramadan-toggle"
              checked={ramadanEnabled}
              onCheckedChange={handleToggleRamadan}
              disabled={saving}
            />
          </div>

          {ramadanEnabled && (
            <>
              {/* Time Settings */}
              <div className="space-y-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-purple-200 dark:border-purple-700">
                <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100">Key Times</h4>

                <div>
                  <Label htmlFor="suhoor" className="text-xs flex items-center gap-1">
                    <Sun className="w-3 h-3" /> Suhoor Time
                  </Label>
                  <input
                    id="suhoor"
                    type="time"
                    value={suhoorTime}
                    onChange={(e) => setSuhoorTime(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-sm"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Pre-dawn meal</p>
                </div>

                <div>
                  <Label htmlFor="iftar" className="text-xs flex items-center gap-1">
                    <Moon className="w-3 h-3" /> Iftar Time
                  </Label>
                  <input
                    id="iftar"
                    type="time"
                    value={iftarTime}
                    onChange={(e) => setIftarTime(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-sm"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Breaking the fast</p>
                </div>

                <div>
                  <Label htmlFor="taraweeh" className="text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Taraweeh Time
                  </Label>
                  <input
                    id="taraweeh"
                    type="time"
                    value={taraweehTime}
                    onChange={(e) => setTaraweehTime(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-sm"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Nightly prayer</p>
                </div>
              </div>

              {/* Features Enabled */}
              <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-700">
                <p className="text-xs font-medium text-purple-900 dark:text-purple-100 mb-2">Features Enabled</p>
                <ul className="text-xs space-y-1 text-purple-800 dark:text-purple-200">
                  <li>✓ Auto-block energy for fasting periods</li>
                  <li>✓ Schedule low-intensity work during fasting</li>
                  <li>✓ Protect Taraweeh prayer time</li>
                  <li>✓ Energy boost reminders at Iftar</li>
                  <li>✓ Suhoor preparation alerts</li>
                </ul>
              </div>

              {/* Active Ramadan Events */}
              {ramadanEvents.length > 0 && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950 rounded-lg border border-indigo-200 dark:border-indigo-700">
                  <p className="text-xs font-medium text-indigo-900 dark:text-indigo-100 mb-2">
                    Ramadan Events ({ramadanEvents.length})
                  </p>
                  <div className="space-y-1">
                    {ramadanEvents.slice(0, 3).map((e, idx) => (
                      <p key={idx} className="text-xs text-indigo-700 dark:text-indigo-300">
                        • {e.title}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}