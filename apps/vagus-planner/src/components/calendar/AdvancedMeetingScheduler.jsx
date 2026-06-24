import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Sparkles, 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  Loader2,
  Plus,
  X,
  CheckCircle2
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdvancedMeetingScheduler({ isOpen, onClose, onSelectTime }) {
  const [constraints, setConstraints] = useState('');
  const [attendees, setAttendees] = useState([]);
  const [newAttendee, setNewAttendee] = useState('');
  const [duration, setDuration] = useState(60);
  const [suggestions, setSuggestions] = useState([]);
  const [insights, setInsights] = useState(null);

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('advancedMeetingScheduler', {
        constraints,
        attendeeEmails: attendees,
        duration
      });
      return data;
    },
    onSuccess: (data) => {
      setSuggestions(data.suggestions || []);
      setInsights(data.team_insights);
      toast.success(`Found ${data.suggestions?.length || 0} optimal time slots!`);
    },
    onError: (error) => {
      toast.error('Failed to find meeting times');
      console.error('Scheduler error:', error);
    }
  });

  const handleAddAttendee = () => {
    if (newAttendee.trim() && !attendees.includes(newAttendee.trim())) {
      setAttendees([...attendees, newAttendee.trim()]);
      setNewAttendee('');
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    onSelectTime?.({
      start_date: suggestion.start_time,
      end_date: suggestion.end_time
    });
    onClose();
  };

  const exampleConstraints = [
    'Find a 1-hour slot next week, avoid Tuesday afternoons',
    'Schedule for next Monday-Wednesday between 9 AM and 4 PM',
    'Find a time in the next 2 weeks, need at least 3 days notice, prefer mornings'
  ];

  return (
    <div className="space-y-6">
          {/* Constraints Input */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Describe your scheduling constraints
            </label>
            <Textarea
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder="E.g., 'Find a 1-hour slot next week, but avoid Tuesday afternoons, and ensure at least 3 days notice'"
              rows={3}
              className="resize-none"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {exampleConstraints.map((example, i) => (
                <button
                  key={i}
                  onClick={() => setConstraints(example)}
                  className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Attendees */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Attendees (optional - for team availability check)
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newAttendee}
                onChange={(e) => setNewAttendee(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddAttendee()}
                placeholder="Email address"
                className="flex-1"
              />
              <Button onClick={handleAddAttendee} size="icon" variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {attendees.map((email, i) => (
                <Badge key={i} variant="outline" className="gap-1">
                  {email}
                  <button onClick={() => setAttendees(attendees.filter((_, idx) => idx !== i))}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Meeting Duration (minutes)
            </label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              min={15}
              step={15}
              className="w-32"
            />
          </div>

          {/* Find Times Button */}
          <Button
            onClick={() => scheduleMutation.mutate()}
            disabled={!constraints.trim() || scheduleMutation.isPending}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-600"
          >
            {scheduleMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing calendars...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Find Optimal Times
              </>
            )}
          </Button>

          {/* Team Insights */}
          {insights && (
            <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Team Insights
              </h3>
              <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                {insights.busiest_member && (
                  <p>📊 Busiest member: {insights.busiest_member}</p>
                )}
                {insights.common_free_times && insights.common_free_times.length > 0 && (
                  <p>⏰ Common free times: {insights.common_free_times.join(', ')}</p>
                )}
                {insights.recommended_duration && (
                  <p>💡 Recommended duration: {insights.recommended_duration} minutes</p>
                )}
              </div>
            </Card>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Suggested Time Slots</h3>
              <div className="space-y-3">
                {suggestions.map((suggestion, i) => (
                  <Card
                    key={i}
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleSelectSuggestion(suggestion)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-teal-600" />
                          <span className="font-medium">
                            {format(new Date(suggestion.start_time), 'EEE, MMM d, yyyy')}
                          </span>
                          <Clock className="w-4 h-4 text-slate-400 ml-2" />
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {format(new Date(suggestion.start_time), 'h:mm a')} - {format(new Date(suggestion.end_time), 'h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                          {suggestion.reasoning}
                        </p>
                        {suggestion.caveats && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            ⚠️ {suggestion.caveats}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          className={
                            suggestion.quality_score >= 8
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : suggestion.quality_score >= 6
                              ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }
                        >
                          {suggestion.quality_score}/10
                        </Badge>
                        <Button size="sm" variant="outline">
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Select
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
          </div>
          );
          }