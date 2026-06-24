import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Heart, Clock, MapPin, Loader2, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function AIContextualDuaSuggester() {
  const [loading, setLoading] = useState(false);
  const [suggestedDuas, setSuggestedDuas] = useState([]);
  const [guidance, setGuidance] = useState('');
  const [autoDetect, setAutoDetect] = useState(true);

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['upcomingEvents'],
    queryFn: async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const events = await base44.entities.Event.filter({});
      return events.filter(e => {
        const eventDate = new Date(e.start_date);
        return eventDate >= today && eventDate <= tomorrow;
      }).slice(0, 3);
    }
  });

  const getCurrentTimeContext = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  };

  const detectSituation = () => {
    const timeContext = getCurrentTimeContext();
    const hasUpcomingMeetings = upcomingEvents.some(e => e.category === 'work');
    const hasTravel = upcomingEvents.some(e => e.category === 'holiday' || e.location);
    
    if (timeContext === 'morning') return 'starting_day';
    if (timeContext === 'evening') return 'ending_day';
    if (hasUpcomingMeetings) return 'before_meeting';
    if (hasTravel) return 'before_travel';
    return 'general_guidance';
  };

  const generateDuas = async (situation) => {
    setLoading(true);
    
    try {
      const result = await base44.functions.invoke('generatePersonalizedIslamicContent', {
        content_type: 'contextual_duas',
        context: {
          situation: situation || detectSituation(),
          time_of_day: getCurrentTimeContext(),
          current_challenges: null
        }
      });

      setSuggestedDuas(result.data.content.duas || []);
      setGuidance(result.data.content.situational_guidance || '');
      toast.success('Du\'as personalized for your life events!');
    } catch (error) {
      toast.error('Failed to generate Du\'as. Please try again.');
      console.error('Du\'a generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Removed auto-detect on mount to prevent errors on initial load

  const parseAiContext = (dua) => {
    try {
      return dua.ai_context || JSON.parse(dua.notes || '{}');
    } catch {
      return {};
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            AI Contextual Du'a Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            AI analyzes your schedule, time of day, and personal context to suggest the most relevant Du'as
          </p>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => generateDuas('morning')}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              Morning Du'as
            </Button>
            <Button
              onClick={() => generateDuas('before_meeting')}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              Before Meeting
            </Button>
            <Button
              onClick={() => generateDuas('before_travel')}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              Travel Du'as
            </Button>
            <Button
              onClick={() => generateDuas('seeking_knowledge')}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              Learning Du'as
            </Button>
            <Button
              onClick={() => generateDuas()}
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-700"
              size="sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Auto-Detect Context'}
            </Button>
          </div>

          {guidance && (
            <div className="p-4 bg-white rounded-lg border border-teal-200">
              <p className="text-sm text-slate-700 italic">💡 {guidance}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {suggestedDuas.length > 0 && (
        <div className="space-y-3">
          {suggestedDuas.map((dua, idx) => {
            const context = parseAiContext(dua);
            
            return (
              <motion.div
                key={dua.id || idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="border-cyan-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800 mb-1">{dua.title}</h4>
                        {dua.occasion && (
                          <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                            <Clock className="w-3 h-3" />
                            <span>{dua.occasion}</span>
                          </div>
                        )}
                      </div>
                      {context.frequency_recommendation && (
                        <Badge className="bg-teal-100 text-teal-700">
                          {context.frequency_recommendation}
                        </Badge>
                      )}
                    </div>

                    <div className="p-4 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg text-white">
                      <p className="text-xl font-arabic leading-loose mb-2" dir="rtl">
                        {dua.arabic_text}
                      </p>
                      <p className="text-sm text-cyan-100 italic mb-2">
                        {dua.transliteration}
                      </p>
                      <p className="text-sm text-white">
                        {dua.translation}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Source: {dua.source}</span>
                      <Button variant="ghost" size="sm">
                        <Volume2 className="w-3 h-3 mr-1" />
                        Listen
                      </Button>
                    </div>

                    {context.relevance_explanation && (
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-xs font-semibold text-purple-900 mb-1">Why This Du'a Now</p>
                        <p className="text-sm text-purple-700">{context.relevance_explanation}</p>
                      </div>
                    )}

                    {dua.benefits && (
                      <div className="p-3 bg-emerald-50 rounded-lg">
                        <p className="text-xs font-semibold text-emerald-900 mb-1">Benefits</p>
                        <p className="text-sm text-emerald-700">{dua.benefits}</p>
                      </div>
                    )}

                    {context.memorization_tip && (
                      <div className="p-3 bg-amber-50 rounded-lg">
                        <p className="text-xs font-semibold text-amber-900 mb-1">💡 Memorization Tip</p>
                        <p className="text-sm text-amber-700">{context.memorization_tip}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}