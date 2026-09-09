import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Sparkles, Loader2, MapPin, Calendar, CheckCircle2, Plus, Package, Lightbulb, List
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { addDays, format } from 'date-fns';
import { requireVpAiFunctions } from '@/lib/vp-registered-functions';

function unwrapFn(res) {
  return res?.data ?? res;
}

export default function AITripPlanner({ open, onClose }) {
  const available = requireVpAiFunctions('planTripWithAi');
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    destination: '',
    start_date: '',
    end_date: '',
    budget: '',
    style: 'balanced',
    travelers: 1,
    halal_mode: false,
  });
  const [loading, setLoading] = useState(false);
  const [packingLoading, setPackingLoading] = useState(false);
  const [result, setResult] = useState(null);

  const planTrip = async () => {
    if (!form.destination || !form.start_date || !form.end_date) {
      toast.error('Please fill in destination and travel dates');
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      toast.error('End date must be after start date');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const data = unwrapFn(await base44.functions.invoke('planTripWithAi', {
        destination: form.destination.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        travelers: Number(form.travelers) || 1,
        travel_style: form.style,
        halal_mode: form.halal_mode || form.style === 'hajj' || form.style === 'umrah',
        ...(form.budget ? { budget: parseInt(form.budget, 10) } : {}),
        create_holiday: true,
        create_calendar_events: true,
      }));
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      if (data?.holiday_id) {
        toast.success(
          data.created_events_count > 0
            ? `Trip saved & ${data.created_events_count} calendar days blocked`
            : 'Trip plan saved to My Trips'
        );
      } else {
        toast.success('Trip plan generated');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Failed to generate trip plan');
    } finally {
      setLoading(false);
    }
  };

  const refreshPackingOnly = async () => {
    if (!form.destination || !form.start_date || !form.end_date) {
      toast.error('Destination and dates required for packing list');
      return;
    }
    setPackingLoading(true);
    try {
      const data = unwrapFn(await base44.functions.invoke('planTripWithAi', {
        destination: form.destination.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        travelers: Number(form.travelers) || 1,
        travel_style: form.style,
        packing_only: true,
        halal_mode: form.halal_mode || form.style === 'hajj' || form.style === 'umrah',
      }));
      setResult((prev) => ({
        ...(prev || {}),
        packing_list: data?.packing_list ?? [],
        travel_tips: data?.travel_tips ?? prev?.travel_tips ?? [],
      }));
      toast.success('Packing list updated');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Failed to generate packing list');
    } finally {
      setPackingLoading(false);
    }
  };

  if (!available) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto safe-area-padding">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-6 h-6 text-teal-600" />
            AI Trip Planner
          </DialogTitle>
        </DialogHeader>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 py-2">
          <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/60">
            <div>
              <p className="text-sm font-semibold">Halal / prayer-aware mode</p>
              <p className="text-xs text-slate-500">Enables Art.9 religious AI routing when needed</p>
            </div>
            <Switch
              checked={form.halal_mode}
              onCheckedChange={(v) => setForm((f) => ({
                ...f,
                halal_mode: v,
                style: v && f.style === 'balanced' ? 'umrah' : f.style,
              }))}
            />
          </div>

          <div>
            <Label>Destination</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-600" />
              <Input
                className="pl-9"
                placeholder={form.halal_mode ? 'e.g. Makkah, Saudi Arabia' : 'e.g. Lisbon, Portugal'}
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="date"
                  className="pl-9"
                  value={form.start_date}
                  onChange={(e) => {
                    const start = e.target.value;
                    setForm((f) => ({
                      ...f,
                      start_date: start,
                      end_date:
                        !f.end_date && start
                          ? format(addDays(new Date(`${start}T12:00:00`), 6), 'yyyy-MM-dd')
                          : f.end_date,
                    }));
                  }}
                />
              </div>
            </div>
            <div>
              <Label>End date</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Budget USD (optional)</Label>
              <Input
                type="number"
                placeholder="3000"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
              />
            </div>
            <div>
              <Label>Travelers</Label>
              <Input
                type="number"
                min="1"
                value={form.travelers}
                onChange={(e) => setForm({ ...form, travelers: parseInt(e.target.value, 10) || 1 })}
              />
            </div>
          </div>

          <div>
            <Label>Travel style</Label>
            <Select value={form.style} onValueChange={(v) => setForm({ ...form, style: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="luxury">Luxury & Comfort</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="budget">Budget-Friendly</SelectItem>
                <SelectItem value="adventure">Adventure & Active</SelectItem>
                <SelectItem value="relaxation">Relaxation & Leisure</SelectItem>
                <SelectItem value="hajj">Hajj Pilgrimage</SelectItem>
                <SelectItem value="umrah">Umrah</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={planTrip}
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Planning trip…</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Generate & Save Trip</>
            )}
          </Button>

          {result && (
            <div className="space-y-4 pt-2 border-t">
              {result.holiday_id && (
                <div className="flex items-center gap-2 text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded-lg p-3">
                  <Plus className="w-4 h-4" />
                  Saved as holiday <code className="text-xs">{result.holiday_id}</code>
                  {result.created_events_count > 0 && (
                    <span>· {result.created_events_count} calendar events</span>
                  )}
                </div>
              )}

              {result.summary && (
                <Card className="p-3 bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-sm text-slate-700 dark:text-slate-200">{result.summary}</p>
                </Card>
              )}

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <List className="w-4 h-4" /> Day-by-day itinerary
                </h4>
                <div className="space-y-2">
                  {(result.itinerary || []).map((day) => (
                    <Card key={day.day} className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>Day {day.day}</Badge>
                        <span className="text-sm font-medium">{day.title}</span>
                        <span className="text-xs text-slate-500 ml-auto">{day.date}</span>
                      </div>
                      <ul className="space-y-1 ml-1">
                        {(day.activities || []).map((act, i) => (
                          <li key={i} className="text-sm text-slate-700 dark:text-slate-300">
                            <span className="text-xs font-semibold text-teal-700 mr-2">{act.time}</span>
                            {act.description}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h4 className="font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4" /> Packing list
                </h4>
                <Button variant="outline" size="sm" onClick={refreshPackingOnly} disabled={packingLoading}>
                  {packingLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh packing'}
                </Button>
              </div>
              <div className="space-y-2">
                {(result.packing_list || []).map((cat, i) => (
                  <Card key={i} className="p-3">
                    <p className="text-sm font-semibold mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      {cat.category}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {(cat.items || []).join(' · ')}
                    </p>
                  </Card>
                ))}
              </div>

              {(result.travel_tips || []).length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" /> Tips
                  </h4>
                  <ul className="space-y-1">
                    {result.travel_tips.map((tip, i) => (
                      <li key={i} className="text-sm text-slate-700 dark:text-slate-300">• {tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
