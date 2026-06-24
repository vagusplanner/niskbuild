import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Calendar, Clock, Users, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SmartMeetingTimeSelector({ meetingTitle, attendees, duration, onSelectTime }) {
  const [suggestions, setSuggestions] = useState(null);

  const suggestTimesMutation = useMutation({
    mutationFn: () => base44.functions.invoke('suggestOptimalMeetingTime', {
      meeting_title: meetingTitle,
      attendee_emails: attendees || [],
      duration_minutes: duration || 30,
      priority: 'medium'
    }),
    onSuccess: (response) => {
      setSuggestions(response.data);
      toast.success('AI found optimal meeting times!');
    },
    onError: () => {
      toast.error('Failed to suggest times');
    }
  });

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <Card className="border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Meeting Time Optimizer
        </CardTitle>
        <p className="text-xs text-slate-600">
          Find the best time based on everyone's availability and preferences
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!suggestions ? (
          <Button
            onClick={() => suggestTimesMutation.mutate()}
            disabled={suggestTimesMutation.isPending || !attendees || attendees.length === 0}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-600"
          >
            {suggestTimesMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing {attendees?.length || 0} schedules...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Find Optimal Times
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Analysis Summary */}
            {suggestions.analysis && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-900">
                {suggestions.analysis}
              </div>
            )}

            {/* Suggested Time Slots */}
            <div className="space-y-2">
              {suggestions.optimal_slots?.map((slot, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card 
                    className="hover:shadow-md transition-all cursor-pointer border-l-4"
                    style={{ borderLeftColor: slot.score >= 8 ? '#10b981' : slot.score >= 6 ? '#f59e0b' : '#ef4444' }}
                    onClick={() => onSelectTime(slot)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-slate-600" />
                            <span className="font-semibold text-slate-800">
                              {format(new Date(slot.date), 'EEE, MMM d')}
                            </span>
                            <Clock className="w-4 h-4 text-slate-600 ml-2" />
                            <span className="text-slate-700">
                              {slot.start_time} - {slot.end_time}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">{slot.reasoning}</p>
                        </div>
                        <Badge className={`${getScoreColor(slot.score)} font-semibold`}>
                          {slot.score}/10
                        </Badge>
                      </div>

                      {slot.attendee_conflicts && slot.attendee_conflicts.length > 0 && (
                        <div className="mt-2 text-xs text-amber-700 bg-amber-50 rounded p-2">
                          ⚠️ Conflicts: {slot.attendee_conflicts.join(', ')}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Recommendations */}
            {suggestions.recommendations && suggestions.recommendations.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-slate-700">💡 Recommendations:</h4>
                {suggestions.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => suggestTimesMutation.mutate()}
              className="w-full"
            >
              <Sparkles className="w-3 h-3 mr-2" />
              Refresh Suggestions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}