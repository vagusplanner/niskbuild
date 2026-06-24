/**
 * BudgetMealPlanner
 * AI meal plan generator that respects a weekly grocery budget.
 * Shows itemized grocery costs, budget vs actual, and nutrition summary.
 */
import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ShoppingCart, Loader2, Utensils, Coffee, Sun, Moon, Sunset,
  Flame, CheckCircle2, RefreshCw, TrendingDown, AlertCircle, Info,
  ChevronDown, ChevronUp, PoundSterling, Users, Leaf, Target, Dumbbell, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_ICONS = { breakfast: Coffee, lunch: Sun, dinner: Moon, snack: Sunset };
const MEAL_COLORS = {
  breakfast: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-200',
  lunch:     'text-blue-600 bg-blue-50 dark:bg-blue-950/20 border-blue-200',
  dinner:    'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200',
  snack:     'text-green-600 bg-green-50 dark:bg-green-950/20 border-green-200',
};
const DIETARY_OPTIONS = [
  { value: 'halal', label: '🥩 Halal' },
  { value: 'vegetarian', label: '🥦 Vegetarian' },
  { value: 'vegan', label: '🌱 Vegan' },
  { value: 'gluten_free', label: '🌾 Gluten Free' },
  { value: 'dairy_free', label: '🥛 Dairy Free' },
];

const GROCERY_CATEGORY_ICONS = {
  'Meat & Fish': '🥩', 'Produce': '🥦', 'Dairy': '🥛', 'Pantry': '🫙',
  'Frozen': '❄️', 'Bakery': '🍞', 'Beverages': '🥤', 'Snacks': '🍪', 'Other': '🛒'
};

// ── Budget Gauge ──────────────────────────────────────────────────────────────
function BudgetGauge({ spent, budget, currency }) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const over = spent > budget;
  const remaining = budget - spent;
  const symbol = currency === 'GBP' ? '£' : '$';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-slate-700 dark:text-slate-200">
          {symbol}{spent.toFixed(2)} <span className="font-normal text-slate-400">of {symbol}{budget}</span>
        </span>
        <span className={cn('font-black text-sm', over ? 'text-red-500' : 'text-emerald-600')}>
          {over ? `${symbol}${Math.abs(remaining).toFixed(2)} over` : `${symbol}${remaining.toFixed(2)} left`}
        </span>
      </div>
      <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('h-full rounded-full', over ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500')}
        />
      </div>
      <div className="flex gap-3 text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Within budget</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />&gt;80%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Over</span>
      </div>
    </div>
  );
}

