import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Utensils, Plus, ChevronDown, ChevronUp, Trash2, Loader2, Sparkles, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

const today = format(new Date(), 'yyyy-MM-dd');

const MEAL_TYPES = [
  { value: 'suhoor', label: 'Suhoor', emoji: '🌅', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'iftar', label: 'Iftar', emoji: '🌇', color: 'bg-violet-100 text-violet-800 border-violet-200' },
];

const BLANK_RECIPE = { name: '', meal_type: 'iftar', ingredients: '', method: '', notes: '' };

function RecipeCard({ recipe, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const typeInfo = MEAL_TYPES.find(t => t.value === recipe.meal_type) || MEAL_TYPES[1];
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-800 text-left hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xl shrink-0">{typeInfo.emoji}</span>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{recipe.name}</p>
            <Badge className={`text-[10px] ${typeInfo.color} border mt-0.5`}>{typeInfo.label}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onDelete(recipe.id); }}
            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
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
              {recipe.ingredients && (
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300 mb-1 text-xs uppercase tracking-wide">Ingredients</p>
                  <p className="text-slate-600 dark:text-slate-400 text-xs whitespace-pre-line">{recipe.ingredients}</p>
                </div>
              )}
              {recipe.method && (
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300 mb-1 text-xs uppercase tracking-wide">Method</p>
                  <p className="text-slate-600 dark:text-slate-400 text-xs whitespace-pre-line">{recipe.method}</p>
                </div>
              )}
              {recipe.notes && (
                <div className="p-2 bg-teal-50 dark:bg-teal-950/30 rounded-lg">
                  <p className="text-teal-700 dark:text-teal-300 text-xs">💡 {recipe.notes}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function RamadanMealLog() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('log'); // 'log' | 'recipes'
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [recipe, setRecipe] = useState(BLANK_RECIPE);

  // Today's meal log stored as RamadanActivity (reuse iftar_time / suhoor_time notes via separate entity)
  // For simplicity, recipes are stored in a lightweight local state + a dedicated entity.
  // We use the Nutrition entity since it has recipe-like fields.
  const { data: recipes = [], isLoading: loadingRecipes } = useQuery({
    queryKey: ['ramadanRecipes'],
    queryFn: () => SDK.entities.Nutrition.filter({ meal_type: 'ramadan' }),
  });

  const saveRecipe = async () => {
    if (!recipe.name) return toast.error('Please enter a recipe name');
    setSaving(true);
    await SDK.entities.Nutrition.create({
      meal_name: recipe.name,
      meal_type: 'ramadan',
      notes: JSON.stringify({ meal_sub_type: recipe.meal_type, ingredients: recipe.ingredients, method: recipe.method, tip: recipe.notes }),
      date: today,
    });
    await queryClient.invalidateQueries({ queryKey: ['ramadanRecipes'] });
    setSaving(false);
    setShowForm(false);
    setRecipe(BLANK_RECIPE);
    toast.success('Recipe saved!');
  };

  const deleteRecipe = async (id) => {
    await SDK.entities.Nutrition.delete(id);
    await queryClient.invalidateQueries({ queryKey: ['ramadanRecipes'] });
  };

  // Normalise saved recipes to a consistent shape
  const normalised = recipes.map(r => {
    let extra = {};
    try { extra = JSON.parse(r.notes || '{}'); } catch {}
    return {
      id: r.id,
      name: r.meal_name || 'Untitled',
      meal_type: extra.meal_sub_type || 'iftar',
      ingredients: extra.ingredients || '',
      method: extra.method || '',
      notes: extra.tip || '',
    };
  });

  const generateWithAI = async () => {
    setGeneratingAI(true);
    const result = await SDK.integrations.Core.InvokeLLM({
      prompt: `Create a detailed Ramadan ${recipe.meal_type} recipe for a Muslim family.
Include: recipe name, full ingredient list with quantities, step-by-step cooking method, and a helpful fasting tip.
Return as JSON: {"name": "...", "ingredients": "...", "method": "...", "tip": "..."}`,
      response_json_schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          ingredients: { type: 'string' },
          method: { type: 'string' },
          tip: { type: 'string' },
        }
      }
    });
    setRecipe(r => ({ ...r, name: result.name || r.name, ingredients: result.ingredients || '', method: result.method || '', notes: result.tip || '' }));
    setGeneratingAI(false);
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Utensils className="w-5 h-5 text-violet-600" />
            Meal Log & Recipes
          </CardTitle>
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
            <button
              onClick={() => setTab('log')}
              className={`px-3 py-1.5 transition-colors ${tab === 'log' ? 'bg-violet-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              Today's Log
            </button>
            <button
              onClick={() => setTab('recipes')}
              className={`px-3 py-1.5 transition-colors ${tab === 'recipes' ? 'bg-violet-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              Recipes
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">

        {tab === 'log' && <TodaysMealLog />}

        {tab === 'recipes' && (
          <>
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-500">{normalised.length} saved recipes</p>
              <Button size="sm" onClick={() => setShowForm(!showForm)} className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Recipe
              </Button>
            </div>

            <AnimatePresence>
              {showForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-200 dark:border-violet-800 space-y-3">
                    <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">New Recipe</p>

                    <div className="flex gap-2">
                      {MEAL_TYPES.map(t => (
                        <button
                          key={t.value}
                          onClick={() => setRecipe(r => ({ ...r, meal_type: t.value }))}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium border-2 transition-all ${recipe.meal_type === t.value ? 'border-violet-500 bg-violet-100 dark:bg-violet-950/40 text-violet-700' : 'border-slate-200 dark:border-slate-700 text-slate-600'}`}
                        >
                          {t.emoji} {t.label}
                        </button>
                      ))}
                    </div>

                    <input
                      value={recipe.name}
                      onChange={e => setRecipe(r => ({ ...r, name: e.target.value }))}
                      placeholder="Recipe name"
                      className="w-full text-sm p-2 rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-violet-400"
                    />
                    <textarea
                      value={recipe.ingredients}
                      onChange={e => setRecipe(r => ({ ...r, ingredients: e.target.value }))}
                      placeholder="Ingredients (one per line)"
                      rows={3}
                      className="w-full text-sm p-2 rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                    />
                    <textarea
                      value={recipe.method}
                      onChange={e => setRecipe(r => ({ ...r, method: e.target.value }))}
                      placeholder="Cooking method / steps"
                      rows={3}
                      className="w-full text-sm p-2 rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                    />
                    <input
                      value={recipe.notes}
                      onChange={e => setRecipe(r => ({ ...r, notes: e.target.value }))}
                      placeholder="Tips or notes (optional)"
                      className="w-full text-sm p-2 rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-violet-400"
                    />

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={generateWithAI} disabled={generatingAI} className="flex-1 text-xs border-violet-300 text-violet-700">
                        {generatingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                        AI Generate
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="text-xs">Cancel</Button>
                      <Button size="sm" onClick={saveRecipe} disabled={saving} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-xs">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {loadingRecipes && <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>}

            {!loadingRecipes && normalised.length === 0 && !showForm && (
              <div className="text-center py-8 text-slate-400">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No recipes saved yet. Add your favourite Ramadan recipes!</p>
              </div>
            )}

            <div className="space-y-2">
              {normalised.map(r => (
                <RecipeCard key={r.id} recipe={r} onDelete={deleteRecipe} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Today's Meal Log ──────────────────────────────────────────────────────────
function TodaysMealLog() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState({
    suhoor_notes: '',
    iftar_notes: '',
    suhoor_time: '',
    iftar_time: '',
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['ramadanActivity', today],
    queryFn: () => SDK.entities.RamadanActivity.filter({ date: today }),
  });
  const activity = activities[0];

  React.useEffect(() => {
    if (activity) {
      setState({
        suhoor_notes: activity.suhoor_notes || '',
        iftar_notes: activity.iftar_notes || '',
        suhoor_time: activity.suhoor_time || '',
        iftar_time: activity.iftar_time || '',
      });
    }
  }, [activity?.id]);

  const save = async () => {
    setSaving(true);
    const data = { ...state, date: today, day_number: 1 };
    if (activity?.id) {
      await SDK.entities.RamadanActivity.update(activity.id, data);
    } else {
      await SDK.entities.RamadanActivity.create(data);
    }
    await queryClient.invalidateQueries({ queryKey: ['ramadanActivity'] });
    setSaving(false);
    toast.success('Meal log saved!');
  };

  return (
    <div className="space-y-4">
      {[
        { key: 'suhoor', label: 'Suhoor', emoji: '🌅', timeKey: 'suhoor_time', notesKey: 'suhoor_notes', placeholder: 'What did you have for Suhoor? e.g. Oats, dates, eggs…' },
        { key: 'iftar', label: 'Iftar', emoji: '🌇', timeKey: 'iftar_time', notesKey: 'iftar_notes', placeholder: 'What did you have for Iftar? e.g. Dates, soup, biryani…' },
      ].map(meal => (
        <div key={meal.key} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {meal.emoji} {meal.label}
            </p>
            <input
              type="time"
              value={state[meal.timeKey]}
              onChange={e => setState(s => ({ ...s, [meal.timeKey]: e.target.value }))}
              className="text-xs p-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
            />
          </div>
          <textarea
            value={state[meal.notesKey]}
            onChange={e => setState(s => ({ ...s, [meal.notesKey]: e.target.value }))}
            placeholder={meal.placeholder}
            rows={2}
            className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-violet-400 resize-none"
          />
        </div>
      ))}
      <Button onClick={save} disabled={saving} size="sm" className="w-full bg-violet-600 hover:bg-violet-700 text-white">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
        Save Meal Log
      </Button>
    </div>
  );
}