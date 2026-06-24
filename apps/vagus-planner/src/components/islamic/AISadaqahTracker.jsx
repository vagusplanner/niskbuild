import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Hand, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

export default function AISadaqahTracker() {
  const [opportunities, setOpportunities] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-start_date', 20)
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list()
  });

  const generateOpportunities = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('aiSadaqahOpportunities', {
        calendar_events: events.slice(0, 10),
        health_events: [], // Could fetch from health module
        personal_milestones: goals.filter(g => g.status === 'completed'),
        user_preferences: {}
      });
      setOpportunities(data.data);
    } catch (error) {
      console.error('Error generating opportunities:', error);
      toast.error('Failed to generate opportunities');
    } finally {
      setLoading(false);
    }
  };

  const recordSadaqah = async (opportunity) => {
    try {
      if (opportunity.type === 'monetary') {
        await base44.entities.CharitableGiving.create({
          type: 'sadaqah',
          amount: opportunity.suggested_amount || 10,
          currency: 'USD',
          date: new Date().toISOString().split('T')[0],
          recipient: opportunity.category,
          category: opportunity.category,
          notes: opportunity.title
        });
        toast.success('Sadaqah recorded! May Allah accept it from you 🤲');
      } else {
        toast.success('Great intention! May Allah reward you for your action 🤲');
      }
      // Refresh opportunities
      await generateOpportunities();
    } catch (error) {
      toast.error('Failed to record Sadaqah');
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Hand className="w-5 h-5 text-blue-600" />
          AI Sadaqah Opportunities
        </CardTitle>
        <Button 
          onClick={generateOpportunities}
          disabled={loading}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Discovering...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Discover
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent>
        {!opportunities ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-600 mb-4">
              Find meaningful Sadaqah opportunities aligned with your life
            </p>
            <Button 
              onClick={generateOpportunities}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Loading...' : 'Discover Opportunities'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Focus */}
            {opportunities.current_month_focus && (
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4 border border-purple-300">
                <p className="font-semibold text-purple-900 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  This Month's Focus
                </p>
                <p className="text-sm text-purple-800 mt-2">{opportunities.current_month_focus}</p>
              </div>
            )}

            {/* Opportunities */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-slate-800">Suggested Opportunities:</h4>
              <AnimatePresence>
                {opportunities.opportunities.map((opp, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-lg p-4 border border-blue-100"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{opp.title}</p>
                        <p className="text-sm text-slate-600 mt-1">{opp.description}</p>
                      </div>
                      <Badge className={`ml-2 whitespace-nowrap ${
                        opp.type === 'monetary'
                          ? 'bg-green-100 text-green-700'
                          : opp.type === 'time'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {opp.type === 'monetary' ? `$${opp.suggested_amount}` : opp.type}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-600 mb-2">
                      <span className="font-semibold">Connection:</span> {opp.connection}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <Badge variant="outline" className="text-xs">{opp.category}</Badge>
                      <Badge variant="outline" className="text-xs">{opp.best_time}</Badge>
                      <Badge 
                        className={`text-xs ${
                          opp.effort === 'high'
                            ? 'bg-red-100 text-red-700'
                            : opp.effort === 'medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {opp.effort} effort
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-700 bg-slate-50 rounded p-2 mb-3">
                      📖 <span className="italic">{opp.reward}</span>
                    </p>

                    <p className="text-xs text-slate-600 mb-3">
                      <span className="font-semibold">How:</span> {opp.implementation}
                    </p>

                    <Button
                      onClick={() => recordSadaqah(opp)}
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {opp.type === 'monetary' ? '🤲 Give Sadaqah' : '✅ I Will Do This'}
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Daily Habits */}
            {opportunities.daily_habits && (
              <div className="mt-6 pt-4 border-t border-blue-200">
                <h4 className="font-semibold text-sm text-slate-800 mb-3">Daily Sadaqah Habits:</h4>
                <div className="grid gap-2">
                  {opportunities.daily_habits.map((habit, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-slate-50 rounded p-3 border border-blue-100"
                    >
                      <p className="font-semibold text-sm text-slate-800">{habit.habit}</p>
                      <p className="text-xs text-slate-600 mt-1">{habit.impact}</p>
                      <Badge variant="outline" className="text-xs mt-2">
                        {habit.effort} effort
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}