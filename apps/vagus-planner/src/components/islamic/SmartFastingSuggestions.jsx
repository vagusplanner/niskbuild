import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, TrendingUp, Heart, Calendar, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function SmartFastingSuggestions() {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('suggestOptimalFastingDays', {
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
      toast.success('Fasting suggestions generated!');
    } catch (error) {
      toast.error('Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  };

  const addFastingToCalendar = async (date) => {
    try {
      await base44.entities.Event.create({
        title: 'Fasting Day - Sunnah',
        start_date: new Date(date + 'T00:00:00').toISOString(),
        end_date: new Date(date + 'T23:59:59').toISOString(),
        category: 'health',
        is_all_day: true,
        color: 'purple'
      });
      toast.success('Fasting added to calendar');
    } catch (error) {
      toast.error('Failed to add to calendar');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Smart Fasting Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Month</label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="w-full mt-1 p-2 border rounded text-sm"
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
              <label className="text-sm font-medium">Year</label>
              <input
                type="number"
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="w-full mt-1 p-2 border rounded text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={fetchSuggestions}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Get Suggestions
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggestions Display */}
      {suggestions && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-xs text-purple-600 font-semibold mb-1">Recommended Days</p>
                  <p className="text-3xl font-bold text-purple-900">{suggestions.total_recommended}</p>
                  <p className="text-xs text-purple-700 mt-2">{suggestions.fasting_pattern}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-xs text-emerald-600 font-semibold mb-1">Streak Goal</p>
                  <p className="text-2xl font-bold text-emerald-900 flex items-center justify-center gap-1">
                    <TrendingUp className="w-5 h-5" />
                    {suggestions.streak_opportunity || 'Variable'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-xs text-blue-600 font-semibold mb-1">Difficulty</p>
                  <div className="flex justify-center gap-1 mt-2">
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={`h-2 w-8 rounded ${i <= Math.ceil(suggestions.optimal_days.length / 3) ? 'bg-blue-600' : 'bg-blue-300'}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-blue-700 mt-2">Balanced</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Motivational Insight */}
          {suggestions.motivational_insight && (
            <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-purple-200">
              <CardContent className="pt-6">
                <p className="text-sm text-indigo-900 italic">{suggestions.motivational_insight}</p>
              </CardContent>
            </Card>
          )}

          {/* Optimal Days */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Optimal Fasting Days
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {suggestions.optimal_days?.map((day, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        {day.day_name}, {day.date}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">{day.reason}</p>
                    </div>
                    <div className="flex gap-1">
                      <Badge className={
                        day.priority === 'high' ? 'bg-red-600' :
                        day.priority === 'medium' ? 'bg-yellow-600' :
                        'bg-blue-600'
                      }>
                        {day.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {day.difficulty}
                      </Badge>
                    </div>
                  </div>

                  {day.tips?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-slate-700 mb-1">Tips:</p>
                      <ul className="text-xs space-y-0.5">
                        {day.tips.map((tip, i) => (
                          <li key={i} className="text-slate-600">💡 {tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {day.Islamic_significance && (
                    <p className="text-xs text-emerald-700 mb-2">
                      <Heart className="w-3 h-3 inline mr-1" />
                      {day.Islamic_significance}
                    </p>
                  )}

                  <Button
                    onClick={() => addFastingToCalendar(day.date)}
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                  >
                    Add to Calendar
                  </Button>
                </motion.div>
              ))}
            </CardContent>
          </Card>

          {/* Health Considerations */}
          {suggestions.health_considerations && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6 flex gap-3">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-900 mb-1">Health Considerations</p>
                  <p className="text-xs text-blue-800">{suggestions.health_considerations}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Milestones */}
          {suggestions.milestone_opportunities?.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-base">Milestone Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {suggestions.milestone_opportunities.map((milestone, idx) => (
                    <Badge key={idx} className="bg-amber-600 text-amber-50">
                      🏆 {milestone}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}