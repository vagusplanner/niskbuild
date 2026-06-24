import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Sparkles, ShoppingCart, ChevronDown, ChevronUp,
  Loader2, Utensils, Sun, Sunset, Moon, Coffee,
  CheckCircle2, RefreshCw, Calendar, Flame
} from 'lucide-react';
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import BudgetMealPlanner from '@/components/meal/BudgetMealPlanner';
import { Link } from 'react-router-dom';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_ICONS = { breakfast: Coffee, lunch: Sun, dinner: Moon, snack: Sunset };
const MEAL_COLORS = {
  breakfast: 'text-amber-600 bg-amber-50 border-amber-200',
  lunch:     'text-blue-600 bg-blue-50 border-blue-200',
  dinner:    'text-indigo-600 bg-indigo-50 border-indigo-200',
  snack:     'text-green-600 bg-green-50 border-green-200',
};

const DIETARY_OPTIONS = [
  { value: 'halal',       label: '🥩 Halal' },
  { value: 'vegetarian',  label: '🥦 Vegetarian' },
  { value: 'vegan',       label: '🌱 Vegan' },
  { value: 'gluten_free', label: '🌾 Gluten Free' },
  { value: 'dairy_free',  label: '🥛 Dairy Free' },
  { value: 'nut_free',    label: '🥜 Nut Free' },
];

