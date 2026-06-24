import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Sparkles, Loader2, ChefHat, Clock, Flame, ShoppingCart,
  Apple, CheckCircle2, Calendar, Utensils, Info, Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAIScheduling } from '@/components/assistant/AISchedulingBridge';
import { addDays, format } from 'date-fns';

export default function AIDietPlanner() {
  const [generating, setGenerating] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const { createEvent, createBulkEvents } = useAIScheduling();

  const { data: dietPlan, refetch: refetchPlan } = useQuery({
    queryKey: ['dietPlan'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('generatePersonalizedDietPlan', {
        duration_days: 7
      });
      return data.diet_plan;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  const generatePlan = async () => {
    setGenerating(true);
    try {
      await refetchPlan();
      toast.success('Your personalized meal plan is ready!');
    } catch (error) {
      toast.error('Failed to generate meal plan');
    } finally {
      setGenerating(false);
    }
  };

  if (!dietPlan && !generating) {
    return (
      <Card className="border-2 border-dashed border-green-200">
        <CardContent className="py-12 text-center">
          <ChefHat className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">AI Diet Planner</h3>
          <p className="text-sm text-slate-600 mb-4">
            Get a personalized 7-day meal plan with recipes tailored to your goals
          </p>
          <Button onClick={generatePlan} className="bg-green-600 hover:bg-green-700">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate My Meal Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (generating) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Creating your personalized meal plan...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ChefHat className="w-6 h-6 text-green-600" />
                Your 7-Day Meal Plan
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Personalized nutrition plan with recipes
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  const events = [];
                  const today = new Date();
                  
                  dietPlan?.daily_plans?.forEach((day) => {
                    const date = addDays(today, day.day - 1);
                    const dateStr = format(date, 'yyyy-MM-dd');
                    
                    day.meals?.forEach((meal) => {
                      const timeMap = { 
                        breakfast: '08:00', 
                        lunch: '13:00', 
                        dinner: '19:00', 
                        snack: '15:00' 
                      };
                      const startTime = timeMap[meal.meal_type?.toLowerCase()] || '12:00';
                      
                      events.push({
                        title: `🍽️ ${meal.name}`,
                        description: `${meal.description}\n\nCalories: ${meal.calories}\nProtein: ${meal.protein}g | Carbs: ${meal.carbs}g | Fats: ${meal.fats}g`,
                        start_date: `${dateStr}T${startTime}:00`,
                        end_date: `${dateStr}T${startTime.split(':')[0]}:30:00`,
                        category: 'health',
                        color: '#10b981',
                        is_all_day: false
                      });
                    });
                  });
                  
                  await createBulkEvents(events);
                }}
                variant="default"
                size="sm"
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Add to Calendar
              </Button>
              <Button
                onClick={() => setShowShoppingList(true)}
                variant="outline"
                size="sm"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Shopping List
              </Button>
              <Button onClick={generatePlan} size="sm" disabled={generating}>
                {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Regenerate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Plans */}
      <Tabs defaultValue="day-1">
        <TabsList className="flex flex-wrap h-auto bg-white">
          {dietPlan?.daily_plans?.map((day) => (
            <TabsTrigger key={day.day} value={`day-${day.day}`}>
              Day {day.day}
            </TabsTrigger>
          ))}
        </TabsList>

        {dietPlan?.daily_plans?.map((day) => (
          <TabsContent key={day.day} value={`day-${day.day}`} className="space-y-4">
            {/* Daily Summary */}
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <Flame className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-slate-800">{day.total_calories}</p>
                    <p className="text-xs text-slate-600">Calories</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-700">{day.total_protein}g</p>
                    <p className="text-xs text-slate-600">Protein</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-700">{day.total_carbs}g</p>
                    <p className="text-xs text-slate-600">Carbs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-700">{day.total_fats}g</p>
                    <p className="text-xs text-slate-600">Fats</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Meals */}
            <div className="space-y-3">
              {day.meals?.map((meal, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card 
                    className="hover:border-green-300 transition-all cursor-pointer"
                    onClick={() => setSelectedMeal(meal)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-green-100 text-green-700">
                              {meal.meal_type}
                            </Badge>
                            <span className="text-xs text-slate-500">{meal.time}</span>
                          </div>
                          <h4 className="font-semibold text-slate-800">{meal.name}</h4>
                          <p className="text-sm text-slate-600 mt-1">{meal.description}</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-lg font-bold text-green-700">{meal.calories}</p>
                          <p className="text-xs text-slate-500">kcal</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-slate-600">
                          <span>Protein: {meal.protein}g</span>
                          <span>Carbs: {meal.carbs}g</span>
                          <span>Fats: {meal.fats}g</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {meal.prep_time_minutes} mins
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const timeMap = { 
                              breakfast: '08:00', 
                              lunch: '13:00', 
                              dinner: '19:00', 
                              snack: '15:00' 
                            };
                            const startTime = timeMap[meal.meal_type?.toLowerCase()] || '12:00';
                            const dateStr = format(addDays(new Date(), day.day - 1), 'yyyy-MM-dd');
                            
                            await createEvent({
                              title: `🍽️ ${meal.name}`,
                              description: `${meal.description}\n\nCalories: ${meal.calories}\nProtein: ${meal.protein}g | Carbs: ${meal.carbs}g | Fats: ${meal.fats}g`,
                              start_date: `${dateStr}T${startTime}:00`,
                              end_date: `${dateStr}T${startTime.split(':')[0]}:30:00`,
                              category: 'health'
                            });
                          }}
                          className="text-xs h-7"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Schedule
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Nutrition Tips */}
      {dietPlan?.nutrition_tips && (
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="w-5 h-5 text-purple-600" />
              Nutrition Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {dietPlan.nutrition_tips.map((tip, idx) => (
                <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 mt-0.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Meal Detail Modal */}
      {selectedMeal && (
        <Dialog open={!!selectedMeal} onOpenChange={() => setSelectedMeal(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-green-600" />
                {selectedMeal.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Badge className="bg-green-100 text-green-700">{selectedMeal.meal_type}</Badge>
                <span className="text-sm text-slate-600">{selectedMeal.time}</span>
                <span className="text-sm text-slate-600 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {selectedMeal.prep_time_minutes} minutes
                </span>
              </div>

              <p className="text-slate-700">{selectedMeal.description}</p>

              {/* Nutrition */}
              <Card className="bg-blue-50">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-slate-800">{selectedMeal.calories}</p>
                      <p className="text-xs text-slate-600">Calories</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-700">{selectedMeal.protein}g</p>
                      <p className="text-xs text-slate-600">Protein</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-700">{selectedMeal.carbs}g</p>
                      <p className="text-xs text-slate-600">Carbs</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-700">{selectedMeal.fats}g</p>
                      <p className="text-xs text-slate-600">Fats</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ingredients */}
              <div>
                <h4 className="font-semibold text-slate-800 mb-2">Ingredients</h4>
                <ul className="space-y-1">
                  {selectedMeal.ingredients?.map((ingredient, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-center gap-2">
                      <Apple className="w-3 h-3 text-green-600" />
                      {ingredient}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Instructions */}
              <div>
                <h4 className="font-semibold text-slate-800 mb-2">Instructions</h4>
                <ol className="space-y-2">
                  {selectedMeal.instructions?.map((step, idx) => (
                    <li key={idx} className="text-sm text-slate-700">
                      <span className="font-semibold text-green-600">Step {idx + 1}:</span> {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Shopping List Modal */}
      {showShoppingList && dietPlan?.shopping_list && (
        <Dialog open={showShoppingList} onOpenChange={setShowShoppingList}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-600" />
                Weekly Shopping List
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {Object.entries(dietPlan.shopping_list).map(([category, items]) => (
                <div key={category}>
                  <h4 className="font-semibold text-slate-800 mb-2 capitalize">{category}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}