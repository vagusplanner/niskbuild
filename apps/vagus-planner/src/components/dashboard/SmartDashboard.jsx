import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, TrendingUp, Zap, Calendar, AlertCircle, 
  Target, Heart, DollarSign, Flame
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { formatCurrency } from '@/components/utils/currencyFormatter';

export default function SmartDashboard() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: briefing } = useQuery({
    queryKey: ['daily-briefing', today],
    queryFn: async () => {
      const briefings = await base44.entities.DailyBriefing.filter({ date: today }, '-created_date', 1);
      return briefings[0];
    }
  });

  const { data: energyLogs = [] } = useQuery({
    queryKey: ['energy-logs'],
    queryFn: () => base44.entities.EnergyLog.list('-date', 7)
  });

  const { data: habits = [] } = useQuery({
    queryKey: ['active-habits'],
    queryFn: () => base44.entities.Habit.filter({ is_active: true })
  });

  const { data: financialEvents = [] } = useQuery({
    queryKey: ['upcoming-bills'],
    queryFn: () => base44.entities.FinancialEvent.filter({ 
      status: 'pending',
      due_date: { $gte: today }
    }, 'due_date', 5)
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });

  const userCurrency = settings[0]?.currency || 'USD';

  const avgEnergy = energyLogs.length > 0 
    ? (energyLogs.reduce((sum, log) => sum + log.energy_level, 0) / energyLogs.length).toFixed(1)
    : 0;

  const totalHabitStreak = habits.reduce((sum, h) => sum + (h.streak || 0), 0);

  return (
    <div className="space-y-6">
      {/* AI Briefing Card */}
      {briefing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-xl">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Today's AI Briefing</CardTitle>
                  <p className="text-sm text-blue-600">Personalized insights</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-700 leading-relaxed">{briefing.summary}</p>
              
              {briefing.top_priorities && briefing.top_priorities.length > 0 && (
                <div className="p-4 bg-white/60 rounded-lg">
                  <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    Top Priorities
                  </h4>
                  <ul className="space-y-1">
                    {briefing.top_priorities.map((priority, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-blue-600 font-bold">{i + 1}.</span>
                        {priority}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {briefing.stress_alert && (
                <div className="flex items-center gap-2 p-3 bg-orange-100 rounded-lg text-orange-800">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">High schedule density today - consider blocking focus time</span>
                </div>
              )}

              {briefing.ai_advice && (
                <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-900 italic">💡 {briefing.ai_advice}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Energy Level</p>
                <p className="text-2xl font-bold text-emerald-700">{avgEnergy}/10</p>
              </div>
              <Zap className="w-8 h-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Habit Streak</p>
                <p className="text-2xl font-bold text-orange-700">{totalHabitStreak}</p>
              </div>
              <Flame className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Events Today</p>
                <p className="text-2xl font-bold text-blue-700">{briefing?.events_count || 0}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pending Bills</p>
                <p className="text-2xl font-bold text-purple-700">{financialEvents.length}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Habits */}
      {habits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Active Habits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {habits.map(habit => (
                <div key={habit.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      habit.category === 'health' ? 'bg-green-500' :
                      habit.category === 'spiritual' ? 'bg-purple-500' :
                      'bg-blue-500'
                    }`} />
                    <div>
                      <p className="font-medium text-slate-800">{habit.title}</p>
                      <p className="text-xs text-slate-500">
                        {habit.trigger_type === 'event_based' 
                          ? `Stacked ${habit.when} ${habit.trigger_event_category} events`
                          : `Triggers at ${habit.trigger_time}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="font-bold text-orange-600">{habit.streak || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Bills */}
      {financialEvents.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-600" />
              Upcoming Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {financialEvents.map(bill => (
                <div key={bill.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800">{bill.title}</p>
                    <p className="text-sm text-slate-600">Due: {format(new Date(bill.due_date), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-700">{formatCurrency(bill.amount, userCurrency)}</p>
                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                      {bill.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}