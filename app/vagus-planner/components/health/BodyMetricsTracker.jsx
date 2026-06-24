/**
 * BodyMetricsTracker — BMI / Body Weight tracker + Water intake tracker
 * No new page. Embedded in Wellness > Health tab.
 * Uses Exercise entity for weight logs (adding weight_kg field) and a simple
 * localStorage water counter (no entity needed for daily transient data).
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Scale, Droplets, TrendingUp, TrendingDown, Minus,
  Plus, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { format } from 'date-fns';
import { toast } from 'sonner';

const WATER_KEY = `vagus_water_${format(new Date(), 'yyyy-MM-dd')}`;
function loadWater() { try { return parseInt(localStorage.getItem(WATER_KEY) || '0', 10); } catch { return 0; } }
function saveWater(v) { localStorage.setItem(WATER_KEY, String(v)); }

function getBMICategory(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' };
  if (bmi < 25)   return { label: 'Healthy',     color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
  if (bmi < 30)   return { label: 'Overweight',  color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
  return           { label: 'Obese',           color: 'text-red-600', bg: 'bg-red-50 border-red-200' };
}

export default function BodyMetricsTracker() {
  const queryClient = useQueryClient();
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [heightInput, setHeightInput] = useState(() => localStorage.getItem('vagus_height_cm') || '');
  const [unit, setUnit] = useState(() => localStorage.getItem('vagus_weight_unit') || 'kg');
  const [water, setWaterState] = useState(loadWater);
  const DAILY_GOAL = 8; // glasses

  // Weight logs stored in a simple dedicated entity field
  // We piggyback on the EnergyLog entity with a type field for simplicity
  const { data: weightLogs = [] } = useQuery({
    queryKey: ['weight-logs'],
    queryFn: () => base44.entities.EnergyLog.filter({ type: 'weight' }, '-date', 90),
    staleTime: 60000,
  });

  const addWeightMutation = useMutation({
    mutationFn: (kg) => base44.entities.EnergyLog.create({
      date: format(new Date(), 'yyyy-MM-dd'),
      type: 'weight',
      level: kg, // repurpose level for weight in kg
      notes: `Weight log: ${kg}${unit}`,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weight-logs'] });
      setWeightInput('');
      setShowWeightForm(false);
      toast.success('Weight logged!');
    }
  });

  const logWeight = () => {
    const raw = parseFloat(weightInput);
    if (!raw || raw <= 0) { toast.error('Enter a valid weight'); return; }
    const kg = unit === 'lbs' ? raw / 2.205 : raw;
    addWeightMutation.mutate(Math.round(kg * 10) / 10);
    if (heightInput) localStorage.setItem('vagus_height_cm', heightInput);
    localStorage.setItem('vagus_weight_unit', unit);
  };

  const chartData = useMemo(() =>
    [...weightLogs].reverse().map(l => ({
      date: format(new Date(l.date), 'MMM d'),
      weight: unit === 'lbs' ? Math.round(l.level * 2.205 * 10) / 10 : l.level,
    })), [weightLogs, unit]);

  const latest = weightLogs[0];
  const prev   = weightLogs[1];
  const latestKg = latest?.level || null;
  const heightCm = parseFloat(heightInput) || null;
  const heightM  = heightCm ? heightCm / 100 : null;
  const bmi = latestKg && heightM ? Math.round((latestKg / (heightM * heightM)) * 10) / 10 : null;
  const bmiCat = bmi ? getBMICategory(bmi) : null;

  const trend = latestKg && prev?.level
    ? latestKg - prev.level
    : null;

  const addWater = () => {
    const next = Math.min(DAILY_GOAL + 4, water + 1);
    setWaterState(next);
    saveWater(next);
  };
  const removeWater = () => {
    const next = Math.max(0, water - 1);
    setWaterState(next);
    saveWater(next);
  };

  return (
    <div className="space-y-4">
      {/* ── Weight & BMI ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Weight & BMI</span>
              {bmi && <Badge className={`${bmiCat.bg} ${bmiCat.color} border text-[10px]`}>{bmiCat.label}</Badge>}
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowWeightForm(p => !p)} className="h-7 text-xs">
              {showWeightForm ? <ChevronUp className="w-3 h-3" /> : <Plus className="w-3 h-3 mr-1" />}
              {showWeightForm ? '' : 'Log Weight'}
            </Button>
          </div>

          {/* Stats row */}
          {latestKg && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-indigo-500 font-semibold">Current</p>
                <p className="text-base font-black text-indigo-700 dark:text-indigo-300">
                  {unit === 'lbs' ? Math.round(latestKg * 2.205 * 10) / 10 : latestKg}
                  <span className="text-[10px] ml-0.5">{unit}</span>
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-slate-500 font-semibold">BMI</p>
                <p className={`text-base font-black ${bmiCat?.color || 'text-slate-700'}`}>{bmi ?? '—'}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-slate-500 font-semibold">Change</p>
                <p className={`text-base font-black flex items-center justify-center gap-0.5 ${trend > 0 ? 'text-red-500' : trend < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {trend !== null ? (trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />) : ''}
                  {trend !== null ? `${Math.abs(Math.round((unit === 'lbs' ? trend * 2.205 : trend) * 10) / 10)}${unit}` : '—'}
                </p>
              </div>
            </div>
          )}

          {/* Log form */}
          {showWeightForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 mb-4 p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900">
              <div className="flex gap-2">
                <Input type="number" placeholder={`Weight (${unit})`} value={weightInput}
                  onChange={e => setWeightInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && logWeight()}
                  className="flex-1 h-9" />
                <Input type="number" placeholder="Height (cm)" value={heightInput}
                  onChange={e => setHeightInput(e.target.value)} className="w-28 h-9" />
                <button
                  onClick={() => { const u = unit === 'kg' ? 'lbs' : 'kg'; setUnit(u); localStorage.setItem('vagus_weight_unit', u); }}
                  className="px-3 h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold text-indigo-600"
                >{unit}</button>
              </div>
              <Button onClick={logWeight} disabled={addWeightMutation.isPending} className="w-full h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                Save Weight Entry
              </Button>
            </motion.div>
          )}

          {/* Chart */}
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                <Tooltip formatter={(v) => `${v} ${unit}`} />
                <Area type="monotone" dataKey="weight" stroke="#6366f1" fill="#e0e7ff" strokeWidth={2} dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-xs text-slate-400 py-4">Log at least 2 weights to see your trend chart.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Water Intake ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Droplets className="w-4 h-4 text-cyan-500" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Water Intake</span>
            <span className="text-xs text-slate-400 ml-auto">Daily goal: {DAILY_GOAL} glasses</span>
          </div>

          {/* Glass grid */}
          <div className="flex flex-wrap gap-2 mb-4 justify-center">
            {Array.from({ length: DAILY_GOAL }, (_, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.1 }}
                onClick={i < water ? removeWater : addWater}
                className={`w-10 h-12 rounded-xl border-2 cursor-pointer flex items-end justify-center pb-1 transition-all ${
                  i < water
                    ? 'bg-cyan-400 border-cyan-500 shadow-sm shadow-cyan-200'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Droplets className={`w-4 h-4 ${i < water ? 'text-white' : 'text-slate-300'}`} />
              </motion.div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{water} <span className="text-sm font-semibold">/ {DAILY_GOAL}</span></p>
              <p className="text-xs text-slate-400">glasses today</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={removeWater} disabled={water === 0} className="h-9 w-9 p-0">
                <Minus className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={addWater} className="h-9 px-4 bg-cyan-500 hover:bg-cyan-600 text-white">
                <Plus className="w-4 h-4 mr-1" /> Add Glass
              </Button>
            </div>
          </div>

          {water >= DAILY_GOAL && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-emerald-600 font-semibold mt-2 text-center">
              🎉 Daily water goal achieved! Great for your health and focus.
            </motion.p>
          )}
          {water < DAILY_GOAL && (
            <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all"
                style={{ width: `${(water / DAILY_GOAL) * 100}%` }} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}