// ── Preferences Panel ─────────────────────────────────────────────────────────
function PreferencesPanel({ prefs, calorieGoal, dietaryNotes, onChange }) {
  const toggle = (val) => {
    const next = prefs.includes(val) ? prefs.filter(p => p !== val) : [...prefs, val];
    onChange({ prefs: next });
  };
  return (
    <Card className="border-[#29ABE2]/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Utensils className="w-4 h-4 text-[#29ABE2]" /> Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 block">Daily Calorie Goal</label>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <Input
              type="number"
              min={800} max={4000} step={50}
              value={calorieGoal}
              onChange={e => onChange({ calorieGoal: Number(e.target.value) })}
              className="w-28 h-8 text-sm"
            />
            <span className="text-xs text-slate-500">kcal/day</span>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 block">Dietary Preferences</label>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => toggle(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                  prefs.includes(opt.value)
                    ? 'bg-[#1D6FB8] text-white border-[#1D6FB8]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#29ABE2]/50'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 block">Extra Notes / Allergies</label>
          <Input
            placeholder="e.g. no shellfish, prefer Mediterranean…"
            value={dietaryNotes}
            onChange={e => onChange({ dietaryNotes: e.target.value })}
            className="text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Day Card ──────────────────────────────────────────────────────────────────
function DayCard({ dayPlan }) {
  const [expanded, setExpanded] = useState(false);
  const meals = ['breakfast', 'lunch', 'dinner', 'snack'];
  const totalCals = meals.reduce((s, m) => s + (dayPlan[m]?.calories || 0), 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <button onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm w-24 text-left">{dayPlan.day}</span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-400" />{totalCals} kcal
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-slate-100 dark:border-slate-700">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {meals.map(meal => {
                const data = dayPlan[meal];
                if (!data) return null;
                const Icon = MEAL_ICONS[meal];
                return (
                  <div key={meal} className={`p-3 rounded-xl border ${MEAL_COLORS[meal]}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold uppercase tracking-wide">{meal}</span>
                      {data.calories && <span className="ml-auto text-xs opacity-70">{data.calories} kcal</span>}
                    </div>
                    <p className="text-sm font-semibold leading-snug">{data.name}</p>
                    {data.description && <p className="text-xs opacity-70 mt-0.5 leading-relaxed">{data.description}</p>}
                    {data.protein && (
                      <div className="flex gap-2 mt-1.5 text-[10px] opacity-60">
                        <span>P: {data.protein}g</span>
                        <span>C: {data.carbs}g</span>
                        <span>F: {data.fats}g</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Shopping List Panel ───────────────────────────────────────────────────────
function ShoppingListPanel({ ingredients, planId, onExported }) {
  const [checked, setChecked] = useState(new Set());
  const [exporting, setExporting] = useState(false);

  const toggleItem = (item) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  };

  const exportToTasks = async () => {
    setExporting(true);
    try {
      const toExport = ingredients.filter(i => !checked.has(i));
      await Promise.all(
        toExport.map(ingredient =>
          base44.entities.Task.create({
            title: ingredient,
            category: 'shopping',
            priority: 'medium',
            status: 'todo',
            notes: 'From Meal Planner',
          })
        )
      );
      await base44.entities.MealPlan.update(planId, { exported_to_tasks: true });
      toast.success(`✅ ${toExport.length} ingredients added to Shopping tasks!`);
      onExported();
    } catch (e) {
      toast.error('Export failed, please try again.');
    }
    setExporting(false);
  };

  return (
    <Card className="border-[#E8B84B]/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-[#E8B84B]" /> Shopping List
          </CardTitle>
          <span className="text-xs text-slate-500">{ingredients.length} items · tap to mark as owned</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
          {ingredients.map((item, i) => (
            <label key={i} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${checked.has(item) ? 'opacity-50 line-through' : ''}`}>
              <Checkbox checked={checked.has(item)} onCheckedChange={() => toggleItem(item)} />
              <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
            </label>
          ))}
        </div>
        <Button onClick={exportToTasks} disabled={exporting || ingredients.length === 0}
          className="w-full gap-2 bg-[#E8B84B] hover:bg-amber-500 text-slate-900 font-bold">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
          Export Unchecked to Shopping Tasks
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MealPlannerPage() {
  const [activeTab, setActiveTab] = useState('budget');
  const qc = useQueryClient();

  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = startOfWeek(
    weekOffset >= 0 ? addWeeks(new Date(), weekOffset) : subWeeks(new Date(), Math.abs(weekOffset)),
    { weekStartsOn: 1 }
  );
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  // Preferences state — seeded from UserSettings
  const { data: settingsList = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list(),
  });
  const settings = settingsList[0] || {};

  const [prefs, setPrefs] = useState(null); // null = not yet seeded
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [generating, setGenerating] = useState(false);

  // Seed from settings once loaded
  useEffect(() => {
    if (prefs === null && settingsList.length > 0) {
      const p = settings.dietary_preferences || [];
      const seeded = p.length > 0 ? p : ['halal'];
      setPrefs(seeded);
      setDietaryNotes(settings.dietary_notes || '');
    }
  }, [settingsList]);

  const activePrefs = prefs ?? ['halal'];

  const { data: existingPlans = [], refetch } = useQuery({
    queryKey: ['mealPlans', weekStartStr],
    queryFn: () => base44.entities.MealPlan.filter({ week_start: weekStartStr }),
  });
  const currentPlan = existingPlans[0] || null;

  const savePlan = useMutation({
    mutationFn: (data) => base44.entities.MealPlan.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mealPlans', weekStartStr] }); refetch(); },
  });

  const generatePlan = async () => {
    setGenerating(true);
    try {
      const dietary = activePrefs.join(', ');
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a detailed 7-day halal-friendly meal plan for someone with the following preferences:
- Dietary: ${dietary || 'halal'}
- Daily calorie target: ${calorieGoal} kcal
- Notes: ${dietaryNotes || 'none'}
- All meals MUST be halal (no pork, no alcohol in ingredients)

For each day (Monday through Sunday), provide breakfast, lunch, dinner, and one snack.
For each meal include: name, short description (1 sentence), calories, protein (g), carbs (g), fats (g).

Also provide a consolidated shopping list of all unique ingredients needed for the full week (be specific with quantities where helpful, e.g. "500g chicken breast").

Return ONLY valid JSON.`,
        response_json_schema: {
          type: 'object',
          properties: {
            plan: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  day: { type: 'string' },
                  breakfast: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, calories: { type: 'number' }, protein: { type: 'number' }, carbs: { type: 'number' }, fats: { type: 'number' } } },
                  lunch:     { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, calories: { type: 'number' }, protein: { type: 'number' }, carbs: { type: 'number' }, fats: { type: 'number' } } },
                  dinner:    { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, calories: { type: 'number' }, protein: { type: 'number' }, carbs: { type: 'number' }, fats: { type: 'number' } } },
                  snack:     { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, calories: { type: 'number' }, protein: { type: 'number' }, carbs: { type: 'number' }, fats: { type: 'number' } } },
                }
              }
            },
            ingredients: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      if (!res?.plan?.length) throw new Error('Empty plan returned');

      // Delete existing plan for this week if any
      if (currentPlan) await base44.entities.MealPlan.delete(currentPlan.id);

      await savePlan.mutateAsync({
        week_start: weekStartStr,
        calorie_goal: calorieGoal,
        dietary_preferences: activePrefs,
        dietary_notes: dietaryNotes,
        plan: res.plan,
        ingredients: res.ingredients || [],
        exported_to_tasks: false,
      });
      toast.success('🍽️ Meal plan generated!');
    } catch (e) {
      toast.error('Generation failed. Please try again.');
    }
    setGenerating(false);
  };

  const weekLabel = `Week of ${format(weekStart, 'MMM d, yyyy')}`;

  // Avg daily calories from plan
  const avgCals = currentPlan?.plan?.length
    ? Math.round(
        currentPlan.plan.reduce((sum, day) => {
          const meals = ['breakfast', 'lunch', 'dinner', 'snack'];
          return sum + meals.reduce((s, m) => s + (day[m]?.calories || 0), 0);
        }, 0) / currentPlan.plan.length
      )
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Tab switcher */}
      <div className="flex bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 gap-1">
        {[
          { key: 'budget', label: '💰 Budget Planner' },
          { key: 'standard', label: '🍽️ Standard Plan' },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${
              activeTab === t.key
                ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}>
            {t.label}
          </button>
        ))}
        <Link to="/FitnessGoalDashboard"
          className="flex items-center justify-center px-3 py-2 rounded-lg text-sm font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all whitespace-nowrap">
          💪 Fitness Goals
        </Link>
      </div>

      {/* Budget Planner tab */}
      {activeTab === 'budget' && <BudgetMealPlanner />}

      {/* Standard Planner tab */}
      {activeTab === 'standard' && <>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-5 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #0D4F6C 55%, #1D6FB8 100%)', border: '1px solid rgba(41,171,226,0.3)' }}>
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #E8B84B, #29ABE2, #1D6FB8)' }} />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Utensils className="w-5 h-5" style={{ color: '#E8B84B' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#A8C8E8' }}>AI Powered</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Halal Meal Planner</h1>
            <p className="text-sm mt-0.5" style={{ color: '#A8C8E8' }}>Generate weekly meal plans tailored to your dietary needs</p>
          </div>
          {avgCals && (
            <div className="text-right">
              <p className="text-white/60 text-xs">Avg daily</p>
              <p className="text-2xl font-black text-white flex items-center gap-1">
                <Flame className="w-5 h-5 text-orange-400" />{avgCals}
              </p>
              <p className="text-white/50 text-xs">kcal/day</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Week Navigator */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5">
        <button onClick={() => setWeekOffset(w => w - 1)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-800">
          ←
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <Calendar className="w-4 h-4 text-[#1D6FB8]" />{weekLabel}
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-800">
          →
        </button>
      </div>

      {/* Preferences */}
      <PreferencesPanel
        prefs={activePrefs}
        calorieGoal={calorieGoal}
        dietaryNotes={dietaryNotes}
        onChange={({ prefs: p, calorieGoal: c, dietaryNotes: d }) => {
          if (p !== undefined) setPrefs(p);
          if (c !== undefined) setCalorieGoal(c);
          if (d !== undefined) setDietaryNotes(d);
        }}
      />

      {/* Generate Button */}
      <Button onClick={generatePlan} disabled={generating}
        className="w-full h-12 text-base font-bold gap-2 text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1D6FB8, #29ABE2)' }}>
        {generating
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating your meal plan…</>
          : currentPlan
            ? <><RefreshCw className="w-5 h-5" /> Regenerate Week Plan</>
            : <><Sparkles className="w-5 h-5" /> Generate Week Meal Plan</>
        }
      </Button>

      {/* Plan days */}
      <AnimatePresence mode="wait">
        {currentPlan?.plan?.length > 0 && (
          <motion.div key={currentPlan.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">7-Day Plan</span>
              {currentPlan.exported_to_tasks && (
                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Shopping list exported
                </Badge>
              )}
            </div>
            {currentPlan.plan.map((dayPlan, i) => (
              <motion.div key={dayPlan.day || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <DayCard dayPlan={dayPlan} />
              </motion.div>
            ))}

            {/* Shopping List */}
            {currentPlan.ingredients?.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <ShoppingListPanel
                  ingredients={currentPlan.ingredients}
                  planId={currentPlan.id}
                  onExported={() => qc.invalidateQueries({ queryKey: ['mealPlans', weekStartStr] })}
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!currentPlan && !generating && (
        <div className="text-center py-16 rounded-2xl bg-slate-50 dark:bg-slate-900/30">
          <Utensils className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400">No plan for this week yet</h3>
          <p className="text-slate-400 mt-1 text-sm">Set your preferences above and tap Generate</p>
        </div>
      )}
      </>}
    </div>
  );
}