// ── Day Meal Card ─────────────────────────────────────────────────────────────
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
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-slate-100 dark:border-slate-700">
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
                    {data.protein != null && (
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
            {dayPlan.batch_cook_tip && (
              <div className="mx-4 mb-4 flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
                <Info className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">{dayPlan.batch_cook_tip}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Grocery List ──────────────────────────────────────────────────────────────
function GroceryList({ groceryList, currency, onExport }) {
  const [checked, setChecked] = useState(new Set());
  const [exporting, setExporting] = useState(false);
  const symbol = currency === 'GBP' ? '£' : '$';

  // Group by category
  const grouped = groceryList.reduce((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const uncheckedTotal = groceryList
    .filter(i => !checked.has(i.item))
    .reduce((s, i) => s + (i.estimated_cost || 0), 0);

  const toggleItem = (item) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const toExport = groceryList.filter(i => !checked.has(i.item));
      await Promise.all(toExport.map(i =>
        SDK.entities.Task.create({
          title: i.item,
          category: 'shopping',
          priority: 'medium',
          status: 'todo',
          notes: i.notes ? `Budget Meal Plan · ${i.notes}` : 'Budget Meal Plan',
        })
      ));
      toast.success(`✅ ${toExport.length} items added to Shopping Tasks!`);
      if (onExport) onExport();
    } catch {
      toast.error('Export failed. Please try again.');
    }
    setExporting(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-[#E8B84B]" />
          <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Grocery List</span>
          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs border-0">
            {groceryList.length} items
          </Badge>
        </div>
        <span className="text-xs text-slate-400">Unchecked: <strong className="text-slate-600 dark:text-slate-300">{symbol}{uncheckedTotal.toFixed(2)}</strong></span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
              <span className="text-sm">{GROCERY_CATEGORY_ICONS[cat] || '🛒'}</span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{cat}</span>
              <span className="ml-auto text-xs text-slate-400">
                {symbol}{items.reduce((s, i) => s + (i.estimated_cost || 0), 0).toFixed(2)}
              </span>
            </div>
            {items.map((item, idx) => (
              <label key={idx} className={cn(
                'flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors',
                checked.has(item.item) && 'opacity-50'
              )}>
                <Checkbox checked={checked.has(item.item)} onCheckedChange={() => toggleItem(item.item)} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm text-slate-700 dark:text-slate-300', checked.has(item.item) && 'line-through')}>{item.item}</p>
                  {item.notes && <p className="text-[10px] text-slate-400 truncate">{item.notes}</p>}
                </div>
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex-shrink-0">
                  {symbol}{(item.estimated_cost || 0).toFixed(2)}
                </span>
              </label>
            ))}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-100 dark:border-slate-700">
        <Button onClick={handleExport} disabled={exporting || groceryList.length === 0}
          className="w-full h-10 bg-[#E8B84B] hover:bg-amber-500 text-slate-900 font-bold gap-2">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
          Export Unchecked to Shopping Tasks
        </Button>
      </div>
    </div>
  );
}

// ── Fitness Goal Banner ───────────────────────────────────────────────────────
function FitnessGoalBanner({ onApplyMacros }) {
  const { data: goals = [] } = useQuery({
    queryKey: ['fitnessGoals'],
    queryFn: () => SDK.entities.FitnessGoal.list('-created_date', 5),
  });
  const activeGoal = goals.find(g => g.status === 'active') || goals[0];
  if (!activeGoal?.recommended_calories) {
    return (
      <Link to="/FitnessGoalDashboard"
        className="flex items-center justify-between p-3.5 rounded-2xl border border-dashed border-[#1D6FB8]/40 bg-blue-50/50 dark:bg-blue-950/10 hover:border-[#1D6FB8] transition-colors group">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-[#1D6FB8]" />
          <p className="text-sm font-semibold text-[#1D6FB8]">Set a fitness goal to get AI macro targets →</p>
        </div>
        <ChevronRight className="w-4 h-4 text-[#1D6FB8] group-hover:translate-x-1 transition-transform" />
      </Link>
    );
  }
  const GOAL_LABELS = {
    weight_loss: '🔥 Weight Loss', muscle_gain: '💪 Muscle Gain',
    maintenance: '⚖️ Maintenance', endurance: '🏃 Endurance', general_health: '🌿 General Health',
  };
  return (
    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/30 bg-emerald-50 dark:bg-emerald-950/10 p-3.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              Active Goal: {GOAL_LABELS[activeGoal.goal_type]}
            </p>
            <p className="text-[11px] text-emerald-600/70 dark:text-emerald-500/70">
              AI targets: {Math.round(activeGoal.recommended_calories)} kcal · {Math.round(activeGoal.recommended_protein_g || 0)}g protein · {Math.round(activeGoal.recommended_carbs_g || 0)}g carbs · {Math.round(activeGoal.recommended_fats_g || 0)}g fat
            </p>
          </div>
        </div>
        <button
          onClick={() => onApplyMacros(activeGoal.recommended_calories)}
          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
          Use These Macros
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BudgetMealPlanner() {
  const qc = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = startOfWeek(
    weekOffset >= 0 ? addWeeks(new Date(), weekOffset) : subWeeks(new Date(), Math.abs(weekOffset)),
    { weekStartsOn: 1 }
  );
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekLabel = `Week of ${format(weekStart, 'MMM d, yyyy')}`;

  // Settings
  const { data: settingsList = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list(),
  });
  const settings = settingsList[0] || {};

  // Form state
  const [weeklyBudget, setWeeklyBudget] = useState(100);
  const [familySize, setFamilySize] = useState(4);
  const [currency, setCurrency] = useState('GBP');
  const [dietaryPrefs, setDietaryPrefs] = useState(null);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [generating, setGenerating] = useState(false);

  // Seed from settings
  useEffect(() => {
    if (dietaryPrefs === null && settingsList.length > 0) {
      const p = settings.dietary_preferences || [];
      setDietaryPrefs(p.length > 0 ? p : ['halal']);
      setDietaryNotes(settings.dietary_notes || '');
    }
  }, [settingsList]);

  const activePrefs = dietaryPrefs ?? ['halal'];

  const togglePref = (val) => {
    setDietaryPrefs(prev => {
      const cur = prev ?? ['halal'];
      return cur.includes(val) ? cur.filter(p => p !== val) : [...cur, val];
    });
  };

  // Load existing plan for this week
  const { data: existingPlans = [], refetch } = useQuery({
    queryKey: ['mealPlans', weekStartStr],
    queryFn: () => SDK.entities.MealPlan.filter({ week_start: weekStartStr }),
  });
  // Use the first plan that has grocery_list (budget plan marker)
  const currentPlan = existingPlans.find(p => p.categories) || existingPlans[0] || null;

  // We store budget plan data as JSON in dietary_notes field with a prefix so we can distinguish it
  // Actually we'll store it in a local state and persist to MealPlan.ingredients + plan
  const [planData, setPlanData] = useState(null);

  const generate = async () => {
    if (!weeklyBudget || weeklyBudget <= 0) {
      toast.error('Please enter a valid weekly budget');
      return;
    }
    setGenerating(true);
    setPlanData(null);
    try {
      const res = await SDK.functions.invoke('generateBudgetMealPlan', {
        weekly_budget: parseFloat(weeklyBudget),
        currency,
        family_size: parseInt(familySize),
        dietary_preferences: activePrefs,
        dietary_notes: dietaryNotes,
        calorie_goal: parseInt(calorieGoal),
        week_start: weekStartStr,
      });

      if (!res.data?.plan?.length) throw new Error('No plan returned');

      // Save to MealPlan entity (ingredients = grocery item names, plan = days)
      const d = res.data;
      const ingredientStrings = (d.grocery_list || []).map(i => i.item);

      // Delete old plan for this week
      if (currentPlan) await SDK.entities.MealPlan.delete(currentPlan.id);

      await SDK.entities.MealPlan.create({
        week_start: weekStartStr,
        calorie_goal: calorieGoal,
        dietary_preferences: activePrefs,
        dietary_notes: `BUDGET_PLAN::${JSON.stringify({ budget: weeklyBudget, currency, family_size: familySize, grocery_list: d.grocery_list, budget_summary: d.budget_summary, savings_tips: d.savings_tips, nutrition_summary: d.nutrition_summary })}`,
        plan: d.plan,
        ingredients: ingredientStrings,
        exported_to_tasks: false,
      });

      setPlanData(d);
      qc.invalidateQueries({ queryKey: ['mealPlans', weekStartStr] });
      toast.success('🍽️ Budget meal plan generated!');
    } catch (e) {
      console.error(e);
      toast.error('Generation failed. Please try again.');
    }
    setGenerating(false);
  };

  // Restore plan data from saved entity
  useEffect(() => {
    if (currentPlan && !planData) {
      const notes = currentPlan.dietary_notes || '';
      if (notes.startsWith('BUDGET_PLAN::')) {
        try {
          const saved = JSON.parse(notes.replace('BUDGET_PLAN::', ''));
          setPlanData({
            plan: currentPlan.plan,
            grocery_list: saved.grocery_list || [],
            budget_summary: saved.budget_summary || {},
            savings_tips: saved.savings_tips || [],
            nutrition_summary: saved.nutrition_summary || {},
            weekly_budget: saved.budget,
            currency: saved.currency || 'GBP',
            family_size: saved.family_size,
          });
          if (saved.budget) setWeeklyBudget(saved.budget);
          if (saved.currency) setCurrency(saved.currency);
          if (saved.family_size) setFamilySize(saved.family_size);
        } catch {}
      }
    }
  }, [currentPlan]);

  const symbol = currency === 'GBP' ? '£' : '$';
  const bs = planData?.budget_summary || {};
  const ns = planData?.nutrition_summary || {};

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-5 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #0D4F6C 55%, #3ecfa0 100%)', border: '1px solid rgba(62,207,160,0.3)' }}>
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #E8B84B, #3ecfa0, #1D6FB8)' }} />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4" style={{ color: '#E8B84B' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#A8C8E8' }}>Budget-Smart</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">Budget Meal Planner</h2>
            <p className="text-sm mt-0.5" style={{ color: '#A8C8E8' }}>
              AI generates a full week of healthy meals within your grocery budget
            </p>
          </div>
          {bs.total_estimated_cost != null && (
            <div className="text-right">
              <p className="text-white/60 text-xs">Est. cost</p>
              <p className={cn('text-2xl font-black', bs.is_within_budget ? 'text-emerald-400' : 'text-red-400')}>
                {symbol}{bs.total_estimated_cost?.toFixed(2)}
              </p>
              <p className="text-white/50 text-xs">of {symbol}{bs.budget?.toFixed(2)}</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Week nav */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5">
        <button onClick={() => { setWeekOffset(w => w - 1); setPlanData(null); }}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500">←</button>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{weekLabel}</span>
        <button onClick={() => { setWeekOffset(w => w + 1); setPlanData(null); }}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500">→</button>
      </div>

      {/* Fitness goal banner */}
      <FitnessGoalBanner onApplyMacros={(cals) => setCalorieGoal(Math.round(cals))} />

      {/* Setup panel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Budget & Family Settings</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Budget */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <PoundSterling className="w-3.5 h-3.5" /> Weekly Budget
            </label>
            <div className="flex items-center">
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="h-10 px-2 text-sm border border-r-0 border-slate-200 dark:border-slate-700 rounded-l-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none">
                <option value="GBP">£</option>
                <option value="USD">$</option>
                <option value="EUR">€</option>
              </select>
              <Input type="number" min={20} max={1000} step={5}
                value={weeklyBudget}
                onChange={e => setWeeklyBudget(e.target.value)}
                className="h-10 rounded-l-none border-l-0 text-sm"
                placeholder="100"
              />
            </div>
          </div>

          {/* Family size */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Family Size
            </label>
            <Input type="number" min={1} max={12}
              value={familySize}
              onChange={e => setFamilySize(e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          {/* Calories */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" /> Calories/day
            </label>
            <Input type="number" min={1000} max={4000} step={50}
              value={calorieGoal}
              onChange={e => setCalorieGoal(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
        </div>

        {/* Dietary prefs */}
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-2 block">Dietary Preferences</label>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => togglePref(opt.value)}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-full border transition-all',
                  activePrefs.includes(opt.value)
                    ? 'bg-[#1D6FB8] text-white border-[#1D6FB8]'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-[#29ABE2]/50')}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500">Extra notes / allergies</label>
          <Input placeholder="e.g. avoid shellfish, prefer Mediterranean…"
            value={dietaryNotes}
            onChange={e => setDietaryNotes(e.target.value)}
            className="text-sm h-10"
          />
        </div>
      </div>

      {/* Generate button */}
      <Button onClick={generate} disabled={generating}
        className="w-full h-12 text-base font-bold gap-2 text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1D6FB8, #3ecfa0)' }}>
        {generating
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating budget plan…</>
          : planData
            ? <><RefreshCw className="w-5 h-5" /> Regenerate Plan</>
            : <><Sparkles className="w-5 h-5" /> Generate Budget Meal Plan</>
        }
      </Button>

      {/* Results */}
      <AnimatePresence mode="wait">
        {planData && (
          <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

            {/* Budget gauge */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Budget Tracker</p>
              <BudgetGauge
                spent={bs.total_estimated_cost || 0}
                budget={parseFloat(weeklyBudget)}
                currency={currency}
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                {[
                  { label: 'Per person/day', value: `${symbol}${(bs.cost_per_person_per_day || 0).toFixed(2)}` },
                  { label: 'Biggest category', value: bs.most_expensive_category || '—' },
                  { label: 'Nutrition score', value: ns.nutrition_score ? `${ns.nutrition_score}/10` : '—' },
                ].map(s => (
                  <div key={s.label} className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <p className="text-base font-black text-slate-700 dark:text-slate-200">{s.value}</p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              {bs.biggest_saving_tip && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30">
                  <TrendingDown className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">{bs.biggest_saving_tip}</p>
                </div>
              )}
            </div>

            {/* Savings tips */}
            {planData.savings_tips?.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Leaf className="w-3.5 h-3.5" /> Money-Saving Tips
                </p>
                {planData.savings_tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
                    <span className="font-bold flex-shrink-0">{i + 1}.</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Nutrition summary */}
            {ns.avg_daily_calories && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-500" /> Nutrition Summary
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Calories', value: `${ns.avg_daily_calories}`, unit: 'kcal' },
                    { label: 'Protein', value: `${ns.avg_daily_protein}`, unit: 'g' },
                    { label: 'Carbs', value: `${ns.avg_daily_carbs}`, unit: 'g' },
                    { label: 'Fats', value: `${ns.avg_daily_fats}`, unit: 'g' },
                  ].map(n => (
                    <div key={n.label} className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                      <p className="text-sm font-black text-slate-700 dark:text-slate-200">{n.value}<span className="text-[9px] font-normal ml-0.5 text-slate-400">{n.unit}</span></p>
                      <p className="text-[9px] text-slate-400 uppercase font-semibold">{n.label}</p>
                    </div>
                  ))}
                </div>
                {ns.nutrition_notes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">{ns.nutrition_notes}</p>
                )}
              </div>
            )}

            {/* Meal plan days */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">7-Day Meal Plan</p>
              {(planData.plan || []).map((dayPlan, i) => (
                <motion.div key={dayPlan.day || i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <DayCard dayPlan={dayPlan} />
                </motion.div>
              ))}
            </div>

            {/* Grocery list */}
            {planData.grocery_list?.length > 0 && (
              <GroceryList
                groceryList={planData.grocery_list}
                currency={currency}
                onExport={() => qc.invalidateQueries({ queryKey: ['mealPlans', weekStartStr] })}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!planData && !generating && (
        <div className="text-center py-14 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700">
          <Target className="w-14 h-14 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-500">Set your budget & generate a plan</h3>
          <p className="text-slate-400 mt-1 text-sm">AI will create healthy meals that fit your grocery budget</p>
        </div>
      )}
    </div>
  );
}