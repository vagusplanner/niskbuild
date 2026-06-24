import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ProactiveEventSuggestions({ onEventCreated }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: () => SDK.entities.Event.list('-start_date', 50)
  });

  const { data: userPreferences = {} } = useQuery({
    queryKey: ['userSettings'],
    queryFn: async () => {
      const settings = await SDK.entities.UserSettings.list();
      return settings[0] || {};
    }
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => SDK.entities.Goal.filter({ status: 'in_progress' }, '-priority', 5)
  });

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const { data } = await SDK.functions.invoke('aiProactiveEventSuggestions', {
        calendar_events: events,
        user_preferences: {
          timezone: userPreferences.timezone,
          interests: userPreferences.travel_interests || [],
          focus_areas: userPreferences.focus_areas || [],
          work_style: userPreferences.work_style
        },
        hijri_date: {
          day: new Date().getDate(),
          month: new Date().getMonth() + 1,
          monthName: 'Current',
          year: new Date().getFullYear()
        },
        user_goals: goals.map(g => ({ title: g.title, category: g.category, progress: g.progress }))
      });

      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast.error('Failed to generate suggestions');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Don't auto-generate - let user manually trigger

  const handleCreateEvent = async (suggestion) => {
    try {
      const startDate = suggestion.due_date
        ? new Date(suggestion.due_date)
        : new Date();

      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);

      await SDK.entities.Event.create({
        title: suggestion.title,
        description: suggestion.description,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        category: suggestion.is_islamic ? 'prayer' : 'personal',
        is_all_day: false,
        reminders: [{ minutes_before: 30, type: 'notification' }]
      });

      toast.success(`Event "${suggestion.title}" created!`);
      onEventCreated?.();
      setSelectedSuggestion(null);
      setSuggestions(prev => prev.filter(s => s.title !== suggestion.title));
    } catch (error) {
      toast.error('Failed to create event');
    }
  };

  if (!suggestions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            AI Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={generateSuggestions} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing your calendar...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Suggestions
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            AI Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 text-center py-4">
            No suggestions at this time. Your calendar is well-organized!
          </p>
          <Button onClick={generateSuggestions} disabled={loading} variant="outline" className="w-full">
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          AI Suggestions ({suggestions.length})
        </CardTitle>
        <Button size="sm" variant="outline" onClick={generateSuggestions} disabled={loading}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <AnimatePresence>
            {suggestions.map((suggestion, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-slate-800">{suggestion.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{suggestion.description}</p>
                  </div>
                  <Badge className={`text-xs whitespace-nowrap ${
                    suggestion.priority === 'high'
                      ? 'bg-red-100 text-red-700'
                      : suggestion.priority === 'medium'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {suggestion.priority}
                  </Badge>
                </div>

                <p className="text-xs text-slate-600 mb-3 flex items-start gap-2">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{suggestion.reason}</span>
                </p>

                <Button
                  onClick={() => handleCreateEvent(suggestion)}
                  size="sm"
                  className="w-full bg-teal-600 hover:bg-teal-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add to Calendar
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}