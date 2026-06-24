import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SDK } from '@/lib/custom-sdk.js';
import { Sparkles, Loader2, Plus, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { addDays } from 'date-fns';

export default function AIScheduleSuggestions({ onAddEvent }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const nextWeek = addDays(today, 7);

      const { data } = await SDK.functions.invoke('aiSchedulingSuggestions', {
        date_range_start: today.toISOString(),
        date_range_end: nextWeek.toISOString()
      });

      if (data.success) {
        setSuggestions(data.suggestions);
        toast.success('AI generated scheduling suggestions!');
      }
    } catch (error) {
      toast.error('Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-amber-100 text-amber-800 border-amber-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200'
  };

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          AI Scheduling Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.length === 0 ? (
          <Button
            onClick={generateSuggestions}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing your schedule...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Get AI Suggestions
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Based on your habits & schedule:</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateSuggestions}
                disabled={loading}
              >
                Refresh
              </Button>
            </div>

            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-2 ${priorityColors[suggestion.priority]}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-semibold text-slate-800">{suggestion.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span className="text-xs text-slate-600">{suggestion.time_slot}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {suggestion.activity_type}
                  </Badge>
                </div>
                
                <p className="text-xs text-slate-600 mb-3">{suggestion.reasoning}</p>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (onAddEvent) {
                      onAddEvent({
                        title: suggestion.title,
                        description: suggestion.reasoning,
                        category: suggestion.activity_type.toLowerCase()
                      });
                    }
                  }}
                  className="w-full"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add to Calendar
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}