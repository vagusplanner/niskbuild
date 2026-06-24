import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Send, Loader2, Heart, Brain, Dumbbell, 
  Apple, Moon, TrendingUp, Calendar, CheckCircle, Clock,
  ChefHat, BarChart3, Lightbulb, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function InteractiveAIHealthCoach() {
  const [activeTab, setActiveTab] = useState('chat');
  const [chatInput, setChatInput] = useState('');
  const [conversation, setConversation] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your AI Health Coach. I can help you with workout plans, meal suggestions, stress management, and sleep improvement. What would you like to discuss today?"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch personalized plans
  const { data: workoutPlan, isLoading: loadingWorkout, refetch: refetchWorkout } = useQuery({
    queryKey: ['workoutPlan'],
    queryFn: async () => {
      const response = await SDK.functions.invoke('generatePersonalizedWorkoutPlan', {});
      return response.data?.data || null;
    },
    enabled: false
  });

  const { data: mealPlan, isLoading: loadingMeal, refetch: refetchMeal } = useQuery({
    queryKey: ['mealPlan'],
    queryFn: async () => {
      const response = await SDK.functions.invoke('generatePersonalizedMealPlan', {});
      return response.data?.data || null;
    },
    enabled: false
  });

  const { data: wellnessAnalysis, isLoading: loadingWellness, refetch: refetchWellness } = useQuery({
    queryKey: ['wellnessAnalysis'],
    queryFn: async () => {
      const response = await SDK.functions.invoke('analyzeMoodSleepForWellness', {});
      return response.data?.data || null;
    },
    enabled: false
  });

  const { data: recipes, isLoading: loadingRecipes, refetch: refetchRecipes } = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const response = await SDK.functions.invoke('generatePersonalizedRecipes', {});
      return response.data?.data || [];
    },
    enabled: false
  });

  const { data: progressReport, isLoading: loadingProgress, refetch: refetchProgress } = useQuery({
    queryKey: ['progressReport'],
    queryFn: async () => {
      const response = await SDK.functions.invoke('generateProgressReport', { timeframe: 'week' });
      return response.data?.data || null;
    },
    enabled: false
  });

  const { data: planAdjustments, isLoading: loadingAdjustments, refetch: refetchAdjustments } = useQuery({
    queryKey: ['planAdjustments'],
    queryFn: async () => {
      const response = await SDK.functions.invoke('suggestPlanAdjustments', { plan_type: 'general' });
      return response.data?.data || null;
    },
    enabled: false
  });

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setConversation(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsTyping(true);

    try {
      const response = await SDK.integrations.Core.InvokeLLM({
        prompt: `You are an expert health coach having a conversation with a user. 

Previous conversation:
${conversation.map(m => `${m.role}: ${m.content}`).join('\n')}

User: ${userMessage}

Provide a helpful, supportive, and actionable response. Be conversational and empathetic. If the user asks about workout plans, meal plans, or wellness strategies, offer to generate personalized recommendations.`,
        response_json_schema: {
          type: "object",
          properties: {
            response: { type: "string" }
          }
        }
      });

      setConversation(prev => [...prev, { 
        role: 'assistant', 
        content: response.response 
      }]);
    } catch (error) {
      toast.error('Failed to get response');
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  return (
    <Card className="h-[700px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-600" />
          Your AI Health Coach
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mx-4 grid grid-cols-7">
            <TabsTrigger value="chat" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="workout" className="gap-2">
              <Dumbbell className="w-4 h-4" />
              Workout
            </TabsTrigger>
            <TabsTrigger value="meal" className="gap-2">
              <Apple className="w-4 h-4" />
              Meals
            </TabsTrigger>
            <TabsTrigger value="recipes" className="gap-2">
              <ChefHat className="w-4 h-4" />
              Recipes
            </TabsTrigger>
            <TabsTrigger value="progress" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Progress
            </TabsTrigger>
            <TabsTrigger value="adjustments" className="gap-2">
              <Lightbulb className="w-4 h-4" />
              Adjust
            </TabsTrigger>
            <TabsTrigger value="wellness" className="gap-2">
              <Brain className="w-4 h-4" />
              Wellness
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="flex-1 flex flex-col m-0 p-4 space-y-4">
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <AnimatePresence>
                {conversation.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-3",
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shrink-0">
                        <Heart className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                        message.role === 'user'
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                      )}
                    >
                      {message.content}
                    </div>
                  </motion.div>
                ))}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                      <Heart className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Input
                placeholder="Ask about your health goals, workouts, nutrition..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isTyping}
              />
              <Button onClick={handleSendMessage} disabled={isTyping || !chatInput.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          {/* Workout Plan Tab */}
          <TabsContent value="workout" className="flex-1 overflow-y-auto p-4 space-y-4">
            {!workoutPlan && !loadingWorkout && (
              <div className="text-center py-12">
                <Dumbbell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Get a personalized 7-day workout plan
                </p>
                <Button onClick={() => refetchWorkout()} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Generate Workout Plan
                </Button>
              </div>
            )}

            {loadingWorkout && (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  Creating your personalized workout plan...
                </p>
              </div>
            )}

            {workoutPlan && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Your Workout Plan</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{workoutPlan.overview}</p>
                </div>

                {workoutPlan.weekly_schedule?.map((day, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{day.day} - {day.workout_name}</CardTitle>
                        <Badge>{day.intensity}</Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {day.duration_minutes} minutes • Focus: {day.focus}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {day.exercises?.map((exercise, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5" />
                          <div>
                            <p className="font-medium">{exercise.name}</p>
                            <p className="text-xs text-slate-500">
                              {exercise.sets} sets × {exercise.reps} reps
                              {exercise.notes && ` • ${exercise.notes}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}

                {workoutPlan.tips && (
                  <Card className="bg-teal-50 dark:bg-teal-950">
                    <CardHeader>
                      <CardTitle className="text-sm">Pro Tips</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm space-y-1">
                        {workoutPlan.tips.map((tip, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="text-teal-600">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <Button variant="outline" onClick={() => refetchWorkout()} className="w-full">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Regenerate Plan
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Meal Plan Tab */}
          <TabsContent value="meal" className="flex-1 overflow-y-auto p-4 space-y-4">
            {!mealPlan && !loadingMeal && (
              <div className="text-center py-12">
                <Apple className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Get a personalized 7-day meal plan
                </p>
                <Button onClick={() => refetchMeal()} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Generate Meal Plan
                </Button>
              </div>
            )}

            {loadingMeal && (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  Creating your personalized meal plan...
                </p>
              </div>
            )}

            {mealPlan && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Your Meal Plan</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">{mealPlan.overview}</p>
                  {mealPlan.daily_target && (
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div>
                        <p className="font-semibold">{mealPlan.daily_target.calories}</p>
                        <p className="text-slate-500">Calories</p>
                      </div>
                      <div>
                        <p className="font-semibold">{mealPlan.daily_target.protein_g}g</p>
                        <p className="text-slate-500">Protein</p>
                      </div>
                      <div>
                        <p className="font-semibold">{mealPlan.daily_target.carbs_g}g</p>
                        <p className="text-slate-500">Carbs</p>
                      </div>
                      <div>
                        <p className="font-semibold">{mealPlan.daily_target.fat_g}g</p>
                        <p className="text-slate-500">Fat</p>
                      </div>
                    </div>
                  )}
                </div>

                {mealPlan.weekly_meals?.map((day, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-base">{day.day}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {day.meals?.map((meal, idx) => (
                        <div key={idx} className="border-l-2 border-green-500 pl-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm capitalize">{meal.meal_type}</p>
                            <Badge variant="outline">{meal.calories} cal</Badge>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{meal.name}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {meal.prep_time_minutes} min prep
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}

                {mealPlan.shopping_list && (
                  <Card className="bg-amber-50 dark:bg-amber-950">
                    <CardHeader>
                      <CardTitle className="text-sm">Shopping List</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {mealPlan.shopping_list.map((item, idx) => (
                          <div key={idx} className="flex gap-2">
                            <CheckCircle className="w-4 h-4 text-amber-600" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button variant="outline" onClick={() => refetchMeal()} className="w-full">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Regenerate Plan
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Recipes Tab */}
          <TabsContent value="recipes" className="flex-1 overflow-y-auto p-4 space-y-4">
            {!recipes?.length && !loadingRecipes && (
              <div className="text-center py-12">
                <ChefHat className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Get personalized recipe suggestions
                </p>
                <Button onClick={() => refetchRecipes()} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Generate Recipes
                </Button>
              </div>
            )}

            {loadingRecipes && (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  Creating personalized recipes...
                </p>
              </div>
            )}

            {recipes?.length > 0 && (
              <div className="space-y-4">
                {recipes.map((recipe, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{recipe.name}</CardTitle>
                          <p className="text-xs text-slate-500 mt-1">{recipe.cuisine} • {recipe.difficulty}</p>
                        </div>
                        <Badge>{recipe.meal_type}</Badge>
                      </div>
                      <div className="flex gap-3 text-xs text-slate-500 mt-2">
                        <span><Clock className="w-3 h-3 inline mr-1" />Prep: {recipe.prep_time_minutes}m</span>
                        <span><Clock className="w-3 h-3 inline mr-1" />Cook: {recipe.cook_time_minutes}m</span>
                        <span>Servings: {recipe.servings}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-4 gap-2 text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div>
                          <p className="text-lg font-semibold">{recipe.calories_per_serving}</p>
                          <p className="text-xs text-slate-500">Calories</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold">{recipe.macros?.protein_g}g</p>
                          <p className="text-xs text-slate-500">Protein</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold">{recipe.macros?.carbs_g}g</p>
                          <p className="text-xs text-slate-500">Carbs</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold">{recipe.macros?.fat_g}g</p>
                          <p className="text-xs text-slate-500">Fat</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm mb-2">Ingredients</h4>
                        <ul className="space-y-1 text-sm">
                          {recipe.ingredients?.map((ing, idx) => (
                            <li key={idx} className="flex gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                              <span>{ing.amount} {ing.item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm mb-2">Instructions</h4>
                        <ol className="space-y-2 text-sm">
                          {recipe.instructions?.map((step, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span className="font-semibold text-teal-600">{idx + 1}.</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {recipe.dietary_tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {recipe.dietary_tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                <Button variant="outline" onClick={() => refetchRecipes()} className="w-full">
                  <ChefHat className="w-4 h-4 mr-2" />
                  Get New Recipes
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Progress Report Tab */}
          <TabsContent value="progress" className="flex-1 overflow-y-auto p-4 space-y-4">
            {!progressReport && !loadingProgress && (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Get detailed progress insights with correlations
                </p>
                <Button onClick={() => refetchProgress()} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Generate Progress Report
                </Button>
              </div>
            )}

            {loadingProgress && (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  Analyzing your health trends...
                </p>
              </div>
            )}

            {progressReport && (
              <div className="space-y-4">
                <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
                  <CardHeader>
                    <CardTitle className="text-base">Progress Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{progressReport.summary}</p>
                  </CardContent>
                </Card>

                {progressReport.key_achievements?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        Key Achievements
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {progressReport.key_achievements.map((achievement, idx) => (
                          <li key={idx} className="flex gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                            {achievement}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {progressReport.correlations?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Key Correlations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {progressReport.correlations.map((corr, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-sm">{corr.finding}</h4>
                            <Badge className="text-xs">{corr.strength}</Badge>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                            {corr.description}
                          </p>
                          <p className="text-xs font-medium text-teal-700 dark:text-teal-400">
                            💡 {corr.recommendation}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {progressReport.goal_progress?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Goal Progress</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {progressReport.goal_progress.map((goal, idx) => (
                        <div key={idx}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{goal.goal_name}</span>
                            <Badge variant={goal.status === 'on_track' ? 'default' : 'outline'}>
                              {goal.progress_percent}%
                            </Badge>
                          </div>
                          <Progress value={goal.progress_percent} className="h-2 mb-2" />
                          <p className="text-xs text-slate-600 dark:text-slate-400">{goal.next_steps}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Button variant="outline" onClick={() => refetchProgress()} className="w-full">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Refresh Report
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Plan Adjustments Tab */}
          <TabsContent value="adjustments" className="flex-1 overflow-y-auto p-4 space-y-4">
            {!planAdjustments && !loadingAdjustments && (
              <div className="text-center py-12">
                <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Get AI-powered plan adjustment suggestions
                </p>
                <Button onClick={() => refetchAdjustments()} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Analyze & Suggest
                </Button>
              </div>
            )}

            {loadingAdjustments && (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  Analyzing your performance...
                </p>
              </div>
            )}

            {planAdjustments && (
              <div className="space-y-4">
                <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
                  <CardHeader>
                    <CardTitle className="text-base">Assessment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{planAdjustments.overall_assessment}</p>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-3 italic">
                      {planAdjustments.encouragement}
                    </p>
                  </CardContent>
                </Card>

                {planAdjustments.suggested_changes?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Suggested Changes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {planAdjustments.suggested_changes.map((change, idx) => (
                        <div key={idx} className="p-3 border-l-4 border-teal-500 bg-slate-50 dark:bg-slate-800 rounded-r-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm capitalize">{change.area.replace('_', ' ')}</h4>
                            <Badge className="text-xs">{change.confidence}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-2">
                            <span className="flex items-center gap-1">
                              <ArrowDownCircle className="w-3 h-3" />
                              {change.current_level}
                            </span>
                            <span>→</span>
                            <span className="flex items-center gap-1">
                              <ArrowUpCircle className="w-3 h-3 text-teal-600" />
                              {change.suggested_level}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 mb-1">
                            {change.reason}
                          </p>
                          <p className="text-xs font-medium text-teal-700 dark:text-teal-400">
                            How: {change.implementation}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {planAdjustments.priority_actions?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Priority Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {planAdjustments.priority_actions.map((action, idx) => (
                        <div key={idx} className="p-3 bg-teal-50 dark:bg-teal-950 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-sm">{action.action}</h4>
                            <Badge variant={action.priority === 'high' ? 'destructive' : 'default'} className="text-xs">
                              {action.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                            Benefit: {action.expected_benefit}
                          </p>
                          <p className="text-xs text-slate-500">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {action.timeframe}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {planAdjustments.workout_modifications && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Dumbbell className="w-4 h-4" />
                        Workout Modifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div>
                        <p className="font-medium">Duration:</p>
                        <p className="text-slate-600 dark:text-slate-400">{planAdjustments.workout_modifications.duration_adjustment}</p>
                      </div>
                      <div>
                        <p className="font-medium">Intensity:</p>
                        <p className="text-slate-600 dark:text-slate-400">{planAdjustments.workout_modifications.intensity_adjustment}</p>
                      </div>
                      <div>
                        <p className="font-medium">Frequency:</p>
                        <p className="text-slate-600 dark:text-slate-400">{planAdjustments.workout_modifications.frequency_adjustment}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button variant="outline" onClick={() => refetchAdjustments()} className="w-full">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Get New Suggestions
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Wellness Tab */}
          <TabsContent value="wellness" className="flex-1 overflow-y-auto p-4 space-y-4">
            {!wellnessAnalysis && !loadingWellness && (
              <div className="text-center py-12">
                <Brain className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Get personalized stress management and sleep strategies
                </p>
                <Button onClick={() => refetchWellness()} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Analyze My Wellness
                </Button>
              </div>
            )}

            {loadingWellness && (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  Analyzing your mood and sleep patterns...
                </p>
              </div>
            )}

            {wellnessAnalysis && (
              <div className="space-y-4">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                  <CardHeader>
                    <CardTitle className="text-base">Wellness Assessment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium mb-1">Mood:</p>
                      <p className="text-slate-700 dark:text-slate-300">{wellnessAnalysis.mood_assessment}</p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Sleep:</p>
                      <p className="text-slate-700 dark:text-slate-300">{wellnessAnalysis.sleep_assessment}</p>
                    </div>
                  </CardContent>
                </Card>

                {wellnessAnalysis.stress_management_techniques && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Stress Management Techniques</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {wellnessAnalysis.stress_management_techniques.map((technique, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm">{technique.technique}</h4>
                            <Badge className="text-xs">{technique.difficulty}</Badge>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                            {technique.description}
                          </p>
                          <div className="flex gap-4 text-xs text-slate-500">
                            <span><Clock className="w-3 h-3 inline mr-1" />{technique.duration_minutes} min</span>
                            <span>Use: {technique.when_to_use}</span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {wellnessAnalysis.sleep_improvement_strategies && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Moon className="w-4 h-4" />
                        Sleep Improvement Strategies
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {wellnessAnalysis.sleep_improvement_strategies.map((strategy, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{strategy.strategy}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">{strategy.description}</p>
                            <div className="flex gap-3 mt-1 text-xs">
                              <Badge variant="outline">Impact: {strategy.expected_impact}</Badge>
                              <span className="text-slate-500">{strategy.timeframe}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {wellnessAnalysis.immediate_actions && (
                  <Card className="bg-teal-50 dark:bg-teal-950">
                    <CardHeader>
                      <CardTitle className="text-sm">Start Today</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm space-y-1">
                        {wellnessAnalysis.immediate_actions.map((action, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="text-teal-600">•</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <Button variant="outline" onClick={() => refetchWellness()} className="w-full">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Refresh Analysis
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}