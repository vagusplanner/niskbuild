import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, ArrowRight, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function DelegateSuggestions() {
  const [suggestions, setSuggestions] = useState([]);

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list()
  });

  useEffect(() => {
    generateSuggestions();
  }, [events]);

  const generateSuggestions = () => {
    const upcoming = events.filter(e => {
      const eventDate = new Date(e.start_date);
      const now = new Date();
      return eventDate > now && eventDate < new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    });

    const suggestions_list = [];

    upcoming.forEach(event => {
      let score = 0;
      let reasons = [];

      // Low value meetings
      if (event.category === 'personal' && event.title.toLowerCase().includes('info')) {
        score += 30;
        reasons.push('FYI meeting');
      }

      if (event.title.toLowerCase().includes('status') || event.title.toLowerCase().includes('standup')) {
        score += 25;
        reasons.push('Recurring standup');
      }

      // Short meetings
      const duration = (new Date(event.end_date) - new Date(event.start_date)) / 60000;
      if (duration < 15) {
        score += 15;
        reasons.push('Very short (delegate async update)');
      }

      // Repeating patterns
      if (event.is_recurring) {
        score += 10;
        reasons.push('Recurring (send recording next time)');
      }

      // No critical category
      if (!['work', 'health', 'spiritual'].includes(event.category)) {
        score += 10;
        reasons.push('Non-critical category');
      }

      if (score >= 40) {
        suggestions_list.push({
          id: event.id,
          event,
          score,
          reasons,
          delegate: {
            type: duration < 15 ? 'email' : 'colleague',
            text: duration < 15 
              ? `Can this be handled via email or Slack?` 
              : `Could a colleague attend instead?`
          }
        });
      }
    });

    setSuggestions(suggestions_list.sort((a, b) => b.score - a.score));
  };

  const handleDecline = (id) => {
    setSuggestions(suggestions.filter(s => s.id !== id));
    toast.success('Suggestion dismissed');
  };

  const handleDelegate = (suggestion) => {
    toast.success(`Suggested: ${suggestion.delegate.text}`);
    setSuggestions(suggestions.filter(s => s.id !== suggestion.id));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            Delegate Suggestions
          </CardTitle>
          <CardDescription>AI-powered suggestions to delegate or skip meetings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions.length > 0 ? (
            <div className="space-y-2">
              <AnimatePresence>
                {suggestions.map(suggestion => (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800"
                  >
                    <div className="mb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-slate-900 dark:text-slate-100">
                            {suggestion.event.title}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {new Date(suggestion.event.start_date).toLocaleDateString([], { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <Badge className="bg-yellow-600 dark:bg-yellow-500 text-white">
                          {suggestion.score}% skip
                        </Badge>
                      </div>
                    </div>

                    {/* Reasons */}
                    <div className="mb-3 flex flex-wrap gap-1">
                      {suggestion.reasons.map((reason, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-white dark:bg-slate-800">
                          {reason}
                        </Badge>
                      ))}
                    </div>

                    {/* Suggestion Text */}
                    <p className="text-xs text-yellow-800 dark:text-yellow-100 mb-3 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      {suggestion.delegate.text}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDelegate(suggestion)}
                      >
                        Delegate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleDecline(suggestion.id)}
                      >
                        Keep It
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                ✓ No meetings recommended for delegation
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}