import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, TrendingUp, Heart, Calendar, AlertCircle, Moon, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function SmartFastingSuggestions() {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data } = await SDK.functions.invoke('suggestOptimalFastingDays', {
        month: selectedMonth,
        year: selectedYear,
        user_preferences: {
          type: 'voluntary',
          experience: 'intermediate',
          work_intensity: 'moderate'
        },
        fasting_history: []
      });
      setSuggestions(data);
      setExpanded(true);
      toast.success('Fasting suggestions generated!');
    } catch (error) {
      toast.error('Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  };

  const addFastingToCalendar = async (day) => {
    try {
      await SDK.entities.Event.create({
        title: `🌙 Fasting - ${day.reason}`,
        description: day.Islamic_significance || 'Voluntary fasting day',
        start_date: new Date(day.date + 'T00:00:00').toISOString(),
        end_date: new Date(day.date + 'T23:59:59').toISOString(),
        category: 'prayer',
        is_all_day: true,
        color: '#9333ea',
        notes: day.tips?.join('\n') || ''
      });
      
      // Also create fasting record
      await SDK.entities.FastingRecord.create({
        date: day.date,
        type: 'voluntary',
        completed: false,
        intention_set: true
      });
      
      toast.success('Fasting day added to calendar');
    } catch (error) {
      toast.error('Failed to add to calendar');
    }
  };

  const addAllToCalendar = async () => {
    if (!suggestions?.optimal_days) return;
    
    setLoading(true);
    try {
      for (const day of suggestions.optimal_days) {
        await addFastingToCalendar(day);
        await new Promise(resolve => setTimeout(resolve, 200)); // Small delay between requests
      }
      toast.success(`Added ${suggestions.optimal_days.length} fasting days to calendar`);
    } catch (error) {
      toast.error('Failed to add all days');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-pink-50/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
              <Moon className="w-4 h-4 text-white" />
            </div>
            AI Fasting Suggestions
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-8 w-8 p-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="space-y-4">
              {/* Controls */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {[
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'
                    ].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Year</label>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={e => setSelectedYear(parseInt(e.target.value))}
                    className="w-full mt-1 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={fetchSuggestions}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Suggest
                  </Button>
                </div>
              </div>

              {/* Suggestions Display */}
              {suggestions && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="space-y-4 mt-4"
                >
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl border border-purple-300">
                      <p className="text-xs text-purple-700 font-semibold mb-1">Recommended</p>
                      <p className="text-2xl font-bold text-purple-900">{suggestions.total_recommended}</p>
                      <p className="text-xs text-purple-700 mt-1">{suggestions.fasting_pattern}</p>
                    </div>

                    <div className="p-3 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl border border-emerald-300">
                      <p className="text-xs text-emerald-700 font-semibold mb-1">Streak Goal</p>
                      <p className="text-xl font-bold text-emerald-900 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        {suggestions.streak_opportunity || 'Variable'}
                      </p>
                    </div>

                    <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl border border-blue-300">
                      <p className="text-xs text-blue-700 font-semibold mb-1">Difficulty</p>
                      <div className="flex gap-1 mt-2">
                        {[1, 2, 3].map(i => (
                          <div
                            key={i}
                            className={`h-1.5 w-6 rounded ${i <= Math.ceil(suggestions.optimal_days.length / 3) ? 'bg-blue-600' : 'bg-blue-300'}`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-blue-700 mt-1">Balanced</p>
                    </div>
                  </div>

                  {/* Motivational Insight */}
                  {suggestions.motivational_insight && (
                    <div className="p-3 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl border border-purple-200">
                      <p className="text-sm text-indigo-900 italic flex items-start gap-2">
                        <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        {suggestions.motivational_insight}
                      </p>
                    </div>
                  )}

                  {/* Action Button */}
                  <Button
                    onClick={addAllToCalendar}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Calendar className="w-4 h-4 mr-2" />
                    )}
                    Add All {suggestions.total_recommended} Days to Calendar
                  </Button>

                  {/* Optimal Days List */}
                  <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                    {suggestions.optimal_days?.map((day, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="p-3 bg-white rounded-lg border border-slate-200 hover:border-purple-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 text-sm">
                              {day.day_name}, {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </h4>
                            <p className="text-xs text-slate-600 mt-0.5">{day.reason}</p>
                          </div>
                          <div className="flex gap-1">
                            <Badge className={
                              day.priority === 'high' ? 'bg-red-600 text-xs' :
                              day.priority === 'medium' ? 'bg-yellow-600 text-xs' :
                              'bg-blue-600 text-xs'
                            }>
                              {day.priority}
                            </Badge>
                          </div>
                        </div>

                        {day.Islamic_significance && (
                          <p className="text-xs text-emerald-700 mb-2 flex items-start gap-1">
                            <Heart className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span>{day.Islamic_significance}</span>
                          </p>
                        )}

                        {day.tips?.length > 0 && (
                          <div className="mb-2 p-2 bg-slate-50 rounded">
                            <p className="text-xs font-semibold text-slate-700 mb-1">Tips:</p>
                            <ul className="text-xs space-y-0.5">
                              {day.tips.slice(0, 2).map((tip, i) => (
                                <li key={i} className="text-slate-600">💡 {tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <Button
                          onClick={() => addFastingToCalendar(day)}
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 w-full border-purple-300 hover:bg-purple-50"
                        >
                          <Calendar className="w-3 h-3 mr-1" />
                          Add This Day
                        </Button>
                      </motion.div>
                    ))}
                  </div>

                  {/* Health Considerations */}
                  {suggestions.health_considerations && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-blue-900 mb-1">Health Note</p>
                        <p className="text-xs text-blue-800">{suggestions.health_considerations}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}