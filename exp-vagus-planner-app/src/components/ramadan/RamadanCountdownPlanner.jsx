import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Moon, Utensils, Loader2, RefreshCw, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';
import RamadanDailyTracker from './RamadanDailyTracker';
import RamadanGoalsTracker from './RamadanGoalsTracker';
import RamadanMealLog from './RamadanMealLog';

// Ramadan 1447H started Feb 18, 2026 (moon sighted)
const RAMADAN_2026_START = new Date('2026-02-18');
const RAMADAN_DURATION = 30;

function getDaysUntilRamadan() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(RAMADAN_2026_START);
  start.setHours(0, 0, 0, 0);
  const diff = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
  return diff;
}

function getRamadanDay() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(RAMADAN_2026_START);
  start.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
  return diff >= 0 && diff < RAMADAN_DURATION ? diff + 1 : null;
}

const DIETARY_LABELS = {
  halal: 'Halal',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  gluten_free: 'Gluten-Free',
  dairy_free: 'Dairy-Free',
  nut_free: 'Nut-Free',
  none: 'No restrictions',
};

const MEAL_PROMPTS = {
  suhoor: 'Suhoor (pre-dawn meal before Fajr)',
  iftar: 'Iftar (meal to break the fast at Maghrib)',
};

function MealCard({ meal }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-800 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{meal.emoji}</span>
          <div>
            <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{meal.name}</p>
            <p className="text-xs text-slate-500">{meal.summary}</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 space-y-2 text-sm">
              {meal.ingredients && (
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">Ingredients</p>
                  <p className="text-slate-600 dark:text-slate-400 text-xs">{meal.ingredients}</p>
                </div>
              )}
              {meal.nutrition && (
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">Nutrition</p>
                  <p className="text-slate-600 dark:text-slate-400 text-xs">{meal.nutrition}</p>
                </div>
              )}
              {meal.tip && (
                <div className="p-2 bg-teal-50 dark:bg-teal-950/30 rounded-lg">
                  <p className="text-teal-700 dark:text-teal-300 text-xs">💡 {meal.tip}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function RamadanCountdownPlanner() {
  const daysUntil = getDaysUntilRamadan();
  const ramadanDay = getRamadanDay();
  const isRamadan = ramadanDay !== null;

  const [mealType, setMealType] = useState('iftar');
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [meals, setMeals] = useState(null);
  const [prayerTimes, setPrayerTimes] = useState(null);

  const { data: userSettings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });
  const settings = userSettings[0];

  const dietary = settings?.dietary_preferences || [];

  // Fetch prayer times for Iftar/Suhoor times
  useEffect(() => {
    const lat = settings?.latitude || 51.5074;
    const lng = settings?.longitude || -0.1278;
    const today = new Date();
    fetch(`https://api.aladhan.com/v1/timings/${today.getDate()}-${today.getMonth()+1}-${today.getFullYear()}?latitude=${lat}&longitude=${lng}&method=3`)
      .then(r => r.json())
      .then(j => {
        const t = j.data?.timings;
        if (t) setPrayerTimes({ fajr: t.Fajr, maghrib: t.Maghrib });
      })
      .catch(() => {});
  }, [settings]);

  const generateMeals = async () => {
    setLoadingMeals(true);
    setMeals(null);
    const dietaryStr = dietary.length > 0 ? dietary.map(d => DIETARY_LABELS[d] || d).join(', ') : 'no specific restrictions';
    const prompt = `Create a ${MEAL_PROMPTS[mealType]} plan for Ramadan fasting. 
Dietary requirements: ${dietaryStr}.
Provide exactly 4 meal/dish suggestions, each with:
- A name
- A short summary (1 sentence)
- Key ingredients list
- Brief nutritional benefit
- A practical fasting tip
${mealType === 'suhoor' ? 'Focus on slow-release energy foods that sustain through the day.' : 'Focus on balanced nutrition to replenish after fasting. Always include dates (Sunnah).'}
Return as JSON: {"meals": [{"name": "...", "emoji": "...", "summary": "...", "ingredients": "...", "nutrition": "...", "tip": "..."}]}`;

    const result = await SDK.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          meals: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                emoji: { type: 'string' },
                summary: { type: 'string' },
                ingredients: { type: 'string' },
                nutrition: { type: 'string' },
                tip: { type: 'string' },
              }
            }
          }
        }
      }
    });

    setMeals(result?.meals || []);
    setLoadingMeals(false);
  };

  // Progress ring
  const progress = isRamadan ? (ramadanDay / RAMADAN_DURATION) * 100 : 0;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="space-y-4">
      {/* Countdown / Status Card */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="bg-gradient-to-br from-indigo-600 via-violet-700 to-purple-800 p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Moon className="w-5 h-5" />
                <h3 className="font-bold text-lg">Ramadan 2026</h3>
              </div>
              {isRamadan ? (
                <>
                  <p className="text-3xl font-black">Day {ramadanDay}</p>
                  <p className="text-white/70 text-sm">{RAMADAN_DURATION - ramadanDay} days remaining</p>
                </>
              ) : daysUntil > 0 ? (
                <>
                  <p className="text-4xl font-black">{daysUntil}</p>
                  <p className="text-white/70 text-sm">days until Ramadan</p>
                </>
              ) : (
                <p className="text-lg font-semibold">Ramadan has concluded — Eid Mubarak! 🌙</p>
              )}
            </div>

            {isRamadan ? (
              <svg className="w-24 h-24" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="8"
                  strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round" transform="rotate(-90 50 50)" />
                <text x="50" y="55" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">
                  {Math.round(progress)}%
                </text>
              </svg>
            ) : (
              <div className="text-6xl">🌙</div>
            )}
          </div>

          {prayerTimes && isRamadan && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <p className="text-xs text-white/70 mb-0.5">Suhoor ends</p>
                <p className="font-bold text-lg">{prayerTimes.fajr}</p>
                <p className="text-xs text-white/60">Fajr Adhan</p>
              </div>
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <p className="text-xs text-white/70 mb-0.5">Iftar time</p>
                <p className="font-bold text-lg">{prayerTimes.maghrib}</p>
                <p className="text-xs text-white/60">Maghrib Adhan</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Daily Ibadah Tracker — shown during Ramadan */}
      {isRamadan && <RamadanDailyTracker ramadanDay={ramadanDay} />}

      {/* Ramadan Goals */}
      <RamadanGoalsTracker />

      {/* Meal Log & Recipes */}
      <RamadanMealLog />

      {/* AI Meal Planner */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Utensils className="w-5 h-5 text-violet-600" />
            AI Meal Planner
            <Badge className="bg-violet-100 text-violet-700 text-xs ml-1">
              <Sparkles className="w-3 h-3 mr-1 inline" />AI
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex gap-2">
            <Select value={mealType} onValueChange={setMealType}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="suhoor">🌅 Suhoor (Pre-dawn)</SelectItem>
                <SelectItem value="iftar">🌇 Iftar (Break fast)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={generateMeals}
              disabled={loadingMeals}
              className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
            >
              {loadingMeals ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </Button>
          </div>

          {dietary.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {dietary.filter(d => d !== 'none').map(d => (
                <Badge key={d} className="bg-teal-50 text-teal-700 text-xs border border-teal-200">
                  {DIETARY_LABELS[d] || d}
                </Badge>
              ))}
            </div>
          )}

          {loadingMeals && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Generating {mealType} suggestions…</p>
            </div>
          )}

          {meals && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  {mealType === 'suhoor' ? '🌅 Suhoor Ideas' : '🌇 Iftar Ideas'}
                </p>
                {meals.map((meal, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                    <MealCard meal={meal} />
                  </motion.div>
                ))}
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={generateMeals}>
                  <RefreshCw className="w-3.5 h-3.5 mr-2" /> Regenerate
                </Button>
              </motion.div>
            </AnimatePresence>
          )}

          {!meals && !loadingMeals && (
            <div className="text-center py-6 text-slate-400">
              <Utensils className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Tap the sparkle button to get personalized meal ideas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preparation tips when not in Ramadan */}
      {!isRamadan && daysUntil > 0 && (
        <Card className="border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20">
          <CardContent className="p-4">
            <p className="font-semibold text-indigo-800 dark:text-indigo-300 text-sm mb-2">🌙 Preparation Tips</p>
            <ul className="text-xs text-indigo-700 dark:text-indigo-400 space-y-1.5">
              {[
                'Start reducing caffeine and sugar intake now',
                'Practice intermittent fasting to ease into Ramadan',
                'Stock up on wholesome Suhoor staples (oats, eggs, dates)',
                'Plan your Quran reading schedule in advance',
                'Set your prayer alarm timings before Ramadan begins',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}