/**
 * Travel Packing Assistant
 * Connects to existing Holiday & TravelContext itineraries.
 * AI suggests packing list based on destination climate + trip length.
 * Users can check off items as they pack. Lists are persisted.
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Plane, Sparkles, CheckCircle2, Loader2,
  Cloud, Thermometer, Droplets, ChevronDown, ChevronUp,
  Trash2, RefreshCw, RotateCcw, Tag, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, differenceInDays, parseISO } from 'date-fns';

const PRIORITY_STYLES = {
  essential: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  important: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  optional: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

function TripCard({ trip, selected, onClick }) {
  const days = (trip.start_date && trip.end_date)
    ? differenceInDays(parseISO(trip.end_date), parseISO(trip.start_date)) + 1
    : (trip.arrival_date && trip.departure_date)
    ? differenceInDays(parseISO(trip.departure_date), parseISO(trip.arrival_date)) + 1
    : '?';
  const dest = trip.destination || trip.title || 'Trip';
  const date = trip.start_date || trip.arrival_date || '';

  return (
    <button onClick={onClick}
      className={cn('w-full text-left p-4 rounded-2xl border-2 transition-all',
        selected
          ? 'border-[#1D6FB8] bg-blue-50 dark:bg-blue-950/20 shadow-sm'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-blue-300')}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
            selected ? 'bg-[#1D6FB8]' : 'bg-slate-100 dark:bg-slate-700')}>
            <Plane className={cn('w-4 h-4', selected ? 'text-white' : 'text-slate-500 dark:text-slate-300')} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{dest}</p>
            <p className="text-xs text-slate-400">{date ? format(parseISO(date), 'MMM d, yyyy') : 'No date'} · {days} days</p>
          </div>
        </div>
        {selected && <CheckCircle2 className="w-5 h-5 text-[#1D6FB8] flex-shrink-0" />}
      </div>
    </button>
  );
}

function WeatherBadge({ weather }) {
  if (!weather) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-semibold">
      <Cloud className="w-4 h-4" />
      <span>{weather.condition}</span>
      <span className="flex items-center gap-1"><Thermometer className="w-3.5 h-3.5" />{Math.round(weather.avg_temp)}°C</span>
      <span className="flex items-center gap-1"><Droplets className="w-3.5 h-3.5" />{weather.rain_chance}% rain</span>
    </div>
  );
}

function CategorySection({ cat, catIdx, onToggle }) {
  const [open, setOpen] = useState(true);
  const packed = cat.items.filter(i => i.packed).length;
  const total = cat.items.length;
  const allDone = packed === total;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
        <div className="flex items-center gap-3">
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black',
            allDone ? 'bg-emerald-500' : PRIORITY_STYLES[cat.priority]?.includes('rose') ? 'bg-rose-500' : 'bg-[#1D6FB8]')}>
            {allDone ? '✓' : catIdx + 1}
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{cat.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={cn('text-[10px] border-0 px-1.5 py-0', PRIORITY_STYLES[cat.priority])}>{cat.priority}</Badge>
              <span className="text-[10px] text-slate-400">{packed}/{total} packed</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mini progress */}
          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', allDone ? 'bg-emerald-500' : 'bg-[#1D6FB8]')}
              style={{ width: `${total ? (packed / total) * 100 : 0}%` }} />
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden">
            <div className="px-4 pb-3 space-y-1.5 border-t border-slate-100 dark:border-slate-700 pt-2">
              {cat.items.map((item, itemIdx) => (
                <div key={itemIdx}
                  onClick={() => onToggle(catIdx, itemIdx)}
                  className={cn('flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-colors',
                    item.packed
                      ? 'bg-emerald-50 dark:bg-emerald-950/10'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/30')}>
                  <Checkbox checked={!!item.packed} onCheckedChange={() => onToggle(catIdx, itemIdx)}
                    className="mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-sm font-medium', item.packed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100')}>
                        {item.item}
                      </span>
                      {item.essential && !item.packed && (
                        <Badge className="bg-rose-100 text-rose-600 border-0 text-[9px] px-1.5 py-0">Essential</Badge>
                      )}
                      {item.quantity && (
                        <span className="text-[10px] text-slate-400">× {item.quantity}</span>
                      )}
                    </div>
                    {item.reason && !item.packed && (
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{item.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TravelPackingAssistantPage() {
  const queryClient = useQueryClient();
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [activeListId, setActiveListId] = useState(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays', user?.email],
    queryFn: () => user?.email
      ? base44.entities.Holiday.filter({ created_by: user.email }, '-start_date', 50)
      : [],
    enabled: !!user?.email,
  });

  const { data: travelContexts = [] } = useQuery({
    queryKey: ['travelContexts', user?.email],
    queryFn: () => user?.email
      ? base44.entities.TravelContext.filter({ created_by: user.email }, '-created_date', 30)
      : [],
    enabled: !!user?.email,
  });

  const { data: packingLists = [] } = useQuery({
    queryKey: ['packingLists', user?.email],
    queryFn: () => base44.entities.PackingList.filter({ created_by: user.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  // Merge holiday + travelContext into single trip list
  const allTrips = useMemo(() => [
    ...holidays.map(h => ({ ...h, _type: 'holiday' })),
    ...travelContexts.map(t => ({ ...t, _type: 'travel', title: t.trip_title || t.destination })),
  ], [holidays, travelContexts]);

  // Active packing list for selected trip
  const activeList = useMemo(() => {
    if (!selectedTrip) return null;
    return packingLists.find(l => l.trip_id === selectedTrip.id) || null;
  }, [selectedTrip, packingLists]);

  const updateListMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PackingList.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['packingLists'] }),
  });

  const deleteListMutation = useMutation({
    mutationFn: (id) => base44.entities.PackingList.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['packingLists'] }),
  });

  const handleToggleItem = async (catIdx, itemIdx) => {
    if (!activeList) return;
    const newCategories = activeList.categories.map((cat, ci) => ({
      ...cat,
      items: cat.items.map((item, ii) => {
        if (ci === catIdx && ii === itemIdx) return { ...item, packed: !item.packed };
        return item;
      }),
    }));
    const packed = newCategories.reduce((s, c) => s + c.items.filter(i => i.packed).length, 0);
    const total = newCategories.reduce((s, c) => s + c.items.length, 0);
    updateListMutation.mutate({ id: activeList.id, data: { categories: newCategories, packed_items: packed, total_items: total } });
  };

  const generateList = async () => {
    if (!selectedTrip) return;
    setGenerating(true);
    try {
      const dest = selectedTrip.destination || selectedTrip.title || 'the destination';
      const days = (selectedTrip.start_date && selectedTrip.end_date)
        ? differenceInDays(parseISO(selectedTrip.end_date), parseISO(selectedTrip.start_date)) + 1
        : (selectedTrip.arrival_date && selectedTrip.departure_date)
        ? differenceInDays(parseISO(selectedTrip.departure_date), parseISO(selectedTrip.arrival_date)) + 1
        : 7;
      const deptDate = selectedTrip.start_date || selectedTrip.arrival_date || new Date().toISOString().split('T')[0];

      // Step 1: Get weather
      const weather = await base44.integrations.Core.InvokeLLM({
        prompt: `Provide realistic weather forecast for ${dest} around ${deptDate} for a ${days}-day trip. Return JSON.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            avg_temp: { type: 'number' },
            max_temp: { type: 'number' },
            min_temp: { type: 'number' },
            rain_chance: { type: 'number' },
            condition: { type: 'string' },
            humidity: { type: 'number' },
            wind_speed: { type: 'string' },
            climate_notes: { type: 'string' }
          }
        }
      });

      // Step 2: Generate packing list
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a comprehensive travel packing list for:
- Destination: ${dest}
- Duration: ${days} days
- Departure: ${deptDate}
- Weather: avg ${weather.avg_temp}°C, ${weather.condition}, ${weather.rain_chance}% rain chance, humidity ${weather.humidity}%
- Climate notes: ${weather.climate_notes || ''}

Generate practical packing categories. Each item must have a reason tailored to this destination and weather.
Include: Clothing, Toiletries, Electronics, Documents & Money, Health & Medicine, Comfort & Entertainment, Destination-specific items.`,
        response_json_schema: {
          type: 'object',
          properties: {
            categories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  priority: { type: 'string', enum: ['essential', 'important', 'optional'] },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        item: { type: 'string' },
                        quantity: { type: 'string' },
                        reason: { type: 'string' },
                        essential: { type: 'boolean' },
                        packed: { type: 'boolean' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      const categories = (result.categories || []).map(cat => ({
        ...cat,
        items: (cat.items || []).map(item => ({ ...item, packed: false }))
      }));
      const total = categories.reduce((s, c) => s + c.items.length, 0);

      const payload = {
        trip_id: selectedTrip.id,
        trip_title: selectedTrip.title || dest,
        destination: dest,
        trip_length_days: days,
        departure_date: deptDate,
        categories,
        weather_summary: { avg_temp: weather.avg_temp, condition: weather.condition, rain_chance: weather.rain_chance },
        total_items: total,
        packed_items: 0,
      };

      if (activeList) {
        await base44.entities.PackingList.update(activeList.id, payload);
      } else {
        await base44.entities.PackingList.create(payload);
      }
      await queryClient.invalidateQueries({ queryKey: ['packingLists'] });
      toast.success('Packing list generated!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate packing list');
    } finally {
      setGenerating(false);
    }
  };

  const totalPacked = activeList?.packed_items ?? 0;
  const totalItems = activeList?.total_items ?? 0;
  const packingProgress = totalItems > 0 ? Math.round((totalPacked / totalItems) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-5 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1D6FB8 0%, #0D4F6C 50%, #0A3333 100%)' }}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-5 h-5 text-sky-300" />
            <span className="text-xs font-bold text-sky-300 uppercase tracking-widest">Travel</span>
          </div>
          <h1 className="text-2xl font-black text-white">Packing Assistant</h1>
          <p className="text-sm text-sky-200 mt-0.5">AI-powered lists based on destination climate &amp; trip length</p>
        </div>
      </motion.div>

      {/* Trip Selector */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide px-1">Select a Trip</p>
        {allTrips.length === 0 ? (
          <div className="text-center py-10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <Plane className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No trips found. Add a trip in the Travel Hub first.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {allTrips.map(trip => (
              <TripCard key={trip.id} trip={trip} selected={selectedTrip?.id === trip.id}
                onClick={() => setSelectedTrip(trip)} />
            ))}
          </div>
        )}
      </div>

      {/* Generate / Active List */}
      <AnimatePresence mode="wait">
        {selectedTrip && (
          <motion.div key={selectedTrip.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-5">

            {/* Action bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button onClick={generateList} disabled={generating}
                className="flex-1 sm:flex-none bg-[#1D6FB8] hover:bg-[#2980B9] text-white gap-2">
                {generating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing climate…</>
                  : activeList
                  ? <><RefreshCw className="w-4 h-4" /> Regenerate List</>
                  : <><Sparkles className="w-4 h-4" /> Generate Packing List</>}
              </Button>
              {activeList && (
                <Button variant="outline" size="sm" onClick={() => deleteListMutation.mutate(activeList.id)}
                  className="text-red-500 border-red-200 hover:bg-red-50 gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </Button>
              )}
            </div>

            {/* Active list */}
            {activeList && (
              <div className="space-y-4">
                {/* Weather + Progress */}
                <div className="space-y-3">
                  <WeatherBadge weather={activeList.weather_summary} />
                  <div className="rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Packing Progress</span>
                      <span className="text-sm font-black text-[#1D6FB8]">{totalPacked}/{totalItems} items</span>
                    </div>
                    <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full bg-gradient-to-r from-[#1D6FB8] to-[#29ABE2]"
                        animate={{ width: `${packingProgress}%` }} transition={{ duration: 0.4 }} />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[10px] text-slate-400">{packingProgress}% packed</span>
                      {packingProgress === 100 && (
                        <span className="text-[10px] font-bold text-emerald-600">✓ All packed! Ready to go 🎒</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-3">
                  {(activeList.categories || []).map((cat, catIdx) => (
                    <CategorySection key={catIdx} cat={cat} catIdx={catIdx} onToggle={handleToggleItem} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}